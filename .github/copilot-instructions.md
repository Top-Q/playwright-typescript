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

## General Guidelines

* **Read Class and Method Comments**: Always read the class and method comments in the page objects to understand their purpose and usage.


## References

- **Page Object Examples**: `/src/po/`
- **Test Fixtures**: `readyOverviewPage` in test setup
- **Playwright MCP**: for DOM inspection and selector validation during triage
- **Chat Modes**:
  - *Implement Page Objects* — build/maintain POMs via Playwright/MCP.
  - *Write Tests* — generate tests from business specs using POMs.
  - *Test Execution* — run tests, confirm commands, analyze failures.
