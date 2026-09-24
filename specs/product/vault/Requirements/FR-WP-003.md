---
id: FR-WP-003
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-01]]"
  - "[[US-WP-04]]"
business_rules: []
permission_rows:
  - "[[Create Work Package]]"
data_fields:
  - "[[WorkPackage#status|WorkPackage.status]]"
  - "[[WorkPackage#priority|WorkPackage.priority]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall default a new [[WorkPackage|Work Package]]'s Status to the [[Workflow|workflow]]'s initial status (e.g., 'New') and Priority to 'Normal'.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
