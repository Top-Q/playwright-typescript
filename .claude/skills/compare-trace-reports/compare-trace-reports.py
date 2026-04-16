"""
Extract lightweight network + console summaries from Playwright trace.zip files.

Produces a compact diagnostic output without loading full screenshots/DOM snapshots.
Typically 100-1000x smaller than the full trace while containing the key debugging signals.

Usage:
    python extract-trace-summary.py <path> [--verbose]

    path: a single trace.zip file or a folder containing trace zips
    --verbose: include all console messages (default: errors/warnings only)

Examples:
    python extract-trace-summary.py 647_debug/trace.zip
    python extract-trace-summary.py test-results/
    python extract-trace-summary.py test-results/ --verbose
"""

import zipfile
import json
import sys
import os
import re


def sanitize(s):
    """Remove ANSI escape codes and encode non-ASCII chars for terminal output."""
    if not isinstance(s, str):
        s = str(s)
    s = re.sub(r'\x1b\[[0-9;]*m', '', s)
    return s.encode('ascii', 'replace').decode('ascii')


def extract_trace_summary(trace_path):
    """Extract network requests, console messages, and actions from a Playwright trace.zip."""
    network = []
    console = []
    actions = []

    with zipfile.ZipFile(trace_path) as zf:
        for name in zf.namelist():
            # Skip large binary files (screenshots, DOM snapshots)
            if name.endswith(('.png', '.jpg', '.jpeg', '.webp', '.svg')):
                continue

            # Read trace event files (.trace suffix or .json)
            if name.endswith('.trace') or name.endswith('.json'):
                try:
                    raw = zf.read(name).decode('utf-8', errors='replace')
                except Exception:
                    continue

                # Trace files can contain newline-delimited JSON
                for line in raw.strip().split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        event = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    etype = event.get('type', '')

                    # Network events
                    if etype == 'resource-snapshot':
                        req = event.get('snapshot', {}).get('request', {})
                        resp = event.get('snapshot', {}).get('response', {})
                        network.append({
                            'method': req.get('method', '?'),
                            'url': req.get('url', '?'),
                            'status': resp.get('status', '?'),
                            'timestamp': event.get('timestamp', 0),
                        })

                    # Console events
                    elif etype == 'console':
                        console.append({
                            'type': event.get('messageType', 'log'),
                            'text': sanitize(event.get('text', '')[:500]),
                            'timestamp': event.get('timestamp', 0),
                        })

                    # Action events (steps performed by Playwright)
                    elif etype == 'action':
                        params = event.get('params', {})
                        error = event.get('error', None)
                        start = event.get('startTime', event.get('timestamp', 0))
                        end = event.get('endTime', 0)
                        duration = end - start if end and start else 0
                        actions.append({
                            'method': event.get('method', '?'),
                            'selector': params.get('selector', ''),
                            'url': params.get('url', ''),
                            'value': str(params.get('value', ''))[:100],
                            'timestamp': start,
                            'duration': duration,
                            'error': sanitize(str(error)[:300]) if error else None,
                        })

    return {'network': network, 'console': console, 'actions': actions}


def print_summary(data, trace_name, verbose=False):
    """Print a formatted summary of the trace data."""
    print(f"\n{'=' * 70}")
    print(f"TRACE: {trace_name}")
    print(f"{'=' * 70}")

    # Actions timeline
    if data['actions']:
        print(f"\n--- Actions ({len(data['actions'])}) ---")
        for a in sorted(data['actions'], key=lambda x: x['timestamp']):
            err_flag = " *** FAILED ***" if a.get('error') else ""
            sel = f" -> {a['selector']}" if a['selector'] else ""
            val = f" = '{a['value']}'" if a['value'] else ""
            url = f" url={a['url']}" if a['url'] else ""
            dur = f" ({a['duration']}ms)" if a['duration'] else ""
            print(f"  {a['method']}{sel}{val}{url}{dur}{err_flag}")
            if a.get('error'):
                print(f"    ERROR: {a['error']}")

    # Network requests
    if data['network']:
        print(f"\n--- Network Requests ({len(data['network'])}) ---")
        for n in sorted(data['network'], key=lambda x: x['timestamp']):
            url = n['url']
            if len(url) > 120:
                url = url[:120] + '...'
            status_flag = ""
            if isinstance(n['status'], int) and n['status'] >= 400:
                status_flag = " ***"
            print(f"  {n['method']} {n['status']}{status_flag} {url}")

    # Console messages
    if verbose:
        if data['console']:
            print(f"\n--- Console ({len(data['console'])}) ---")
            for c in sorted(data['console'], key=lambda x: x['timestamp']):
                print(f"  [{c['type'].upper()}] {c['text']}")
    else:
        important = [c for c in data['console'] if c['type'] in ('error', 'warning')]
        if important:
            print(f"\n--- Console Errors/Warnings ({len(important)}) ---")
            for c in sorted(important, key=lambda x: x['timestamp']):
                print(f"  [{c['type'].upper()}] {c['text']}")
        elif data['console']:
            print(f"\n--- Console ({len(data['console'])} messages, no errors/warnings) ---")

    # Summary stats
    print(f"\n--- Stats ---")
    print(f"  Actions: {len(data['actions'])}")
    print(f"  Network requests: {len(data['network'])}")
    error_count = len([c for c in data['console'] if c['type'] == 'error'])
    print(f"  Console messages: {len(data['console'])} (errors: {error_count})")
    failed_actions = [a for a in data['actions'] if a.get('error')]
    if failed_actions:
        print(f"  Failed actions: {len(failed_actions)}")
    failed_requests = [n for n in data['network'] if isinstance(n['status'], int) and n['status'] >= 400]
    if failed_requests:
        print(f"  Failed requests (4xx/5xx): {len(failed_requests)}")


def normalize_url(url):
    """Normalize a URL for comparison by stripping query params and UUIDs."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    # Strip query params
    path = parsed.path
    # Replace UUIDs with placeholder
    path = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<UUID>', path, flags=re.IGNORECASE)
    # Replace numeric IDs in path segments
    path = re.sub(r'/\d{5,}/', '/<ID>/', path)
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def get_api_endpoints(network):
    """Extract unique API endpoint signatures (method + normalized path) from network data."""
    endpoints = set()
    for n in network:
        url = n['url']
        # Skip static assets
        if any(url.endswith(ext) for ext in ('.js', '.css', '.png', '.jpg', '.svg', '.woff', '.woff2', '.ico', '.map')):
            continue
        normalized = normalize_url(url)
        endpoints.add(f"{n['method']} {normalized}")
    return endpoints


def print_comparison(data_list, trace_names):
    """Print a side-by-side comparison of two or more trace summaries."""
    print(f"\n{'#' * 70}")
    print(f"  TRACE COMPARISON")
    print(f"{'#' * 70}")

    for i, name in enumerate(trace_names):
        d = data_list[i]
        actions_count = len(d['actions'])
        failed_count = len([a for a in d['actions'] if a.get('error')])
        net_count = len(d['network'])
        err_count = len([c for c in d['console'] if c['type'] == 'error'])
        print(f"  [{i+1}] {name}: {actions_count} actions ({failed_count} failed), {net_count} network, {err_count} console errors")

    # --- Network endpoint diff ---
    endpoint_sets = [get_api_endpoints(d['network']) for d in data_list]
    if len(endpoint_sets) == 2:
        only_in_first = endpoint_sets[0] - endpoint_sets[1]
        only_in_second = endpoint_sets[1] - endpoint_sets[0]

        print(f"\n--- Network Endpoint Diff ---")
        if only_in_first:
            print(f"\n  Only in [{trace_names[0]}]:")
            for ep in sorted(only_in_first):
                print(f"    + {ep}")
        if only_in_second:
            print(f"\n  Only in [{trace_names[1]}]:")
            for ep in sorted(only_in_second):
                print(f"    + {ep}")
        if not only_in_first and not only_in_second:
            print(f"  Same API endpoints called in both traces")

        # Status code differences for shared endpoints
        shared = endpoint_sets[0] & endpoint_sets[1]
        if shared:
            status_diffs = []
            for ep in sorted(shared):
                method_path = ep
                statuses_1 = set()
                statuses_2 = set()
                for n in data_list[0]['network']:
                    norm = f"{n['method']} {normalize_url(n['url'])}"
                    if norm == method_path:
                        statuses_1.add(n['status'])
                for n in data_list[1]['network']:
                    norm = f"{n['method']} {normalize_url(n['url'])}"
                    if norm == method_path:
                        statuses_2.add(n['status'])
                if statuses_1 != statuses_2:
                    status_diffs.append((ep, statuses_1, statuses_2))

            if status_diffs:
                print(f"\n  Different status codes for same endpoint:")
                for ep, s1, s2 in status_diffs:
                    print(f"    {ep}")
                    print(f"      {trace_names[0]}: {sorted(s1)}")
                    print(f"      {trace_names[1]}: {sorted(s2)}")

    # --- Action sequence diff ---
    print(f"\n--- Action Sequence Diff ---")
    for i, d in enumerate(data_list):
        actions = sorted(d['actions'], key=lambda x: x['timestamp'])
        failed = [a for a in actions if a.get('error')]
        print(f"\n  [{trace_names[i]}]: {len(actions)} actions, {len(failed)} failed")
        if failed:
            for a in failed:
                sel = f" -> {a['selector']}" if a['selector'] else ""
                print(f"    FAILED: {a['method']}{sel}")
                print(f"      ERROR: {a['error']}")

    # --- Console error diff ---
    error_sets = []
    for d in data_list:
        errors = set()
        for c in d['console']:
            if c['type'] == 'error':
                errors.add(c['text'][:200])
        error_sets.append(errors)

    if len(error_sets) == 2:
        only_in_first = error_sets[0] - error_sets[1]
        only_in_second = error_sets[1] - error_sets[0]

        if only_in_first or only_in_second:
            print(f"\n--- Console Error Diff ---")
            if only_in_first:
                print(f"\n  Only in [{trace_names[0]}]:")
                for e in sorted(only_in_first):
                    print(f"    {e}")
            if only_in_second:
                print(f"\n  Only in [{trace_names[1]}]:")
                for e in sorted(only_in_second):
                    print(f"    {e}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract-trace-summary.py <path> [--verbose] [--no-compare]")
        print("  path: a single trace.zip file or a folder containing trace zips")
        print("  --verbose: include all console messages (default: errors/warnings only)")
        print("  --no-compare: skip comparison even when multiple traces are present")
        sys.exit(1)

    path = sys.argv[1]
    verbose = '--verbose' in sys.argv
    no_compare = '--no-compare' in sys.argv

    traces = []
    if os.path.isfile(path) and path.endswith('.zip'):
        traces = [path]
    elif os.path.isdir(path):
        for root, dirs, files in os.walk(path):
            for f in files:
                if f.endswith('.zip'):
                    traces.append(os.path.join(root, f))

    if not traces:
        print(f"No trace .zip files found at '{path}'")
        sys.exit(1)

    print(f"Found {len(traces)} trace file(s)")

    # Extract all traces
    all_data = []
    all_names = []
    for t in sorted(traces):
        try:
            data = extract_trace_summary(t)
            print_summary(data, os.path.basename(t), verbose)
            all_data.append(data)
            all_names.append(os.path.basename(t))
        except Exception as e:
            print(f"\nError processing {t}: {e}")

    # Comparison mode: when 2+ traces are present
    if len(all_data) >= 2 and not no_compare:
        print_comparison(all_data, all_names)


if __name__ == '__main__':
    main()
