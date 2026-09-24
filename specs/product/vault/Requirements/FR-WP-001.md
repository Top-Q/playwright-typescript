---
id: FR-WP-001
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-01]]"
business_rules: []
permission_rows:
  - "[[Create Work Package]]"
data_fields:
  - "[[WorkPackage#subject|WorkPackage.subject]]"
  - "[[WorkPackage#type|WorkPackage.type]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall require Type and Subject (title) fields when creating a [[WorkPackage|Work Package]]; all other fields are optional at creation unless configured as required by an [[Administrator]].

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
