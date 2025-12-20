---
description: 'Write tests'
tools: ['edit/createFile', 'edit/createDirectory', 'edit/editFiles', 'search', 'runTasks', 'problems', 'fetch', 'todos']
---

# Instructions for Writing Test Cases

## Reference Rules
Use the `copilot-instructions.md` file as a reference for writing test cases. Follow the structure and examples provided in that file.


## Coding Standards
- **Importing Test Function**: Always import the `test` function from the `./fixtures` file.
- **Importing Page Objects**: Import Page Objects from the `../internals`
- **Page Object Insantiation**: Except the first page object instantiation, do not use `new` keyword to instantiate Page Objects. Use the methods provided by the previous page object to get the next page object.
* **Gherkin Steps**: Create one test.step per Gherkin sentence and use the sentence exactly (or a very close, readable phrasing) as the step description.
- **Test Tags**: Use the `tag` field to categorize the test. Use tags like `ui`, `api`, `regression`, `performance`, etc. to indicate the type of test.

For example:
```ts
test('description', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
  // Test steps go here
}
```

* **Import Page Objects**: When page objects are required, import them only from the 'internals.ts' file.
* **Defining variables in a test**: *Always* define variables with the specific type of the page object. If needed, import the type from the `internals.ts` file and use it to define the variable.
Don't use generic types like `any` or `unknown` for page objects, as this can lead to type errors and make the code less readable.

For example:
```ts
import { WorkPackagesPage } from '../internals';

test('example test', async ({ readyOverviewPage }) => {
  // Define the variable with the specific type
  let workPackagesPage: WorkPackagesPage;
  
  // Use the page object methods
  workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();  
}
```
or
```ts
const boardRow: BoardTableRowComp = await boardTable.getRowByBoardName("some board name");
```
* **Defining Varialbes in Step Definitions**: In step definitions, define variables with the specific type of the page object outside the step scope. This ensures that the variable is accessible throughout the step definition and maintains type safety.
For example:
```ts
  let randomBoardName: string;
  let newBoardPage: NewBoardPage
  let boardTypePage: BoardTypePage;
  await test.step("step description", async () => {
      boardTypePage = await boardsPage.clickCreateBoardButton();
      newBoardPage = await boardTypePage.clickBasicBoardButton();
      randomBoardName = `Automated board ${Date.now()}`;
      await newBoardPage.fillBoardName(randomBoardName);
  });
```

* **Missing Methods**: If you are asked to write a test that requires a method not present in the page object, first, check yourself again and make sure that there is not existing way to achive the task. In case you still think that the method is missing, do not implement it directly. Instead, write a comment in the test indicating the missing methods.

* **Test Isolation**: Tests must be runnable in isolation and not depend on side effects from other tests. Never assume test execution order. Tests should pass when run individually or as part of the whole suite, including in parallel. 
For example, if a test should delete an entity, it must first create that entity within the same test. Never rely on another test to create or set up data for the current test.
---

## Step-by-Step Workflow
1. **Understand the Business Requirement**: Read the business requirement carefully to understand what needs to be tested.
2. **Identify the Page Objects**: Determine which page objects are needed for the test.
3. **Check Existing Methods**: Before writing test, check if all required methods are implemented in the page objects. Check for similar methods and make sure to look at the `aliases` of the methods.
4. **Write the Test**: Use the `test` function to write the test case, following the structure and examples in the `copilot-instructions.md` file.
5. **Check for Errors**: After writing the test, check for any compilation and linter errors or missing methods in the page objects. Fix any issues.
