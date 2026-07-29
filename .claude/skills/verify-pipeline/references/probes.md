# Probes

Each probe is a command plus what a bad answer means. Run the stage probes **at the
stage boundary**, not afterwards — most of them read state that the next stage destroys.

Probes are the greybox part: none of them opens an agent's context, all of them read what
an agent left behind. Where a probe disagrees with an agent's own report, the probe wins.
That asymmetry is the point.

---

## P1 — Scope: which files did this stage touch?

Run immediately after every agent stage:

```bash
git status --short
git diff --name-only
```

**Snapshot the test file at the stage-1 boundary**, before running anything else. P5's
assertion count needs it and there is no other way to get it later:

```powershell
Copy-Item <testFile> .pipeline/pipeline-tests/<test-id>/stage1-test.snapshot.ts
```

The pipeline never commits, so there is no sha to `git show`, and a brand-new test file is
untracked so it is absent from `git diff <base>` too. Miss this copy and the single most
serious finding this skill can produce — an assertion deleted to turn a failing run green —
has nothing to check against.

Diff against the allowed set for that stage:

| After stage | May change | A change outside it means |
|---|---|---|
| 1 test-creator | the test file, `.pipeline/runs/**` | It authored page objects — the load-bearing constraint of the whole design is broken. **Blocker.** |
| 2.5 investigator | `.pipeline/runs/**` only | It holds no `Edit` tool, so this should be impossible. Investigate the tool grant. |
| 2.5 po-builder (scaffold) | `src/po/**`, `internals.ts`, `pom-catalog/**`, run dir | A test-file change in scaffold mode means it went past its brief. |
| 3 po-builder | `src/po/**`, `internals.ts`, `pom-catalog/**`, the test file, run dir | A change to another test is scope creep. |
| 6 test-healer | `src/po/**`, the test file, run dir | Prefer PO changes; a test-only fix on a locator failure is suspicious — see P5. |
| 7 test-reviewer | the files it says it fixed, run dir | An unreported edit is a finding regardless of whether it was correct. |

Attribution is only possible if the worktree was clean at the start and you probe after
*every* stage. Skip one and every later diff is ambiguous.

---

## P2 — Gate truth: what did the gate actually say?

Record exit codes verbatim, never a paraphrase. For the gap gate, take the numbers:

```bash
npm run gate:gaps -- --run <run-id> --json
```

Capture `count`, `steps`, `ratio`, and `ids`. The ratio is the number that routes the run,
and it is the one number nobody sees unless it is recorded here. `ids` reports the gap ids
declared in `gaps.json` against those written in the test — `missing`, `undeclared`,
`duplicated` — which is the check that counting alone cannot make.

- Exit 1 where you expected 0 → `gaps.json` disagrees with the test file, by count or by
  id: the worklist lies, which breaks po-builder's input.
- Exit 2 in the `covered` scenario → the module is thinner than assumed, or the creator
  deferred steps it could have built. Check P4 before blaming the module.
- Exit 0 in the `bare` scenario → the ratio gate did not fire on a module with no page
  objects. Either the creator invented methods that do not exist (types would catch it)
  or it wrote too few steps. Both are blockers.

Also record whether the orchestrator **read** the exit code correctly. Advancing past a
red gate is a blocker against `gen-test/SKILL.md`, not against the agent.

`npm run pipeline:stage -- --run <run-id> --list` prints the boundaries the orchestrator
recorded, with exit codes. Compare it against what you observed: a stage missing from the
timeline, or recorded `ok` where the gate was red, is a finding in its own right — the
orchestrator's account of the run is the only one a human gets afterwards.

---

## P3 — Artifact conformance

```bash
npm run pipeline:audit -- --run <run-id>
```

Checks the run directory against the handoff contract: artifacts present, `gaps.json`
entries carrying `searched`, one `build-report.md` row per gap, every row's Evidence cell
non-empty, a heal section per re-run.

It parses shape, not meaning. `Evidence: the source` passes. A clean audit means nothing
is *missing*; P4 and P5 are what test whether what is there is any good.

---

## P4 — False gaps: was the catalog really consulted?

The highest-value probe in this skill, and the only one that is manual.

For each entry in `gaps.json`, search the module's catalog file for the terms in
`searched`, and then for the obvious synonyms of the requirement's verb:

```bash
node -e "
const m=require('./pom-catalog/openproject/<module>.json');
const terms=process.argv.slice(1).map(t=>t.toLowerCase());
for (const c of m.classes) for (const x of (c.methods||[])) {
  const hay=[x.name,...(x.aliases||[]),x.description||''].join(' ').toLowerCase();
  if (terms.some(t=>hay.includes(t))) console.log(c.name+'.'+x.name, '::', (x.aliases||[]).join(', '));
}
" filter role status
```

A gap is **false** if an existing method would have satisfied it. Each false gap costs a
po-builder round trip and risks a duplicate method entering the catalog, so classify it:

| Cause | Fix goes in |
|---|---|
| The method exists and its `@aliases` cover the searched terms | `.claude/agents/test-creator.md` — discovery procedure |
| The method exists but its `@aliases` do not cover them | The page object's JSDoc — and note that the *next* run repeats this |
| The method exists in another module's catalog file | test-creator's read order — it opens one `<module>.json` |
| Nothing existed | Not a false gap. Correct behaviour. |

Report the count and the ratio of false to total gaps. Zero is the target and is
achievable; anything above about a third means discovery, not implementation, is the
pipeline's weak stage.

Run the mirror check too: a gap that po-builder implemented on a class **different** from
`likelyClass` is a hint-quality signal, not a defect — `gaps.json` calls it a hint. Count
them; a consistently wrong hint is worth removing from the schema rather than fixing.

---

## P5 — Anti-cheat: was the test weakened to make it green?

Over the full diff, at the end of the run and again after any heal iteration:

```bash
git diff <base-sha> -- tests/ src/po/ | grep -nE "^\+.*(waitForTimeout|networkidle|test\.(skip|fixme|only)|\.only\()"
git diff <base-sha> -- src/po/ | grep -nE "^\+.*expect\("
git diff <base-sha> -- src/po/ | grep -nE "^\+.*return new \w+(Page|Comp)\(this\.page\)"
```

Each hit is a specific documented violation:

- `waitForTimeout` / `networkidle` — the healer's named anti-patterns. A sleep is a
  masked race, and it will fail again on a slower day.
- `test.skip` / `test.fixme` / `.only` — a disabled test reported as a finished run.
- `expect(` under `src/po/` — CLAUDE.md rule 3.
- `return new XPage(this.page)` without a chained `.waitForLoad()` — the navigation rule.
  Check each hit in context; the regex cannot see the next line.

Then the assertion count, which catches the subtler cheat. It compares the final file
against **the snapshot P1 told you to take at the stage-1 boundary** — not against git,
which cannot see it:

```powershell
(Select-String -Path .pipeline/pipeline-tests/<test-id>/stage1-test.snapshot.ts -Pattern 'expect\(' -AllMatches).Count
(Select-String -Path <testFile> -Pattern 'expect\(' -AllMatches).Count
```

A drop between stage 1 and the final file means an assertion was removed after the test
started failing. That is the single most serious finding this skill can produce, because
the run still ends green and every gate stays quiet.

A *rise* is normal and expected: po-builder adds the assertions the gap steps were deferring.
Read the added ones anyway — an assertion added on something trivially true (a URL the page
object's `waitForLoad()` already waited for) inflates the count without testing anything.

---

## P6 — Reviewer recall

Take every violation P1 and P5 found, and check whether `review.md` names it.

| Reviewer result | Means |
|---|---|
| Found it, fixed it, reported it | Working as intended |
| Found and reported, left it for the orchestrator | Fine — check the orchestrator then acted |
| Missed it | A finding against `.claude/agents/test-reviewer.md`, naming the rule it failed to check |
| Reported something you did not detect | Not a false positive by default — verify it, and if real, add it to this file as a new probe |

The last row is how this file grows. A reviewer that catches something the probes do not
is telling you the probe catalog is incomplete.

---

## P7 — Catalog delta

```bash
npm run catalog:report          # before the run, and after
```

Compare `methods` and `fullyAnnotated`. **They must rise by the same number.** Any new
method missing `@aliases` / `@prerequisites` / `@observable-state` is invisible to the
next run's discovery, which manufactures a false gap later — the defect and its
consequence land in different runs, which is why it needs a probe rather than a review.

Also confirm `gate:catalog` is green at the end: a stale catalog means a stage forgot to
regenerate, and the next run starts from a lie.

---

## P8 — Leakage

After every browser-using stage (2.5, 3, 6) and at the end of the run:

```bash
playwright-cli list                                    # expect (no browsers)
```

```powershell
Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*ms-playwright*' }
Get-Process node   -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*playwright test*' }
```

A leaked session holds a browser and breaks the *next* stage, so the symptom usually
appears one stage after the cause. Attribute it to the stage that opened it, not the one
that failed. Contract rule 5 makes this each agent's own responsibility.

---

## P9 — Timing

Wall clock per stage, in `log.md` as you go. It is the only way to answer "where does a
run's cost actually go", and the answer routinely contradicts expectations — a stage that
feels slow is often a stage that produced a lot of visible output.

Note separately any stage that ran long **and** produced little: that is a context-pressure
signal, and the usual remedy is a narrower prompt rather than a bigger budget.

---

## P10 — Claim vs evidence

For each stage, put the agent's final report next to the gate that followed it.

- po-builder reports all gaps implemented, `gate:gaps` finds one → the agent's
  self-assessment is unreliable; the contract already says the gate is the evidence, so
  the finding is about the agent's exit checklist.
- test-healer reports a root cause that the injected fault contradicts (scenario
  `covered`, fault injection) → `heal-report.md` is misleading the next stage.
- module-investigator reports locators it did not verify without saying so → its report is
  a map, and po-builder is told to confirm each one; check that it did.

A stage whose claims survive its gate every time is a stage you can trust with a bigger
job. A stage whose claims regularly do not is one whose prompt needs an explicit
verification step before it may report success — which is a concrete, actionable finding
about a specific file.

---

## P11 — Alias closure: will the next run find what this one built?

P4 asks whether a gap was false *this* run. P11 asks whether it will be false *next* run.

po-builder is told to turn a gap's `searched` terms into `@aliases` on the method it ships,
precisely so the next creator searching those words finds it. When that does not happen, the
next run searches the same terms, finds nothing, and re-declares the same gap — a defect
whose cause and consequence land in **different runs**, which is why it needs a probe rather
than a review.

Report **per searched term**, not per gap. A gap-level "reachable: yes" hides which words
work, and the whole failure mode is one specific word not working.

```bash
node -e "
const gaps=require('./.pipeline/runs/<run-id>/gaps.json');
const cat=require('./pom-catalog/openproject/<module>.json');
const methods=[]; for (const c of cat.classes||[]) for (const m of c.methods||[]) methods.push(m);
for (const g of gaps) {
  console.log('== '+g.id+'  '+(g.requirement||''));
  for (const term of (g.searched||[])) {
    const t=term.toLowerCase();
    const byAlias=methods.filter(m=>[m.name,...(m.aliases||[])].join(' ').toLowerCase().includes(t)).map(m=>m.name);
    const byDesc =methods.filter(m=>(m.description||'').toLowerCase().includes(t)).map(m=>m.name);
    console.log('   '+term.padEnd(18)+' alias: '+(byAlias.join(',')||'-')+'   desc: '+(byDesc.join(',')||'-'));
  }
}"
```

Then read it against `build-report.md`, which says **which method was shipped for which gap**.
The question is not "does some method match" but "does *the method built for this gap* match":

| Result | Means |
|---|---|
| The gap's own method is reachable by an alias | Working as intended. |
| Only *other* methods match the terms | The worse case, and the one a gap-level check misses. The next creator searches, gets a plausible wrong hit, and either declares a false gap anyway or — worse — calls the wrong method. |
| Reachable only via the description | Weak. It works, since the catalog indexes descriptions, but it rests on prose nobody maintains as a search key. `should-fix` against the page object's JSDoc. |
| Reachable by neither | The gap will be re-declared verbatim next run. |

**The matching is substring, so read the hits, do not just count them.** `confirmSaved`
contains both `confirm` and `save`, so a method named for reloading scores as reachable by
the vocabulary of saving. That is a real hit for a grepping creator and a misleading one for
a human — which is precisely why this probe prints names rather than a tally.

This probe exists because a `test-reviewer` found an instance of the middle row unaided
(`reloadFromServer`, run `tc-wp-006`, 2026-07-29) and no probe in this file would have. Per
P6's last row, that is the reviewer telling you the probe catalogue is incomplete — so it
was extended.
