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
is the edit. The exceptions are `Automated Tests/` and `Dashboard.md`, which are generated from the
test code and the vault and never edited by hand.

A requirement, and one of its test cases:

```yaml
# Requirements/FR-WP-004.md — properties, then ## Requirement, ## Test cases, ## Referenced by
id: FR-WP-004
source: '[[SRS 5.3]]'
stories: ['[[US-WP-02]]']
business_rules: ['[[BR-WP-01]]']
tags: [kind/requirement, module/work-packages]
```

A requirement found in the app rather than the SRS has no `source`; it carries an `## Evidence`
section instead, citing the source code or the passing test that observes it (`vault-lint` rule 11).
The Meetings requirements and FR-WP-016 are written that way, from the tests, because this is a
demo and its tests, not the reverse-engineered SRS, are the record of what the app does.

```yaml
# Test Cases/TC-WP-004-03.md — properties, then ## Preconditions, ## Steps, ## Expected result, ## Automated by
id: TC-WP-004-03
type: negative
title: Closed statuses are not offered for a Work Package that an open Work Package blocks
requirement: '[[FR-WP-004]]'
business_rules: ['[[BR-WP-01]]']
actors: ['[[Administrator]]']
approved: true
approved_hash: 56ccb826c5e3836c
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

Obsidian itself helps before the lint does, and none of it replaces the lint — nobody in the pipeline
runs Obsidian, and only a script can block a commit:

- **Templates.** Create a note, then _Templates → Insert template_ and pick one from `_templates/`
  (requirement, test case, user story, business rule, clarification). Every placeholder is a `TODO`,
  an unresolved link or `module/MODULE`, all of which `vault:lint` rejects, so a note cannot be
  committed half-filled. `_templates/` is skipped by the lint, by `/gen-test` and by the vault-wide
  tables.
- **Property types.** `.obsidian/types.json` tells the property editor which properties are lists
  of links and which are text, so it does not guess and rewrite one as the other. `vault:lint` fails
  when a note uses a property that is not declared there.
- **Needs attention.** `Home.md` embeds `Needs attention.base`: test cases awaiting approval, open
  questions, test cases with no actor, and approved test cases no test automates yet.

## Test cases are approved by a person

Claude drafts test cases (the **draft-test-cases** skill); a person approves each one before a test
is generated from it. The review is two checkboxes, both editable straight from the **Awaiting
approval** table:

| State    | Checkboxes                        | Meaning                                                                   | Set by                                  |
| -------- | --------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| Draft    | neither ticked                    | Written or revised, not yet reviewed                                      | Claude, a person, or `vault:lint --fix` |
| Approved | `approved`                        | A person read this exact text and agrees a test should hold the app to it | A person, in Obsidian — never an agent  |
| Rejected | `rejected`, with a `## Notes` why | A person disagrees; Claude revises it and removes `rejected`              | A person                                |

Ticking both fails the lint. An approval holds for the text that was approved, and no longer. After
you tick `approved`, `npm.cmd run vault:lint -- --fix` records `approved_hash`, a hash of the test
case's properties and its Preconditions, Steps and Expected result, including the text of any block
it embeds. When any of that changes, the lint fails, and `--fix` unticks `approved`. `--fix` records
an approval a person gave and revokes a stale one; it never approves anything. `## Notes` and
`## Evidence` are outside the hash, so discussing a test case does not revoke its approval.

`/gen-test` preflight refuses a spec containing a test case that is not approved, unless it is given
`--allow-unapproved`. Nothing can check who ticked `approved`, so that is rule 30 in `CLAUDE.md`, and
the git diff is how it is reviewed.

**Needs attention → Awaiting approval** is the review queue, grouped by requirement.

## Automated tests are tracked in the vault

Every test under `tests/ui` and `tests/api` has a note in `Automated Tests/` — except
`tests/ui/saucedemo`, which tests saucedemo.com rather than OpenProject and is outside the vault
entirely (rule 31 in `CLAUDE.md`; the lint fails if it is ever tagged with a test case). Each note is named after its title,
and it links **test → test case**, the same direction as every other link in the vault. The test code
is the fact and the note is generated from it: `npm.cmd run vault:lint -- --fix` writes, rewrites and
deletes these notes, and the lint fails while one differs from the code. Change the test, never the
note.

A test declares what it covers in its own options. A `@TC-…` tag says which test case it covers, and
a `built-from` annotation says which approved text of that test case it was built from (the test
case's `approved_hash`). The lint requires an annotation for every `@TC-…` tag. `/gen-test` writes
both:

```ts
test('Filter Members list by Role', {
    tag: ['@ui', '@members', '@regression', '@TC-MEM-009-01'],
    annotation: { type: 'built-from', description: 'TC-MEM-009-01@9aa64be3b5821796' },
}, async ({ readyOverviewPage }) => { … });
```

```yaml
# Automated Tests/Filter Members list by Role.md — generated
title: Filter Members list by Role
file: tests/ui/members/filter-members-list-by-role.spec.ts
mode: test # or fixme, skip
covers: ['[[TC-MEM-009-01]]']
built_from: [TC-MEM-009-01@9aa64be3b5821796]
stale: [] # covered test cases whose approved text is no longer the one built from
tags: [kind/automated-test, module/members-roles]
```

A test is **stale** when a test case it covers was revised after the test was built: the approval
was revoked, or given again to different text. Stale is reported, not failed: `vault:lint` names
stale tests on every run, and **Needs attention → Stale tests** lists them. Review the test against
the test case, change it if it no longer matches, then update its annotation to the current hash.

**`Dashboard.md`** is the overview, generated by the same `--fix` and checked by the same lint, so
it is never out of date in a commit. It shows coverage meters (requirements with an automated test,
test cases approved and automated, tests traced), coverage by module as a bar chart and a table,
Mermaid pies of review state, test-case type and test traceability, a requirement → test case →
test flowchart whose nodes open their notes, and foldable worklists. A test case counts as
automated when a running test covers it; fixme and skip do not count. Its colours are one
three-slot palette validated for colour-vision deficiency on both Obsidian themes, and every slice
carries a label and its value.

A test case lists its tests in its `## Automated by` section, a Bases query over these notes, so no
property on the test case points back at a test. **Not automated yet** lists approved test cases that
no test covers, **Tests covering no test case** lists tests with no `@TC-…` tag, and each module hub
has an **Automated tests** view.

`/gen-test FR-MEM-001` or `/gen-test TC-MEM-009-01` reads the vault through
[`gen-test/scripts/vault.ts`](../.claude/skills/gen-test/scripts/vault.ts), which hands the pipeline
plain text: links reduced to their display text, embeds resolved to what they point at, actors as
"Logged in as" preconditions. Preflight refuses a spec with a test case that is not approved (unless
given `--allow-unapproved`), or one that an open clarification question `blocks`, whose expected result
would be a guess (unless given `--allow-open-cq`). A generated test carries its `@TC-…` tags and
`built-from` annotations, so `vault:lint -- --fix` can write its note. The pipeline itself is
documented in
[`.claude/skills/gen-test/SKILL.md`](../.claude/skills/gen-test/SKILL.md).

Start at `Home.md` or `SRS/SRS.md`. The folders:

| Folder                                                   | Holds                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Requirements/`                                          | 42 functional requirements                                                                                      |
| `Test Cases/`                                            | 129 test cases, each naming its requirement                                                                     |
| `Automated Tests/`                                       | One generated note per test in `tests/ui` and `tests/api`, linking the test cases it covers. Never edit by hand |
| `SRS/`                                                   | The source document's outline — root, chapters, sections — with the text of the sections nothing else carries   |
| `Stories/`, `Business Rules/`                            | `US-*` and `BR-*` / `RBAC-*`, cited by requirements and test cases                                              |
| `Permissions/`, `User Classes/`                          | The RBAC matrix's rows and columns                                                                              |
| `Clarifications/`                                        | Open questions, each naming the test cases it blocks. Read before generating a test for one of them             |
| `Non-Functional/`, `Constraints/`, `Design Constraints/` | NFRs (nothing consumes them yet), test-environment assumptions, SRS 2.5                                         |
| `Data Model/`, `Glossary/`, `Workflow/`                  | Entities with their attributes, terms, the Task status workflow                                                 |
| `Acceptance Criteria/`                                   | Human-approved Given/When/Then exemplars — the style a criterion should follow                                  |
| `Modules/`                                               | One hub per module: Bases views of everything tagged with it                                                    |
| `_bases/`                                                | The shared queries notes embed                                                                                  |
| `_templates/`                                            | The templates new notes are created from                                                                        |

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

- **Three tests are not tagged.** 18 of the 21 tests cover a test case. Two check less than the
  approved test case nearest them: the members sidebar's Invited view (no check that only invited
  members are listed), and `Create basic board with a list`, which may rename the board's default
  list rather than add one. Each needs a stronger assertion, run against the app, before it is
  tagged. `Delete all boards` is a cleanup utility, not a requirement. **Needs attention → Tests
  covering no test case** is the worklist.
- **No test case covers BR-WP-04's time-entry clause.** Deleting Work Packages with logged time asks
  whether to delete those entries, keep them without a Work Package, or reassign them; nothing tests
  any of the three.
- **No input-sanitization requirement.** Nothing in `FR-WP-*` or `Non-Functional/` covers XSS or
  escaping on Subject and Description.
- **Three work-package behaviours are unspecified:** Cancel discarding unsaved changes, "Save and
  create another" and draft recovery, and a length bound on Description to match `FR-WP-002`'s bound
  on Subject.
