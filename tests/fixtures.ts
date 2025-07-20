import { test as base } from '@playwright/test';
import { OverviewPage, IntroPage, HomePage, ProjectSelectionComponent } from '../internals';

export const test = base.extend<{
    readyOverviewPage: OverviewPage;
}>({
    readyOverviewPage: async ({ page }, use) => {
        await base.step("Given the user is logged in with username 'admin' and password 'adminadmin'", async () => {
            await page.goto('http://localhost:8080');
            const introPage = new IntroPage(page);            
            await introPage.signInLink.click();
            await introPage.userNameTextBox.fill('admin');
            await introPage.passwordTextBox.fill('adminadmin');
            await introPage.signInButton.click();
        });
        await base.step("And the user selects the 'Demo project'", async () => {
            const homePage = new HomePage(page);
            await homePage.selectAProjectLink.click();
            const projectSelectionComponent = new ProjectSelectionComponent(page);
            await projectSelectionComponent.projectsListContainer.getByText('Demo project').click();
        });
        // Now on OverviewPage
        await use(new OverviewPage(page));
    },
});
