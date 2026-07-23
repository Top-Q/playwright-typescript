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

`/gen-test <spec-ref>` generates a complete, passing UI test from a specification by running four specialised subagents with deterministic gates between them. `<spec-ref>` is an FR id (`FR-MEM-001`), a TC id (`TC-MEM-001-02`), or a path to a markdown spec.

| Stage | Agent           | Does                                                                                                |
| ----- | --------------- | --------------------------------------------------------------------------------------------------- |
| 1     | `test-creator`  | Spec → test file, using **only** the POM catalog. No browser. Gaps become throwing `@stub` methods. |
| 3     | `po-builder`    | Implements the stubs, deriving locators from OpenProject's Rails source and the live DOM.           |
| 6     | `test-healer`   | Diagnoses failures from the trace and the live app; minimal fixes only.                             |
| 7     | `test-reviewer` | Architecture compliance **and** whether the test actually covers the spec.                          |

The pipeline works on a `test-gen/<run-id>` branch and never commits, pushes, or deletes it. Run artifacts go to `.pipeline/runs/<run-id>/` (gitignored); the handoff contract is [`.claude/skills/gen-test/references/contract.md`](.claude/skills/gen-test/references/contract.md).

Why the split: one agent doing discovery, browser investigation, PO authoring, and debugging runs out of context and starts inventing locators. Keeping test design (catalog-only) apart from DOM investigation (browser) is the core constraint.

**Agent definitions in `.claude/agents/` are read once, at session start.** After adding or editing one, restart Claude Code before running the pipeline — otherwise the stage fails with `Agent type '<name>' not found`, listing only the built-in agents.

**Browser investigation has three recipes**, all in [`.claude/skills/gen-test/references/browser.md`](.claude/skills/gen-test/references/browser.md):

- `npx playwright test <file>:<line> --debug=cli` + `playwright-cli attach tw-XXXX` — pauses the real test, `pause-at` any line. The healer's default. **Requires Playwright ≥ 1.59**; the project ran 1.56.1 until 2026-07-23, which is why older notes call this flag non-existent.
- `tests/debug-session.spec.ts` + `playwright-cli attach --cdp=http://localhost:9222` — a logged-in browser with no test attached, for locator hunting. Its teardown is three steps and leaks a Chromium if you skip one.
- `playwright-cli open` + manual login — only for deliberately logged-out state.

**What you will find once you are looking** is a separate file: [`references/openproject-dom.md`](.claude/skills/gen-test/references/openproject-dom.md) — the DOM facts that have already cost this project a run each (icon-font glyphs in accessible names, ng-select panels escaping their form, `waitForLoadState('load')` being a no-op after submit, members pagination). Both `po-builder` and `test-healer` read it unconditionally. Keep it separate from `browser.md`: tooling mechanics churn with every Playwright upgrade, these facts do not.

### Gates

| Command                | Asserts                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run gate:catalog` | POM catalog matches `src/po/`                                        |
| `npm run gate:types`   | `tsc --noEmit` clean                                                 |
| `npm run gate:lint`    | `eslint .` has no errors                                             |
| `npm run gate:stubs`   | No `@stub` methods remain (`-- --expect <n>` to require exactly _n_) |
| `npm run gate:all`     | All of the above                                                     |

## Skills & Commands

- `/gen-test <spec-ref>` — the full pipeline above; the normal way to create a test
- **Write web test** skill — single-shot manual test writing, when you don't want the pipeline
- **Write api test** skill — generate API tests
- `/heal-test <test name>` — run a test, diagnose failures, apply minimal fixes

## Environment
This machine is Windows. Use PowerShell/Windows path conventions (`C:\...`) for all shell commands, config files, and scripts. 
Do NOT assume bash, `~/.bashrc`, `~/.zshrc`, or POSIX-only tooling. 
When writing Python that shells out or handles paths, use `pathlib` and avoid MSYS-style `/c/...` paths.

## Python / uv'
This project uses `uv`. Do not run `uv add`. Add dependencies by editing `pyproject.toml` directly, then run `uv sync`.