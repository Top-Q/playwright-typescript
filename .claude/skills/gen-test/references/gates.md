# Deterministic gates

Gates are commands, not judgement. They exist so that a mistake made by one agent is caught by a program before the next agent inherits it. The orchestrator runs them; agents do not decide whether they passed.

**Never advance a stage on a red gate.** A gate that is failing is telling you the previous stage did not finish its job.

## The gates

| Command | Asserts | On failure |
|---|---|---|
| `npm run gate:catalog` | `pom-catalog/` matches `src/po/` | Run `npm run catalog`. In preflight this is a fixable nuisance; after a PO change it means the agent forgot to regenerate. |
| `npm run gate:types` | `tsc --noEmit` is clean | Hard stop. |
| `npm run gate:lint` | `eslint .` reports no **errors** | Hard stop. Warnings are tolerated — the repo has 3 pre-existing ones. |
| `npm run gate:gaps` | Zero `GAP-` markers remain | After po-builder, this is the completeness check. Anything listed is still throwing. |
| `npm run gate:gaps -- --file <test> --expect <n>` | Exactly `n` gaps exist | After test-creator, confirms `gaps.json` matches the test file. A mismatch means the worklist lies. |
| `npm run gate:gaps -- --file <test> --expect <n> --ratio-max 0.6` | …and the test is mostly built, not mostly deferred | **Exit 2** — not a hard stop. See below. |
| `npm run gate:all` | catalog + types + lint + gaps(0) | Preflight and final gate. |

`gate:gaps` scans `tests/` and `src/po/` by default, takes `--file` to scope to one file, and `--json` for a machine-readable count.

## The ratio gate

`--ratio-max` compares gaps against the test's `test.step()` count. It answers a different question from the count: not *did the creator record its work* but *did the creator have anything to work with*.

A ratio near 1.0 means nearly every step was deferred — the "test" is the spec restated in TypeScript. That is not the creator failing. It means the POM catalog covers this module so thinly that there was no vocabulary to design against, and pushing on would hand po-builder a whole module to invent in one pass, which is the monolithic agent this pipeline exists to avoid.

So it exits **2**, distinct from the exit 1 of a real mismatch, and the orchestrator branches on it rather than aborting. Threshold 0.6 is a starting point, not a discovered constant — adjust once a few runs have been observed.

This replaces measuring module coverage separately at preflight: a module with no page objects produces a ratio near 1.0 by construction, so one number covers both cases.

## Where each gate runs

```
stage 0    preflight     gate:all                                must be green before generating
stage 1    test-creator
stage 2    gate          gate:types, gate:lint,
                         gate:gaps --file <test> --expect <n>
                                    --ratio-max 0.6
stage 2.5  investigate   only on exit 2: module-investigator -> po-builder (scaffold
                         mode) -> catalog -> re-run stage 1 once
stage 3    po-builder    (skipped when gaps.json is empty)
stage 4    gate          catalog, gate:types, gate:lint, gate:gaps
stage 5    execute       npx playwright test <file>
stage 6    test-healer   re-run stage 5 after each iteration
stage 7    test-reviewer
stage 8    final         catalog, gate:all, pipeline:report
```

`npm run catalog` (regenerate) runs *before* `gate:catalog` (verify) at stage 4 — po-builder is expected to have changed page objects, so regenerating is correct there. It is **not** needed at stage 2 any more: test-creator touches only the test file, so a catalog change at that point would mean it exceeded its scope. At preflight, a stale catalog is a pre-existing condition worth reporting rather than silently fixing.

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

Leftover gaps at preflight mean a previous run aborted mid-flight. Do not proceed — surface the list and let the user decide whether to revert them.

## Running the test (stage 5)

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test <testFile> --reporter=list
```

Capture stdout to `.pipeline/runs/<run-id>/test-run/<n>/stdout.txt` and the exit code to `.../exit-code` in the same directory — `npm run pipeline:report` reads both, and the healer needs the output.

`PLAYWRIGHT_HTML_OPEN=never` matters: without it a passing run opens a browser window and blocks.

## Budgets

- **Heal iterations: 3.** After the third failure, stop and report. Do not keep going.
- **Repair passes: 1 per gate.** If a gate fails after an agent's stage, that agent gets exactly one chance to fix it, then the run aborts.
- **Investigation passes: 1.** The ratio gate may send a run back through investigation exactly once. If the ratio is still high afterwards, stop — investigating twice means the module needs a human, not another lap.

Budgets are not targets. A run that finishes in zero heal iterations is the good outcome, and one that burns all three is telling you the po-builder's evidence was weak.

## Cleanup

At the end of every run, whether it succeeded or aborted:

```bash
playwright-cli list           # any sessions still bound?
playwright-cli close-all      # release them
```

Also stop any background `npx playwright test --debug=cli` still running. The branch is **not** cleaned up — it stays for the user to inspect, merge, or delete.
