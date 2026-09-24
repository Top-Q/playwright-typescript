# Specifications

Everything here specifies **the application under test** — OpenProject. Nothing here specifies this
repository: the rules governing page-object architecture, coding standards and test integrity are the
numbered rules in [`CLAUDE.md`](../CLAUDE.md), and changes to the framework, the gates and the
pipeline are made by writing code rather than a document.

## The requirement vault is the source of truth

`product/vault/` is an [Obsidian](https://obsidian.md) vault: one Markdown note per requirement, test
case, user story, business rule, RBAC row, data-model entity, user class, constraint, clarification
question and SRS section, linked with `[[wikilinks]]`. People review and edit it in Obsidian; agents
read and edit the same files. There is no generator behind it and no second copy — an edit to a note
is the edit.

A requirement, and one of its test cases:

```yaml
# Requirements/FR-WP-004.md — properties, then ## Requirement, ## Test cases, ## Referenced by
id: FR-WP-004
source: '[[SRS 5.3]]'
stories: ['[[US-WP-02]]']
business_rules: ['[[BR-WP-01]]']
tags: [kind/requirement, module/work-packages]
```

```yaml
# Test Cases/TC-WP-004-03.md — properties, then ## Preconditions, ## Steps, ## Expected result
id: TC-WP-004-03
type: negative
title: Closed statuses are not offered for a Work Package that an open Work Package blocks
requirement: '[[FR-WP-004]]'
business_rules: ['[[BR-WP-01]]']
actors: ['[[Administrator]]']
automated_by: []
tags: [kind/test-case, module/work-packages]
```

Three rules keep every fact in exactly one place:

- **Links point one way,** from the specific to the general: test case → requirement → rule → SRS
  section. A requirement does not list its test cases, and a rule does not list what cites it; those
  views are Bases queries (`![[Requirement test cases.base]]`, `![[Referenced by.base]]`) or Obsidian's backlinks.
- **Related text is embedded, not copied.** A test case that shares another's setup embeds the one
  line it means — `![[TC-WP-004-03#^a-blocks-b]]` — instead of saying "same setup as".
- **Prose does not restate properties.** Titles carry no ids, and who runs a test is its `actors`
  property, not a "Logged in as" sentence.

**`npm.cmd run vault:lint` enforces them, and `gate:all` runs it.** Every note has a `kind/*` tag, and
every kind has a closed schema: required properties, optional ones, and the kind of note each may
link to — anything else fails, which is how reverse lists stay out. It also fails on a link, heading
or block that does not resolve, an id written as plain text, a title that mentions an id, a
precondition that restates an actor, and a test case whose module tag differs from its
requirement's. Each kind's `##` sections are a closed set too: `/gen-test` finds a test case's steps
by the `## Steps` heading, so a renamed, missing or empty section fails the lint rather than
silently producing a test with no steps.

`/gen-test FR-MEM-001` or `/gen-test TC-MEM-009-01` reads the vault through
[`gen-test/scripts/vault.ts`](../.claude/skills/gen-test/scripts/vault.ts), which hands the pipeline
plain text: links reduced to their display text, embeds resolved to what they point at, actors as
"Logged in as" preconditions. Preflight refuses a spec whose test case an open clarification
question `blocks` — its expected result would be a guess — unless it is given `--allow-open-cq`, and
a generated test tags itself `@TC-…` so `vault:lint -- --fix` can record it in `automated_by`. The pipeline itself is documented in
[`.claude/skills/gen-test/SKILL.md`](../.claude/skills/gen-test/SKILL.md).

Start at `Home.md` or `SRS/SRS.md`. The folders:

| Folder                                                   | Holds                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Requirements/`                                          | 42 functional requirements                                                                                    |
| `Test Cases/`                                            | 129 test cases, each naming its requirement                                                                   |
| `SRS/`                                                   | The source document's outline — root, chapters, sections — with the text of the sections nothing else carries |
| `Stories/`, `Business Rules/`                            | `US-*` and `BR-*` / `RBAC-*`, cited by requirements and test cases                                            |
| `Permissions/`, `User Classes/`                          | The RBAC matrix's rows and columns                                                                            |
| `Clarifications/`                                        | Open questions, each naming the test cases it blocks. Read before generating a test for one of them           |
| `Non-Functional/`, `Constraints/`, `Design Constraints/` | NFRs (nothing consumes them yet), test-environment assumptions, SRS 2.5                                       |
| `Data Model/`, `Glossary/`, `Workflow/`                  | Entities with their attributes, terms, the Task status workflow                                               |
| `Acceptance Criteria/`                                   | Human-approved Given/When/Then exemplars — the style a criterion should follow                                |
| `Modules/`                                               | One hub per module: Bases views of everything tagged with it                                                  |
| `_bases/`                                                | The shared queries notes embed                                                                                |

## The SRS is frozen history

`product/openproject-demo-requirements.docx` is the SRS the vault was derived from. It is **history**:
nothing reads it, and nothing is regenerated from it. Where the vault and the document disagree, the
vault wins, and the note that changed says why — BR-WP-01 and FR-PRJ-001/002 carry their evidence
from OpenProject's source. Where a correction is simple to mirror, the document is corrected too, as
those three were; it keeps no copies of wording that was wrong.

## On `reference/`

Documents that came from elsewhere and that no script parses. **Do not treat these as a source of
truth** — three things worth knowing before you trust them:

- `openapi/openproject-workpackages-spec.json` is OpenProject's own API contract — useful when
  writing API tests, and authoritative about the API in a way the vault is not.
- `std/*.md` are Gherkin scenarios with YAML frontmatter, an earlier format that overlaps the
  vault's test cases. Nothing consumes them. They are kept because they are **not purely
  superseded** — `std/time_and_costs_tests.md` covers a module the vault has no requirements for
  at all. Treat them as a source of scenario ideas, and if Time & Costs gets specified properly, that
  content belongs in the vault and the file belongs in `_legacy/`.
- `std/work_package_tests.md.bu` is a stray backup file, referenced by nothing and a deletion
  candidate; it was moved as-is rather than removed silently.

`_legacy/` is where a superseded document goes. It is currently empty, so it is absent from git.

## Known gaps

Real holes in coverage, recorded so they are not rediscovered. Nobody is committed to filling them.

- **Most tests predate the `@TC-…` tags.** Five tests are tagged — the ones earlier `/gen-test` runs
  recorded against a test case — and `automated_by` lists them. `boards-crud`, `members-crud`,
  `workpackage-crud` and `meetings` cover requirements too, but which test cases each covers was never
  recorded; tagging them means reading each against the vault. `Test Cases.base` → "Not automated
  yet" is the worklist.
- **No test case covers BR-WP-04's time-entry clause.** Deleting Work Packages with logged time asks
  whether to delete those entries, keep them without a Work Package, or reassign them; nothing tests
  any of the three.
- **No input-sanitization requirement.** Nothing in `FR-WP-*` or `Non-Functional/` covers XSS or
  escaping on Subject and Description.
- **Three work-package behaviours are unspecified:** Cancel discarding unsaved changes, "Save and
  create another" and draft recovery, and a length bound on Description to match `FR-WP-002`'s bound
  on Subject.
