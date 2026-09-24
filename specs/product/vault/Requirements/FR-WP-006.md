---
id: FR-WP-006
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-03]]"
business_rules:
  - "[[BR-WP-03]]"
permission_rows:
  - "[[Edit any Work Package]]"
data_fields:
  - "[[WorkPackage#assignee_id|WorkPackage.assignee_id]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall support assigning a [[WorkPackage|Work Package]] to any current [[Member]] of the [[Project]] (single Assignee), and optionally additional [[Watcher|Watchers]].

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
