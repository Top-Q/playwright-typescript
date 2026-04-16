---
name: compare-trace-reports
description: "Compare Playwright trace.zip files to diagnose test failures using network requests, console errors, and action timelines — without loading the full trace. Supports single trace analysis or side-by-side comparison of two traces (e.g. local vs CI)."
user-invocable: true
model: sonnet
argument-hint: "<path-to-folder-with-traces> [test-name-pattern]"
allowed-tools: Bash(python*)
---

# Compare Playwright Trace Reports

Compare lightweight summaries extracted from Playwright `trace.zip` files to diagnose why a test fails. Extracts only **network requests**, **browser console messages**, and **action timelines** — skipping screenshots and DOM snapshots — at a fraction of the full trace size.

## Usage

`/compare-trace-reports <folder-with-traces>`

The folder should contain one or more `trace.zip` files. When two are present, a side-by-side comparison is produced automatically. Name them descriptively so the comparison is clear (e.g., `local_trace.zip`, `ci_trace.zip`).

Examples:
- `/compare-trace-reports test-results/`
- `/compare-trace-reports 647_debug/`
- `/compare-trace-reports 647_debug/ci_trace.zip`

## How It Works

### Step 1: Run the extraction script

```bash
PYTHONIOENCODING=utf-8 python .claude/skills/compare-trace-reports/compare-trace-reports.py <folder> [--verbose]
```

Options:
- `--verbose` — include all console messages (default: errors/warnings only)
- `--no-compare` — skip comparison, print individual summaries only

### Step 2: Analyze the output

Focus on these signals:

| Signal | What to look for |
|--------|-----------------|
| **Failed actions** | Playwright actions that errored — the step where execution stopped |
| **Missing network request** | An API call that should have fired but doesn't appear — indicates the UI action didn't trigger the expected behavior |
| **4xx/5xx responses** | Backend errors causing downstream assertion failures |
| **Console errors** | JavaScript errors or unhandled rejections preventing component initialization |
| **Action without subsequent request** | A `.fill()` or `.click()` with no API call following — event handler didn't fire |
| **Long action duration** | Element took longer than expected to become actionable |

### Step 3: Compare traces (when two are present)

When the folder contains two traces (e.g. local passing + CI failing), the script produces a **side-by-side comparison**:

#### Network endpoint diff

| Delta | Meaning |
|-------|---------|
| Request in passing trace but missing in failing | The triggering UI action didn't fire the expected API call |
| Same request returns 200 in passing, 4xx/5xx in failing | Backend behaves differently per environment |
| Same request but significantly different response time | Timeout or slowness causing downstream failures |

#### Action sequence diff

| Delta | Meaning |
|-------|---------|
| Same actions, but failing trace has much longer duration | Element took longer to become actionable (timing issue) |
| Failing trace has fewer actions before failure | A preceding step didn't complete — failure cascaded |
| Action exists in both but has error only in failing trace | Same action behaves differently in CI environment |

#### Console error diff

| Delta | Meaning |
|-------|---------|
| JS error in failing trace only | Environment-specific JavaScript failure preventing component setup |
| React/framework warning in failing trace | Component lifecycle issue under slower CI execution |

### Step 4: Investigate the root cause

Based on the patterns detected:

1. **Read the test spec file** to understand the test logic and flow
2. **Read the relevant Page Object** if the failure involves a UI action
3. **Find other tests that exercise the same code path** — compare their setup and waits with the failing test
4. **Check for environment differences**: CI (UTC, headless, Linux) vs local (headed, Windows/Mac)

### Step 5: Report findings

```
## Failure Summary
- Test: [name]
- Failing on: CI / Local
- Failure step: [step name from trace actions]
- Error: [one-line summary]

## Trace Comparison
- Passing trace: [filename]
- Failing trace: [filename]

### Network Diff
- Requests in passing but missing in failing: [list]
- Requests with different status codes: [list]

### Action Diff
- Actions with errors only in failing: [list]
- Actions with significant duration differences: [list]

### Console Diff
- Errors only in failing trace: [list]

## Root Cause
[Explanation with evidence]

## Suggested Fix
[Concrete code change with file path and rationale]
```

## Common Root Cause Patterns

| Trace Evidence | Likely Root Cause |
|----------------|-------------------|
| API request in passing trace missing from failing | UI action didn't trigger expected behavior (event handler not yet bound) |
| Same API returns 200 locally, 4xx/5xx on CI | Environment-specific backend config or test data |
| JS error in failing trace only | Component initialization failure under slower CI execution |
| Same action, much longer duration on CI | Element took longer to become actionable (timing) |
| Failing trace has fewer actions before failure | Preceding step didn't complete — failure cascaded |
| `.fill()` present but no subsequent API request | Event handlers not bound when action executed — add explicit wait |
| Network request timing gap > 5s between actions | App stuck or waiting — check for polling/timeout issues |

## Fix Patterns

**Timing / initialization**: Wait for a concrete UI signal (heading visible, button enabled) rather than `waitForLoadState('networkidle')` — persistent connections (WebSockets, analytics) will cause it to hang.

**fill() not triggering events**: Try `pressSequentially()` or `press('Tab')` after `fill()` to dispatch the events the framework listens for.

**Element not yet interactive**: Add `expect(locator).toBeEnabled()` after navigation before interacting — this auto-retries until the component is ready.

**Timezone-sensitive assertions**: Use explicit timezone in date formatting instead of relying on `new Date()` which returns local time.

## Size Comparison

| Artifact | Typical size | What it contains |
|----------|-------------|-----------------|
| Full trace.zip | 5MB–50MB+ | Everything (DOM snapshots, screenshots, network, console, timeline) |
| **This script's output** | **5KB–50KB** | **Network requests, console errors, action timeline** |

Typically **100–1000x smaller** than the full trace while containing the key debugging signals.

## Notes

- Always run with `PYTHONIOENCODING=utf-8` to handle non-ASCII characters in console output
- Trace format compatible with Playwright v1.49+
- Network request bodies/responses are not extracted — if you need payload details, open the full trace with `npx playwright show-trace`
