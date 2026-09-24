---
id: FR-WP-014
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-01]]"
business_rules:
  - "[[BR-WP-02]]"
permission_rows:
  - "[[Create Work Package]]"
data_fields:
  - "[[WorkPackage#type|WorkPackage.type]]"
  - "[[WorkPackage#due_date|WorkPackage.due_date]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall support a Milestone type [[WorkPackage|Work Package]] with a single Date field (no duration/Start-Due range).

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
