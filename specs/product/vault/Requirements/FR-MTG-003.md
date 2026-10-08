---
id: FR-MTG-003
tags:
  - kind/requirement
  - module/meetings
---

## Requirement

The system shall let a user delete a meeting from its page; the meeting is then removed from the Project's meetings list.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Evidence

Observed by a passing automated test; the tests are the source of truth for this demo (decided 2026-10-08), not the SRS. Not re-run on 2026-10-08: the app was down.

- Deleting a meeting from its page returns to the meetings list, which no longer lists it: `tests/ui/meetings/meetings.spec.ts:64`.
