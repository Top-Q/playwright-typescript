import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu } from '../internals';
import { NewPhasePage } from '../src/po/openproject/newWorkpackagePage';

test('create new phase and assert creation', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomPhaseName: string;
    await test.step("When the user creates new phase and provide the name 'My new phase'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.phaseLink.click();
        const newPhasePage = new NewPhasePage(page);
        randomPhaseName = `My new phase ${Date.now()}`;
        await newPhasePage.subjectTextBox.fill(randomPhaseName);
        await newPhasePage.descriptionTextBox.fill(`Random description ${Date.now()}`);
        await newPhasePage.saveButton.click();
    });
    await test.step("Then the phase is created", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(randomPhaseName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomPhaseName)).toBeVisible();
    });
});

test('attempt to create phase without a name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    await test.step("When the user tries to create a new phase without providing a name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.phaseLink.click();
        const newPhasePage = new NewPhasePage(page);
        await newPhasePage.subjectTextBox.fill(''); // Leave name empty
        await newPhasePage.descriptionTextBox.fill(`Random description ${Date.now()}`);
        await newPhasePage.saveButton.click();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});