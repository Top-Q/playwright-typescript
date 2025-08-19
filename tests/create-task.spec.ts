import { expect } from '@playwright/test';
import { test } from './fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewTaskPage } from '../internals';

test('Create workpackage from type task', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("Given the user navigates to the 'Work packages' section", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });

    let randomTaskName: string;
    let newTaskPage: NewTaskPage;
    await test.step("When the user creates a new task and provides a name", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        newTaskPage = await taskTypeMenu.clickTaskLink();
        randomTaskName = `Automated task ${Date.now()}`;
        await newTaskPage.fillSubject(randomTaskName);
        await newTaskPage.fillDescription(`Task description ${Date.now()}`);
        await newTaskPage.clickSaveButton();
    });

    await test.step("Then the task is created successfully", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomTaskName);
        await workPackagesPage.workPackageTable().waitForTableToLoad();
        expect(await workPackagesPage.workPackageTable().isWorkPackageVisible(randomTaskName)).toBeTruthy();
    });
});

