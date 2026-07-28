# OpenProject Playwright E2E Automation

## Domain Context

OpenProject is a web-based project management platform with modules such as:

- **Projects** containing boards, timelines, and work packages.
- **Work Packages** (tasks, milestones) with workflows, statuses, and assignments.
- **Boards** for agile task management.
- **Members** and **Roles** to manage permissions.
- **Administration** for system configuration.

Tests simulate an **admin** user logged into the **Demo Project**.

- UI: `http://localhost:8090`
- API: `http://localhost:8080` (docs at `http://localhost:8080/api/docs`)

## Project Structure

```
<project-root>/
├── src/po/openproject/           # Page objects and components
│   ├── basePage.ts               # Abstract base for all pages
│   ├── baseComponent.ts          # Abstract base for all components
│   ├── general/                  # Login, home, overview, main menu, project selection
│   ├── workpackage/              # Work package pages and components
│   └── board/                    # Board pages and components
├── src/api/                      # Fluent API client (OpenProjectClient)
├── tests/
│   ├── ui/                       # UI test specs + fixtures.ts
│   └── api/                      # API test specs + fixtures.ts
├── .claude/skills/gen-test/      # The test-generation pipeline, self-contained
│   ├── SKILL.md                  # Orchestration
│   ├── references/               # Contract, gates, environment, DOM facts
│   └── scripts/                  # Its TypeScript, run through the npm aliases
├── scripts/                      # Repo tooling not owned by a skill (POM catalog)
├── internals.ts                  # Central barrel export — ALL imports go through here
├── playwright.config.ts
├── eslint.config.mjs             # ESLint v9 flat config
└── .env                          # Environment variables (base URL, API key, project ID)
```

## Naming Conventions

| Category            | Convention                 | Example                               |
| ------------------- | -------------------------- | ------------------------------------- |
| Page Object classes | PascalCase                 | `WorkPackagesPage`                    |
| Page Object files   | camelCase                  | `workPackagesPage.ts`                 |
| Component classes   | PascalCase + `Comp` suffix | `MainMenuComp`                        |
| Test files          | kebab-case + `.spec.ts`    | `work-packages-crud.spec.ts`          |
| Test tags           | `@` prefix                 | `@ui`, `@api`, `@regression`, `@task` |

## Architecture Rules (always apply)

1. All page objects extend `BasePage<T>` with own type as generic parameter
2. All components extend `BaseComponent<T>`, scoped to `rootComponent` locator
3. Assertions belong in tests only — page objects never import `expect`
4. All PO/component imports go through `internals.ts` — every new PO/component must be exported there. Standalone utilities are imported directly from their source file, to avoid barrel re-export type resolution issues in the IDE.
5. Use Playwright fixtures for test setup (not `beforeEach`)
6. Use `test.step()` with Given/When/Then BDD structure
7. Locators use `.describe()` for trace clarity
8. Locators are `private readonly`, exposed via getter methods
9. Prefer `getByRole()` > `getByLabel()` > `getByText()` > `getByTestId()` > CSS
10. Navigation methods return the destination page object (fluent pattern)
11. Every page/component implements `waitForLoad()`
12. Every public page-object method carries `@aliases`, `@prerequisites`, and `@observable-state` JSDoc tags (see [POM Catalog](#pom-catalog)). Regenerate the catalog after adding or changing methods.

## Coding Standards

- **Read class and method comments** in page objects before using them
- TypeScript strict mode — no `any` or `unknown` for page objects
- ESLint v9 + Prettier enforced
- No floating promises (`@typescript-eslint/no-floating-promises: error`)
- All async functions must use `await`
- **After generating or modifying any code, always run `npx eslint <file>` and fix all errors before finishing**

## Test Isolation

Tests must be runnable in isolation and not depend on side effects from other tests. Never assume test execution order. If a test deletes an entity, it must first create that entity within the same test.

## Debugging Utilities

To see what a page actually renders, drive the live app with `playwright-cli` — the
three recipes are in
[`.claude/skills/gen-test/references/browser.md`](.claude/skills/gen-test/references/browser.md).
`playwright-cli snapshot` gives the ARIA tree **with element refs**, which
`generate-locator` then turns into a real locator.

For a test that already failed, read its trace instead of re-running anything:
`playwright.config.ts` sets `trace: 'on'`, so every run records a DOM snapshot and a
screenshot for every action. The `playwright-trace` skill reads it from the command line.

## POM Catalog

A committed, greppable index of every page object and its methods, so agents (and humans) discover what already exists before writing new page objects — avoiding duplicate methods and reinvented locators. **Consult it first when writing a test.**

- **Location:** `pom-catalog/<app>/` — `index.json` (class-level overview) plus one `<module>.json` per module holding the methods.
- **Read order:** start with `index.json` to find the right class by name or `@aliases`, then open only the relevant `<module>.json` for its method signatures and metadata. The index deliberately carries no method-level data so it stays small as the project grows.
- **Purpose:** it serves _test writing_ (discovery). The catalog contains only public methods and only what you need to pick and call one — it is not a substitute for reading the page-object source when filling in or extending a class.

### Commands

| Command                  | Does                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `npm run catalog`        | Regenerate the catalog from `src/po/`. Run after adding or changing any page-object method. |
| `npm run catalog:check`  | Fail (exit 1) if the committed catalog is stale — the freshness gate.                       |
| `npm run catalog:report` | Print per-module metadata coverage.                                                         |

### Method metadata tags

Write these on **every public page-object method**. They are what make the catalog searchable by intent rather than exact name.

| Tag                 | Answers                                                    | Example                                                    |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `@aliases`          | Other names someone might search by (2–4, comma-separated) | `@aliases addMember, inviteUser, createMember`             |
| `@prerequisites`    | What must be true before calling — state, not narrative    | `@prerequisites The add-member form is open`               |
| `@observable-state` | What a test could assert after calling                     | `@observable-state A new row appears in the members table` |

Classes additionally take a class-level `@aliases`. The leading comment text becomes the description; standard `@param` / `@returns` / `@deprecated` are recognized. Example:

```typescript
/**
 * Adds a member to the project by searching for a user name or email.
 *
 * @aliases addMemberToProject, inviteUser, createMember
 * @prerequisites The Members page is open
 * @observable-state A new row appears in the members table; a success flash is shown
 * @param userNameOrEmail - The name or email to search for.
 * @param role - The role to assign. Defaults to 'Member'.
 */
async addMember(userNameOrEmail: string, role: string = 'Member'): Promise<void> { ... }
```

`waitForLoad()` and non-public methods are excluded from the catalog automatically — do not tag them for coverage.

## Test-Generation Pipeline

`/gen-test <spec-ref>` generates a complete, passing UI test from a specification by running specialised subagents with deterministic gates between them. `<spec-ref>` is an FR id (`FR-MEM-001`), a TC id (`TC-MEM-001-02`), or a path to a markdown spec.

| Stage | Agent           | Does                                                                                                |
| ----- | --------------- | --------------------------------------------------------------------------------------------------- |
| 1     | `test-creator`  | Spec → test file, using **only** the POM catalog. No browser, no PO authoring. Unbuildable steps become gaps. |
| 2.5   | `module-investigator` | Only when the gap ratio is too high — maps the module to a report, then `po-builder` scaffolds from it and stage 1 retries once. Read-only: it writes a report, never code. |
| 3     | `po-builder`    | Designs the API for each gap and implements it, deriving locators from Rails source and the live DOM. |
| 6     | `test-healer`   | Diagnoses failures from the trace and the live app; minimal fixes only.                             |
| 7     | `test-reviewer` | Architecture compliance **and** whether the test actually covers the spec.                          |

The pipeline works on a `test-gen/<run-id>` branch and never commits, pushes, or deletes it. Run artifacts go to `.pipeline/runs/<run-id>/` (gitignored); the handoff contract is [`.claude/skills/gen-test/references/contract.md`](.claude/skills/gen-test/references/contract.md).

Why the split: one agent doing discovery, browser investigation, PO authoring, and debugging runs out of context and starts inventing locators. Keeping test design (catalog-only) apart from DOM investigation (browser) is the core constraint.

### Gaps

A **gap** is a test step the creator could not build from the catalog. It is the whole step body, and it names a requirement rather than an API:

```typescript
await test.step('When the user changes the role to Reader', async () => {
    throw new Error('GAP-3: change this member row role to a given value');
});
```

test-creator does not name the method, choose parameters, or edit anything under `src/po/` — it has never seen the page, and a wrong signature costs more than a missing one because it propagates into the test body. po-builder decides the API and replaces the throw.

Gaps are counted two ways. **How many remain** is completeness — `n` after stage 1, zero after stage 3. **What fraction of the test's steps they are** is a different signal: near 1.0 means the catalog covered this module too thinly for the test to be a design at all, so the run is routed to investigation (exit code 2) instead of handing po-builder a whole module to invent at once.

**Agent definitions in `.claude/agents/` are read once, at session start.** After adding or editing one, restart Claude Code before running the pipeline — otherwise the stage fails with `Agent type '<name>' not found`, listing only the built-in agents.

**Browser investigation has two recipes**, both in [`.claude/skills/gen-test/references/browser.md`](.claude/skills/gen-test/references/browser.md):

- `npx playwright test <file>:<line> --debug=cli` + `playwright-cli attach tw-XXXX` — pauses a real test; `step-over` to drive it, then `goto`/`snapshot` anywhere. Target **one** test: given a whole file the second one dies with `browser.bind: Server is already started`. With no relevant test, attach to `tests/seed.spec.ts` (login fixture, no side effects) and step four times. **Requires Playwright ≥ 1.59**; the project ran 1.56.1 until 2026-07-23, which is why older notes call this flag non-existent.
- `playwright-cli open` + manual login — only for deliberately logged-out state.

**`pause-at` does not work** (verified 2026-07-23 on Playwright 1.61.1 / `playwright-cli` 0.1.17). All four target forms tried — test line, page-object line, forward and backslash paths — behaved as `resume`: no error, no pause, test ran to completion. It **fails open**, so "pause before the destructive step" instead executes it. Use `step-over`. The CDP-holder recipe that existed to work around `--debug=cli` was removed once stepping was shown to cover it with a one-command teardown.

**What you will find once you are looking** is a separate file: [`references/openproject-dom.md`](.claude/skills/gen-test/references/openproject-dom.md) — the DOM facts that have already cost this project a run each (icon-font glyphs in accessible names, ng-select panels escaping their form, `waitForLoadState('load')` being a no-op after submit, members pagination). Both `po-builder` and `test-healer` read it unconditionally. Keep it separate from `browser.md`: tooling mechanics churn with every Playwright upgrade, these facts do not.

**Where this instance lives** is a third file: [`references/environment.md`](.claude/skills/gen-test/references/environment.md) — UI on `:8090` and API on `:8080` (`.env`'s unqualified `OPENPROJECT_BASE_URL` is the API one, which has misled before), the admin credentials, and the Rails checkout with the version check that must pass before its locators count as evidence. Agents cite this instead of hardcoding addresses. Pointing the pipeline at another instance — or another application — means rewriting this file and `openproject-dom.md`, and nothing else.

### Gates

| Command                | Asserts                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run gate:catalog` | POM catalog matches `src/po/`                                        |
| `npm run gate:types`   | `tsc --noEmit` clean                                                 |
| `npm run gate:lint`    | `eslint .` has no errors                                             |
| `npm run gate:gaps`    | No `GAP-` markers remain (`-- --run latest` derives the file, the expected count and the declared ids from the run record; `--ratio-max <r>` bounds the gap ratio, exit 2 if exceeded) |
| `npm run gate:all`     | All of the above                                                     |

Gates check the repository. `npm run pipeline:audit -- --run <run-id>` checks the **run record** — that every gap carries what was searched for, that every `build-report.md` row cites evidence, that no artifact is missing. It reads shape, not meaning, so a clean audit means nothing is missing, not that the locators are sound.

### Pipeline commands

**On PowerShell, run these as `npm.cmd run …`, not `npm run …`.** `npm` resolves to `npm.ps1`, a PowerShell script, so the parameter binder swallows `--` and every `--flag` before npm sees them: `npm run pipeline:preflight -- --spec TC-MEM-009-01` reaches the script as `preflight.ts TC-MEM-009-01`. `npm.cmd` is a batch file — a real native command — and passes the flags through verbatim. Quoting every token (`npm run pipeline:preflight '--' '--spec' 'TC-MEM-009-01'`) also works. Value-taking flags fail loudly when eaten; **boolean flags fail silently** (`-- --kill` becomes report-only, `--json` yields text), which is the reason for the rule. Full explanation in [`references/gates.md`](.claude/skills/gen-test/references/gates.md).

Everything deterministic about running the pipeline is a script, so the orchestrator spends its context on judgement rather than on retyping shell:

| Command                    | Does                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `npm run pipeline:preflight -- --spec <ref>` | Stage 0 whole: gates, app reachability, `playwright-cli`, run branch, run directory. Changes nothing until every check passes. |
| `npm run pipeline:test-run` | Stage 5: runs the run's test into the next `test-run/<n>/`, writing `stdout.txt` and `exit-code`, and exits with the test's exit code. |
| `npm run pipeline:stage -- --stage <name> --status <ok\|fail\|skip>` | Records a stage boundary in `run.json`; `--list` prints the timeline. |
| `npm run pipeline:set -- --test-file <path>` | Records where the test actually landed, validated, instead of hand-editing `run.json`. |
| `npm run pipeline:cleanup [-- --kill]` | Closes `playwright-cli` sessions; reports (and with `--kill`, terminates) leaked `--debug=cli` runs. |
| `npm run pipeline:report -- --run <id>` | Collapses the run directory into `summary.md`. |

The pipeline runs on Windows/PowerShell, which is why these exist as scripts rather than as command lines in a document: `curl -o /dev/null` and `VAR=x cmd` are both silently wrong here, and a gap count transcribed by eye is wrong occasionally, which is worse.

They live in **`.claude/skills/gen-test/scripts/`**, as assets of the skill they serve, so the pipeline is one folder: instructions, references and code together. Only `package.json`'s aliases point at them, and only `tsconfig.json` and `eslint.config.mjs` need to know where they are — both are extended to cover that directory, because the pipeline's own code must stay under the same gates it enforces on generated tests.

### Testing the pipeline itself

`/verify-pipeline covered|bare|both|replay <run-id>` runs the pipeline end to end as a greybox test and reports how it behaved. `covered` exercises the normal path against a module that already has page objects; `bare` exercises the stage-2.5 branch against one with none. It observes every stage boundary, gate exit code and git diff, then reports findings against the pipeline's own files — never against the application. Re-testing after changing an agent definition needs a Claude Code restart.

## Skills & Commands

- `/gen-test <spec-ref>` — the full pipeline above; the normal way to create a test
- `/verify-pipeline <scenario>` — greybox-test the pipeline itself and report improvements
- **Write web test** skill — single-shot manual test writing, when you don't want the pipeline
- **Write api test** skill — generate API tests
- `/heal-test <test name>` — run a test, diagnose failures, apply minimal fixes

## Environment
This machine is Windows. Use PowerShell/Windows path conventions (`C:\...`) for all shell commands, config files, and scripts. 
Do NOT assume bash, `~/.bashrc`, `~/.zshrc`, or POSIX-only tooling. 
When writing Python that shells out or handles paths, use `pathlib` and avoid MSYS-style `/c/...` paths.

## Python / uv'
This project uses `uv`. Do not run `uv add`. Add dependencies by editing `pyproject.toml` directly, then run `uv sync`.