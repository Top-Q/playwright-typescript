# Specifications

Everything here specifies **the application under test** — OpenProject. Nothing here specifies this
repository: the rules governing page-object architecture, coding standards and test integrity are the
numbered rules in [`CLAUDE.md`](../CLAUDE.md), and changes to the framework, the gates and the
pipeline are made by writing code rather than a document.

## The two workflows

Both run on `product/graph/`, and everything here exists to serve one of them.

**1 — `openproject-demo-requirements.docx` → the requirement graph.** The source document becomes
`product/graph/**.yaml`: one file per functional requirement, each declaring the test cases that
verify it with stable ids.

```yaml
id: FR-WP-001
module: work-packages
source: { document: openproject-demo-requirements.docx, section: '5.3' }
text: The system shall require Type and Subject (title) fields when creating a Work Package…
test_cases:
    - id: TC-WP-001-01
      type: positive
      title: Create Work Package with only required fields
      preconditions: […]
      steps: […]
      expected_result: Work Package is created; detail view shows auto-generated ID…
```

This is the STD. `source.section` traces a requirement back to the document it came from;
`test_cases[].id` is what the second workflow consumes.

**2 — The requirement graph → automated tests.** `/gen-test FR-MEM-001` or `/gen-test TC-MEM-009-01`
reads the graph and produces a passing Playwright test. `run-init.ts` resolves the id against
`product/graph/` and normalises it into the run's `spec.md`; the pipeline itself is documented in
[`.claude/skills/gen-test/SKILL.md`](../.claude/skills/gen-test/SKILL.md) and its `references/`.

The graph being machine-readable is the load-bearing property. A markdown restatement of it would be
a comment with extra steps.

## Inside `product/graph/`

| Path                           | Holds                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `FR-*.yaml`                    | 42 functional requirements declaring 129 test cases between them                                     |
| `nfr/NFR-*.yaml`               | Non-functional requirements. Nothing consumes them yet                                               |
| `global/`                      | Constraints, glossary, data model, RBAC matrix and business rules                                    |
| `clarification-questions.md`   | 6 open questions, each naming the test case it blocks. Read before generating a test for one of them |
| `acceptance-criteria-samples/` | Human-approved Given/When/Then exemplars — the style a criterion should follow                       |

`product/openproject-demo-requirements.docx` is the source document the graph was derived from.

## On `reference/`

Documents that came from elsewhere and that no script parses. **Do not treat these as a source of
truth** — three things worth knowing before you trust them:

- `openapi/openproject-workpackages-spec.json` is OpenProject's own API contract — useful when
  writing API tests, and authoritative about the API in a way our own YAML is not.
- `std/*.md` are Gherkin scenarios with YAML frontmatter, an earlier format that overlaps
  `product/graph`'s `test_cases`. Nothing consumes them. They are kept because they are **not purely
  superseded** — `std/time_and_costs_tests.md` covers a module the requirement graph has no FRs for
  at all. Treat them as a source of scenario ideas, and if Time & Costs gets specified properly, that
  content belongs in `product/graph/` and the file belongs in `_legacy/`.
- `std/work_package_tests.md.bu` is a stray backup file, referenced by nothing and a deletion
  candidate; it was moved as-is rather than removed silently.

`_legacy/` is where a superseded document goes. It is currently empty, so it is absent from git.

## Known gaps in the graph

Real holes in coverage, recorded so they are not rediscovered. Nobody is committed to filling them.

- **No test → requirement link.** `grep -rn "TC-" tests/` returns nothing. `/gen-test` establishes the
  link in `.pipeline/runs/<id>/run.json`, but `.pipeline/` is gitignored, so it dies with the run.
  "Which test cases have automated tests?" cannot be answered without reading nine test files against
  42 YAML files by eye. The cheap fix, if it is ever wanted, is a Playwright tag per test case
  (`{ tag: ['@ui', '@TC-MEM-009-01'] }`) plus a script joining the tags against the graph — the tag
  also buys `--grep "@TC-MEM-009"` for free.
- **Nothing enforces the open clarification questions.** Generating a test for a test case named by an
  open CQ produces a test that asserts a guess, and a green run makes the guess look settled.
- **No input-sanitization requirement.** Nothing in `FR-WP-*` or `nfr/` covers XSS or escaping on
  Subject and Description.
- **Three work-package behaviours are unspecified:** Cancel discarding unsaved changes, "Save and
  create another" and draft recovery, and a length bound on Description to match `FR-WP-002`'s bound
  on Subject.
