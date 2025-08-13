import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu } from '../internals';
import { NewMilestonePage } from '../src/po/openproject/newWorkpackagePage';

test('create new milestone and assert creation', async ({ page, readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });
    let randomMilestoneName: string;
    await test.step("When the user creates new milestone and provide the name 'My new milestone'", async () => {
        await workPackagesPage.clickCreateButton();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.clickMilestoneLink();
        const newMilestonePage = new NewMilestonePage(page);
        randomMilestoneName = `My new milestone ${Date.now()}`;
        await newMilestonePage.fillSubject(randomMilestoneName);
        await newMilestonePage.fillDescription(`Random description ${Date.now()}`);
        await newMilestonePage.clickSaveButton();
    });
    await test.step("Then the milestone is created", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomMilestoneName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.isWorkPackageVisible(randomMilestoneName)).resolves.toBeTruthy();
    });
});

test('attempt to create milestone without a name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.clickMenuSidebarOption('Work packages');
    });
    await test.step("When the user tries to create a new milestone without providing a name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.clickCreateButton();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.clickMilestoneLink();
        const newMilestonePage = new NewMilestonePage(page);
        await newMilestonePage.fillSubject(''); // Leave name empty
        await newMilestonePage.fillDescription(`Random description ${Date.now()}`);
        await newMilestonePage.clickSaveButton();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});