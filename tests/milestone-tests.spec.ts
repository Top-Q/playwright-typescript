import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu } from '../internals';
import { NewMilestonePage } from '../src/po/openproject/newWorkpackagePage';

test('create new milestone and assert creation', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });
    let randomMilestoneName: string;
    await test.step("When the user creates new milestone and provide the name 'My new milestone'", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        const newMilestonePage: NewMilestonePage = await taskTypeMenu.clickMilestoneLink();
        randomMilestoneName = `My new milestone ${Date.now()}`;
        await newMilestonePage.fillSubject(randomMilestoneName);
        await newMilestonePage.fillDescription(`Random description ${Date.now()}`);
        await newMilestonePage.clickSaveButton();
    });
    await test.step("Then the milestone is created", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomMilestoneName);
        await workPackagesPage.workPackageTable().waitForTableToLoad();
        await expect(workPackagesPage.workPackageTable().isWorkPackageVisible(randomMilestoneName)).resolves.toBeTruthy();
    });
});

test('attempt to create milestone without a name', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });
    await test.step("When the user tries to create a new milestone without providing a name", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        const newMilestonePage: NewMilestonePage = await taskTypeMenu.clickMilestoneLink();
        await newMilestonePage.fillSubject(''); // Leave name empty
        await newMilestonePage.fillDescription(`Random description ${Date.now()}`);
        await newMilestonePage.clickSaveButton();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(readyOverviewPage.page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});