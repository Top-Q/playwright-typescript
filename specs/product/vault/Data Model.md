---
tags:
  - kind/index
---

Section [[SRS 9|9]] of the source document.

```base
filters:
  and:
    - file.hasTag("kind/entity")
views:
  - type: table
    name: Data Model
    order:
      - file.name
      - aliases
```
