---
id: FR-WP-002
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-01]]"
business_rules: []
permission_rows:
  - "[[Create Work Package]]"
data_fields:
  - "[[WorkPackage#subject|WorkPackage.subject]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall constrain the Subject field to a maximum of 255 characters and reject empty/whitespace-only values.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
