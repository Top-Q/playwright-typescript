---
id: FR-MEM-006
source: "[[SRS 7.3]]"
stories:
  - "[[US-MEM-04]]"
business_rules:
  - "[[BR-MEM-03]]"
  - "[[BR-PRJ-04]]"
permission_rows:
  - "[[Invite-Remove Member|Invite/Remove Member]]"
data_fields: []
tags:
  - kind/requirement
  - module/members-roles
---

## Requirement

The system shall prevent removing the last [[Member]] holding a 'manage project' capable [[Role]], to avoid an unmanageable project.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Also enforces [[BR-PRJ-04]] ([[Project|Projects]] module) — cross-module business rule shared between [[Member|Members]] and Projects.
