# Driving the live app

Used by **po-builder** (to find real locators), **module-investigator** (to map a module)
and **test-healer** (to see why a step failed).

This file owns one thing: **how to acquire a browser against this app, drive it, and
release it without leaking.** What you will *see* once you are looking is a separate
concern — that lives in [`openproject-dom.md`](openproject-dom.md), which those agents
read unconditionally. Addresses and credentials live in
[`environment.md`](environment.md). Do not add OpenProject DOM facts here.

Two ways in:

| Recipe | Use when | Gives you |
| --- | --- | --- |
| **A — `--debug=cli`** | Almost always | A real test, paused, that you can step and then drive anywhere |
| **B — standalone** | You deliberately want logged-out / non-fixture state | A blank browser you log in yourself |

> **Version note.** `--debug=cli` requires Playwright **≥ 1.59.0** (bisected 2026-07-23: 1.57.0/1.58.0 boolean-only; 1.59.0+ accept `--debug [mode]` with choices `"inspector"` / `"cli"`). The project runs **1.61.1**. On 1.56.1 it failed with `error: unknown option '--debug=cli'` — if you ever see that, the lockfile has drifted back.

---

## ⚠️ `pause-at` does not work — use `step-over`

**Verified broken 2026-07-23** on Playwright 1.61.1 / `playwright-cli` 0.1.17. Four
variants were tried and all four behaved exactly like `resume`: the test ran to
completion and the session ended.

| Target tried | Result |
| --- | --- |
| a test-file line | ran to completion |
| a page-object action line | ran to completion |
| backslash path, as the runner prints it | ran to completion |

It **fails open and silently** — no error, no output, no pause. That is the dangerous
part: on a test with side effects, "pause before the destructive step" instead runs the
whole test. This is how a stray member got invited to the Demo project while checking it.

`step-over` works correctly and reports each action with its source location. Drive with
that. Do not reintroduce `pause-at` into these instructions without re-verifying it —
the earlier version of this file documented it as the primary control, and that was
never tested.

---

## Recipe A — attach to a real test

```powershell
# 1. Run ONE test in the BACKGROUND with --debug=cli.
$env:PLAYWRIGHT_HTML_OPEN='never'
npx playwright test tests/seed.spec.ts --project=chromium --debug=cli
```

The variable is set on its own line because this machine runs PowerShell, where a
`VAR=value cmd` prefix is a parse error rather than an environment assignment. Without
the variable a *passing* debug run opens the HTML report and blocks.

**One test per run.** A file holding several needs `<file>:<line>` to pick one —
otherwise the first test runs and the second dies with
`Error: browser.bind: Server is already started.` `tests/seed.spec.ts` holds exactly one,
so it needs no line number.

```bash
# 2. Wait for "Debugging Instructions" and the session name, then attach.
playwright-cli attach tw-0d5b4b          # name is printed by the run; never guess it
```

The test is now **paused before the fixture has run** — the page is `about:blank` and
the pause is at `tests/ui/fixtures.ts:11`. You are *not* logged in yet.

```bash
# 3. Step forward. Each step executes one action and reports the next.
playwright-cli --s=tw-0d5b4b step-over
```

**Four `step-over`s from the start puts you logged in**, via the fixture:

```
- Fill "admin"      at src\po\openproject\general\loginPage.ts:36
- Fill "adminadmin" at src\po\openproject\general\loginPage.ts:44
- Click             at src\po\openproject\general\loginPage.ts:51
- Click             at src\po\openproject\general\homePage.ts:31   <- logged in here
```

```bash
# 4. Now drive the paused browser anywhere. This is the part that makes A general.
playwright-cli --s=tw-0d5b4b goto http://localhost:8090/projects/demo-project/members
playwright-cli --s=tw-0d5b4b find "Add member"
playwright-cli --s=tw-0d5b4b snapshot "#content"
playwright-cli --s=tw-0d5b4b generate-locator e42 --raw
playwright-cli --s=tw-0d5b4b eval "location.href"
```

Pass `--s=<session>` on **every** command: the session is named after the test run, not
`default`. If the test finishes or fails, the session ends and further commands return
*"The browser 'tw-XXXX' is not open"* — that is the run completing, not an error to retry.

### Which test to attach to

- **Healing a failure** → the failing test itself. Step to the failing action so you see
  its real state. If it is deep in a long test, read the trace first; stepping there is
  slow, and `trace: 'on'` already recorded every action.
- **Building a gap's method** (po-builder) → the test containing the gap. Step to the
  gap and you are in exactly the state the missing method will be called in.
- **Mapping a module, or anything with no relevant test** (module-investigator) →
  `tests/seed.spec.ts`, which requests the login fixture and does nothing else. Step
  four times, then navigate by URL. It has no side effects, so even a mis-step is free.

### Teardown — one command

```bash
playwright-cli --s=tw-0d5b4b resume
```

The run then tears its own browser down. Verified: `playwright-cli list` reports
`(no browsers)` and no `ms-playwright` chrome process survives.

If you navigated the page during the pause, `resume` will usually **fail the test** —
the fixture resumes against a page you moved off. That is expected and harmless when
you were only investigating; the teardown is still clean. Use `playwright-cli kill-all`
for a stale session.

---

## Recipe B — standalone browser, log in by hand

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
```

The login page has two name traps (asterisked labels, duplicate `Sign in`) — see
[`openproject-dom.md`](openproject-dom.md) § Accessible names. They are why step 2 is a
snapshot and steps 3–4 use refs rather than text: work from refs and the traps cannot
bite you.

Refs are scoped to the frame and re-issued on navigation — after a `goto` they come back with a prefix (`f3e43` rather than `e43`). Re-snapshot after every navigation; never carry a ref across one.

**Always `npm run pipeline:cleanup -- --kill` before you return.** It closes the sessions and terminates any `--debug=cli` run still holding a browser; `playwright-cli list` should print `(no browsers)` when you are done.

### What this costs

You start logged out, so you do not inherit `tests/ui/fixtures.ts` (which logs in as
admin and selects the Demo project). Your browser state is therefore _not_ identical to
the state a test sees. **This is exactly the gap Recipe A closes**, which is why B is the
last resort — reach for it only when logged-out state is the point.

---

## Getting a locator you can trust

`playwright-cli generate-locator <ref> --raw` emits a real Playwright locator for an
element. Use it rather than composing a locator by eye from the snapshot — it accounts
for role, accessible name, and disambiguation that reading YAML does not.

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

**Read the trace first.** It is a complete record of the failed run and costs nothing to
open — the `playwright-trace` skill reads it from the command line, and it is usually
faster than reproducing. With `pause-at` unavailable, it is also *much* faster than
stepping to a failure deep in a test.

When the trace leaves the cause ambiguous, use Recipe A against the failing test and
step to the failing action:

```bash
playwright-cli --s=tw-XXXXXX snapshot     # did the element move, rename, or change role?
playwright-cli --s=tw-XXXXXX console      # app-side JS errors?
playwright-cli --s=tw-XXXXXX requests     # failed request, wrong payload?
```

Before deciding the cause is novel, check
[`openproject-dom.md`](openproject-dom.md) — most failures here have happened before.
