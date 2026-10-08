---
name: draft-test-cases
description: Draft test cases for a requirement in the requirement vault, as notes a person approves before any test is generated from them. Use when the user asks to write, draft, propose or add test cases for a requirement ("draft test cases for FR-WP-004", "what test cases does FR-MEM-003 need?"), or to revise test cases a reviewer rejected.
---

# Drafting test cases for approval

`$ARGUMENTS` names a requirement (`FR-WP-004`), or `rejected` to revise every rejected test case. If
it is empty, ask.

Claude drafts, a person approves. A test case is the contract a generated test is held to, so nobody
should automate one they have not read. Every note this skill writes is a draft — `approved: false`, no
`rejected`. **Never tick `approved`** — that is the reviewer's decision, recorded in Obsidian
(rule 30) — and `/gen-test` preflight refuses a draft.

How approval is kept honest is `vault-lint` rule 10 in
[`scripts/vault-lint.ts`](../../../scripts/vault-lint.ts): `--fix` records a hash of the text the
person approved, and unticks `approved` as soon as that text changes.

## 1. Read what the requirement already has

Read the requirement note and everything it links: business rules, stories, permission rows, data
fields, and any clarification whose `sources` names it. Then list its existing test cases, approved or
not:

```powershell
Get-ChildItem 'specs/product/vault/Test Cases' -Filter *.md |
    Select-String -SimpleMatch 'requirement: "[[FR-WP-004]]"' -List | ForEach-Object Path
```

Draft only what is missing. A gap in an approved test case is reported to the user, not edited. An
edit revokes that test case's approval, so it is the user's call, and correcting one is the
**correct-requirement** skill's job.

## 2. Find what the app actually does

A test case states an expected result, and rule 29 holds it to evidence: a path and line in
OpenProject's source, or a live observation. The SRS is not evidence. Where to look, and the version
check the Rails checkout must pass first, are in **correct-requirement** step 2 and
[`docs/app-under-test/environment.md`](../../../docs/app-under-test/environment.md#rails-source).

Cover the requirement's positive path, its negatives, its boundaries, and each permission row it
cites (one test case per role that behaves differently). Where the source leaves the expected result
undecided, do not guess. Draft the test case anyway, open a `Clarifications/CQ-*` note that `blocks`
it, and say so in the report.

## 3. Write each test case

Start from `specs/product/vault/_templates/Test case.md`, and keep to the vault's conventions in
[`specs/README.md`](../../../specs/README.md):

- **Id:** `TC-<MODULE>-<NNN>-<NN>`, numbered from the requirement's (`FR-WP-004` → `TC-WP-004-06`
  after `-05`). Never reuse an id, not even one whose note was deleted: it may still be a `@TC-…` tag.
- **Properties:** `type` (one already in use: `positive`, `negative`, `edge`, `permission`,
  `boundary-positive`, `boundary-negative`), `title` with no ids, `requirement`, `actors`, and the
  rules or permission rows it exercises. `approved: false`. `tags` with
  `kind/test-case` and the requirement's `module/*`.
- **Body:** `## Preconditions` (optional; never "Logged in as", which is `actors`), `## Steps` as a
  numbered list of user actions, `## Expected result` as what the user can observe,
  `## Automated by` exactly as the template has it (a table of the tests that cover it), then
  `## Evidence` with the `file:line` citations from step 2 and how far they were verified (source
  only, or observed live). The reviewer approves against that evidence.
- Setup shared with another test case is embedded (`![[TC-WP-004-03#^a-blocks-b]]`), not copied.

## 4. Revising a rejected test case

A rejected test case (`rejected: true`) says why under `## Notes`. Address that, rewrite the test
case, and remove the `rejected` property so it is a draft again. Keep the reviewer's note and add a dated line under it saying what changed, so
the next review sees the conversation. If you disagree with the rejection, leave the test case
rejected and put your case in the report instead.

## 5. Check and report

```powershell
npm.cmd run vault:lint
```

It rejects a leftover `TODO`, a bare id in prose, an unknown property and a missing section. Then
report each drafted or revised test case as a link with its title, every clarification you opened,
and any gap you found in an approved test case. Point the user at **Home → Needs attention →
Awaiting approval** in Obsidian, where the drafts are grouped by requirement.

After they approve, `npm.cmd run vault:lint -- --fix` records the approvals (`gate:all` fails until
it has run), and `/gen-test` will accept the test cases.
