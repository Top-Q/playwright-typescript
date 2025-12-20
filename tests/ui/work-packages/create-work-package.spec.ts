import { expect } from '@playwright/test';
import { test } from '../fixtures';
import { WorkPackagesPage, NewTaskPage } from '../../../internals';

test('Create work package (task)', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
  // Define typed variables for page objects and test data
  let workPackagesPage: WorkPackagesPage;
  let newTaskPage: NewTaskPage;
  const workPackageType = 'task';
  const name = `Automated WP ${Date.now()}`;
  const description = `Auto description ${Date.now()}`;

  await test.step(`When the user creates a new work package of type "${workPackageType}"`, async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    const taskTypeMenu = await workPackagesPage.clickCreateButton();
    newTaskPage = await taskTypeMenu.clickTaskMenuItem();
  });

  await test.step(`And the user sets the work package name to "${name}"`, async () => {
    await newTaskPage.fillSubject(name);
  });

  await test.step(`And the user sets the work package description to "${description}"`, async () => {
    await newTaskPage.fillDescription(description);
  });

  await test.step('And the user saves the work package', async () => {
    await newTaskPage.clickSaveButton();
  });

  await test.step(`And the user filter for work package with name "${name}"`, async () => {
    // Use the overview page filter to search for the newly created work package
    await readyOverviewPage.clickActivateFilterButton();
    await readyOverviewPage.fillFilterByText(name);
  });

  await test.step(`Then the work package named "${name}" exists in the work packages table`, async () => {
    const table = await workPackagesPage.workPackageTable();
    const exists = await table.isWorkPackageBySubjectExists(name);
    expect(exists).toBeTruthy();
  });

});
