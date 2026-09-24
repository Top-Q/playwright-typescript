# OpenProject Playwright E2E Automation

## The application under test

OpenProject: **projects** contain **work packages** organised on **boards**, with **members** and
**roles** controlling permissions and an **administration** area for configuration. Those module names
are the vocabulary everything else uses — `src/po/openproject/<module>/`, `tests/ui/<module>/` and the
spec ids (`TC-WP-…`, `TC-MEM-…`).

Tests run as **admin** against the **Demo project**.

| Surface                                           | URL                     |
| ------------------------------------------------- | ----------------------- |
| **UI** — everything a browser drives              | `http://localhost:8090` |
| **API** — `OpenProjectClient`, tests, `/api/docs` | `http://localhost:8080` |

`.env`'s unqualified `OPENPROJECT_BASE_URL` is the **API** one, which has misled before.

Two documents describe the app itself rather than this repo, and both apply whether you are writing a
locator by hand or running the pipeline:

- [`docs/app-under-test/environment.md`](docs/app-under-test/environment.md) — addresses,
  credentials, the Rails source checkout and the version check that makes it trustworthy.
- [`docs/app-under-test/openproject-dom.md`](docs/app-under-test/openproject-dom.md) — what
  OpenProject actually renders. Every entry was paid for by a failed run. **Read it before writing a
  locator**, not after one fails.

## Project Structure

```
<project-root>/
├── src/po/openproject/     # Page objects and components (basePage.ts, baseComponent.ts, per-module dirs)
├── src/api/                # Fluent API client (OpenProjectClient)
├── tests/ui/, tests/api/   # Test specs + fixtures.ts
├── pom-catalog/            # Generated index of every page object and method
├── specs/                  # Specifications for the app under test — see specs/README.md
├── .claude/skills/         # Skills, each self-contained: SKILL.md + references/ + scripts/
├── scripts/                # Repo tooling not owned by a skill (POM catalog generator)
└── internals.ts            # Central barrel export — ALL PO/component imports go through here
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

Binding on every session, and the single authority: other files cite these **by number**, and the
`architecture` skill's references explain how to satisfy them rather than restating them.
**Rules 1–12 keep their historical numbers** — renumbering silently breaks every citation.

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
refactor, and why [`openproject-dom.md`](docs/app-under-test/openproject-dom.md) exists: here,
accessible names contain icon-font glyphs, so the naive `getByRole` is sometimes wrong.

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

Rule 21 has no escape hatch and needs none: a red run you cannot honestly fix is a result, and
reporting it is finishing the job.

### Evidence

| #   | Rule                                                                                                                                                                                                                                                              | Enforced by                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 23  | A locator ships only with evidence: a cited path in the application's source, or an ARIA snapshot ref from the live DOM. A plausible guess is not evidence.                                                                                                       | `pipeline:audit` — pipeline only   |
| 24  | _Relocated 2026-09-06 to [`gen-test/SKILL.md`](.claude/skills/gen-test/SKILL.md) — an orchestration principle, not a rule about this repository. Number retained; never reuse it._                                                                                | —                                  |
| 25  | Check what already exists before building it. The POM catalog is searched — by `@aliases`, not just by exact name — before a new method is written.                                                                                                               | `plan.md` gap rows — pipeline only |
| 29  | A change to what the requirement vault says the app does — a rule, a requirement, an expected result — cites its evidence on the note: a path and line in the application's source, or a live observation. The SRS document is not evidence of what the app does. | review only                        |

Rule 23 is why this repo keeps a Rails checkout of the app under test, and why
[`openproject-dom.md`](docs/app-under-test/openproject-dom.md) is worth reading before you guess.

Both limits stated honestly: `pipeline:audit` reads _shape_, so it proves a citation is present, never
that it is correct — and 23 and 25 are checked **only inside `/gen-test`**. Writing a page object by
hand, nothing enforces either one but you.

Rule 29 is rule 23 applied to the spec. A test built on a wrong requirement can have perfectly
evidenced locators and still assert behaviour the app does not have — BR-WP-01 and BR-WP-04 did
exactly that until the source was read. The **correct-requirement** skill is how to meet it.

### Changing a rule

Edit it here, in a commit that says which of these it does: **add** one (next free number is **30** —
never reuse a retired one), **amend** one (edit in place, then fix every file that relied on the old
wording), **retire** one (strike it with a one-line reason and the date, leaving the number
occupied), **relocate** one (move the text to wherever it is actually operative — a skill, an agent —
leaving a dated tombstone in its row so the number stays occupied and the citation still lands), or
**add teeth** (move it from `review only` to a named gate — the highest-value change available, and
it needs no other justification).

A rule violated three times without consequence is not a rule: gate it or retire it.

_Retired: rules 26–28 (spec discipline), 2026-08-12 — they required a written spec before adding a
gate, script, agent or pipeline stage, and produced documents rather than code._

## Before you finish

- `npm run catalog` after changing anything under `src/po/` — `gate:catalog` fails on a stale
  catalog, and the next agent cannot discover what you added.
- `npm run gate:all` — catalog, types, lint, gaps, and the requirement vault (`vault:lint`, after any
  edit under `specs/product/vault/`). `npx eslint <file>` on everything you touched is the
  minimum (rule 17).
- `pom-catalog/` is the index of existing page objects. **Search it before writing a new method**
  (rule 25), by `@aliases` rather than exact name. Details:
  [`architecture/references/pom-catalog.md`](.claude/skills/architecture/references/pom-catalog.md).

## Specifications

Everything under `specs/` specifies **the application under test**, not this repository. Read
[`specs/README.md`](specs/README.md) before editing a requirement — it owns the format, says which
directories are consumed, and says which reference material is superseded and must not be trusted.

The requirements live in **`specs/product/vault/`**, an Obsidian vault, and it is the source of truth:
edit a note in place — there is no generator behind it and no second copy. Three habits keep it
consistent, and `vault:lint` (part of `gate:all`) fails when one slips: links point one way (test
case → requirement → rule), related text is embedded rather than copied, and prose never restates a
property. A test covering a test case carries its `@TC-…` tag; `vault:lint -- --fix` records it in
the vault.

**Changes to this repository's own tooling need no specification document** — write the code. The
gates and rules 1–25 govern it, and unlike a document they are executable.

## Skills

Each skill carries its own instructions, references and scripts; read the skill rather than a summary
of it here. What the skill descriptions do not tell you is which one to reach for:

- **`/gen-test <FR-id|TC-id|path>` is the normal way to create a UI test** — staged pipeline,
  subagents, deterministic gates, its own branch. **write-web-test** / **write-api-test** are the
  single-shot alternative, for when the pipeline is more machinery than the job needs.
- When a requirement, rule or test case may not match the app — the user doubts it, or a test fails
  because the spec asserts behaviour the app lacks — **correct-requirement** checks it against the
  source and corrects it with evidence (rule 29).
- To learn what the app actually renders, drive it with **playwright-cli**. To learn why a test
  failed, read its trace with **playwright-trace** instead of re-running it (`playwright.config.ts`
  sets `trace: 'on'`, so every action has a DOM snapshot and screenshot). **pause-test** is for the
  state that exists only partway through a run.
- `playwright-cli` and `playwright-trace` are **vendor-managed and must never be hand-edited**. How to
  regenerate them, and the one local edit every refresh destroys:
  [`.claude/skills/README.md`](.claude/skills/README.md).

## Environment

Windows. PowerShell and `C:\...` paths in every command, config file and script — no bash, no
POSIX-only tooling.

**Run npm scripts that take flags as `npm.cmd run …`, not `npm run …`.** `npm` resolves to `npm.ps1`,
whose parameter binder eats `--` and every `--flag` before npm sees them. Value flags then fail
loudly, but **boolean flags fail silently** (`-- --kill` becomes report-only), which is why this is a
rule rather than a tip. The full explanation and the alternative quoting form are in
[`gen-test/references/gates.md`](.claude/skills/gen-test/references/gates.md).
