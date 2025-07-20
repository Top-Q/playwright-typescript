import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, NewTaskPage, NewPhasePage, NewMilestonePage, ProjectSelectionComponent, HomePage, TaskTypeMenu } from '../internals';


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
        await newTaskPage.saveButton.click();
    });
    await test.step("Then the task with the long name is created", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(longTaskName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(longTaskName)).toBeVisible();
    });
});

