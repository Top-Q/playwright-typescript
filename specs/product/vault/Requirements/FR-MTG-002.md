---
id: FR-MTG-002
tags:
  - kind/requirement
  - module/meetings
---

## Requirement

The system shall let a user add agenda items to a meeting.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Evidence

Observed by a passing automated test; the tests are the source of truth for this demo (decided 2026-10-08), not the SRS. Not re-run on 2026-10-08: the app was down.

- An agenda item added on the meeting's page is listed there: `tests/ui/meetings/meetings.spec.ts:35`.
