---
tags:
  - kind/index
---

# OpenProject requirement graph

This vault is the source of truth for the requirements. For coverage at a glance — what is approved, what is automated, which tests are stale — open the [[Dashboard|test dashboard]].

Start at the [[SRS]], or at a module:

- [[boards|Boards]]
- [[members-roles|Members & Roles]]
- [[projects|Projects]]
- [[work-packages|Work Packages]]

## Cross-cutting

- [[RBAC Matrix]]
- [[Data Model]]
- [[Glossary]]
- [[Constraints]]
- [[Clarification Questions]]
- [[Non-Functional Requirements]]

## Needs attention

Test cases awaiting your approval, open questions, test cases with no actor, approved test cases no test automates yet, stale tests (their test case changed after they were built), and tests that cover no test case. Each test has a generated note in `Automated Tests/`. New notes start from `_templates/` (Templates → Insert template).

To approve a test case, read it and tick `approved`; to reject one, tick `rejected` and say why under `## Notes`. Both checkboxes are editable right in the Awaiting approval table. `npm.cmd run vault:lint -- --fix` then records exactly which text you approved, and if that text changes later, it unticks `approved` for you to approve again.

![[Needs attention.base]]

Every note carries a `kind/*` tag, and a `module/*` tag where it belongs to one. `npm.cmd run vault:lint` checks every note against its kind.
