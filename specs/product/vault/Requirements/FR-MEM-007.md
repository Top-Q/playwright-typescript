---
id: FR-MEM-007
source: "[[SRS 7.3]]"
stories:
  - "[[US-MEM-06]]"
business_rules: []
permission_rows: []
data_fields:
  - "[[Role#name|Role.name]]"
  - "[[Role#permissions|Role.permissions (list)]]"
  - "[[Role#is_global_template|Role.is_global_template (bool)]]"
tags:
  - kind/requirement
  - module/members-roles
---

## Requirement

The system shall allow an [[Administrator]] to define new global [[Role|Roles]] with a name and a checklist of granular permissions (e.g., view work packages, edit work packages, manage boards, manage members).

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Global [[Role]]-template management is not represented as a row in the project-scoped RBAC matrix (Section [[SRS 3|3]]); it is implicitly [[Administrator]]-only per Section [[SRS 2.3|2.3]]'s user-class description.
