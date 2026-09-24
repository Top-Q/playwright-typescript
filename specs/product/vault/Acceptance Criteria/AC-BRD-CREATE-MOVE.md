---
id: AC-BRD-CREATE-MOVE
title: Create Board and Move Card
source: "[[SRS 6.5]]"
exemplifies:
  - "[[FR-BRD-001]]"
  - "[[FR-BRD-005]]"
  - "[[FR-BRD-002]]"
  - "[[FR-BRD-007]]"
tags:
  - kind/acceptance-sample
  - module/boards
---

## Criteria

- Given I am a [[Project Manager]] on the [[Board|Boards]] overview, when I click 'Create Board', enter a unique Title, select 'Basic' type, and click Create, then a new Board opens with a default list.
- Given a [[Board]] with at least two lists, when I drag a [[Card|card]] from List A to List B, then the card appears in List B and the change persists after page reload.
- Given an [[Action Board|Action board]] backed by Status, when I drag a [[Card|card]] to the 'Closed' column, then the underlying [[WorkPackage|Work Package]]'s Status updates to 'Closed'.
- Given a [[Board]] I no longer need, when I delete it and confirm, then it disappears from the Boards overview and its [[WorkPackage|Work Packages]] remain accessible from the Work Packages module.

## Notes

Use as style/format reference for generated test cases; these are already human-approved, do not regenerate them from scratch.
