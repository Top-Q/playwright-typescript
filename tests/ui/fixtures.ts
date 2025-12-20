import { test as base } from '@playwright/test';
import { OverviewPage, IntroPage as LoginPage, HomePage} from '../../internals';

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
             // Now on OverviewPage
            await use(overviewPage);
        });
       
    },
});
