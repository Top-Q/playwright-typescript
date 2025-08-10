import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu, NewTaskPage } from '../internals';


test('add task', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomTaskName: string;
    await test.step("When the user creates new task and provide the name 'My new task'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.taskLink.click();
        const newTaskPage = new NewTaskPage(page);
        randomTaskName = `My new task ${Date.now()}`;
        await newTaskPage.subjectTextBox.fill(randomTaskName);
        await newTaskPage.descriptionTextBox.fill(`Random description ${Date.now()}`);
        await newTaskPage.saveButton.click();
    });
    await test.step("Then the task is created", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(randomTaskName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomTaskName)).toBeVisible();
    });
});

test('add task with very long name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let longTaskName: string;
    await test.step("When the user creates new task and provide a very long name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.taskLink.click();
        const newTaskPage = new NewTaskPage(page);
        longTaskName = `My new task with a very long name ${'x'.repeat(70)} ${Date.now()}`;
        await newTaskPage.subjectTextBox.fill(longTaskName);
        await newTaskPage.descriptionTextBox.fill(`Random description ${Date.now()}`);
        await newTaskPage.saveButton.click();
    });
    await test.step("Then the task with the long name is created", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(longTaskName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(longTaskName)).toBeVisible();
    });
});

test('attempt to create task without a name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    await test.step("When the user tries to create a new task without providing a name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.taskLink.click();
        const newTaskPage = new NewTaskPage(page);
        await newTaskPage.subjectTextBox.fill(''); // Leave name empty
        await newTaskPage.descriptionTextBox.fill(`Random description ${Date.now()}`);
        await newTaskPage.saveButton.click();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});

test('create two new tasks and verify their creation', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });

    let firstTaskName: string;
    let secondTaskName: string;

    await test.step("When the user creates the first task with the name 'First Task'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.taskLink.click();
        const newTaskPage = new NewTaskPage(page);
        firstTaskName = `First Task ${Date.now()}`;
        await newTaskPage.subjectTextBox.fill(firstTaskName);
        await newTaskPage.descriptionTextBox.fill(`Description for ${firstTaskName}`);
        await newTaskPage.saveButton.click();
    });

    await test.step("And the user creates the second task with the name 'Second Task'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.taskLink.click();
        const newTaskPage = new NewTaskPage(page);
        secondTaskName = `Second Task ${Date.now()}`;
        await newTaskPage.subjectTextBox.fill(secondTaskName);
        await newTaskPage.descriptionTextBox.fill(`Description for ${secondTaskName}`);
        await newTaskPage.saveButton.click();
    });

    await test.step("Then both tasks are created and visible in the work packages list", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(firstTaskName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(firstTaskName)).toBeVisible();

        await readyOverviewPage.filterByTextTextBox.fill(secondTaskName);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(secondTaskName)).toBeVisible();
    });
});



