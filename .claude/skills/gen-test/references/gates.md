# Deterministic gates

Gates are commands, not judgement. They exist so that a mistake made by one agent is caught by a program before the next agent inherits it. The orchestrator runs them; agents do not decide whether they passed.

**Never advance a stage on a red gate.** A gate that is failing is telling you the previous stage did not finish its job.

## The gates

| Command | Asserts | On failure |
|---|---|---|
| `npm run gate:catalog` | `pom-catalog/` matches `src/po/` | Run `npm run catalog`. In preflight this is a fixable nuisance; after a PO change it means the agent forgot to regenerate. |
| `npm run gate:types` | `tsc --noEmit` is clean | Hard stop. Type errors after test-creator usually mean a stub signature does not match its call site in the test. |
| `npm run gate:lint` | `eslint .` reports no **errors** | Hard stop. Warnings are tolerated — the repo has 3 pre-existing ones. |
| `npm run gate:stubs` | Zero `@stub` methods remain | After po-builder, this is the completeness check. Anything listed is still throwing. |
| `npm run gate:stubs -- --expect <n>` | Exactly `n` stubs exist | After test-creator, confirms `stubs.json` matches the source. A mismatch means the worklist lies. |
| `npm run gate:all` | catalog + types + lint + stubs(0) | Preflight and final gate. |

`gate:stubs` also takes `--run <run-id>` to scope to one run's stubs, and `--json` for a machine-readable count.

## Where each gate runs

```
stage 0  preflight     gate:all                                  must be green before generating
stage 1  test-creator
stage 2  gate          catalog, gate:types, gate:lint,
                       gate:stubs -- --expect <n>
stage 3  po-builder    (skipped when stubs.json is empty)
stage 4  gate          catalog, gate:types, gate:lint, gate:stubs
stage 5  execute       npx playwright test <file>
stage 6  test-healer   re-run stage 5 after each iteration
stage 7  test-reviewer
stage 8  final         catalog, gate:all, pipeline:report
```

`npm run catalog` (regenerate) runs *before* `gate:catalog` (verify) at stages 2 and 4 — the agent is expected to have changed page objects, so regenerating is correct there. At preflight, a stale catalog is a pre-existing condition worth reporting rather than silently fixing.

## Preflight, in full

```bash
npm run gate:all                                  # baseline must be green
curl -sf -o /dev/null http://localhost:8090       # OpenProject reachable
playwright-cli --version                          # browser tooling present
git rev-parse --abbrev-ref HEAD                   # note the base branch
git checkout -b test-gen/<run-id>                 # isolate the run
npm run pipeline:init -- --spec <ref> --branch test-gen/<run-id>
```

If `gate:all` is red at preflight, **stop and report**. Generating a test on a broken baseline produces failures that cannot be attributed to the new code, which wastes the entire run.

Leftover stubs at preflight mean a previous run aborted mid-flight. Do not proceed — surface the list and let the user decide whether to revert them.

## Running the test (stage 5)

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test <testFile> --reporter=list
```

Capture stdout to `.pipeline/runs/<run-id>/test-run/<n>/stdout.txt` and the exit code to `.../exit-code` in the same directory — `npm run pipeline:report` reads both, and the healer needs the output.

`PLAYWRIGHT_HTML_OPEN=never` matters: without it a passing run opens a browser window and blocks.

## Budgets

- **Heal iterations: 3.** After the third failure, stop and report. Do not keep going.
- **Repair passes: 1 per gate.** If a gate fails after an agent's stage, that agent gets exactly one chance to fix it, then the run aborts.

Budgets are not targets. A run that finishes in zero heal iterations is the good outcome, and one that burns all three is telling you the po-builder's evidence was weak.

## Cleanup

At the end of every run, whether it succeeded or aborted:

```bash
playwright-cli list           # any sessions still bound?
playwright-cli close-all      # release them
```

Also stop any background `npx playwright test --debug=cli` still running. The branch is **not** cleaned up — it stays for the user to inspect, merge, or delete.
