# Deterministic gates

Gates are commands, not judgement. They exist so that a mistake made by one agent is caught by a program before the next agent inherits it. The orchestrator runs them; agents do not decide whether they passed.

**Never advance a stage on a red gate.** A gate that is failing is telling you the previous stage did not finish its job.

## On PowerShell, type `npm.cmd`, not `npm`

Every command in this file and in `SKILL.md` is written as `npm run <alias> -- --flag value`. That form works in bash. **In PowerShell it silently loses every flag**, and the cause is not npm:

```
npm run pipeline:preflight -- --spec TC-MEM-009-01
> tsx .../preflight.ts TC-MEM-009-01          # --spec is gone
```

`npm` resolves to `npm.ps1`, a PowerShell *script*, so PowerShell binds its arguments with the parameter binder instead of forwarding them as it would for a native command. The binder eats `--` as end-of-parameters and every `--flag` as the name of a parameter `npm.ps1` does not declare, passing on only the values.

Two forms work. Prefer the first — the flags are then typed exactly as documented:

```powershell
npm.cmd run pipeline:preflight -- --spec TC-MEM-009-01     # npm.cmd is a batch file: a real native command
npm run pipeline:preflight '--' '--spec' 'TC-MEM-009-01'   # quoting every token also survives the binder
```

Flags that take a value fail loudly when they are eaten — the value arrives as a stray positional and the script exits 1 explaining this (`cli-args.ts`). **Boolean flags fail silently**: `pipeline:cleanup -- --kill` becomes report-only, `--json` yields text, `--skip-gates` stops skipping. Nothing can detect those, which is why the rule is `npm.cmd` rather than a code fix.

## The gates

| Command | Asserts | On failure |
|---|---|---|
| `npm run gate:catalog` | `pom-catalog/` matches `src/po/` | Run `npm run catalog`. In preflight this is a fixable nuisance; after a PO change it means the agent forgot to regenerate. |
| `npm run gate:types` | `tsc --noEmit` is clean | Hard stop. |
| `npm run gate:lint` | `eslint .` reports no **errors** | Hard stop. Warnings are tolerated — the repo has 3 pre-existing ones. |
| `npm run gate:gaps` | Zero `GAP-` markers remain | After po-builder, this is the completeness check. Anything listed is still throwing. |
| `npm run gate:gaps -- --run latest` | Exactly the gaps `gaps.json` declares, **by id**, and the test is mostly built | After test-creator. See below. |
| `npm run gate:gaps -- --run latest --expect 0` | No gap survives | After po-builder, scoped to the run's test file. |
| `npm run gate:all` | catalog + types + lint + gaps(0) | Preflight and final gate. |

`gate:gaps` scans `tests/` and `src/po/` by default, takes `--file` to scope to one file, and `--json` for a machine-readable count.

## `--run`: the gate reads the run record

`--run <id>` (or `--run latest`) takes the scope from the run directory instead of the command line: the test file from `run.json`, the expected count from the length of `gaps.json`, and `--ratio-max` defaults to 0.6. Nothing is transcribed by hand, so nothing can be transcribed wrongly.

It also enables a check the count alone cannot make: that the gap **ids** in the test are the ids the creator declared. Four ids matching four entries by number and not by name used to pass clean, which left po-builder working from a worklist that did not describe the test. Three ways it now fails, all exit 1:

- **declared but never written** — `gaps.json` lists `GAP-2`; the test does not.
- **written but never declared** — the test throws `GAP-3`; the worklist has no such entry, so nobody will implement it.
- **written more than once** — the same id in two steps, which makes "implement GAP-1" ambiguous.

An explicit `--expect` still wins over the derived count. That is how stage 4 asks for zero against a `gaps.json` that legitimately still lists what stage 1 deferred — and with `--expect 0` the **declared but never written** arm is switched off, because their absence is exactly what that command is asking about. (It used to fire regardless, which made the documented stage-4 gate unpassable: a po-builder that implemented every gap scored one `missing` per gap and exited 1. The other two arms still apply.)

## The ratio gate

`--ratio-max` compares gaps against the test's `test.step()` count. It answers a different question from the count: not *did the creator record its work* but *did the creator have anything to work with*.

A ratio near 1.0 means nearly every step was deferred — the "test" is the spec restated in TypeScript. That is not the creator failing. It means the POM catalog covers this module so thinly that there was no vocabulary to design against, and pushing on would hand po-builder a whole module to invent in one pass, which is the monolithic agent this pipeline exists to avoid.

So it exits **2**, distinct from the exit 1 of a real mismatch, and the orchestrator branches on it rather than aborting. Threshold 0.6 is a starting point, not a discovered constant — adjust once a few runs have been observed.

This replaces measuring module coverage separately at preflight: a module with no page objects produces a ratio near 1.0 by construction, so one number covers both cases.

## Where each gate runs

```
stage 0    preflight     npm run pipeline:preflight -- --spec <ref>
stage 1    test-creator
stage 2    gate          gate:types, gate:lint, gate:gaps -- --run latest
stage 2.5  investigate   only on exit 2: module-investigator -> po-builder (scaffold
                         mode) -> catalog -> re-run stage 1 once
stage 3    po-builder    (skipped when gaps.json is empty)
stage 4    gate          catalog, gate:types, gate:lint, gate:gaps -- --run latest --expect 0
stage 5    execute       npm run pipeline:test-run
stage 6    test-healer   re-run stage 5 after each iteration
stage 7    test-reviewer
stage 8    final         catalog, gate:all, pipeline:report, pipeline:cleanup
```

Record each boundary as you cross it:

```bash
npm run pipeline:stage -- --stage test-creator --status ok --note "4 gaps across 7 steps"
npm run pipeline:stage -- --stage gate:2 --status fail --exit 2 --note "ratio 0.71 — routing to 2.5"
```

`run.json` has carried `stages` since the first version of the contract and nothing ever wrote it, so the only account of what happened when was the orchestrator's own narration — which does not survive a context window. `pipeline:test-run` records its own attempts; the stages worth recording by hand are the agent stages and the gates between them. `npm run pipeline:stage -- --list` prints the timeline.

`npm run catalog` (regenerate) runs *before* `gate:catalog` (verify) at stage 4 — po-builder is expected to have changed page objects, so regenerating is correct there. It is **not** needed at stage 2 any more: test-creator touches only the test file, so a catalog change at that point would mean it exceeded its scope. At preflight, a stale catalog is a pre-existing condition worth reporting rather than silently fixing.

## Preflight, in full

```bash
npm run pipeline:preflight -- --spec <ref>        # add --json for the run record
```

One command, because every part of it was mechanical: the four gates, the app on `:8090`, `playwright-cli` on PATH, the base branch, the run branch, and the run directory. It reports every check before it changes anything, so a red preflight leaves the repository exactly as it found it — no branch, no run directory.

It also settles an ordering that could not work by hand: the run id is derived **first**, so the branch is `test-gen/<run-id>` for the id that `run.json` actually records. Written out as separate commands the branch had to be named before `pipeline:init` generated the id, and the two drifted apart as a matter of course.

Read the check list, not just the exit code:

- **A red gate** — stop and report. Generating a test on a broken baseline produces failures that cannot be attributed to the new code, which wastes the entire run.
- **`gate:gaps` red** — a previous run aborted mid-flight and left gaps behind. Surface the list and let the user decide whether to revert them; it is not yours to clean up.
- **`git` warn** — HEAD is already a `test-gen/` branch, so this run's diff will sit on top of another run's. Usually you want the base branch first.
- **`module` warn** — the spec's module resolved to a directory that does not exist under `src/po/openproject/`. Correct and expected for a genuinely new module (stage 2.5 will map it). For a module you know has page objects, it means `run-init.ts`'s module table is missing an entry, and the run would otherwise reach test-creator with an empty catalog and gap out every step.
- **`leaks` warn** — a previous session left a `playwright test` run alive. Clear it with `npm run pipeline:cleanup -- --kill` before the browser stages need a port.

`--skip-gates` exists for debugging the pipeline itself and skips the only part that proves the baseline. `--no-branch` runs on the current branch. Neither belongs in a normal run.

## Running the test (stage 5)

```bash
npm run pipeline:test-run                    # add -- --run <run-id> for an older run
```

It resolves the test file from `run.json` (`testFile`, falling back to `suggestedTestFile`), allocates the next `test-run/<n>/`, writes `stdout.txt` and `exit-code` where the healer and the report expect them, records the attempt in `stages`, and exits with the test's own exit code.

Do not run Playwright by hand here. The command this replaces was

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test <testFile> --reporter=list
```

whose env-var prefix is POSIX syntax and a parse error in PowerShell, which is the shell this project runs on. Without that variable a *passing* run opens the HTML report and blocks the pipeline, so getting it wrong does not look like a failure — it looks like a hang.

Extra Playwright arguments go after a second `--`: `npm run pipeline:test-run -- -- --grep @members`.

## Budgets

- **Heal iterations: 3.** After the third failure, stop and report. Do not keep going.
- **Repair passes: 1 per gate.** If a gate fails after an agent's stage, that agent gets exactly one chance to fix it, then the run aborts.
- **Investigation passes: 1.** The ratio gate may send a run back through investigation exactly once. If the ratio is still high afterwards, stop — investigating twice means the module needs a human, not another lap.

Budgets are not targets. A run that finishes in zero heal iterations is the good outcome, and one that burns all three is telling you the po-builder's evidence was weak.

## Cleanup

At the end of every run, whether it succeeded or aborted:

```bash
npm run pipeline:cleanup             # close sessions; report leaked test processes
npm run pipeline:cleanup -- --kill   # …and terminate them
```

Sessions are closed by default. Leaked `playwright test` runs are only *reported* unless you pass `--kill`, because matching a command line and terminating what it hits is not something a script should decide on its own. A leaked run holds a browser and a port, and the next stage dies with `browser.bind: Server is already started` — a failure that looks like the new stage's fault.

Detection is **not** keyed to `--debug=cli`. That flag names one way of starting a run rather than a property of one, so runs leaked by any other recipe were invisible — and cleanup then printed "nothing left holding a browser" and exited 0 with four of them alive, the oldest for five days. What is matched instead is the Playwright *runner*, executing tests, out of this checkout (`leaked-runs.ts`); `test-server` and `@playwright/mcp` are excluded by name because they are long-lived tooling, not runs. One leaked `npx playwright test` is four processes, so cleanup counts and kills tree **roots** and re-reads the process table afterwards rather than assuming the kill worked.

`preflight` reports the same thing as a **warn**, because a leak inherited from an earlier session is a precondition the end of *this* run cannot fix.

Exit 1 means something is still held. The branch is **not** cleaned up — it stays for the user to inspect, merge, or delete.
