---
id: FR-BRD-002
source: "[[SRS 6.3]]"
stories:
  - "[[US-BRD-03]]"
business_rules: []
permission_rows:
  - "[[Move cards on Board (drag-and-drop)]]"
data_fields:
  - "[[BoardList#backing_attribute|BoardList.backing_attribute (status/version/none)]]"
tags:
  - kind/requirement
  - module/boards
---

## Requirement

For an [[Action Board|Action board]] backed by Status, the system shall auto-generate one column per Status defined in the relevant [[Workflow|workflow]], and moving a [[Card|card]] between columns shall update the [[WorkPackage|Work Package]]'s Status accordingly.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
