---
name: gen-test
description: Generate a complete, passing UI test from a requirement or test-case specification by orchestrating specialised subagents (test-creator, po-builder, test-healer, test-reviewer) with deterministic gates between stages. Use when the user asks to generate a test from a spec, an FR id, or a TC id — e.g. "/gen-test FR-MEM-001", "generate a test for TC-WP-003-02", "build a test from this spec".
---

# Test-generation pipeline

You are the **orchestrator**. You do not write the test yourself. You run stages, gate them, and report.

`$ARGUMENTS` is the spec reference: an FR id (`FR-MEM-001`), a TC id (`TC-MEM-001-02`), or a path to a markdown spec. If it is empty, ask which spec before doing anything else.

Read [references/gates.md](references/gates.md) for the gate commands and [references/contract.md](references/contract.md) for the artifact schemas. The four agents read the contract themselves — you do not need to explain it to them.

## Why it is split up

One agent doing discovery, browser investigation, PO authoring, test writing, and debugging runs out of context and starts inventing locators. Each stage here gets a fresh context and one job, and a **program** — not the next agent's judgement — decides whether the previous stage succeeded.

The load-bearing constraint: **test-creator has no browser access**. It designs the test from the POM catalog and marks everything missing as a throwing stub. po-builder then fills those stubs with the browser and Rails source in hand. Test design and DOM archaeology never compete for the same context window.

## Running it

Announce each stage and each gate result as you go, so the user sees progress live.

### Stage 0 — preflight

Run the preflight block in [references/gates.md](references/gates.md): `gate:all`, app reachable, `playwright-cli` present, branch created, `pipeline:init`.

Stop and report if the baseline is red or stubs are left over from a previous run. Do not generate on a broken baseline — every failure afterwards becomes unattributable.

Note the run id and run directory; every agent prompt needs the run directory path.

### Stage 1 — test-creator

```
Agent(subagent_type: "test-creator", run_in_background: false)
```

Give it: the run directory path, and nothing else it can read for itself. Tell it to read `.claude/skills/gen-test/references/contract.md` first.

### Stage 2 — gate

```bash
npm run catalog
npm run gate:types
npm run gate:lint
npm run gate:stubs -- --expect <n>    # n = length of stubs.json
```

Type errors here almost always mean a stub signature disagrees with how the test calls it. Give test-creator one repair pass, then abort.

### Stage 3 — po-builder

**Skip entirely if `stubs.json` is an empty array** — say so; it means existing infrastructure covered the whole test, which is the best outcome.

Otherwise spawn `po-builder` with the run directory path.

### Stage 4 — gate

```bash
npm run catalog
npm run gate:stubs        # must be zero now
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
- **Do not let a stage's self-report substitute for a gate.** An agent saying "all stubs implemented" is a claim; `gate:stubs` is the evidence.
- **Report failure plainly.** A run that aborts at stage 4 with a clear reason is more useful than one that limps to a green test by deleting assertions.
- Run agents **sequentially**, not in background — each stage depends on the previous one's files, and browser stages cannot share a session.
