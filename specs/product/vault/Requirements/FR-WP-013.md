---
id: FR-WP-013
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-08]]"
business_rules:
  - "[[BR-WP-04]]"
permission_rows:
  - "[[Delete Work Package]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall not delete a [[WorkPackage|Work Package]] that has child Work Packages, open or closed, until the user explicitly acknowledges that all of its descendants will be deleted with it.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Corrected 2026-09-23 together with [[BR-WP-04]], which carries the evidence. The previous wording protected only Work Packages with *open* children; OpenProject asks for the acknowledgement whenever there are children at all. The `WorkPackage.status` data field was dropped for the same reason: the children's status plays no part.
