---
name: architecture
description: Generates page objects, components, fixtures, and tests following the project's established architecture patterns. Use when the user needs to create new page objects, add components, create fixtures, or scaffold test infrastructure.
---

# Project Architecture Skill

Use this skill when creating or modifying page objects, components, fixtures, or tests.

## The rules live in CLAUDE.md

The numbered rules in [`CLAUDE.md`](../../../CLAUDE.md) are the authority, and the rest of the repo
cites them by number. **This skill does not restate them** — a second copy drifts from the first, and
then two files disagree about what the rule is. What it does is say where each pattern is written out
in full.

| CLAUDE.md rule                                         | Pattern to follow                                     |
| ------------------------------------------------------ | ----------------------------------------------------- |
| 1 — pages extend `BasePage<T>`                         | [page-objects.md](references/page-objects.md)         |
| 2 — components extend `BaseComponent<T>`               | [components.md](references/components.md)             |
| 5 — fixtures, not `beforeEach`                         | [fixtures.md](references/fixtures.md)                 |
| 6 — `test.step()` with Given/When/Then                 | [test-structure.md](references/test-structure.md)     |
| 9 — locator preference order                           | [locator-patterns.md](references/locator-patterns.md) |
| 12 — `@aliases`/`@prerequisites`/`@observable-state`   | [pom-metadata.md](references/pom-metadata.md)         |
| 25 — search the catalog first, regenerate it after     | [pom-catalog.md](references/pom-catalog.md)           |
| 15, 18 — the CLI, not the editor, decides a diagnostic | [module-scaffold.md](references/module-scaffold.md)   |

An entirely new module is its own job: work through
[module-scaffold.md](references/module-scaffold.md) top to bottom.

The remaining rules (3, 4, 7, 8, 10, 11, 13, 14, 16, 17, 19–24) need no pattern file — they are
stated completely in CLAUDE.md. Read them there.

## Where things go

`CLAUDE.md` has the project tree and the naming conventions. Two placement facts it does not spell
out:

- Page objects and components live under `src/po/openproject/<module>/`, one directory per
  OpenProject module (`general`, `workpackage`, `board`, `members`, `projects`, `meeting`,
  `timeandcosts`). `basePage.ts` and `baseComponent.ts` sit at the root of that folder.
- UI tests live under `tests/ui/<module>/`, beside the `tests/ui/fixtures.ts` they import `test`
  from.

Every new page object and component is also exported from `internals.ts` (rule 4) — a class that is
not exported there cannot be imported by a test.

## What the app under test actually does

A pattern tells you how to write a locator; it cannot tell you what OpenProject renders. Before
writing one by hand, read
[`docs/app-under-test/openproject-dom.md`](../../../docs/app-under-test/openproject-dom.md) — known
duplicate matches, accessible names carrying icon-font glyphs, waiting and navigation quirks. Every
entry there was paid for by a failed run, so reading it is cheaper than rediscovering any of it.

Addresses, credentials and the Rails source checkout (with the version check that makes it
trustworthy) are in
[`docs/app-under-test/environment.md`](../../../docs/app-under-test/environment.md).
