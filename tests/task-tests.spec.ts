import { expect } from '@playwright/test';
import { test } from './fixtures/overview-page-fixture'
import { WorkPackagesPage, NewTaskPage, NewPhasePage, NewMilestonePage, ProjectSelectionComponent, HomePage } from '../internals';


test('add task', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomTaskName: string;
    await test.step("When the user creates new task and provide the name 'My new task'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        await workPackagesPage.taskTypeContainer.getByText('Task').click();
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

test('add phase', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomPhaseName: string;
    await test.step("When the user creates new phase and provide the name 'My new phase'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        await workPackagesPage.taskTypeContainer.getByText('Phase').click();
        const newPhasePage = new NewPhasePage(page);
        randomPhaseName = `My new phase ${Date.now()}`;
        await newPhasePage.subjectTextBox.fill(randomPhaseName);
        await newPhasePage.saveButton.click();
    });
    await test.step("Then the phase is created", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(randomPhaseName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomPhaseName)).toBeVisible();
    });
});

test('add milestone', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomMilestoneName: string;
    await test.step("When the user creates new milestone and provide the name 'My new milestone'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        await workPackagesPage.taskTypeContainer.getByText('Milestone').click();
        const newMilestonePage = new NewMilestonePage(page);
        randomMilestoneName = `My new milestone ${Date.now()}`;
        await newMilestonePage.subjectTextBox.fill(randomMilestoneName);
        await newMilestonePage.saveButton.click();
    });
    await test.step("Then the milestone is created", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(randomMilestoneName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomMilestoneName)).toBeVisible();
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
        await workPackagesPage.taskTypeContainer.getByText('Task').click();
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