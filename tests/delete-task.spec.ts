import { expect } from '@playwright/test';
import { test } from './fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewTaskPage, WorkPackageRow, workPackageRowContextMenu, WorkPackageDeletionConfirmationDialogComp } from '../internals';

test('Delete work package from type task', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("Given the user navigates to the 'Work packages' section", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });

    let randomTaskName: string;
    let newTaskPage: NewTaskPage;
    await test.step('And the user creates a work package from type task', async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        newTaskPage = await taskTypeMenu.clickTaskLink();
        randomTaskName = `Automated task ${Date.now()}`;
        await newTaskPage.fillSubject(randomTaskName);
        await newTaskPage.fillDescription(`Task description ${Date.now()}`);
        await newTaskPage.clickSaveButton();
    });

    await test.step('And the user gets back to Work packages page', async () => {
        // The application returns to the work packages table after saving the new work package
        // Ensure the table is loaded so we can interact with it
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomTaskName);
        await workPackagesPage.workPackageTable().waitForTableToLoad();
    });

    let workPackageRow: WorkPackageRow;
    await test.step('When the user deletes the work package', async () => {
        workPackageRow = await workPackagesPage.workPackageTable().getWorkPackageRowBySubject(randomTaskName);
        const ctxMenu: workPackageRowContextMenu = await workPackageRow.clickOpenContextMenu();
        const confirmDialog: WorkPackageDeletionConfirmationDialogComp = await ctxMenu.clickDeleteMenuItem();
        await confirmDialog.clickOnConfirmButton();
    });

    await test.step('Then the work package no longer exists', async () => {
        await workPackagesPage.workPackageTable().waitForTableToLoad();
        expect(await workPackagesPage.workPackageTable().isWorkPackageVisible(randomTaskName)).toBeFalsy();
    });
});
