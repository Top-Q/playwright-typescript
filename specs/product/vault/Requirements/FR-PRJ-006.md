---
id: FR-PRJ-006
source: "[[SRS 4.3]]"
stories:
  - "[[US-PRJ-04]]"
business_rules:
  - "[[BR-PRJ-03]]"
permission_rows:
  - "[[Create-Edit-Archive Project|Create/Edit/Archive Project]]"
data_fields:
  - "[[Project#archived|Project.archived]]"
tags:
  - kind/requirement
  - module/projects
---

## Requirement

The system shall allow archiving of a [[Project]], which hides it from default project lists and prevents new [[WorkPackage|Work Packages]] from being created within it, while preserving all existing data.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
