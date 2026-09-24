---
id: FR-WP-010
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-07]]"
business_rules: []
permission_rows:
  - "[[View Project-WP-Boards|View Project/WP/Boards]]"
data_fields:
  - "[[WorkPackage#status|WorkPackage.status]]"
  - "[[WorkPackage#type|WorkPackage.type]]"
  - "[[WorkPackage#assignee_id|WorkPackage.assignee_id]]"
  - "[[WorkPackage#priority|WorkPackage.priority]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall provide list-view filtering by Status, Type, Assignee, Priority, and free-text search on Subject/Description, combinable with AND semantics.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
