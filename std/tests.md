# Test Cases

## Work packages Test Cases

*Test*: Create work package from type task

Given the user is on the Work packages table
When the user create a new work package from type task
And the user adds a random name and description
And the user saves the work package
Then the work package is added to the system

*Test*: Delete work package from type task

Given the user is on the work packages table
And the user creates work package from type task
And the user gets back to Work packages page
When the user deletes the work package
Then the work package no longer exists


*Test*: Create work package from type phase

Given the user is on the Work packages table
When the user create a new work package from type phase
And the user adds a random name and description
And the user saves the work package
Then the work package is added to the system

*Test*: Create work package from type milestone

Given the user is on the Work packages table
When the user create a new work package from type milestone
And the user adds a random name and description
And the user saves the work package
Then the work package is added to the system



## Board Test Cases

*Test*: Create basic board

Given the user is on the boards page
When the user creates a new basic board with the name "Automated board<random>"
And the user adds a list with the name "Automated List<random>"
And the user returns to the boards page
Then the new board is visible on the boards page table

*Test*: Create basic board and delete it

Given the user is on the boards page
And the user creates a new basic board with the name "Automated board<random>"
And the user returns to the boards page
When the user deletes the board from the boards page
Then the board is no longer visible on the boards page table

*Test*: Delete all boards
Given the user is on the boards page
And there are boards on the boards table
When the user deletes all boards in the table
Then there are no boards left in the table
