---
id: Project Manager
name: Project Manager / Member with 'Manage' role
rbac_column: project_manager
aliases: []
source: "[[SRS 2.3]]"
tags:
  - kind/user-class
---

Manages a specific project's configuration, members, and work packages.

Typical permissions: Create/edit/delete WPs, manage boards, invite/remove members, assign roles.

## RBAC matrix column

```base
filters:
  and:
    - file.hasTag("kind/permission")
views:
  - type: table
    name: Project Manager
    order:
      - file.name
      - project_manager
```

## Referenced by

![[Referenced by.base]]
