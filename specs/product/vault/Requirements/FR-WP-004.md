---
id: FR-WP-004
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-02]]"
business_rules:
  - "[[BR-WP-01]]"
permission_rows:
  - "[[Change Work Package status-workflow|Change Work Package status/workflow]]"
data_fields:
  - "[[WorkPackage#status|WorkPackage.status]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall only permit Status transitions defined in the active [[Workflow|workflow]] for the [[WorkPackage|Work Package]]'s Type and the current user's [[Role]]; disallowed transitions shall not appear in the Status selector.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Notes

Also underpins the RBAC row 'Change Work Package status/workflow' ([[SRS 3|Sec 3]]) — relevant to [[Viewer]]/[[Team Member]] permission test cases beyond just [[US-WP-02]].

Corrected 2026-09-23 together with [[BR-WP-01]]: [[TC-WP-004-03]] and [[TC-WP-004-04]] now test the rule as OpenProject 16 implements it. The evidence is on the rule.
