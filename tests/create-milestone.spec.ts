import { expect } from '@playwright/test';
import { test } from './fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewMilestonePage } from '../internals';

test('Create workpackage from type milestone', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("Given the user navigates to the 'Work packages' section", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });

    let randomMilestoneName: string;
    let newMilestonePage: NewMilestonePage;
    await test.step('When the user creates a new workpackage from type milestone and provides a name', async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        newMilestonePage = await taskTypeMenu.clickMilestoneLink();
        randomMilestoneName = `Automated milestone ${Date.now()}`;
        await newMilestonePage.fillSubject(randomMilestoneName);
        await newMilestonePage.fillDescription(`Milestone description ${Date.now()}`);
        await newMilestonePage.clickSaveButton();
    });

    await test.step('Then the work package is added to the system', async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomMilestoneName);
        await workPackagesPage.workPackageTable().waitForTableToLoad();
        expect(await workPackagesPage.workPackageTable().isWorkPackageVisible(randomMilestoneName)).toBeTruthy();
    });
});
