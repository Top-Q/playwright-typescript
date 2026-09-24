---
aliases:
  - Work Packages
tags:
  - kind/module
  - module/work-packages
---

# Work Packages

```base
filters:
  and:
    - file.hasTag("module/work-packages")
views:
  - type: table
    name: Requirements
    filters:
      and:
        - file.hasTag("kind/requirement")
    order:
      - file.name
      - source
  - type: table
    name: Test cases
    filters:
      and:
        - file.hasTag("kind/test-case")
    order:
      - file.name
      - requirement
      - type
      - title
  - type: table
    name: User stories
    filters:
      and:
        - file.hasTag("kind/user-story")
    order:
      - file.name
      - actor
  - type: table
    name: Business rules
    filters:
      and:
        - file.hasTag("kind/business-rule")
    order:
      - file.name
      - source
  - type: table
    name: Open questions
    filters:
      and:
        - file.hasTag("kind/clarification")
    order:
      - file.name
      - title
      - status
      - blocks
```
