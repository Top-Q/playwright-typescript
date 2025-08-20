---
id: WP-Create-Task
suite: Work Packages
feature: Work packages CRUD
component: work-packages
priority: P2
tags: [ui,task,regression]
variables:
  workPackageType: task
  name: "Auto WP <uuid4>"
  description: "Auto description <timestamp>"
---


Background:
  Given the user is authenticated as "default"
  And the user is on the Work packages page

Scenario: Create work package (task)
  When the user creates a new work package of type "<workPackageType>"
  And the user sets the work package name to "<name>"
  And the user sets the work package description to "<description>"
  And the user saves the work package
  And the user filter for work package with name "<name>"
  Then the work package named "<name>" exists in the work packages table

---
id: WP-Delete-Task
suite: Work Packages
feature: Work packages CRUD
component: work-packages
priority: P2
tags: [ui,task,regression]
variables:
  workPackageType: task
  name: "Auto WP <uuid4>"
setup:
  - create_work_package: { type: "{{ workPackageType }}", name: "{{ name }}" }
---


Background:
  Given the user is authenticated as "default"
  And the user is on the Work packages page

Scenario: Delete work package (task)
  When the user deletes the work package named "<name>"  
  Then the work package named "<name>" does not exist in the work packages table


---
id: WP-Create-Phase
suite: Work Packages
feature: Work packages CRUD
component: work-packages
priority: P2
tags: [ui,phase,regression]
variables:
  workPackageType: phase
  name: "Auto WP <uuid4>"
  description: "Auto description <timestamp>"
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Work packages page

Scenario: Create work package (phase)
  When the user creates a new work package of type "<workPackageType>"
  And the user sets the work package name to "<name>"
  And the user sets the work package description to "<description>"
  And the user saves the work package
  Then the work package named "<name>" exists in the system

---
id: WP-Delete-Phase
suite: Work Packages
feature: Work packages CRUD
component: work-packages
priority: P2
tags: [ui,phase,regression]
variables:
  workPackageType: phase
  name: "Auto WP <uuid4>"
setup:
  - create_work_package: { type: "{{ workPackageType }}", name: "{{ name }}" }
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Work packages page

Scenario: Delete work package (task)
  When the user deletes the work package named "<name>"
  Then the work package named "<name>" does not exist in the system


