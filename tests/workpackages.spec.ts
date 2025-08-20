import { test } from './fixtures';
import { WorkPackagesPage, NewPhasePage, WorkpackageTable, WorkPackageRow, NewTaskPage } from '../internals';
import { expect } from '@playwright/test';

test('Delete work package (task)', async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let newTaskPage: NewTaskPage;

  const name = `Auto WP ${Date.now()}`;

  await test.step('Given the user is authenticated as "default"', async () => {
    // Authentication is handled by the readyOverviewPage fixture
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

  await test.step('And the user saves the work package', async () => {
    await newTaskPage.clickSaveButton();
  });

  await test.step(`When the user deletes the work package named "${name}"`, async () => {
    const wpTable: WorkpackageTable = workPackagesPage.workPackageTable();
    await wpTable.waitForTableToLoad();
    const row: WorkPackageRow = await wpTable.getWorkPackageRowBySubject(name);
    const ctx = await row.clickOpenContextMenu();
    const confirmDialog = await ctx.clickDeleteMenuItem();
    await confirmDialog.clickOnConfirmButton();
  });

  await test.step(`Then the work package named "${name}" does not exist in the system`, async () => {
    const wpTable: WorkpackageTable = workPackagesPage.workPackageTable();
    await wpTable.waitForTableToLoad();
    const exists = await wpTable.isWorkPackageVisible(name);
    expect(exists).toBeFalsy();
  });
});


test('Create work package (phase)', async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let newPhasePage: NewPhasePage;

  const name = `Auto WP ${Date.now()}`;
  const description = `Auto description ${new Date().toISOString()}`;

  await test.step('Given the user is authenticated as "default"', async () => {
    // The readyOverviewPage fixture already authenticates the user
  });

  await test.step('And the user is on the Work packages page', async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
  });

  await test.step('When the user creates a new work package of type "phase"', async () => {
    const taskTypeMenu = await workPackagesPage.clickCreateButton();
    newPhasePage = await taskTypeMenu.clickPhaseLink();
  });

  await test.step(`And the user sets the work package name to "${name}"`, async () => {
    await newPhasePage.fillSubject(name);
  });

  await test.step(`And the user sets the work package description to "${description}"`, async () => {
    await newPhasePage.fillDescription(description);
  });

  await test.step('And the user saves the work package', async () => {
    await newPhasePage.clickSaveButton();
  });

  await test.step(`Then the work package named "${name}" exists in the system`, async () => {
    const wpTable: WorkpackageTable = workPackagesPage.workPackageTable();
    await wpTable.waitForTableToLoad();
    const exists = await wpTable.isWorkPackageVisible(name);
    expect(exists).toBeTruthy();
  });
});


test('Delete work package (phase)', async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let newPhasePage: NewPhasePage;

  const name = `Auto WP ${Date.now()}`;

  await test.step('Given the user is authenticated as "default"', async () => {
    // The readyOverviewPage fixture already authenticates the user
  });

  await test.step('And the user is on the Work packages page', async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
  });

  await test.step('When the user creates a new work package of type "phase"', async () => {
    const taskTypeMenu = await workPackagesPage.clickCreateButton();
    newPhasePage = await taskTypeMenu.clickPhaseLink();
  });

  await test.step(`And the user sets the work package name to "${name}"`, async () => {
    await newPhasePage.fillSubject(name);
  });

  await test.step('And the user saves the work package', async () => {
    await newPhasePage.clickSaveButton();
  });

  await test.step(`When the user deletes the work package named "${name}"`, async () => {
    const wpTable: WorkpackageTable = workPackagesPage.workPackageTable();
    await wpTable.waitForTableToLoad();
    const row: WorkPackageRow = await wpTable.getWorkPackageRowBySubject(name);
    const ctx = await row.clickOpenContextMenu();
    const confirmDialog = await ctx.clickDeleteMenuItem();
    await confirmDialog.clickOnConfirmButton();
  });

  await test.step(`Then the work package named "${name}" does not exist in the system`, async () => {
    const wpTable: WorkpackageTable = workPackagesPage.workPackageTable();
    await wpTable.waitForTableToLoad();
    const exists = await wpTable.isWorkPackageVisible(name);
    expect(exists).toBeFalsy();
  });
});
