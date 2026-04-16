# Playwright Fixtures

## Purpose

Fixtures replace `beforeEach` hooks for reusable test setup. They provide pre-configured state (e.g., authenticated user, navigated page) to tests via dependency injection.

## Current Fixtures

### `readyOverviewPage` (UI tests)

Provides an `OverviewPage` instance with the user already logged in and the Demo project selected.

```typescript
// tests/ui/fixtures.ts
import { test as base } from '@playwright/test';
import { OverviewPage, IntroPage as LoginPage, HomePage } from '../../internals';

export const test = base.extend<{
    readyOverviewPage: OverviewPage;
}>({
    readyOverviewPage: async ({ page }, use) => {
        let homePage: HomePage;
        let overviewPage: OverviewPage;
        await base.step("Given the user is logged in with username 'admin' and password 'adminadmin'", async () => {
            await page.goto('http://localhost:8090');
            const loginPage = new LoginPage(page);
            await loginPage.fillUserNameTextBox('admin');
            await loginPage.fillPasswordTextBox('adminadmin');
            homePage = await loginPage.clickOnSignInButton();
        });
        await base.step("And the user selects the 'Demo project'", async () => {
            const projectSelectionComponent = await homePage.clickAllProjectsButton();
            overviewPage = await projectSelectionComponent.clickProjectByName('Demo project');
            await use(overviewPage);
        });
    },
});
```

### `opclient` (API tests)

Provides an authenticated `OpenProjectClient` for API interactions.

Located at `tests/api/fixtures.ts`.

## Using Fixtures in Tests

```typescript
import { test } from './fixtures';
import { expect } from '@playwright/test';
import { WorkPackagesPage } from '../../internals';

test('should display work packages', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;

    await test.step('Given user navigates to work packages', async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });

    await test.step('Then the work packages page is loaded', async () => {
        // assertions here
    });
});
```

## Adding a New Fixture

1. Define the fixture type in the `extend<>` generic
2. Implement the setup logic using `async ({ page }, use) => { ... }`
3. Use `base.step()` for structured logging in fixture setup
4. Call `await use(value)` to provide the fixture to the test
5. Any cleanup runs after `use()` returns

Fixtures can depend on other fixtures (e.g., a project-specific fixture depends on the login fixture).
