---
id: FR-WP-005
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-04]]"
business_rules: []
permission_rows:
  - "[[Edit any Work Package]]"
data_fields:
  - "[[WorkPackage#start_date|WorkPackage.start_date]]"
  - "[[WorkPackage#due_date|WorkPackage.due_date]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall validate that Due Date is not earlier than Start Date, displaying a validation error otherwise.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
