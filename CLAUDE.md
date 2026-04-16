# OpenProject Playwright E2E Automation

## Domain Context

OpenProject is a web-based project management platform with modules such as:

- **Projects** containing boards, timelines, and work packages.
- **Work Packages** (tasks, milestones) with workflows, statuses, and assignments.
- **Boards** for agile task management.
- **Members** and **Roles** to manage permissions.
- **Administration** for system configuration.

Tests simulate an **admin** user logged into the **Demo Project**.

- UI: `http://localhost:8090`
- API: `http://localhost:8080` (docs at `http://localhost:8080/api/docs`)

## Project Structure

```
<project-root>/
├── src/po/openproject/           # Page objects and components
│   ├── basePage.ts               # Abstract base for all pages
│   ├── baseComponent.ts          # Abstract base for all components
│   ├── general/                  # Login, home, overview, main menu, project selection
│   ├── workpackage/              # Work package pages and components
│   └── board/                    # Board pages and components
├── src/api/                      # Fluent API client (OpenProjectClient)
├── tests/
│   ├── ui/                       # UI test specs + fixtures.ts
│   └── api/                      # API test specs + fixtures.ts
├── internals.ts                  # Central barrel export — ALL imports go through here
├── playwright.config.ts
├── eslint.config.mjs             # ESLint v9 flat config
└── .env                          # Environment variables (base URL, API key, project ID)
```

## Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Page Object classes | PascalCase | `WorkPackagesPage` |
| Page Object files | camelCase | `workPackagesPage.ts` |
| Component classes | PascalCase + `Comp` suffix | `MainMenuComp` |
| Test files | kebab-case + `.spec.ts` | `work-packages-crud.spec.ts` |
| Test tags | `@` prefix | `@ui`, `@api`, `@regression`, `@task` |

## Architecture Rules (always apply)

1. All page objects extend `BasePage<T>` with own type as generic parameter
2. All components extend `BaseComponent<T>`, scoped to `rootComponent` locator
3. Assertions belong in tests only — page objects never import `expect`
4. All imports go through `internals.ts` — every new PO/component must be exported there
5. Use Playwright fixtures for test setup (not `beforeEach`)
6. Use `test.step()` with Given/When/Then BDD structure
7. Locators use `.describe()` for trace clarity
8. Locators are `private readonly`, exposed via getter methods
9. Prefer `getByRole()` > `getByLabel()` > `getByText()` > `getByTestId()` > CSS
10. Navigation methods return the destination page object (fluent pattern)
11. Every page/component implements `waitForLoad()`

## Coding Standards

- **Read class and method comments** in page objects before using them
- TypeScript strict mode — no `any` or `unknown` for page objects
- ESLint v9 + Prettier enforced
- No floating promises (`@typescript-eslint/no-floating-promises: error`)
- All async functions must use `await`

## Test Isolation

Tests must be runnable in isolation and not depend on side effects from other tests. Never assume test execution order. If a test deletes an entity, it must first create that entity within the same test.

## Skills & Commands

- **Write web test** skill — generate UI tests from business requirements
- **Write api test** skill — generate API tests
- `/heal-test <test name>` — run a test, diagnose failures, apply minimal fixes
