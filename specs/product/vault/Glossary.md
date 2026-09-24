---
tags:
  - kind/index
---

Sections [[SRS 1.4|1.4]] and [[SRS 12|12]] of the source document. Terms that name an entity live on the entity.

```base
filters:
  or:
    - file.hasTag("kind/term")
    - file.hasTag("kind/entity")
views:
  - type: table
    name: Glossary
    order:
      - file.name
      - aliases
```
