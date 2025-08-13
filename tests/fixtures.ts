import { test as base } from '@playwright/test';
import { OverviewPage, IntroPage, HomePage} from '../internals';

export const test = base.extend<{
    readyOverviewPage: OverviewPage;
}>({
    readyOverviewPage: async ({ page }, use) => {
        let homePage: HomePage;
        let overviewPage: OverviewPage;
        await base.step("Given the user is logged in with username 'admin' and password 'adminadmin'", async () => {
            await page.goto('http://localhost:8080');
            const introPage = new IntroPage(page);            
            await introPage.clickOnSignInLink();
            await introPage.fillUserNameTextBox('admin');
            await introPage.fillPasswordTextBox('adminadmin');
            homePage = await introPage.clickOnSignInButton();
        });
        await base.step("And the user selects the 'Demo project'", async () => {            
            const projectSelectionComponent = await homePage.clickSelectAProjectLink();
            overviewPage = await projectSelectionComponent.clickProjectByName('Demo project');
             // Now on OverviewPage
            await use(overviewPage);
        });
       
    },
});
