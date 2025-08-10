import { expect } from '@playwright/test';
import { test } from './fixtures'
import { WorkPackagesPage, TaskTypeMenu } from '../internals';
import { NewMilestonePage } from '../src/po/openproject/newWorkpackagePage';

test('create new milestone and assert creation', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomMilestoneName: string;
    await test.step("When the user creates new milestone and provide the name 'My new milestone'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.milestoneLink.click();
        const newMilestonePage = new NewMilestonePage(page);
        randomMilestoneName = `My new milestone ${Date.now()}`;
        await newMilestonePage.subjectTextBox.fill(randomMilestoneName);
        await newMilestonePage.descriptionTextBox.fill(`Random description ${Date.now()}`);
        await newMilestonePage.saveButton.click();
    });
    await test.step("Then the milestone is created", async () => {
        await readyOverviewPage.activateFilterButton.click();
        await readyOverviewPage.filterByTextTextBox.fill(randomMilestoneName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomMilestoneName)).toBeVisible();
    });
});

test('attempt to create milestone without a name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    await test.step("When the user tries to create a new milestone without providing a name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        const taskTypeMenu = new TaskTypeMenu(page);
        await taskTypeMenu.milestoneLink.click();
        const newMilestonePage = new NewMilestonePage(page);
        await newMilestonePage.subjectTextBox.fill(''); // Leave name empty
        await newMilestonePage.descriptionTextBox.fill(`Random description ${Date.now()}`);
        await newMilestonePage.saveButton.click();
    });
    await test.step("Then the UI should prevent creation or show an error", async () => {
        await expect(page.getByText("Subject can't be blank.", { exact: true })).toBeVisible();
    });
});