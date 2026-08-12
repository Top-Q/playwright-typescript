# OpenProject Playwright E2E Automation

## Domain Context

OpenProject is a web-based project management platform: **projects** contain **work packages**
(tasks, milestones) with workflows, statuses and assignments, organised on **boards**, with
**members** and **roles** controlling permissions, and an **administration** area for configuration.

Tests simulate an **admin** user logged into the **Demo Project**.

- UI: `http://localhost:8090`
- API: `http://localhost:8080` (docs at `http://localhost:8080/api/docs`)

Note `.env`'s unqualified `OPENPROJECT_BASE_URL` is the **API** one, which has misled before. Full
addresses, credentials and the Rails source checkout:
[`.claude/skills/gen-test/references/environment.md`](.claude/skills/gen-test/references/environment.md).

## Project Structure

```
<project-root>/
├── src/po/openproject/     # Page objects and components (basePage.ts, baseComponent.ts, per-module dirs)
├── src/api/                # Fluent API client (OpenProjectClient)
├── tests/ui/, tests/api/   # Test specs + fixtures.ts
├── pom-catalog/            # Generated index of every page object and method
├── .claude/skills/         # Skills, each self-contained: SKILL.md + references/ + scripts/
├── scripts/                # Repo tooling not owned by a skill (POM catalog generator)
├── specs/                  # Specifications for the app under test — see specs/README.md
├── internals.ts            # Central barrel export — ALL PO/component imports go through here
├── playwright.config.ts
├── eslint.config.mjs       # ESLint v9 flat config
└── .env                    # Base URL, API key, project ID
```

## Naming Conventions

| Category            | Convention                 | Example                               |
| ------------------- | -------------------------- | ------------------------------------- |
| Page Object classes | PascalCase                 | `WorkPackagesPage`                    |
| Page Object files   | camelCase                  | `workPackagesPage.ts`                 |
| Component classes   | PascalCase + `Comp` suffix | `MainMenuComp`                        |
| Test files          | kebab-case + `.spec.ts`    | `work-packages-crud.spec.ts`          |
| Test tags           | `@` prefix                 | `@ui`, `@api`, `@regression`, `@task` |

## Rules

Binding on every session. **Rules 1–12 keep their historical numbers** — other files cite them by
number ("CLAUDE.md rule 3"), so renumbering silently breaks those references.

Each rule names what actually enforces it. **`review only` means no program checks it** and a human
or the `test-reviewer` agent is the only thing standing between the rule and a violation — those are
the ones that break first, and they are candidates for a future gate rather than suggestions.

### Architecture

| #   | Rule                                                                                                                                                                                                   | Enforced by            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| 1   | All page objects extend `BasePage<T>` with their own type as the generic parameter.                                                                                                                    | `gate:types`           |
| 2   | All components extend `BaseComponent<T>`, scoped to a `rootComponent` locator.                                                                                                                         | `gate:types`           |
| 3   | Assertions belong in tests only — page objects never import `expect`.                                                                                                                                  | review only            |
| 4   | All PO/component imports go through `internals.ts`, and every new PO/component is exported there. Standalone utilities are imported directly from their source, to avoid barrel type-resolution churn. | `gate:types`, partial  |
| 5   | Test setup uses Playwright fixtures, not `beforeEach`.                                                                                                                                                 | review only            |
| 6   | Tests are structured with `test.step()` and Given/When/Then bodies.                                                                                                                                    | review only            |
| 7   | Locators carry `.describe()` for trace clarity.                                                                                                                                                        | review only            |
| 8   | Locators are `private readonly`, exposed through getter methods.                                                                                                                                       | review only            |
| 9   | Locator preference order: `getByRole()` > `getByLabel()` > `getByText()` > `getByTestId()` > CSS.                                                                                                      | review only            |
| 10  | Navigation methods return the destination page object, awaited through `waitForLoad()` (the fluent pattern).                                                                                           | review only            |
| 11  | Every page and component implements `waitForLoad()`.                                                                                                                                                   | review only            |
| 12  | Every public page-object method carries `@aliases`, `@prerequisites` and `@observable-state`.                                                                                                          | `catalog:report` only¹ |

¹ `gate:catalog` proves the catalog matches the source, **not** that the tags are present. Rule 12 is
what makes intent-level search work, so this is the widest hole in the current gate set.

**Rule 3** is what keeps a page object reusable across a positive and a negative test — an `expect`
inside one decides the outcome for every caller. **Rule 9** is what keeps locators surviving a CSS
refactor, and why `openproject-dom.md` exists: here, accessible names contain icon-font glyphs, so
the naive `getByRole` is sometimes wrong.

### Code quality

| #   | Rule                                                                                                  | Enforced by  |
| --- | ----------------------------------------------------------------------------------------------------- | ------------ |
| 13  | TypeScript strict mode. No `any` or `unknown` in page objects.                                        | `gate:types` |
| 14  | No floating promises. Every async call is awaited.                                                    | `gate:lint`  |
| 15  | ESLint v9 and Prettier are authoritative on style; the editor is not.                                 | `gate:lint`  |
| 16  | Read the class and method comments in a page object before calling it.                                | review only  |
| 17  | Run `npx eslint <file>` on everything you touch, before you finish.                                   | `gate:lint`  |
| 18  | Never silence a diagnostic with a cast, a disable comment, or an import that bypasses `internals.ts`. | review only  |

**`gate:lint` and `gate:types` are the authority.** When the editor and the CLI disagree, the CLI
wins and the editor is stale; the diagnostic recipe is in
[`architecture/references/module-scaffold.md`](.claude/skills/architecture/references/module-scaffold.md).

### Test integrity

| #   | Rule                                                                                                                                       | Enforced by |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 19  | Every test runs in isolation. No test depends on another's side effects, and no test assumes execution order.                              | review only |
| 20  | A test that deletes an entity creates that entity itself, in the same test.                                                                | review only |
| 21  | Never weaken a test to make it pass. Deleting an assertion, loosening a matcher, or adding a sleep to close out a red run is a failed run. | review only |
| 22  | A known product bug is `test.fixme()` with a comment naming the decision or issue — never a silent skip and never a deleted assertion.     | review only |

Rule 21 is what the pipeline is built around: `/gen-test` caps healing at three iterations and then
stops and reports, so no agent is ever cornered into choosing between a red gate and an honest test.

### Evidence

| #   | Rule                                                                                                                                                        | Enforced by                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 23  | A locator ships only with evidence: a cited path in the application's source, or an ARIA snapshot ref from the live DOM. A plausible guess is not evidence. | `pipeline:audit`, shape only |
| 24  | An agent's self-report is a claim, not a result. A gate is the evidence.                                                                                    | orchestrator                 |
| 25  | Check what already exists before building it. The POM catalog is searched — by `@aliases`, not just by exact name — before a new method is written.         | `plan.md` gap rows           |

Rule 23 is why this repo keeps a Rails checkout of the app under test. Note the limit honestly:
`pipeline:audit` reads _shape_, so it proves a citation is present, never that it is correct.

### Changing a rule

Edit it here, in a commit that says which of these it does: **add** one (next free number is **29** —
never reuse a retired one), **amend** one (edit in place, then fix every file that relied on the old
wording), **retire** one (strike it with a one-line reason and the date, leaving the number
occupied), or **add teeth** (move it from `review only` to a named gate — the highest-value change
available, and it needs no other justification).

A rule violated three times without consequence is not a rule: gate it or retire it.

_Retired: rules 26–28 (spec discipline), 2026-08-12 — they required a written spec before adding a
gate, script, agent or pipeline stage, and produced documents rather than code._

## Before you finish

- `npm run catalog` after changing anything under `src/po/` — `gate:catalog` fails on a stale
  catalog, and the next agent cannot discover what you added.
- `npm run gate:all` — catalog, types, lint. `npx eslint <file>` on everything you touched is the
  minimum (rule 17).
- `pom-catalog/` is the index of existing page objects. **Search it before writing a new method**
  (rule 25), by `@aliases` rather than exact name. Details:
  [`architecture/references/pom-catalog.md`](.claude/skills/architecture/references/pom-catalog.md).

## Specifications

Everything under `specs/` specifies **the application under test**, not this repository. The source
`.docx` becomes a requirement graph at `specs/product/graph/**.yaml` — `FR-*` files declaring
`test_cases[]` with stable ids like `TC-MEM-009-01` — and `/gen-test` turns a graph id into a passing
test. Read [`specs/README.md`](specs/README.md) before editing a requirement — it says which
directories are consumed, and which reference material is superseded and must not be trusted.

**Changes to this repository's own tooling need no specification document** — write the code. The
gates and rules 1–25 govern it, and unlike a document they are executable.

## Skills

Each skill carries its own instructions, references and scripts; read the skill rather than a summary
of it here.

- `/gen-test <FR-id|TC-id|path>` — generate a complete, passing UI test through the staged pipeline
  (subagents, deterministic gates, own branch). The normal way to create a test.
- `/verify-pipeline <scenario>` — greybox-test that pipeline itself and report improvements
- **Architecture** skill — page objects, components, fixtures, the POM catalog and its metadata
- **Write web test** / **Write api test** skills — single-shot test writing, without the pipeline
- **playwright-cli** skill — drive the live app to see what a page actually renders
- **playwright-trace** skill — read a failed test's trace instead of re-running it
  (`playwright.config.ts` sets `trace: 'on'`, so every action has a DOM snapshot and screenshot)

## Environment

This machine is Windows. Use PowerShell/Windows path conventions (`C:\...`) for all shell commands,
config files and scripts. Do NOT assume bash, `~/.bashrc`, or POSIX-only tooling.

**Run npm scripts that take flags as `npm.cmd run …`, not `npm run …`.** `npm` resolves to `npm.ps1`,
whose parameter binder swallows `--` and every `--flag` before npm sees them, so
`npm run pipeline:preflight -- --spec TC-MEM-009-01` arrives as `preflight.ts TC-MEM-009-01`. Value
flags fail loudly; **boolean flags fail silently** (`-- --kill` becomes report-only), which is why
this is a rule rather than a tip.
