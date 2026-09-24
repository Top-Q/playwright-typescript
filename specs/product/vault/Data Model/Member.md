---
id: Member
aliases:
  - Members
source: "[[SRS 9]]"
tags:
  - kind/entity
---

**Member** — A user (or group) associated with a project via one or more roles

## Relationships

belongs to [[Project]] and User; has many [[Role|Roles]] (via join)

## Attributes

### id

### user_id

### project_id

### status

(active/invited)

### created_at

## Referenced by

![[Referenced by.base]]
