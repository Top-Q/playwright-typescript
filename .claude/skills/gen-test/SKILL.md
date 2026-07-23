---
name: gen-test
description: Generate a complete, passing UI test from a requirement or test-case specification by orchestrating specialised subagents (test-creator, po-builder, test-healer, test-reviewer) with deterministic gates between stages. Use when the user asks to generate a test from a spec, an FR id, or a TC id — e.g. "/gen-test FR-MEM-001", "generate a test for TC-WP-003-02", "build a test from this spec".
---

# Test-generation pipeline

You are the **orchestrator**. You do not write the test yourself. You run stages, gate them, and report.

`$ARGUMENTS` is the spec reference: an FR id (`FR-MEM-001`), a TC id (`TC-MEM-001-02`), or a path to a markdown spec. If it is empty, ask which spec before doing anything else.

Read [references/gates.md](references/gates.md) for the gate commands and [references/contract.md](references/contract.md) for the artifact schemas. The agents read the contract themselves — you do not need to explain it to them, and the same goes for [references/environment.md](references/environment.md) (addresses, credentials, the source checkout), [references/browser.md](references/browser.md) (how to drive the app) and [references/openproject-dom.md](references/openproject-dom.md) (what it renders), which the browser-using agents load from their own instructions.

## Why it is split up

One agent doing discovery, browser investigation, PO authoring, test writing, and debugging runs out of context and starts inventing locators. Each stage here gets a fresh context and one job, and a **program** — not the next agent's judgement — decides whether the previous stage succeeded.

Two load-bearing constraints, both on test-creator:

- **No browser access.** It designs the test from the POM catalog alone, so it cannot resolve a design question by poking at the DOM. Test design and DOM archaeology never compete for the same context window.
- **No page-object authoring.** Every step it cannot build becomes a *gap* — a throw carrying a plain-English requirement and no API. An agent that has never seen the page is in no position to name a method or fix a signature, and a wrong signature is worse than a missing one: it propagates into the test body and every stage after.

po-builder, which has seen the page, designs those APIs and implements them.

## Running it

Announce each stage and each gate result as you go, so the user sees progress live.

### Stage 0 — preflight

Run the preflight block in [references/gates.md](references/gates.md): `gate:all`, app reachable, `playwright-cli` present, branch created, `pipeline:init`.

Stop and report if the baseline is red or gaps are left over from a previous run. Do not generate on a broken baseline — every failure afterwards becomes unattributable.

Note the run id and run directory; every agent prompt needs the run directory path.

### Stage 1 — test-creator

```
Agent(subagent_type: "test-creator", run_in_background: false)
```

Give it: the run directory path, and nothing else it can read for itself. Tell it to read `.claude/skills/gen-test/references/contract.md` first.

### Stage 2 — gate

```bash
npm run gate:types
npm run gate:lint
npm run gate:gaps -- --file <testFile> --expect <n> --ratio-max 0.6   # n = length of gaps.json
```

Do **not** run `npm run catalog` here. test-creator touches only the test file, so a catalog change at this point means it exceeded its scope — worth reporting, not silently absorbing.

Read the exit code, because the two failures mean opposite things:

- **Exit 1** — the gap count disagrees with `gaps.json`, or types/lint are red. The worklist lies or the test does not compile. One repair pass by test-creator, then abort.
- **Exit 2** — the count was right, but too much of the test is gaps. Go to stage 2.5.

### Stage 2.5 — investigate (only on exit 2)

The catalog covered too little of this module for the test to be a design rather than a restatement of the spec. Do not push on to po-builder: it would be handed a whole module to invent in one pass, which is the monolith this pipeline exists to avoid.

Instead:

1. Spawn `module-investigator` with `module` from `run.json` and an output path of
   `.pipeline/runs/<run-id>/investigation.md`. It maps the module and writes the report;
   it does not write code.
2. Spawn `po-builder` in **scaffold mode** — give it the report path and say there is no
   `gaps.json`. It builds enough of the module for a test to be designed against.
3. `npm run catalog` — the new vocabulary has to be in the catalog or stage 1 cannot see it.
4. Re-run stage 1 and stage 2.

Both are agents, not work you do yourself. Scaffolding page objects in *your* context
would put module archaeology into the one context that has to survive all eight stages.

**Budget: one investigation pass.** If the ratio is still over the threshold afterwards, stop and report. A module that needs investigating twice needs a human.

### Stage 3 — po-builder

**Skip entirely if `gaps.json` is an empty array** — say so; it means existing infrastructure covered the whole test, which is the best outcome.

Otherwise spawn `po-builder` with the run directory path. It designs the API for each gap, implements it, and replaces the gap's throw in the test with the real call.

### Stage 4 — gate

```bash
npm run catalog
npm run gate:gaps         # must be zero now
npm run gate:types
npm run gate:lint
```

### Stage 5 — execute

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test <testFile> --reporter=list
```

`<testFile>` comes from `testFile` in `run.json` (falling back to `suggestedTestFile`). Capture stdout and the exit code into `test-run/1/`.

### Stage 6 — heal loop, max 3 iterations

While the test fails and the budget is not spent: spawn `test-healer` with the run directory and the attempt number, then re-run stage 5 into `test-run/<n+1>/`.

If the budget is exhausted, **stop**. Report the remaining failure honestly. Do not weaken the test to close out the run, and do not let an agent do so on your behalf — check the diff.

### Stage 7 — test-reviewer

Spawn `test-reviewer` with the run directory. Apply its `blocker` findings, surface the rest.

### Stage 8 — finalize

```bash
npm run catalog && npm run gate:all
npm run pipeline:report -- --run <run-id>
playwright-cli close-all
```

Then report to the user: the test file, whether it passes, what infrastructure was added, how many heal iterations it took, the branch name, and anything the reviewer flagged.

## Rules

- **Never commit, push, or delete the branch.** The branch is left in place for the user; cleanup is their call.
- **Do not skip a red gate.** If you find yourself wanting to, the honest move is to stop and report.
- **Do not let a stage's self-report substitute for a gate.** An agent saying "all gaps implemented" is a claim; `gate:gaps` is the evidence.
- **Report failure plainly.** A run that aborts at stage 4 with a clear reason is more useful than one that limps to a green test by deleting assertions.
- Run agents **sequentially**, not in background — each stage depends on the previous one's files, and browser stages cannot share a session.
