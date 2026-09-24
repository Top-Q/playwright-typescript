---
tags:
  - kind/index
---

Ambiguities surfaced while deriving test cases from `openproject-demo-requirements.docx`. Each item lists the conflicting/underspecified source text, why it blocks a confident test case, and the specific question to put to a stakeholder before finalizing expected results.

Status legend: 🔴 Open — no answer yet.

```base
filters:
  and:
    - file.hasTag("kind/clarification")
    - '!file.inFolder("_templates")'
views:
  - type: table
    name: Clarification Questions
    order:
      - file.name
      - title
      - status
      - blocks
```
