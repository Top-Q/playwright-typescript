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

## Automation Workflow

### 1. Generate Page Objects
- Start from recorded Playwright scripts or MCP-based site scans.
- For each distinct screen, create a **locator-only Page Object Model (POM)** class.
- Include **`.describe()` documentation** for each locator, explaining its business purpose and navigation behavior.
- Do not use headless mode when scanning; explore all reachable links/buttons, return from external links.
- Follow the existing POM style in `/page-objects/`.

### 2. Write Tests from Business Specs
- Accept **business-language** prompts (e.g., “Add a workflow of type Task and verify it exists”) — never require low-level UI steps in the prompt.
- Use only provided POM locators — **no raw selectors**.
- Wrap all steps in `test.step()` with **Gherkin prefixes**: Given, When, Then, And, But.
- Follow the `readyOverviewPage` fixture usage unless instructed otherwise.

### 3. Execute and Analyze Tests
- Use Playwright CLI (`npx playwright test`) for execution.
- Always display and confirm the exact command before execution.
- Run only the requested test(s) using `-g "<test name>"`.
- On failure:
  - Summarize error and pinpoint the failing step.
  - Suggest **minimal fixes** (selector, wait, or data adjustment).
  - Use Playwright MCP tools (if enabled) to inspect DOM, validate selectors, and propose stable alternatives.
- Support running “last implemented test” by identifying the newest test in the file.

---

## Page Object Rules

- **Locator-only** — no helper methods.
- Class name format: `<Name>Page`.
- Locator names: `camelCase` and self-descriptive (e.g., `signInButton`, `userNameTextBox`).
- **Selectors**: Prefer `data-testid`, ARIA roles, or `getByText`; avoid brittle CSS/XPath.
- **Navigation**: Instantiate a new Page Object only when documented navigation occurs.
- **Child Selection** inside locators: only `.getByText()`, `.getByRole()`, or `.nth()`.

**Example:**
```ts
export class WorkPackagesPage {
  constructor(private readonly page: Page) {}

  /** Create button - navigates to NewTaskPage */
  readonly createButton: Locator = this.page
    .getByRole('button', { name: 'Create' })
    .describe('Create work package button');
}
```

---

## Test Rules

- **Fixture**: Always use `readyOverviewPage` for a logged-in, project-ready state unless explicitly told otherwise.
- **Structure**: One business scenario per file.
- **Steps**: One `test.step()` per action/assertion, using Gherkin prefixes.
- **Assertions**: Focus on business outcomes (entity visible, created, updated) rather than incidental UI state.
- **Naming**: Use clear, business-relevant test names.

---

## Execution Rules (from Test Execution Mode)

1. **Transparency**: Always display the command before running.
2. **Isolation**: Use `-g` to run only the named test.
3. **Confirmation**: Confirm command correctness before execution.
4. **Logging**: Present commands in a copyable format.
5. **Failure Investigation**:
   - Provide specific error message, failing step, possible causes.
   - Suggest fixes based on POM and selector guidelines.
6. **Run Last Test**: Identify the most recently added test and run it by name.

---

## Common Patterns

| Task                      | Example                                                                 |
|---------------------------|-------------------------------------------------------------------------|
| Navigate to Work Packages | `await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();` |
| Create Task               | `await workPackagesPage.createButton.click();` + fill form in `NewTaskPage` |
| Assert Created Entity     | `await expect(page.locator(...)).toBeVisible();`                         |

---

## Guardrails

- No `waitForTimeout` — rely on Playwright’s auto-waiting and assertions.
- No brittle CSS or XPath selectors.
- No navigation assumptions — follow locator documentation.
- Keep tests idempotent and parallel-safe.
- Use descriptive `.describe()` on every locator.

---

## References

- **Page Object Examples**: `/page-objects/`
- **Test Fixtures**: `readyOverviewPage` in test setup
- **Playwright MCP**: for DOM inspection and selector validation during triage
- **Chat Modes**:
  - *Create Page Objects* — build/maintain POMs via Playwright/MCP.
  - *Write Tests* — generate tests from business specs using POMs.
  - *Test Execution* — run tests, confirm commands, analyze failures.
