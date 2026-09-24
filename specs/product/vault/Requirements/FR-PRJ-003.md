---
id: FR-PRJ-003
source: "[[SRS 4.3]]"
stories:
  - "[[US-PRJ-01]]"
business_rules: []
permission_rows:
  - "[[Create-Edit-Archive Project|Create/Edit/Archive Project]]"
data_fields:
  - "[[Project#name|Project.name]]"
  - "[[Project#identifier|Project.identifier]]"
tags:
  - kind/requirement
  - module/projects
---

## Requirement

The system shall reject [[Project]] creation if the Name is empty or the [[Identifier]] collides with an existing project, and shall display an inline validation error.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
