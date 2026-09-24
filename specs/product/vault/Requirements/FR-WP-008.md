---
id: FR-WP-008
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-06]]"
business_rules:
  - "[[BR-WP-01]]"
permission_rows:
  - "[[Edit any Work Package]]"
data_fields:
  - "[[Relation#relation_type|Relation.relation_type]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall support relation types: 'relates to', 'blocks', 'blocked by', 'duplicates', 'duplicated by', 'parent/child'; circular parent/child relations shall be rejected.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
