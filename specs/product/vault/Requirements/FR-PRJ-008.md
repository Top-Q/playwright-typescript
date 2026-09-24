---
id: FR-PRJ-008
source: "[[SRS 4.3]]"
stories:
  - "[[US-PRJ-06]]"
business_rules:
  - "[[BR-PRJ-02]]"
permission_rows:
  - "[[Delete Project]]"
data_fields:
  - "[[Project#identifier|Project.identifier]]"
tags:
  - kind/requirement
  - module/projects
---

## Requirement

The system shall allow permanent deletion of a [[Project]] by an [[Administrator]] only, after an explicit confirmation step (type-to-confirm project name).

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
