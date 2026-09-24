---
id: NFR-REL-001
category: Reliability
source: "[[SRS 8]]"
related_frs:
  - "[[FR-WP-006]]"
tags:
  - kind/nfr
---

Concurrent edits to the same [[WorkPackage|Work Package]] by two users shall be detected (optimistic locking) and the second submitter shall be prompted to reconcile rather than silently overwrite.

## Notes

ID invented for tracking purposes; source doc's NFR table (Section [[SRS 8|8]]) has no native IDs. related_frs is inferred, not stated in source.

## Referenced by

![[Referenced by.base]]
