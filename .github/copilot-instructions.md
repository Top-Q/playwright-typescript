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

## Project File Structure
- **Page Objects**: Located in `/src/po/openproject/`
  - **General**: Common components like overview, main menu, project selection.
  - **Work Packages**: Specific components for work package management.
  - **Boards**: Components for board management.
- **Tests**: Located in `/tests/ui/`
  - **UI Tests**: Playwright tests for UI interactions.
  - **API Tests**: API tests for backend interactions.

## Naming Conventions
- **Page Objects Classes**: Use `PascalCase` (e.g., `WorkPackagesPage`)
- **Page Object Files**: use `camelCase` structured as `<page-object-name>.ts` (e.g., `workPackagePage.ts`)
- **Components Classes**: Use `PascalCase` (e.g., `MainMenuComp`)
- **Test Files**: Use `kebab-case` structured as `<feature>.spec.ts` (e.g., `work-packages-crud.spec.ts`)

## References
- **Chat Modes**:
  - *Implement Page Objects* — build/maintain POMs via Playwright/MCP.
  - *Write Tests* — generate tests from business specs using POMs.
  - *Test Execution* — run tests, confirm commands, analyze failures.
