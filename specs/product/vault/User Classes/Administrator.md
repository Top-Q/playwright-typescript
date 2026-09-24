---
id: Administrator
name: Administrator
rbac_column: admin
aliases:
  - Admin
source: "[[SRS 2.3]]"
tags:
  - kind/user-class
---

Full system access; manages all projects, users, and global settings.

Typical permissions: All permissions, including Members & Roles management.

## RBAC matrix column

```base
filters:
  and:
    - file.hasTag("kind/permission")
views:
  - type: table
    name: Administrator
    order:
      - file.name
      - admin
```

## Referenced by

![[Referenced by.base]]
