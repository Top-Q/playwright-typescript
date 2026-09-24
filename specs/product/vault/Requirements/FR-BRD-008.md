---
id: FR-BRD-008
source: "[[SRS 6.3]]"
stories:
  - "[[US-BRD-01]]"
  - "[[US-BRD-04]]"
  - "[[US-BRD-05]]"
  - "[[US-BRD-03]]"
business_rules: []
permission_rows:
  - "[[Create-Delete Board|Create/Delete Board]]"
  - "[[Move cards on Board (drag-and-drop)]]"
data_fields: []
tags:
  - kind/requirement
  - module/boards
---

## Requirement

The system shall restrict [[Board]] create/delete/list-management actions to users holding 'manage boards' permission; [[Card|card]] movement (drag-and-drop) shall be permitted to any member who could otherwise edit the underlying [[WorkPackage|Work Package]].

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Cross-cutting permission rule spanning multiple stories (create/manage vs. [[Card|card]]-move), not tied to a single one in the source doc.
