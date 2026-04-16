---
name: write-web-test
description: Generate UI test cases from business requirements using existing page objects and the project's BDD test structure. Use when the user asks to write, create, or generate a UI or web test.
---

# Writing UI Tests

Use this skill when creating new UI/web test cases from business requirements or test specifications.

## Imports

- Import `test` from `./fixtures` (relative to the test file) — **never** from `@playwright/test`
- Import `expect` from `@playwright/test`
- Import page objects only from `../internals` (or the appropriate relative path to `internals.ts`)

## Test Structure

```typescript
test('description', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
    // Test steps go here
});
```

- One `test.step()` per Gherkin sentence — use the sentence exactly (or a very close, readable phrasing) as the step description
- Use the `tag` field to categorize: `@ui`, `@api`, `@regression`, `@task`, `@board`, etc.

## Variable Typing

Always define variables with the specific page object type. Never use `any` or `unknown`.

Define variables **outside** the step scope so they are accessible across steps:

```typescript
let workPackagesPage: WorkPackagesPage;
let newTaskPage: NewWorkpackagePage;

await test.step("Given user is on Work packages page", async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
});

await test.step("When user clicks create button", async () => {
    const taskTypeMenu = await workPackagesPage.clickCreateButton();
    newTaskPage = await taskTypeMenu.clickTaskMenuItem();
});
```

## Page Object Instantiation

- The **first** page object comes from the fixture (`readyOverviewPage`)
- All subsequent page objects come from **navigation methods** on the previous page object (fluent chain)
- Do **not** use `new` to instantiate page objects after the first one

## Test Isolation

- Tests must be runnable in isolation — no dependency on other tests
- Never assume test execution order
- If a test deletes an entity, it must first create that entity within the same test
- Use unique names with `Date.now()` or `crypto.randomUUID()` for test data

## Missing Methods

If a required method doesn't exist on a page object:
1. Check thoroughly — look at all methods, including aliases
2. Check if a similar method exists that can achieve the goal
3. If truly missing, write a `// TODO: Missing method - <description>` comment — **do not** implement the method in the page object

## Step-by-Step Workflow

1. **Understand the business requirement**: Read the requirement carefully
2. **Identify page objects**: Determine which POs are needed for the test
3. **Check existing methods**: Before writing, verify all required methods exist in the POs. Check for similar methods and aliases
4. **Write the test**: Follow all conventions above
5. **Verify**: Check for compilation errors, linter issues, and missing methods. Fix any issues found
