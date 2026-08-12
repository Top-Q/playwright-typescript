# Scenarios

Two conditions, chosen because they exercise **different halves of the pipeline**. The
covered scenario tests whether catalog-only discovery works when there is something to
discover. The bare scenario tests the branch that exists precisely because there is not.

Never reuse a spec whose test already exists in `tests/ui/`. It measures nothing: the
creator can find a near-identical implementation in the catalog, and a green result is
attributable to the earlier run rather than to this one.

---

## Scenario `covered` — partial infrastructure

**The selection rule.** A module that has a directory under `src/po/openproject/` and
enough catalog methods to design against (≥15), and a test case in that module whose
steps are *adjacent to* — not identical with — what the module already covers. Adjacency
is the point: full coverage produces zero gaps and never exercises po-builder; no
coverage is the other scenario.

Check the current state before choosing:

```bash
node -e "const i=require('./pom-catalog/openproject/index.json'); i.modules.forEach(m=>console.log(m.module, m.classCount, m.methodCount))"
ls tests/ui/*                      # which specs already exist
```

**Default fixture: `TC-WP-006-01`** — assign a Work Package to a current Project Member.

`workpackage` has 5 classes and (as of 2026-07-29) 21 methods covering create, text-filter,
open, delete and the assignee vocabulary this fixture's own run added. Pick a WP test case
whose subject matter sits next to that: status transitions (`FR-WP-003`/`FR-WP-004`),
sorting (`FR-WP-011`), bulk edit (`FR-WP-012`), attachments (`FR-WP-007`) and the Activity
log (`FR-WP-009`) are all uncovered as of that date, while navigation and creation resolve
from the catalog.

**The members fixtures are spent.** `TC-MEM-009-01` (the original default) has a committed
test at `tests/ui/members/filter-members-list-by-role.spec.ts`, and `TC-MEM-004-01` (the
original fallback) is now *fully* covered — `MemberTableRowComp` gained `clickManageRoles`,
`toggleRole`, `isRoleChecked` and `clickChangeButton`, so it yields zero gaps and never
exercises po-builder. Both fail the selection rule, in opposite directions. Expect this
document to go stale the same way: **re-run the two commands above and check `tests/ui/`
before trusting any named fixture here.** A scenario that has been run once is a scenario
that has been consumed.

**What is under test:** stages 1 → 2 → 3 → 4 → 5 → (6) → 7 → 8, with 2.5 *not* taken.

| # | Expectation | How you know |
|---|---|---|
| 1 | Stage 1 produces a test whose steps mostly resolve to existing methods | `plan.md` — count rows resolving to a method vs to `GAP-` |
| 2 | Stage 2 exits **0**, ratio comfortably under 0.6 | `gate:gaps --json` — record `ratio`, and also `specSteps`, `steps` and `ratioBasis`. The ratio divides by the spec's Gherkin lines; `steps` (the test's `test.step()` calls) is reported alongside. A large gap between the two is worth a look at `plan.md` even when the gate is green |
| 3 | Stage 2.5 is **not** entered | no `investigation.md` in the run dir |
| 4 | test-creator touched only the test file | scope probe P1 — any `src/po/**` change is a mandate breach |
| 5 | Gaps are real, not discovery failures | probe P4 — no gap satisfiable by a method already in the catalog |
| 6 | po-builder ran, or was correctly skipped on an empty `gaps.json` | stage 3 announcement + `build-report.md` |
| 7 | Every locator cites evidence | `pipeline:audit` `build.evidence` |
| 8 | The test executes, and either passes or fails for a stated reason | `test-run/<n>/exit-code`, `heal-report.md` |
| 9 | The reviewer catches what you independently found | probe P6 |

The most valuable single number this scenario produces is **false gaps** (probe P4): a
gap declared for a method the catalog already had. Each one is a discovery failure and
points at either the test-creator prompt or missing `@aliases` on the existing method —
and it is the failure mode the whole catalog-first design is meant to prevent.

### Optional add-on — the stage 6 probe (fault injection)

Stage 6 otherwise runs only by luck, since a clean run never fails. After a green
`covered` run, exercise it deliberately:

1. Break exactly **one** locator in a page object the test uses — change a role, or a
   single character of an accessible name. Record the file, line, and original text in
   `log.md` first.
2. Re-run stages 5 and 6 only, into a fresh `test-run/<n>/`.
3. Then check: did the healer read the trace before touching the browser? Did it fix the
   **page object** rather than the test? Does `heal-report.md` name the actual root cause
   you injected, rather than a plausible-sounding one? Did it avoid `waitForTimeout` and
   avoid weakening an assertion (probe P5)?
4. **Restore the original line** with `git checkout -- <file>` if the healer did not, and
   say in the report which of the two happened.

A healer that fixes the injected fault but describes it wrongly is a finding: the next
run inherits `heal-report.md`, not the reasoning behind it.

---

## Scenario `bare` — no infrastructure at all

**The selection rule.** A requirement whose `module:` maps to a directory that does not
exist under `src/po/openproject/`. `run-init` maps the module by taking the segment
before the first `-`, `_` or `/` and lowercasing it (`members-roles` → `members`), so
resolve it that way, not by eye.

```bash
grep -h "^module:" specs/product/graph/*.yaml | sort -u
ls src/po/openproject/
```

**Default fixture: `TC-PRJ-002-03`** — the Project Identifier is immutable after
creation. Module `projects`; there is no `src/po/openproject/projects`, and no test under
`tests/ui/projects`. Its steps reach project settings, a surface nothing in the catalog
touches.

Any other `FR-PRJ-*` / `TC-PRJ-*` case satisfies the rule. Prefer one with three or more
steps: the ratio gate divides by the step count, so a two-step spec gives a coarse
signal.

**What is under test:** the stage-2.5 branch, which is the pipeline's answer to the
question "what happens when there is nothing to design against". Everything interesting
here happens between stages 2 and 3.

| # | Expectation | How you know |
|---|---|---|
| 1 | Stage 2 exits **2**, not 1 — the count was right, the ratio was not | exit code, plus ratio ≈ 1.0 in `gate:gaps --json` |
| 2 | The orchestrator branches to 2.5 instead of aborting or pushing to po-builder | stage announcements |
| 3 | `module-investigator` runs and writes `investigation.md` | the file exists and follows the schema in the agent definition |
| 4 | The investigator wrote **no code** | scope probe P1 — it holds no `Edit` tool, so any `src/po/**` change here is a real surprise |
| 5 | It states its evidence basis — source (version-checked) or live DOM | the `Evidence basis:` line under `## Access` |
| 6 | po-builder runs in scaffold mode and creates the module | new files under `src/po/openproject/<module>/`, exported from `internals.ts` |
| 7 | The scaffold is a vocabulary, not a speculative module | method count vs pages mapped; every method is one a test would plausibly call |
| 8 | New POs carry `@aliases` / `@prerequisites` / `@observable-state` | `catalog:report` — `fullyAnnotated` must rise by the number of methods added |
| 9 | The catalog is regenerated **before** stage 1 retries | `npm run catalog` in the stage-2.5 sequence; otherwise the retry cannot see the new vocabulary |
| 10 | Stage 1 re-runs **once**, and the ratio now falls below the threshold | second stage-2 exit code |
| 11 | If the ratio is still high, the run **stops** — investigation budget is one | orchestrator behaviour; a second investigation pass is a finding |
| 12 | Navigation methods chain `waitForLoad()`; no `expect` in a page object | probe P5 |

Two things to watch for specifically, because they are where an unattended run tends to
go wrong:

- **Scaffold sprawl.** po-builder is told to stop where a test-creator would have
  something to write against. Count the methods it produced against the pages the report
  named. A module padded with methods nobody calls is catalog noise that misleads the
  *next* run's discovery.
- **The retry loop.** The expensive failure is a run that investigates, scaffolds,
  retries, still exceeds the ratio, and investigates again. The budget says one pass.
  Verify it holds.

This scenario writes a whole new module into `src/po/`. That is intended, and it is why
every run happens on its own `test-gen/*` branch — which you leave in place.

---

## Scenario `replay` — audit an existing run

No pipeline execution. Given a run id, reconstruct what happened from the evidence:

```bash
npm run pipeline:audit -- --run <run-id>
git log --oneline <base>..test-gen/<run-id>     # if the branch survives
git diff <base>..test-gen/<run-id> --stat
```

Then apply probes P3–P7 to the artifacts and the diff. You lose the timeline, the gate
exit codes and the scope-per-stage attribution — everything that only exists while the
run is happening — so say so in the validity threats. What survives is worth having:
artifact conformance, false gaps, anti-cheat, evidence quality, and reviewer recall.

Use it to check the two existing runs before spending an hour on a live one, and to
re-audit a run cheaply after changing an agent definition.
