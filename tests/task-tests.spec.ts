import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu, NewTaskPage } from '../internals';


test('add task', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });
    let randomTaskName: string;
    await test.step("When the user creates new task and provide the name 'My new task'", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        const newTaskPage : NewTaskPage = await taskTypeMenu.clickTaskLink();
        randomTaskName = `My new task ${Date.now()}`;
        await newTaskPage.fillSubject(randomTaskName);
        await newTaskPage.fillDescription(`Random description ${Date.now()}`);
        await newTaskPage.clickSaveButton();
    });
    await test.step("Then the task is created", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomTaskName);
        await expect(workPackagesPage.isWorkPackageVisible(randomTaskName)).resolves.toBeTruthy();
    });
});

test('add task with very long name', async ({ page, readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });
    let longTaskName: string;
    await test.step("When the user creates new task and provide a very long name", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        const newTaskPage: NewTaskPage = await taskTypeMenu.clickTaskLink();
        longTaskName = `My new task with a very long name ${'x'.repeat(70)} ${Date.now()}`;
        await newTaskPage.fillSubject(longTaskName);
        await newTaskPage.fillDescription(`Random description ${Date.now()}`);
        await newTaskPage.clickSaveButton();
    });
    await test.step("Then the task with the long name is created", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(longTaskName);
        await expect(workPackagesPage.isWorkPackageVisible(longTaskName)).resolves.toBeTruthy();
    });
});

test('attempt to create task without a name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.clickMenuSidebarOption('Work packages');
    });
    await test.step("When the user tries to create a new task without providing a name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.clickCreateButton();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.clickTaskLink();
        const newTaskPage = new NewTaskPage(page);
        await newTaskPage.fillSubject(''); // Leave name empty
        await newTaskPage.fillDescription(`Random description ${Date.now()}`);
        await newTaskPage.clickSaveButton();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});

test('create two new tasks and verify their creation', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.clickMenuSidebarOption('Work packages');
    });

    let firstTaskName: string;
    let secondTaskName: string;

    await test.step("When the user creates the first task with the name 'First Task'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.clickCreateButton();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.clickTaskLink();
        const newTaskPage = new NewTaskPage(page);
        firstTaskName = `First Task ${Date.now()}`;
        await newTaskPage.fillSubject(firstTaskName);
        await newTaskPage.fillDescription(`Description for ${firstTaskName}`);
        await newTaskPage.clickSaveButton();
    });

    await test.step("And the user creates the second task with the name 'Second Task'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.clickCreateButton();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.clickTaskLink();
        const newTaskPage = new NewTaskPage(page);
        secondTaskName = `Second Task ${Date.now()}`;
        await newTaskPage.fillSubject(secondTaskName);
        await newTaskPage.fillDescription(`Description for ${secondTaskName}`);
        await newTaskPage.clickSaveButton();
    });

    await test.step("Then both tasks are created and visible in the work packages list", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(firstTaskName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.isWorkPackageVisible(firstTaskName)).resolves.toBeTruthy();

        await readyOverviewPage.fillFilterByText(secondTaskName);
        await expect(workPackagesPage.isWorkPackageVisible(secondTaskName)).resolves.toBeTruthy();
    });
});



