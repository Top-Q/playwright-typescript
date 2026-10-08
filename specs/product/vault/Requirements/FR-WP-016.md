---
id: FR-WP-016
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall let a user delete a [[WorkPackage|Work Package]] that has no children; it is then removed from the Work Packages list.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]

## Evidence

Observed by a passing automated test; the tests are the source of truth for this demo (decided 2026-10-08), not the SRS. Not re-run on 2026-10-08: the app was down.

- Deleting a Task removes it from the Work Packages list: `tests/ui/workpackage/workpackage-crud.spec.ts:79`.
- Deleting a Phase removes it from the Work Packages list: `tests/ui/workpackage/workpackage-crud.spec.ts:171`.

A Work Package with children is [[FR-WP-013]]'s case.
