---
id: FR-MTG-001
tags:
  - kind/requirement
  - module/meetings
---

## Requirement

The system shall let a user create a one-time meeting in a Project, giving it a title and optionally a location, and open the new meeting's page.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Evidence

Observed by a passing automated test; the tests are the source of truth for this demo (decided 2026-10-08), not the SRS. Not re-run on 2026-10-08: the app was down.

- Creating a one-time meeting from the Meetings page opens the meeting's page showing its title: `tests/ui/meetings/meetings.spec.ts:6`.
