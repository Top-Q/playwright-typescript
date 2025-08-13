import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu } from '../internals';
import { NewPhasePage } from '../src/po/openproject/newWorkpackagePage';

test('create new phase and assert creation', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });
    let randomPhaseName: string;
    await test.step("When the user creates new phase and provide the name 'My new phase'", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        const newPhasePage: NewPhasePage = await taskTypeMenu.clickPhaseLink();
        randomPhaseName = `My new phase ${Date.now()}`;
        await newPhasePage.fillSubject(randomPhaseName);
        await newPhasePage.fillDescription(`Random description ${Date.now()}`);
        await newPhasePage.clickSaveButton();
    });
    await test.step("Then the phase is created", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomPhaseName);
        await workPackagesPage.workPackageTable().waitForTableToLoad();
        await expect(workPackagesPage.workPackageTable().isWorkPackageVisible(randomPhaseName)).resolves.toBeTruthy();
    });
});

test('attempt to create phase without a name', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });
    await test.step("When the user tries to create a new phase without providing a name", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        const newPhasePage: NewPhasePage = await taskTypeMenu.clickPhaseLink();
        await newPhasePage.fillSubject(''); // Leave name empty
        await newPhasePage.fillDescription(`Random description ${Date.now()}`);
        await newPhasePage.clickSaveButton();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(readyOverviewPage.page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});

