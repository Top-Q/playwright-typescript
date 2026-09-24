---
tags:
  - kind/index
---

Section [[SRS 8|8]] of the source document.

```base
filters:
  and:
    - file.hasTag("kind/nfr")
views:
  - type: table
    name: Non-Functional Requirements
    order:
      - file.name
      - category
      - related_frs
```
