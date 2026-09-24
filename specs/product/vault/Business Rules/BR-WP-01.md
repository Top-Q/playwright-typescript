---
id: BR-WP-01
source: "[[SRS 5.5]]"
tags:
  - kind/business-rule
  - module/work-packages
---

## Rule

A Work Package that another open Work Package blocks (through a 'blocks' relation) cannot be moved to a closed status. Closed statuses are not offered in its Status selector, for any user regardless of role, and setting one through the API is rejected as an invalid status transition. The block lifts once every blocking Work Package is closed. ^rule

## Referenced by

![[Referenced by.base]]

## Evidence

Corrected 2026-09-23 against OpenProject 16 (Rails source `stable/16`, v16.6.10). The previous wording — open child Work Packages "flagged as blocking", with an override for users holding Manage permission — matched nothing in the source:

- Blocking is a 'blocks' relation between any two Work Packages, not a property of children: `app/models/work_package.rb:248`.
- A blocked Work Package loses every closed status from its assignable statuses, for every user: `app/contracts/work_packages/base_contract.rb:639`, pinned by the upstream spec "removes closed statuses if blocked" (`spec/contracts/work_packages/base_contract_spec.rb:1481`).
- Setting one anyway fails as `status_transition_invalid`: `base_contract.rb:328`.

Not yet verified in the running app. The SRS (`openproject-demo-requirements.docx`) was corrected to the same wording.
