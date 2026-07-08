# Clarification Questions — OpenProject Demo Requirements

Ambiguities surfaced while deriving test cases from `openproject-demo-requirements.docx`. Each item lists the conflicting/underspecified source text, why it blocks a confident test case, and the specific question to put to a stakeholder before finalizing expected results.

Status legend: 🔴 Open — no answer yet.

---

## CQ-01 — Can a Project Manager unarchive their own Project?

**Status:** 🔴 Open
**Source:** FR-PRJ-007 (Sec 4.3), RBAC matrix (Sec 3)
**Affected test case:** `TC-PRJ-007-02`

FR-PRJ-007 states re-activation (unarchiving) is allowed "by a user with Administrator permission" — implying Administrator-only. But the RBAC matrix's **"Create/Edit/Archive Project"** row grants Project Manager **"Yes (own project)"**, and doesn't carve out an exception for unarchiving specifically. Archiving and unarchiving are usually treated as symmetric actions, so the asymmetry looks like it could be a drafting oversight rather than intentional.

**Question:** Should a Project Manager be able to unarchive their own Project (matching their archive permission), or is Administrator-only intentional and the RBAC matrix needs a footnote/exception added?

---

## CQ-02 — Do Board drag-and-drop moves bypass Work Package workflow restrictions?

**Status:** 🔴 Open
**Source:** FR-BRD-002 (Sec 6.3) vs. FR-WP-004 / BR-WP-01 (Sec 5.3, 5.5)
**Affected test case:** `TC-BRD-002-03`

FR-WP-004 says Status transitions are restricted to those defined in the active workflow for the Work Package's Type and the user's Role, and BR-WP-01 blocks closing a Work Package with open blocking children. FR-BRD-002 says moving a card on an Action Board updates the underlying Work Package's Status, but doesn't state whether that move is still subject to the same workflow/role restrictions, or whether Board drag-and-drop is a privileged path that bypasses them.

**Question:** If a user drags a card to a column representing a Status their Role/the Type's workflow wouldn't normally allow (or one blocked by BR-WP-01's open-children rule), should the drag be rejected/reverted, or does the Board UI intentionally allow it?

---

## CQ-03 — What happens to cards when a Basic Board list is deleted?

**Status:** 🔴 Open
**Source:** FR-BRD-003 (Sec 6.3), BR-BRD-02 (Sec 6.4)
**Affected test case:** `TC-BRD-003-05`

FR-BRD-003 allows deleting a Basic Board list ("column"). BR-BRD-02 confirms the underlying Work Package is never deleted when removed from a Board. What's unspecified is the behavior when the *list itself* is deleted while it still contains cards: are the cards silently dropped from the Board (Work Packages unaffected, per BR-BRD-02), or does the system require the list to be emptied/cards relocated first?

**Question:** Should deleting a non-empty list be blocked until it's emptied, or allowed with cards simply removed from the Board (while the underlying Work Packages remain untouched)?

---

## CQ-04 — Are circular Project hierarchies rejected, like circular Work Package relations?

**Status:** 🔴 Open
**Source:** FR-PRJ-005 (Sec 4.3) vs. FR-WP-008 (Sec 5.3)
**Affected test case:** `TC-PRJ-005-02`

FR-WP-008 explicitly rejects circular parent/child relations between Work Packages. FR-PRJ-005 allows nesting a Project under a Parent Project but says nothing about whether the same circularity check applies to Project hierarchies (e.g., setting Project A's parent to one of its own descendants).

**Question:** Should the system reject circular Project hierarchies the same way it rejects circular Work Package relations, and if so, what error should be shown?

---

## CQ-05 — Is the direct New → Closed Work Package transition allowed?

**Status:** 🔴 Open
**Source:** FR-WP-004 (Sec 5.3), Sec 5.4 representative workflow, Sec 5.6 sample acceptance criteria
**Affected test case:** `TC-WP-004-02`

The representative workflow diagram (Sec 5.4) doesn't list a direct New → Closed transition — only New → In Progress → Closed or New → Rejected. But the document's own sample acceptance criteria (Sec 5.6) hedges: *"the system either allows it if the workflow permits or shows only valid transitions in the dropdown"* — i.e., the doc itself doesn't commit to an answer.

**Question:** Is direct New → Closed a valid transition for the default Task workflow, or should the Status selector only ever show 'In Progress' or 'Rejected' from 'New'? (This also determines whether `TC-WP-004-02`'s current wording needs to become a hard pass/fail assertion instead of a conditional one.)

---

## CQ-06 — Is the 100MB attachment limit inclusive or exclusive?

**Status:** 🔴 Open
**Source:** FR-WP-007 (Sec 5.3)
**Affected test case:** `TC-WP-007-03`

FR-WP-007 specifies attachments are supported "up to a configured maximum size (default 100MB)," and oversized uploads are rejected. "Up to X" is commonly read as inclusive (≤ 100MB), but boundary behavior at exactly 100MB is a classic off-by-one source of bugs and isn't explicitly confirmed.

**Question:** Should a file of exactly 100MB be accepted (≤ 100MB) or rejected (< 100MB strictly)?

---

## Summary Table

| ID | Module | FR(s) | One-line issue |
|----|--------|-------|-----------------|
| CQ-01 | Projects | FR-PRJ-007 | PM unarchive permission conflicts with RBAC matrix |
| CQ-02 | Boards / Work Packages | FR-BRD-002, FR-WP-004 | Board drag-and-drop vs. workflow restrictions |
| CQ-03 | Boards | FR-BRD-003 | Deleting a non-empty Board list — card handling undefined |
| CQ-04 | Projects / Work Packages | FR-PRJ-005, FR-WP-008 | Circular Project hierarchy not addressed |
| CQ-05 | Work Packages | FR-WP-004 | Direct New→Closed transition — doc hedges |
| CQ-06 | Work Packages | FR-WP-007 | 100MB attachment limit — inclusive or exclusive |
