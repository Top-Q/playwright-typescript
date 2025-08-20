import { test } from '../fixtures';
import { expect } from '@playwright/test';
import {
    WorkPackagesPage,
    TaskTypeMenu,
    NewTaskPage,
    WorkpackageTable,
} from '../../internals';

test('Create work package (task)', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    let taskTypeMenu: TaskTypeMenu;
    let newTaskPage: NewTaskPage;
    let workpackageTable: WorkpackageTable;

    const wpName: string = `Auto WP ${crypto.randomUUID()}`;
    const wpDescription: string = `Auto description ${Date.now()}`;

    await test.step('Given the user is authenticated as "default"', async () => {
        // Authentication is handled by the fixture `readyOverviewPage`.
    });

    await test.step('And the user is on the Work packages page', async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
        await workPackagesPage.waitForLoad();
    });

    await test.step('When the user creates a new work package of type "task"', async () => {
        taskTypeMenu = await workPackagesPage.clickCreateButton();
        newTaskPage = await taskTypeMenu.clickTaskLink();
    });

    await test.step(`And the user sets the work package name to "${wpName}"`, async () => {
        await newTaskPage.fillSubject(wpName);
    });

    await test.step(`And the user sets the work package description to "${wpDescription}"`, async () => {
        await newTaskPage.fillDescription(wpDescription);
    });

    await test.step('And the user saves the work package', async () => {
        await newTaskPage.clickSaveButton();
        // Wait for the app to process the save. Navigate back to Work packages list to ensure table is visible.
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();        
    });

    await test.step(`And the user filter for work package with name "${wpName}"`, async () => {
        // The global filter component is available on the overview object
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(wpName);
        workpackageTable = await workPackagesPage.workPackageTable();
    });

    await test.step(`Then the work package named "${wpName}" exists in the work packages table`, async () => {
        const exists = await workpackageTable.isWorkPackageBySubjectExists(wpName);
        expect(exists, `Work package with subject "${wpName}" was not found in the table.`).toBeTruthy();
    });
});
