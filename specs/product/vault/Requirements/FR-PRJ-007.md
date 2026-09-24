---
id: FR-PRJ-007
source: "[[SRS 4.3]]"
stories:
  - "[[US-PRJ-04]]"
business_rules: []
permission_rows:
  - "[[Create-Edit-Archive Project|Create/Edit/Archive Project]]"
data_fields:
  - "[[Project#archived|Project.archived]]"
tags:
  - kind/requirement
  - module/projects
---

## Requirement

The system shall allow re-activation (unarchiving) of an archived [[Project]] by a user with [[Administrator]] permission.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Ambiguity flagged for clarification: this FR restricts unarchiving to [[Administrator]] only, but the RBAC matrix's 'Create/Edit/Archive [[Project]]' row grants [[Project Manager]] 'Yes (own project)' with no unarchive exception noted. Confirm with stakeholder whether PM can unarchive their own project or Admin-only is intentional before generating permission test cases.
