---
id: FR-MEM-001
source: "[[SRS 7.3]]"
stories:
  - "[[US-MEM-01]]"
business_rules:
  - "[[BR-MEM-01]]"
permission_rows:
  - "[[Invite-Remove Member|Invite/Remove Member]]"
data_fields:
  - "[[Member#user_id|Member.user_id]]"
  - "[[Member#status|Member.status (active/invited)]]"
tags:
  - kind/requirement
  - module/members-roles
---

## Requirement

The system shall allow inviting a [[Member]] to a [[Project]] by selecting an existing user (search by name/email/username) or entering an email address for an external invite.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
