---
name: dump-dom
description: Captures a live DOM snapshot and/or ARIA accessibility tree from the currently open Chrome browser tab via CDP. Use when you need to inspect the real page structure to write accurate Playwright locators, understand component hierarchy, or generate ARIA snapshots for toMatchAriaSnapshot() assertions. Requires Chrome to be running with --remote-debugging-port=9222.
allowed-tools: mcp__topq-playwright-plugin__dump_dom
---

# DOM & ARIA Snapshot Tool

Two approaches are available depending on the context:

## Option A — `dumpDom()` utility (preferred when a test is running)

A TypeScript utility function embedded in test code. Import directly from the source file (not through `internals.ts`).

```typescript
import { dumpDom } from '../../../src/utils/dumpDom';

// Drop anywhere in a test or page object — resumes automatically
await dumpDom(page, { label: 'before-submit', sleepMs: 500 });
```

Writes three files to `test-results/debug-dumps/<timestamp>-<label>/`:

| File | Use for |
|------|---------|
| `aria.yml` | Writing `getByRole()` locators; pasting into `toMatchAriaSnapshot()` |
| `content.html` | Finding IDs, classes, data attributes |
| `screenshot.png` | Visual confirmation of page state |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `label` | `'dump'` | Folder name suffix |
| `sleepMs` | `0` | Wait before capturing (ms) |
| `waitForNetworkIdle` | `false` | Wait for network idle first |
| `outputDir` | `'test-results/debug-dumps'` | Output folder |

After investigation: read the `aria.yml` to write accurate locators, then **remove the `dumpDom` call**.

---

## Option B — MCP CDP tool (when investigating outside a test)

Connects to Chrome via CDP. Requires Chrome to be running with `--remote-debugging-port=9222`.

```bash
# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=%TEMP%\chrome-debug
```

### What it returns

| Field | Content |
|-------|---------|
| `dom` | Sanitized HTML — scripts/styles/SVGs stripped, semantic attributes kept |
| `aria` | ARIA tree in Playwright `toMatchAriaSnapshot()` format |
| `files` | Paths of the timestamped files written to `dom-snapshots/` |

Both files from a single capture share the same timestamp (e.g. `dom-snapshots/2026-04-16T14-30-45-123.html` and `dom-snapshots/2026-04-16T14-30-45-123.aria.yaml`).

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `host` | `127.0.0.1` | Chrome debug host |
| `port` | `9222` | Chrome debug port |
| `delay` | `0` | Seconds to wait before capture |
| `captureType` | `both` | `"dom"`, `"aria"`, or `"both"` |
| `outputDir` | `dom-snapshots/` | Folder to save snapshot files |

### Workflow

1. Ensure Chrome is open with `--remote-debugging-port=9222` and the target page is visible.
2. Invoke the `dump_dom` MCP tool (optionally with `delay` if you need time to navigate first).
3. Use the returned `aria` YAML to write `toMatchAriaSnapshot()` assertions.
4. Use the returned `dom` HTML for element roles, IDs, and class names to build `getByRole()` / `getByLabel()` locators.
