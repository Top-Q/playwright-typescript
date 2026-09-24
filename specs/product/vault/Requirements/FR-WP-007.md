---
id: FR-WP-007
source: "[[SRS 5.3]]"
stories:
  - "[[US-WP-05]]"
business_rules: []
permission_rows:
  - "[[Edit any Work Package]]"
data_fields:
  - "[[Attachment#filename|Attachment.filename]]"
  - "[[Attachment#size|Attachment.size]]"
tags:
  - kind/requirement
  - module/work-packages
---

## Requirement

The system shall support file [[Attachment|attachments]] up to a configured maximum size (default 100MB) per file; oversized uploads shall be rejected with a clear error message.

## Test cases

![[Requirement test cases.base]]

## Referenced by

![[Referenced by.base]]
