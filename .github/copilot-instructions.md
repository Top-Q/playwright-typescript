# Copilot Instructions — OpenProject Playwright E2E Automation

## Domain Context

OpenProject is a web-based project management platform with modules such as:

- **Projects** containing boards, timelines, and work packages.
- **Work Packages** (tasks, milestones) with workflows, statuses, and assignments.
- **Boards** for agile task management.
- **Members** and **Roles** to manage permissions.
- **Administration** for system configuration.

Tests simulate an **admin** user logged into the **Demo Project**.

Common business workflows include:
- Creating and editing work packages (tasks, milestones)
- Managing workflows and statuses
- Assigning members and roles
- Navigating between boards, timelines, and overview pages

---
## Gurdrails
* **Import Page Objects**: When page objects are required, import them only from the 'internals.ts' file.
* **Defining variables in a test**: Always define variables with the specific type of the page object. If needed, import the type from the `internals.ts` file and use it to define the variable.

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

* **Read Class and Method Comments**: Always read the class and method comments in the page objects to understand their purpose and usage.


## References

- **Page Object Examples**: `/src/po/`
- **Test Fixtures**: `readyOverviewPage` in test setup
- **Playwright MCP**: for DOM inspection and selector validation during triage
- **Chat Modes**:
  - *Implement Page Objects* — build/maintain POMs via Playwright/MCP.
  - *Write Tests* — generate tests from business specs using POMs.
  - *Test Execution* — run tests, confirm commands, analyze failures.

## Writing Tests
* **Missing Methods**: If you are asked to write a test that requires a method not present in the page object, first, check yourself again and make sure that there is not existing way to achive the task. In case you still think that the method is missing, do not implement it directly. Instead, write a comment in the test indicating the missing methods.