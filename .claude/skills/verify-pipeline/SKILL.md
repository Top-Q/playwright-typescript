---
name: verify-pipeline
description: Greybox-test the /gen-test pipeline itself. Runs it end to end against a chosen scenario — a module that already has page objects, or one with none at all — observing every stage boundary, gate exit code and artifact, then reports how the pipeline behaved and what to change in it. Use when asked to test, validate, audit or improve the test-generation pipeline, not to generate a test.
---

# Verifying the test-generation pipeline

You are testing **the pipeline**, not the application and not the test it produces.

That distinction decides every judgement call in this skill. A generated test that
fails against OpenProject may be a perfectly correct pipeline outcome — the pipeline's
job is to reach a truthful result, not a green one. Conversely a green test proves
almost nothing on its own: it could have been produced by an agent that guessed a
locator and got lucky, and that is a defect this skill exists to catch.

## Why greybox

The pipeline's stage boundaries are already externalised: every handoff is a file under
`.pipeline/runs/<run-id>/`, every gate is a command with an exit code, and every stage's
effect on the repo is a git diff. So you can observe the machinery precisely without
instrumenting anything.

What stays opaque is each agent's reasoning — you never see a subagent's context, and
its final report is lossy by design. That is the grey part, and it is where the
interesting findings live: **an agent's claim and its artifact can disagree**, and only
the artifact and the diff are evidence.

## Modes

`$ARGUMENTS` selects the scenario. If empty, ask which one before doing anything.

| Mode | Exercises | Cost |
|---|---|---|
| `covered` | The normal path against a module that already has page objects — discovery, a few gaps, po-builder, execute, review | Moderate |
| `bare` | The stage-2.5 branch against a module with no page objects at all — ratio gate exit 2, module-investigator, po-builder scaffold mode, stage-1 retry | High — it builds a module |
| `both` | `covered` then `bare`, each on its own branch, one report covering both | Highest |
| `replay <run-id>` | No pipeline run at all: audits an existing run directory and its diff after the fact | Minutes |

Fixture selection and the per-stage expectations for each scenario are in
[references/scenarios.md](references/scenarios.md). The observations to take, and what
each one means when it comes back wrong, are in [references/probes.md](references/probes.md).
Read both before starting. You will also need
[`../gen-test/references/gates.md`](../gen-test/references/gates.md) and
[`../gen-test/references/contract.md`](../gen-test/references/contract.md), since half of
what you are checking is whether the pipeline obeyed its own contract.

## Where your artifacts go

```
.pipeline/pipeline-tests/<test-id>/
├── log.md          # the observation log — appended live, during the run
├── audit-<run>.json
└── report.md       # the deliverable
```

`<test-id>` is `<mode>-<yyyy-mm-dd-hh-mm>`. `.pipeline/` is gitignored.

**Append to `log.md` as each stage ends, before you interpret anything.** Two reasons,
and both have teeth: a `bare` run is long enough that your context may be compacted
partway through, and an observation written after you have formed an opinion about the
run is not an observation.

## Procedure

### 1. Preconditions

```bash
git status --short          # MUST be empty
git rev-parse --abbrev-ref HEAD
npm run gate:all
```

A dirty worktree makes every scope probe meaningless, because you cannot attribute a
changed file to a stage. Stop and say so rather than working around it. A red
`gate:all` is equally disqualifying — the pipeline's own preflight would refuse too.

Record the baseline in `log.md`: base branch, HEAD sha, `npm run catalog:report` output,
and the module directories under `src/po/openproject/`.

### 2. Pick the fixture

Follow the selection rule in [scenarios.md](references/scenarios.md) rather than reusing
a spec that has already been generated — a spec whose test already exists measures
nothing. Record which spec you chose and why it fits the scenario.

### 3. Run the pipeline, probing between stages

Invoke `/gen-test <spec-ref>` and act as its orchestrator, following
[`../gen-test/SKILL.md`](../gen-test/SKILL.md) **exactly as written**. Then, at every
stage boundary, run the probe block for that stage from
[probes.md](references/probes.md) and append the result to `log.md`.

Three rules govern this, and the whole exercise is worthless without them:

- **Do not help the agents.** If a prompt is ambiguous and a stage is heading for
  failure, let it fail. The ambiguity is the finding; a nudge from you erases it and
  makes the run untestable.
- **Do not fix pipeline defects mid-run.** Note them and keep going. Editing
  `.claude/agents/*.md` mid-run would not even take effect — agent definitions are read
  once at session start — so it only corrupts the observation.
- **Follow the orchestrator's rules, including the ones you would rather skip.** If a
  gate is red, stop where the pipeline says to stop. A run you rescued past a red gate
  tells you nothing about what the pipeline does unattended.

### 4. Post-run probes

```bash
npm run pipeline:audit -- --run <run-id> --json > .pipeline/pipeline-tests/<test-id>/audit-<run-id>.json
npm run pipeline:audit -- --run <run-id>
npm run catalog:report
git diff --stat <base-sha>
```

`pipeline:audit` checks the run directory against the handoff contract — artifacts
present, gaps carrying `searched`, every `build-report.md` row citing evidence. It reads
shape, not meaning, so treat a clean audit as "nothing is missing", never as "the
locators are sound".

Then run the post-run probes P4–P10 from [probes.md](references/probes.md): false gaps,
anti-cheat greps over the final diff, reviewer recall, catalog metadata delta, and
browser-session leakage.

### 5. Report

Write `report.md` with these sections, in this order:

1. **Verdict** — one paragraph per scenario: did the pipeline behave the way its own
   documentation says it does? Name the divergences, not the successes.
2. **Timeline** — stage, wall clock, gate exit code, artifact written. This is where the
   run's cost actually went, and it is usually the most surprising table in the report.
3. **Expectations vs observed** — the scenario's table from scenarios.md with an observed
   column. Every row is met, missed, or not reached.
4. **Audit** — `pipeline:audit` output, plus anything it could not see.
5. **Findings** — ranked `blocker` / `should-fix` / `nit`. Every finding names **the file
   to change** (`.claude/agents/<x>.md`, a reference doc, or a script) and the specific
   edit. A finding that does not name a file is an observation, so file it under 2 or 3
   instead.
6. **Metrics** — gaps declared, false gaps, heal iterations, ratio at stage 2, methods
   added, annotation coverage delta.
7. **Validity threats** — what this run cannot tell you. Always includes: n=1; you were
   both orchestrator and observer, so your instrumentation shares a context window with
   the thing measured; and the app's state drifts between runs.

Classify every finding as a defect in **the pipeline**, **the application**, or **the
spec**. They are routinely confused, and only the first is in scope for this skill —
name the other two and move on.

## Rules

- **Never commit, push, or delete a branch or a run directory.** The `test-gen/*` branch
  and `.pipeline/runs/<id>/` are the evidence for your report.
- **Do not repair the pipeline in the same session that tested it.** Report first. If the
  user then asks for fixes, apply them and note that a re-test needs a Claude Code
  restart to pick up changed agent definitions.
- **Quote exit codes and file paths, not impressions.** "Stage 2 exited 2 with ratio 1.00
  on 5 steps" is a finding; "the creator struggled" is not.
- **Say when a stage never ran.** A stage that was skipped is not a stage that passed,
  and a report that blurs the two is worse than no report.
