---
id: Team Member
name: Team Member (Contributor)
rbac_column: member
aliases:
  - Project Member
source: "[[SRS 2.3]]"
tags:
  - kind/user-class
---

Works on assigned tasks; updates status and logs progress.

Typical permissions: Create/edit WPs they are assigned to or watch; view boards; limited member management.

## RBAC matrix column

```base
filters:
  and:
    - file.hasTag("kind/permission")
views:
  - type: table
    name: Team Member
    order:
      - file.name
      - member
```

## Referenced by

![[Referenced by.base]]
