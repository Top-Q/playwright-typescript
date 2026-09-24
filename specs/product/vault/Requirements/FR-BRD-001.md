---
id: FR-BRD-001
source: "[[SRS 6.3]]"
stories:
  - "[[US-BRD-01]]"
business_rules:
  - "[[BR-BRD-03]]"
permission_rows:
  - "[[Create-Delete Board|Create/Delete Board]]"
data_fields:
  - "[[Board#title|Board.title]]"
  - "[[Board#board_type|Board.board_type (basic/action)]]"
tags:
  - kind/requirement
  - module/boards
---

## Requirement

The system shall allow creating a [[Board]] by specifying a Title and a Board Type (Basic or [[Action Board|Action board]]) via a single combined creation form.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
