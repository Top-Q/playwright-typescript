---
id: BR-WP-04
source: "[[SRS 5.5]]"
tags:
  - kind/business-rule
  - module/work-packages
---

## Rule

Deleting a [[WorkPackage|Work Package]] is permanent, and deletes all of its descendants with it, whatever their status. If any Work Package being deleted has children, the user must first acknowledge that all descendants will be deleted too. If time has been logged against the Work Packages being deleted, the user must first choose what happens to those time entries: delete them, keep them without a Work Package, or reassign them to another Work Package. ^rule

## Referenced by

![[Referenced by.base]]

## Evidence

Corrected 2026-09-23 against OpenProject 16 (Rails source `stable/16`, v16.6.10). The previous wording — a soft delete, recoverable for 7 days, then a hard delete by a background job — matched nothing in the source:

- Deletion is permanent: `WorkPackages::DeleteService` calls `work_package.destroy`, and Work Packages have no soft-delete column or trash (`app/services/work_packages/delete_service.rb`).
- Descendants go with their parent, whatever their status: `destroy_descendants` in the same service.
- The acknowledgement is required when any Work Package being deleted has children, open or closed; Delete stays disabled until it is ticked: `frontend/src/app/shared/components/modals/wp-destroy-modal/wp-destroy.modal.ts:129-140`, wording in `config/locales/js-en.yml:1133-1134`.
- Logged time must be dealt with first — `destroy`, `nullify` or `reassign`: `app/models/work_package.rb:201` registers it, `app/models/work_package/time_entries_cleaner.rb:41-58` performs it, and `app/controllers/work_packages/bulk_controller.rb:61-83` asks for it.

Not yet verified in the running app. The SRS (`openproject-demo-requirements.docx`) was corrected to the same wording.
