import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu } from '../internals';
import { NewPhasePage } from '../src/po/openproject/newWorkpackagePage';

test('create new phase and assert creation', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.clickMenuSidebarOption('Work packages');
    });
    let randomPhaseName: string;
    await test.step("When the user creates new phase and provide the name 'My new phase'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.clickCreateButton();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.clickPhaseLink();
        const newPhasePage = new NewPhasePage(page);
        randomPhaseName = `My new phase ${Date.now()}`;
        await newPhasePage.fillSubject(randomPhaseName);
        await newPhasePage.fillDescription(`Random description ${Date.now()}`);
        await newPhasePage.clickSaveButton();
    });
    await test.step("Then the phase is created", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomPhaseName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.isWorkPackageVisible(randomPhaseName)).resolves.toBeTruthy();
    });
});

test('attempt to create phase without a name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.clickMenuSidebarOption('Work packages');
    });
    await test.step("When the user tries to create a new phase without providing a name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.clickCreateButton();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.clickPhaseLink();
        const newPhasePage = new NewPhasePage(page);
        await newPhasePage.fillSubject(''); // Leave name empty
        await newPhasePage.fillDescription(`Random description ${Date.now()}`);
        await newPhasePage.clickSaveButton();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});

