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
  Then the work package named "<name>" exists in the system

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
  Then the work package named "<name>" does not exist in the system


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


---
id: BRD-Create
suite: Boards
feature: Boards CRUD
component: boards
priority: P1
tags: [ui, board, regression]
variables:
  boardName: "Automated board <uuid4>"
  listName: "Automated List <rand4>"
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Boards page

Scenario: Create basic board with a list
  When the user creates a new basic board with the name "<boardName>"
  And the user adds a list with the name "<listName>"
  And the user returns to the Boards page
  Then the board named "<boardName>" is visible on the Boards page


---
id: BRD-Create-Delete
suite: Boards
feature: Boards CRUD
component: boards
priority: P1
tags: [ui, board, regression]
variables:
  boardName: "Automated board <uuid4>"
---


Background:
  Given the user is authenticated as "default"
  And the user is on the Boards page

Scenario: Create and delete a board
  When the user creates a new basic board with the name "<boardName>"
  And the user returns to the Boards page
  And the user deletes the board named "<boardName>"
  Then the board named "<boardName>" is not visible on the Boards page

---
id: BRD-Delete-All
suite: Boards
feature: Boards maintenance
component: boards
priority: P3
tags: [ui, board, regression]
---


Background:
  Given the user is authenticated as "default"
  And the user is on the Boards page

Scenario: Delete all boards
  When the user deletes all boards in the table
  Then no boards are visible on the Boards page
