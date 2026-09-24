---
id: FR-BRD-003
source: "[[SRS 6.3]]"
stories:
  - "[[US-BRD-04]]"
business_rules:
  - "[[BR-BRD-01]]"
permission_rows:
  - "[[Create-Delete Board|Create/Delete Board]]"
data_fields:
  - "[[BoardList#name|BoardList.name]]"
  - "[[BoardList#position|BoardList.position]]"
tags:
  - kind/requirement
  - module/boards
---

## Requirement

For a [[Basic Board|Basic board]], the system shall allow manually creating, renaming, reordering, and deleting columns ('lists'), independent of any [[WorkPackage|Work Package]] attribute.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
