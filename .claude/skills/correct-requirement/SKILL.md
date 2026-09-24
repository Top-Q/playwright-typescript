---
name: correct-requirement
description: Check a requirement, business rule or test case in the requirement vault against how OpenProject actually behaves, and correct it with cited evidence. Use when the user doubts or asks to verify a requirement, rule or test case ("is BR-WP-04 right?", "check FR-WP-013 against the app"), asks to fix one, or when a test fails because its spec asserts behaviour the app does not have.
---

# Correcting a requirement against the app

`$ARGUMENTS` names what to check — a note id (`BR-WP-04`, `FR-WP-013`, `TC-WP-012-04`) or a claim in
words. If it is empty, ask.

The SRS the vault came from was reverse-engineered, and a wrong claim reads exactly like a right one.
BR-WP-01 described an override that does not exist; BR-WP-04 described a 7-day soft delete that does
not exist. Both were internally consistent, so `vault:lint` could not see them — only the source
could. This skill is the workflow that found them, and rule 29 in [CLAUDE.md](../../../CLAUDE.md) is
the standard it meets.

## 1. Pin the claim and everything that depends on it

Quote the exact sentence you are checking — the rule's text, the requirement, the expected result.
Then find every note that relies on it, because a correction that stops at the rule leaves test
cases asserting the old behaviour:

```powershell
Get-ChildItem specs/product/vault -Recurse -Filter *.md |
    Select-String -SimpleMatch '[[BR-WP-04' -List | ForEach-Object Path
```

(`[[BR-WP-04` without the closing brackets also catches `[[BR-WP-04#^rule]]` embeds and
`[[BR-WP-04|…]]` links.)

Read each hit. Property links (`business_rules`, `requirement`, `blocks`) are dependents; a prose
mention may be too.

## 2. Find the evidence

Read the application's source. Its path, and the version check that must pass before you trust it,
are in [`docs/app-under-test/environment.md`](../../../docs/app-under-test/environment.md#rails-source)
— source from a different major version is not evidence.

Where behaviour lives in OpenProject, roughly in order of authority:

| Look in                              | For                                                            |
| ------------------------------------ | -------------------------------------------------------------- |
| `app/contracts/**/base_contract.rb`  | What is allowed and validated — assignable values, errors      |
| `app/services/**`                    | What an action actually does — cascades, side effects          |
| `app/models/**`                      | Associations, callbacks, registered hooks                      |
| `app/controllers/**`                 | Which path a request takes, what it asks the user first        |
| `frontend/src/app/**`                | What the UI enforces — disabled buttons, required checkboxes   |
| `config/locales/en.yml`, `js-en.yml` | The exact wording a test can assert                            |
| `spec/**`                            | Upstream tests that pin the behaviour — the strongest citation |

Two questions to always ask, because both have already been wrong in this vault:

- **Does anyone bypass it?** An admin, a role with Manage, an API caller. Check that the code path
  has no exemption before writing "for any user".
- **Does the claim's condition matter?** "Open children", "the Assignee", "a Viewer" — check the code
  actually branches on it. FR-WP-013 said _open_ children; the code checks for any children.

Record `file:line` for every point. Look for what the SRS never said, too: correcting BR-WP-04 found a
time-entry step no document mentioned.

If the source is ambiguous, check the running app with **playwright-cli**. If it is still undecided,
do not guess: open a clarification question (a `Clarifications/CQ-*` note whose `blocks` names the
affected test cases) and stop there — preflight will then keep `/gen-test` from building on it.

## 3. Decide what the vault should say

The vault describes the app **as it is**. If the user says a requirement describes behaviour the
product _should_ have, it stays, and a test for it is `test.fixme()` naming the gap (rule 22).
Otherwise, correct the vault.

## 4. Correct the notes

- **The note that owns the fact** — usually the rule — gets the corrected text and an `## Evidence`
  section:

    ```markdown
    ## Evidence

    Corrected 2026-09-23 against OpenProject 16 (Rails source `stable/16`, v16.6.10). The previous
    wording — <what it claimed> — matched nothing in the source:

    - <finding>: `app/services/work_packages/delete_service.rb` (`destroy_descendants`).
    - <finding>: `frontend/src/app/…/wp-destroy.modal.ts:129-140`.

    Not yet verified in the running app.
    ```

    End with how far it was verified — source only, or observed live — never leave it implied.

- **Dependents** link to that note instead of repeating the evidence: _"Corrected 2026-09-23
  together with [[BR-WP-04]], which carries the evidence."_
- **A test case that asserted the wrong thing** is rewritten, never deleted: its id may already be a
  `@TC-…` tag on a test. If the correction flips its meaning, invert it (positive ↔ negative) and
  keep the id's question: _"Inverted 2026-09-23 from … keeping the id's meaning as 'the
  closed-children question'."_ TC-WP-004-04 and TC-WP-013-03 are worked examples.
- **Drop properties that no longer apply** — a data field the behaviour does not depend on — and say
  so in the notes.
- **An automated test case** (`automated_by` not empty) means a test asserts the old behaviour. Name
  it in your report; changing it is a test change under rules 21 and 22, not a note edit.

## 5. Mirror the change into the SRS

The document keeps no wording that was wrong. Replace the exact paragraph:

```powershell
.claude/skills/correct-requirement/scripts/update-docx.ps1 `
    -Path specs/product/openproject-demo-requirements.docx `
    -Old 'BR-WP-04: Deleting a Work Package is a soft operation…' `
    -New 'BR-WP-04: Deleting a Work Package is permanent…'
```

It fails, changing nothing, unless `-Old` occurs exactly once. Requirements appear in the document
without their id (the id is in the neighbouring table cell) — pass the requirement's sentence alone.

## 6. Check and report

```powershell
npm.cmd run vault:lint
```

It will catch an id you wrote as plain text in the Evidence section — link it. Then report: the claim,
the evidence, every note changed, how far it was verified, and anything else found wrong on the way.
Ask before correcting those too; a correction spreads, and the user decides how far.
