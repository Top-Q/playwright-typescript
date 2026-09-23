---
id: BRD-Create
suite: Boards
feature: Boards CRUD
component: boards
priority: P1
tags: [ui, board, regression]
variables:
    boardName: 'Automated board <uuid4>'
    listName: 'Automated List <rand4>'
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
