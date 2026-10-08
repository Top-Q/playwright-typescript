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

The system shall allow removing a [[Member]] from a [[Project]], revoking the permissions of their [[Role|Roles]] immediately. On a private [[Project]] they lose access to it; on a public one they keep only what every logged-in non-member has. Any [[WorkPackage|Work Packages]] previously assigned to them shall remain but display the (now former) member's name with an 'inactive/removed' indicator.

## Evidence

Corrected 2026-10-08 against OpenProject 16 (Rails source `stable/16`, v16.6.10). The previous
wording — removal revokes the member's access to the Project — holds only for a private Project:

- On a public Project, a logged-in user with no membership is given the built-in Non member role:
  `app/services/authorization/user_project_roles_query.rb:43-58` (`Role::BUILTIN_NON_MEMBER`,
  `app/models/role.rb:34`). Demo project is public, and its Non member role holds `view_project`,
  `view_work_packages`, `view_wiki_pages` and `show_board_views`, so a removed member can still
  view it.
- Removing the member destroys its member roles: `app/services/members/delete_service.rb:34-41`.
  What is lost is every permission the Non member role lacks — on Demo project, the Member role's
  `add_work_packages`, `edit_work_packages` and `view_members`.
- The work package list's Create button is disabled for a user without the
  `work_packages/create` capability:
  `frontend/src/app/features/work-packages/components/wp-buttons/wp-create-button/wp-create-button.component.ts:83-102`.

Project visibility and the Non member permissions were read from the running app's database.
Not yet observed in the browser.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
