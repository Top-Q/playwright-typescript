---
section: "11"
title: Acceptance Criteria Summary
aliases:
  - 11 Acceptance Criteria Summary
sections: []
tags:
  - kind/srs-chapter
---

# 11. Acceptance Criteria Summary

Each Functional Requirement (FR-xxx) in Sections [[SRS 4|4]]-[[SRS 7|7]] shall have at least one corresponding automated or manual test case verifying its positive path, and at least one negative/edge case where validation or permission enforcement applies. The following table summarizes traceability categories to guide test-case generation:

| Module | Positive Path Focus | Negative / Edge Focus | [[Permission]] Focus |
| --- | --- | --- | --- |
| [[Project\|Projects]] | Create, edit, archive, hierarchy | Duplicate identifier, empty name | Non-manager cannot create/delete |
| [[WorkPackage\|Work Packages]] | Create, transition status, relate, attach | Invalid dates, oversized attachment, circular relation | [[Viewer]] cannot edit; [[Workflow\|workflow]]-restricted transitions |
| [[Board\|Boards]] | Create board, add/move [[Card\|cards]], delete board | Duplicate board title, deleting last required column | Only managers can create/delete boards |
| [[Member\|Members]] & [[Role\|Roles]] | Invite member, assign/change role, remove member | Remove last manager, invite duplicate | Only managers can invite/remove/assign roles |

## Referenced by

![[Referenced by.base]]
