---
id: FR-PRJ-001
source: "[[SRS 4.3]]"
stories:
  - "[[US-PRJ-01]]"
business_rules: []
permission_rows:
  - "[[Create-Edit-Archive Project|Create/Edit/Archive Project]]"
data_fields:
  - "[[Project#name|Project.name]]"
  - "[[Project#identifier|Project.identifier]]"
tags:
  - kind/requirement
  - module/projects
---

## Requirement

The system shall allow users with sufficient permission to create a [[Project]] by providing at minimum a Name. An [[Identifier]] shall be auto-generated (slug) from the Name when the Project is saved, and shall be editable after creation through the Project's 'Change identifier' form.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Corrected 2026-08-13 against OpenProject 16 (deployed image openproject/openproject:16-slim; Rails
source stable/16, HEAD 53daf3c). The previous wording said the [[Identifier]] was auto-generated on the
create form and "editable before save", and [[TC-PRJ-001-02]] tested editing it there. Both are false in
v16 and no test could satisfy them:

- /projects/new renders no Identifier field at all, and has no "Advanced settings" disclosure. The
  form is Name + "Subproject of" (+ optional template and project custom fields).
- The Identifier is generated server-side on save by acts_as_url (app/models/project.rb:174-181:
  url_attribute: :identifier, sync_url: false, only_when_blank: true, limit: 100).
- It becomes editable only after creation, at /projects/:id/identifier, reached from [[Project]]
  settings -> Information -> "Change identifier".

The create form's Create button is also never disabled (disabled: false in
Projects::SubmitOrCancel#default_submit_options), so "Create becomes enabled" was removed from
[[TC-PRJ-001-01]]'s expected result rather than restated: it can never fail. An empty Name is rejected
server-side and rendered inline (.FormControl-inlineValidation, aria-invalid on the input) with no
navigation and no flash banner.

Deliberately not asserted here, because this run did not verify them: the exact suffix stringex
appends when a generated slug collides, and the transliteration of non-ASCII Names. Assert slug
*shape* plus a known unique suffix rather than an exact computed string.
