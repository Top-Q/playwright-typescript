---
aliases:
  - Create/Delete Board
action: Create/Delete Board
admin: "Yes"
project_manager: "Yes"
member: "Yes"
viewer: "No"
source: "[[SRS 3]]"
tags:
  - kind/permission
---

A row of the [[RBAC Matrix]]; [[RBAC-01]] and [[RBAC-02]] govern every row.

## Evidence

Corrected 2026-10-08 against OpenProject 16 (Rails source `stable/16`, v16.6.10). The Team Member
column said "No"; the app's Member role can create and delete Boards:

- Creating and deleting a Board — UI and API alike — needs `manage_board_views`:
  `modules/boards/lib/open_project/boards/engine.rb:36-40` (`boards/boards` `new create destroy`,
  contract actions `create update destroy`).
- The default Member role is seeded with it, and Reader is not:
  `modules/boards/app/seeders/common.yml:34-41`.

Read from the running app's database 2026-10-08: Member and Project admin hold
`manage_board_views`; Reader holds only `show_board_views`. Not yet observed in the browser as a
Member.

## Referenced by

![[Referenced by.base]]
