---
id: FR-MEM-008
source: "[[SRS 7.3]]"
stories:
  - "[[US-MEM-02]]"
  - "[[US-MEM-03]]"
business_rules: []
permission_rows: []
data_fields: []
tags:
  - kind/requirement
  - module/members-roles
---

## Requirement

The system shall enforce that permission checks are evaluated as the union of all [[Role|Roles]] a [[Member]] holds within a given [[Project]].

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Not tied to a single story or RBAC row in the source doc; underpins any scenario involving a [[Member]] with multiple concurrent [[Role|Roles]].
