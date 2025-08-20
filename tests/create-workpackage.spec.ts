import { test } from './fixtures';
import { WorkPackagesPage, NewTaskPage } from '../internals';
import { expect } from '@playwright/test';

test('Create work package (task)', async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let newTaskPage: NewTaskPage;

  const name = `Auto WP ${Date.now()}`;
  const description = `Auto description ${new Date().toISOString()}`;

  await test.step('Given the user is authenticated as "default"', async () => {
    // The {@readyOverviewPage} fixture already handles authentication.
  });

  await test.step('And the user is on the Work packages page', async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
  });

  await test.step('When the user creates a new work package of type "task"', async () => {
    const taskTypeMenu = await workPackagesPage.clickCreateButton();
    newTaskPage = await taskTypeMenu.clickTaskLink();
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

  await test.step(`Then the work package named "${name}" exists in the system`, async () => {
    const wpTable = workPackagesPage.workPackageTable();
    await wpTable.waitForTableToLoad();
    const exists = await wpTable.isWorkPackageVisible(name);
    expect(exists).toBeTruthy();
  });
});
