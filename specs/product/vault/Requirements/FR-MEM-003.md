---
id: FR-MEM-003
source: "[[SRS 7.3]]"
stories:
  - "[[US-MEM-05]]"
business_rules: []
permission_rows:
  - "[[View Project-WP-Boards|View Project/WP/Boards]]"
data_fields:
  - "[[Member#status|Member.status (active/invited)]]"
  - "[[Member#created_at|Member.created_at]]"
tags:
  - kind/requirement
  - module/members-roles
---

## Requirement

The system shall display the [[Member|Members]] list with columns: Name, Email, [[Role]](s), Status (Active/Invited), and Date Added, sortable and searchable.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
