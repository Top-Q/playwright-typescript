---
tags:
  - kind/index
---

# OpenProject requirement graph

This vault is the source of truth for the requirements. Start at the [[SRS]], or at a module:

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

Every note carries a `kind/*` tag, and a `module/*` tag where it belongs to one. `npm.cmd run vault:lint` checks every note against its kind.
