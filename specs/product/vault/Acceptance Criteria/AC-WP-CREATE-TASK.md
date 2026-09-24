---
id: AC-WP-CREATE-TASK
title: Create Task Work Package
source: "[[SRS 5.6]]"
exemplifies:
  - "[[FR-WP-001]]"
  - "[[FR-WP-002]]"
  - "[[FR-WP-003]]"
  - "[[FR-WP-004]]"
tags:
  - kind/acceptance-sample
  - module/work-packages
---

## Criteria

- Given I am on the [[WorkPackage|Work Packages]] list of the [[Demo Project]], when I click 'Create new Work Package' and select Type 'Task', then a creation form/panel opens with Subject required.
- Given a valid Subject, when I click Save, then the [[WorkPackage|Work Package]] is created with Status='New', appears in the list, and its detail view shows an auto-generated ID.
- Given an empty Subject, when I click Save, then a validation error is shown and no [[WorkPackage|Work Package]] is created.
- Given a Task in 'New' status, when I change Status to 'Closed' directly (skipping 'In Progress'), then the system either allows it if the [[Workflow|workflow]] permits or shows only valid transitions in the dropdown.

## Notes

Use as style/format reference for generated test cases; these are already human-approved, do not regenerate them from scratch.
