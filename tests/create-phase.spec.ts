import { expect } from '@playwright/test';
import { test } from './fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewPhasePage } from '../internals';

test('Create workpackage from type phase', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("Given the user navigates to the 'Work packages' section", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });

    let randomPhaseName: string;
    let newPhasePage: NewPhasePage;
    await test.step('When the user creates a new workpackage from type phase and provides a name', async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        newPhasePage = await taskTypeMenu.clickPhaseLink();
        randomPhaseName = `Automated phase ${Date.now()}`;
        await newPhasePage.fillSubject(randomPhaseName);
        await newPhasePage.fillDescription(`Phase description ${Date.now()}`);
        await newPhasePage.clickSaveButton();
    });

    await test.step('Then the work package is added to the system', async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomPhaseName);
        await workPackagesPage.workPackageTable().waitForTableToLoad();
        expect(await workPackagesPage.workPackageTable().isWorkPackageVisible(randomPhaseName)).toBeTruthy();
    });
});
