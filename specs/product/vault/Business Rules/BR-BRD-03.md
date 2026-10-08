---
id: BR-BRD-03
source: "[[SRS 6.4]]"
tags:
  - kind/business-rule
  - module/boards
---

## Rule

A [[Board]] must have a Title, but Titles need not be unique: two Boards in the same [[Project]] may share a Title, in the same or a different case. ^rule

## Evidence

Corrected 2026-10-08 against OpenProject 16 (Rails source `stable/16`, v16.6.10). The previous
wording — Titles unique within a Project, case-insensitive — matched nothing in the source:

- The only validation on a Board's name is presence:
  `modules/boards/app/models/boards/grid.rb:32` (`validates_presence_of :name`).
- Neither the grid contract (`modules/grids/app/contracts/grids/base_contract.rb:36-56`) nor the
  base model (`modules/grids/app/models/grids/grid.rb`) checks uniqueness.

Observed live 2026-10-08: in Demo project, Boards titled 'Sprint Board' and then 'sprint board'
were both created with no error.

## Referenced by

![[Referenced by.base]]
