---
tags:
  - kind/index
---

Section [[SRS 10|10]] of the source document: assumptions every test case inherits.

```base
filters:
  and:
    - file.hasTag("kind/constraint")
views:
  - type: table
    name: Constraints
    order:
      - file.name
```
