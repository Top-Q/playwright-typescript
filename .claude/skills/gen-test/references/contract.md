# Pipeline handoff contract

Every `/gen-test` stage runs in its own subagent with its own context. Subagents cannot see each other's conversation, and a subagent's final report is **not** shown to the user. Files under the run directory are therefore the only durable state. If it is not written to a file, the next stage does not know it.

**Every agent's first two actions:** read this file, then read `run.json` at the run directory path given in your prompt.

## Run directory

```
.pipeline/runs/<run-id>/
├── run.json           # the run record (run-init writes; orchestrator updates status)
├── spec.md            # normalised Given/When/Then spec (run-init)
├── plan.md            # step -> method mapping (test-creator)
├── gaps.json          # worklist of unimplemented steps (test-creator)
├── investigation.md   # module map, stage 2.5 only (module-investigator)
├── build-report.md    # what po-builder implemented, and on what evidence
├── heal-report.md     # root cause + fix per heal iteration (test-healer)
├── review.md          # compliance findings (test-reviewer)
├── summary.md         # aggregate (npm run pipeline:report)
└── test-run/<n>/      # one directory per execution attempt
    ├── stdout.txt
    └── exit-code
```

`.pipeline/` is gitignored. Nothing in it is a deliverable — the deliverables are the test file and page objects in the repo proper.

## Artifacts

### `run.json` — written by `run-init`, read by everyone

```jsonc
{
  "runId": "tc-mem-001-02-2026-07-22-09-46-16",
  "specRef": "TC-MEM-001-02",
  "specKind": "test-case",              // "requirement" | "test-case" | "markdown"
  "sourceFile": "requirements/graph/FR-MEM-001.yaml",
  "specPath": ".pipeline/runs/<run-id>/spec.md",
  "module": "members",                  // maps to src/po/openproject/<module> and tests/ui/<module>
  "suggestedTestFile": "tests/ui/members/invite-a-new-user-by-email.spec.ts",
  "testCaseIds": ["TC-MEM-001-02"],
  "branch": "test-gen/tc-mem-001-02",
  "createdAt": "2026-07-22T09:46:16.347Z",
  "status": "initialised",
  "stages": []
}
```

`suggestedTestFile` is a suggestion. If the test-creator picks a different path it **must** write the real path back into `run.json` as `testFile`, because every later stage runs the test from that value.

### `plan.md` — written by `test-creator`, read by `test-reviewer`

One row per Gherkin line in `spec.md`. This is the audit trail for whether the catalog was actually consulted:

```markdown
# Plan — TC-MEM-001-02

| # | Gherkin step | Resolution |
|---|---|---|
| 1 | Given logged in as a Project Manager | fixture `readyOverviewPage` |
| 2 | When click 'Add member' | `MembersPage.openAddMemberForm()` |
| 3 | And enter an external email address | `MembersPage.addMember(email, role)` |
| 4 | Then member appears with Status 'Invited' | `MemberTableRowComp.getStatus()` |
| 5 | And a confirmation banner is shown | `GAP-1` |

## Gaps declared
| Gap | Searched for | Why what I found was insufficient |
|---|---|---|
| GAP-1 | `flash`, `banner`, `notification`, `successMessage` | `members.json` has `hasMemberWithName` (row presence) and nothing covering the flash region |

## Notes
<Anything the next stage needs: assumptions, ambiguity in the spec, data constraints.>
```

Every gap row must name what you searched for and why what you found was insufficient. "Nothing existed" is not an acceptable justification — the catalog has `@aliases` precisely so that intent-level searching works.

### `gaps.json` — written by `test-creator`, read by `po-builder`

A gap is a **requirement without an API**. The creator has never seen the page, so it does not name the method, choose parameters, or fix a return type — po-builder decides all of that:

```jsonc
[
  {
    "id": "GAP-1",
    "step": "Then a confirmation banner is shown",
    "requirement": "Read the confirmation banner shown after a successful invite",
    "observable": "The banner text, for the test to assert on",
    "likelyClass": "MembersPage",          // a hint, not an instruction
    "likelyFile": "src/po/openproject/members/membersPage.ts",
    "classExists": true,
    "searched": ["flash", "banner", "notification", "successMessage"],
    "reason": "No accessor exists for the post-invite flash region"
  }
]
```

`searched` is load-bearing in both directions: the reviewer uses it to check the catalog was really consulted, and po-builder turns it into `@aliases` on the new method so the *next* run finds it instead of declaring the same gap again.

Each `id` must appear exactly once in the test file as `throw new Error('GAP-1: …')`. The gate compares the two, so a gap in one and not the other fails the run.

An empty array is a valid and good outcome: it means the test was built entirely from existing infrastructure, and the orchestrator skips the po-builder stage.

### `investigation.md` — written by `module-investigator`, read by `po-builder`

Stage 2.5 only, when the ratio gate found the module too thinly covered to design
against. A map of the module: its pages and URL patterns, the element that proves each
is loaded, its components, and the sidebar entry — every locator citing a source path
or a snapshot ref. The report's own schema lives in the agent definition.

It is a map, not evidence. po-builder confirms each locator before shipping it.

### `build-report.md` — written by `po-builder`, read by `test-healer` and `test-reviewer`

One row per gap, naming the API po-builder chose and the **evidence** the locator came from. A row without evidence is a guessed locator, which is the specific failure this pipeline exists to prevent:

```markdown
# Build report — <run-id>

| Gap | Method designed | Locator | Evidence |
|---|---|---|---|
| GAP-1 | `MembersPage.getFlashBanner(): Locator` | `getByRole('alert')` scoped to `#content` | snapshot `.playwright-cli/page-<ts>.yml` ref e42 |
| GAP-2 | `ProjectSettingsPage.clickModulesTab(): Promise<ModulesPage>` | `getByRole('link', { name: 'Modules' })` | `modules/.../menus.rb` + `config/locales/en.yml:project_module_*` |

## API notes
<Why a method landed on a different class than gaps.json suggested, or took a
different shape than the gap text implied. The creator could not see the page;
say what it would have got wrong.>

## Unresolved
<Any gap left throwing, and why. This blocks the run - the gap gate will fail.>
```

### `heal-report.md` — appended to by `test-healer`, one section per iteration

```markdown
## Iteration 1

- **Failure:** `TimeoutError` waiting for `getByRole('button', { name: 'Add' })` at membersPage.ts:88
- **Root cause:** the button is an `<a title="Add">`, not a button — the ARIA snapshot shows `link "Add"`
- **Fix:** `src/po/openproject/members/membersPage.ts:88` — `getByRole('button')` -> `getByRole('link')`
- **Evidence:** snapshot ref e17 after attaching at the paused test
- **Confidence:** high — matches the known OpenProject pattern of `<a>` action links
```

### `review.md` — written by `test-reviewer`

Severity-ranked findings against CLAUDE.md. `blocker` / `should-fix` / `nit`, each with `file:line`, what rule it violates, and whether the reviewer fixed it or left it.

## Rules that bind every stage

1. **Write your artifact before you finish**, even if your stage failed. A missing artifact is indistinguishable from a crashed agent.
2. **Never edit another stage's artifact.** Append to your own; read the others.
3. **Report file paths, not summaries**, in your final message to the orchestrator — it needs to know what to gate, not what you thought.
4. **Leave the repo compiling.** Every stage ends with `npx eslint <touched files>` clean and no type errors, because the orchestrator gates on exactly that before advancing.
5. **Stop what you started.** If you launched a background `playwright test --debug=cli`, kill it before you return. A leaked debug session holds a browser and a port and will break the next stage.
