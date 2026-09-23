---
name: pause-test
description: Pause a running Playwright test at a chosen line, attach a browser session to it, inspect the live page, then step or resume. Use when you need to see the real state of the app mid-test — debugging a failure, checking what a page renders before writing a locator, or reaching a state that only exists partway through a test.
---

# Pausing a running test

A Playwright test can be stopped mid-run and inspected in the live browser: real page, real
login, real data, exactly as the test left it. Use it when a screenshot or a trace cannot
answer the question — "is this element here *now*", "what does this button actually do",
"what state is the form in before the click".

Requires `@playwright/cli` **0.1.18+** and Playwright **1.59+** (`playwright-cli --version`).

## The workflow

**1. Start the test in the background** with `--debug=cli`. One test per run.

```powershell
$env:PLAYWRIGHT_HTML_OPEN='never'                      # own line — PowerShell has no VAR=x prefix
npx playwright test tests/ui/members/members-crud.spec.ts --debug=cli
```

Use `<file>:<line>` to pick one test out of a file that holds several. Without
`PLAYWRIGHT_HTML_OPEN`, a passing run opens the HTML report and blocks.

**2. Read the run's output for the session name**, then attach:

```
### The test is currently paused at the start
- Run "playwright-cli attach tw-d19416" to attach to this test
```

```bash
playwright-cli attach tw-d19416
```

Never guess the name — it is generated per run. The test is now paused *before* the fixture
has run: the page is `about:blank` and you are not logged in yet.

**3. Jump to the point you care about:**

```bash
playwright-cli --s=tw-d19416 pause-at "membersPage.ts:364"
```

Everything up to that line executes for real — login, navigation, setup — and the test stops
there. Picking that line correctly is the whole trick; see below.

**4. Inspect the live page.** Every command needs `--s=<session>`.

```bash
playwright-cli --s=tw-d19416 snapshot "#content"       # ARIA tree, with a ref per element
playwright-cli --s=tw-d19416 find "Add member"         # locate text in the tree
playwright-cli --s=tw-d19416 generate-locator e42 --raw # a real locator for that ref
playwright-cli --s=tw-d19416 console                   # app-side JS errors
playwright-cli --s=tw-d19416 requests                  # failed request, wrong payload
playwright-cli --s=tw-d19416 eval "el => el.id" e42    # attributes the ARIA tree omits
```

**5. Advance or finish:**

```bash
playwright-cli --s=tw-d19416 step-over    # run the next action, pause again
playwright-cli --s=tw-d19416 pause-at "otherPage.ts:88"   # jump further ahead
playwright-cli --s=tw-d19416 resume       # run to the end; the run tears its browser down
```

## Choosing the pause location

> **Target the line that makes the Playwright call.**

Playwright attributes an action to the **innermost user frame** — the line where `.click()`,
`.fill()`, `.goto()`, `.selectOption()` or `waitFor*` is actually written. In a page-object
codebase that line is in the page object, **not** in the spec:

```ts
// members-crud.spec.ts
await membersPage.filterByRole('Reader');   // ✗ not a valid target — just a method call

// membersPage.ts
async filterByRole(role: string) {
    await this.filterApplyButton.click();   // ✓ target this line: membersPage.ts:364
}
```

So: open the page object the spec calls, find the real call inside it, and use that
`file:line`. A bare filename is enough — `membersPage.ts:364`, no path.

To find a target, `step-over` once and read what it prints — it reports each action with its
source location, which is the exact format `pause-at` wants.

## Always check it actually paused

A location that matches nothing **fails silently**: no error, no output, and the test runs to
completion.

A real pause always prints a `### Paused` block:

```
### Paused
- Click at src\po\openproject\members\membersPage.ts:364
```

**No block means no pause.** Do not carry on as if the test were waiting for you — it has
already finished, and every side effect after your intended stopping point has happened. This
matters most when pausing *before* a destructive step: a mistyped location runs the delete.

## Finishing

`resume` lets the test end and tears the browser down by itself. If you navigated the page
during the pause, `resume` will often fail the test — expected, and harmless when you were
only investigating.

Stop the background run when you are done, and confirm nothing leaked:

```bash
npm run pipeline:cleanup -- --kill      # npm.cmd if flags get swallowed
playwright-cli list                     # expect "(no browsers)"
```

A finished or failed run ends its session; further commands returning *"The browser 'tw-XXXX'
is not open"* mean the run completed, not that something is wrong. Use
`playwright-cli kill-all` for a stale session.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `pause-at` prints nothing, test passes | Location matched no action — you targeted a spec line, or the wrong line in the page object |
| `Error: browser.bind: Server is already started.` | More than one test in the run — narrow it with `<file>:<line>` |
| `The browser 'tw-XXXX' is not open` | The run ended; start a new one |
| Commands hit the wrong browser | `--s=<session>` missing — the session is named after the run, never `default` |
| A passing run hangs at the end | `PLAYWRIGHT_HTML_OPEN='never'` was not set |

## Related

- **Read the trace first** for a test that already failed — `trace: 'on'` records the DOM and a
  screenshot at every action, and costs nothing to open (`playwright-trace` skill). Pause a run
  when the trace leaves the cause ambiguous, or when the page state you need does not exist yet.
- Acquiring a browser without a test (logged-out state, no relevant spec):
  [`browser.md`](../gen-test/references/browser.md), Recipe B.
