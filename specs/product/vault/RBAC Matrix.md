---
tags:
  - kind/index
---

Section [[SRS 3|3]] of the source document. [[RBAC-01]] and [[RBAC-02]] govern every row.

```base
filters:
  and:
    - file.hasTag("kind/permission")
views:
  - type: table
    name: RBAC Matrix
    order:
      - file.name
      - admin
      - project_manager
      - member
      - viewer
```
