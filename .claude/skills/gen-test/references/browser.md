# Driving the live app

Used by **po-builder** (to find real locators) and **test-healer** (to see why a step failed).

This file owns one thing: **how to acquire a browser against this app, drive it, and
release it without leaking.** What you will *see* once you are looking is a separate
concern — that lives in [`openproject-dom.md`](openproject-dom.md), which both agents
read unconditionally. Do not add OpenProject DOM facts here.

Three ways in. Pick by what you are doing:

| Recipe | Use when | Gives you |
| --- | --- | --- |
| **A — `--debug=cli`** | **healer**: a specific test fails and you need to see *its* state | The real test, pausable at any line |
| **B — CDP holder** | **po-builder**: hunting locators on a page | A logged-in browser, no test attached |
| **C — standalone** | You deliberately want logged-out / non-fixture state | A blank browser you log in yourself |

> **Version note.** `--debug=cli` requires Playwright **≥ 1.59.0** (bisected 2026-07-23: 1.57.0/1.58.0 boolean-only; 1.59.0+ accept `--debug [mode]` with choices `"inspector"` / `"cli"`). The project was upgraded from 1.56.1 to **1.61.1** on 2026-07-23, so it now works. On 1.56.1 it failed with `error: unknown option '--debug=cli'` — if you ever see that, the lockfile has drifted back. `playwright-cli` 0.1.17 bundles Playwright 1.62.0-alpha, so its own docs have always described this flag correctly; the old failure was our runner being behind, not a broken tool.

## Recipe A — attach to the failing test itself (healer's default)

The only recipe that lets you pause inside the test under repair.

```bash
# 1. Run the single failing test in the BACKGROUND with --debug=cli.
PLAYWRIGHT_HTML_OPEN=never \
  npx playwright test tests/ui/members/members-crud.spec.ts:80 --project=chromium --debug=cli

# 2. Wait for "Debugging Instructions" and the session name, then attach.
playwright-cli attach tw-0d5b4b          # name is printed by the run; never guess it

# 3. The test is paused at the start. Drive it to the interesting line.
playwright-cli --s=tw-0d5b4b pause-at "src/po/openproject/members/memberTableRowComp.ts:215"
playwright-cli --s=tw-0d5b4b step-over
playwright-cli --s=tw-0d5b4b resume

# 4. Inspect at the pause point — same commands as any other session.
playwright-cli --s=tw-0d5b4b snapshot "#content"
playwright-cli --s=tw-0d5b4b eval "location.href"
```

Pass `--s=<session>` on every command: the session is named after the test run, not
`default`. If the test fails or finishes, the session ends and further commands return
*"The browser 'tw-XXXX' is not open"* — that is the run completing, not an error to retry.
`pause-at` runs the test forward, so a test that fails *before* your target line will
simply fail rather than pause.

Teardown: the run tears down its own browser when the test ends. Confirm with
`playwright-cli list` → `(no browsers)`. Use `playwright-cli kill-all` for stale sessions.

## Recipe B — attach to a logged-in holder browser

For locator work, where you want a page but no test in the way.
`tests/debug-session.spec.ts` launches Chromium with a CDP port, runs the normal
login fixtures, and then parks forever. You attach to that browser over CDP, so you
inherit the exact state a real test sees at its first line.

```bash
# 1. Start the holder in the BACKGROUND.
PW_DEBUG_SESSION=1 PLAYWRIGHT_HTML_OPEN=never \
  npx playwright test tests/debug-session.spec.ts --project=chromium --reporter=list

# 2. Wait for "[debug-session] Logged in and holding" in its output. Do not attach early.

# 3. Attach. No ref hunting, no login.
playwright-cli attach --cdp=http://localhost:9222

# 4. Explore — already authenticated and on the Demo project.
playwright-cli goto http://localhost:8090/projects/demo-project/members
playwright-cli find "Add member"
playwright-cli generate-locator <ref> --raw
```

**Teardown is three steps and all are required** (verified 2026-07-23):

1. `playwright-cli detach` — clears the CLI session registry, leaves the browser up.
   `playwright-cli close` does **not** close a CDP-attached browser; it is not a substitute.
2. Kill the background test run.
3. Kill the Chromium. **Killing the runner does not take the browser with it** — it is a
   grandchild, survives, and keeps holding port 9222, so the next run's attach silently
   lands on a stale browser:
   ```powershell
   Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
     Where-Object { $_.ExecutablePath -like '*ms-playwright*' } |
     ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
   ```
   The `ms-playwright` path filter is load-bearing — it spares the user's own Chrome.

Set `PW_CDP_PORT` if 9222 is busy. If `curl http://localhost:9222/json/version` answers
*before* you start the holder, a previous run leaked — clean it up first.

## Recipe C — standalone browser, log in by hand

Use when you want a logged-out or otherwise non-fixture state. Last verified on
Playwright 1.56.1 / `playwright-cli` 0.1.17 — the project has since moved to 1.61.1 and
this recipe has **not** been re-verified on it. It touches no runner flags, so it should
be unaffected; if it misbehaves, that assumption is the first thing to check.

```bash
# 1. Open a browser on the login page. Creates a session named "default".
playwright-cli open http://localhost:8090/login

# 2. Snapshot to get element refs. Never guess a ref — they change per page.
playwright-cli snapshot --depth=8

# 3. Log in using the refs from that snapshot — refs, not label text (see below).
playwright-cli fill <username-ref> admin
playwright-cli fill <password-ref> adminadmin
playwright-cli click <signin-ref>

# 4. Go straight to the page you care about.
playwright-cli goto http://localhost:8090/projects/demo-project/members

# 5. Explore.
playwright-cli find "Add member"
playwright-cli snapshot "#content"
playwright-cli generate-locator <ref> --raw
```

The login page has two name traps (asterisked labels, duplicate `Sign in`) — see
[`openproject-dom.md`](openproject-dom.md) § Accessible names. They are why step 2 is a
snapshot and steps 3–5 use refs rather than text: work from refs and the traps cannot
bite you.

Refs are scoped to the frame and re-issued on navigation — after a `goto` they come back with a prefix (`f3e43` rather than `e43`). Re-snapshot after every navigation; never carry a ref across one.

**Always `playwright-cli close-all` before you return.** A leaked session holds a browser, and `playwright-cli list` should print `(no browsers)` when you are done.

### What this costs

You start logged out, so you do not inherit `tests/ui/fixtures.ts` (which logs in as admin and selects the Demo project). Your browser state is therefore _not_ identical to the state the test under construction will see. Land on the same page the test would before trusting a snapshot, and prefer navigating by URL over clicking through the app. **This is exactly the gap Recipes A and B close**, which is why Recipe C is the last resort.

## Getting a locator you can trust

`playwright-cli generate-locator <ref> --raw` emits a real Playwright locator for an element. Use it rather than composing a locator by eye from the snapshot — it accounts for role, accessible name, and disambiguation that reading YAML does not.

Keep snapshots small; a full OpenProject page is large:

```bash
playwright-cli snapshot "#content"      # scope to a container
playwright-cli snapshot --depth=4       # shallow first, then drill in
playwright-cli snapshot e34             # subtree of one element
```

To read attributes the ARIA tree does not show:

```bash
playwright-cli eval "el => el.id" e5
playwright-cli eval "el => el.getAttribute('data-test-selector')" e5
```

## Debugging a specific failure (healer)

**Read the trace first.** It is a complete record of the failed run and costs nothing to open — the `playwright-trace` skill reads it from the command line, and it is usually faster than reproducing. Reach for the browser only when the trace leaves the cause ambiguous.

When it does, use **Recipe A**: re-run the single failing test with `--debug=cli`, attach, and `pause-at` the line above the failure so you are looking at the test's own state rather than a reconstruction of it. Then inspect — `--s=<session>` on every command, because a `--debug=cli` session is named after the run, not `default`:

```bash
playwright-cli --s=tw-XXXXXX snapshot     # did the element move, rename, or change role?
playwright-cli --s=tw-XXXXXX console      # app-side JS errors?
playwright-cli --s=tw-XXXXXX requests     # failed request, wrong payload?
```

Before deciding the cause is novel, check
[`openproject-dom.md`](openproject-dom.md) — most failures here have happened before.
