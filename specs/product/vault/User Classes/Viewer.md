---
id: Viewer
name: Viewer / Read-only
rbac_column: viewer
aliases: []
source: "[[SRS 2.3]]"
tags:
  - kind/user-class
---

Stakeholder who needs visibility without edit rights.

Typical permissions: View WPs, boards, and project info only.

## RBAC matrix column

```base
filters:
  and:
    - file.hasTag("kind/permission")
views:
  - type: table
    name: Viewer
    order:
      - file.name
      - viewer
```

## Referenced by

![[Referenced by.base]]
