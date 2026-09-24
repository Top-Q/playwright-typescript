---
id: FR-WP-015
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-04]]"
business_rules: []
permission_rows:
  - "[[Edit any Work Package]]"
data_fields:
  - "[[WorkPackage#percent_done|WorkPackage.percent_done]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall persist and display the percentage-complete value in the range 0-100 for applicable [[WorkPackage|Work Package]] types.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

No explicit story mentions percent-complete; linked to [[US-WP-04]] (scheduling/progress visibility) by inference.
