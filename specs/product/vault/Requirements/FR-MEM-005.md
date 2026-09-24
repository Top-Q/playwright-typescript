---
id: FR-MEM-005
source: "[[SRS 7.3]]"
stories:
  - "[[US-MEM-04]]"
business_rules: []
permission_rows:
  - "[[Invite-Remove Member|Invite/Remove Member]]"
data_fields:
  - "[[Member#status|Member.status (active/invited)]]"
tags:
  - kind/requirement
  - module/members-roles
---

## Requirement

The system shall allow removing a [[Member]] from a [[Project]], revoking their access immediately; any [[WorkPackage|Work Packages]] previously assigned to them shall remain but display the (now former) member's name with an 'inactive/removed' indicator.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
