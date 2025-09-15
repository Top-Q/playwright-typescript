import { expect } from '@playwright/test';
import { test } from './fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewTaskPage, WorkpackageTable, NewPhasePage, WorkPackageRow, workPackageRowContextMenu, WorkPackageDeletionConfirmationDialogComp } from '../../internals';

test('Create work package (task)', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let taskTypeMenu: TaskTypeMenu;
  let newTaskPage: NewTaskPage;
  let workpackageTable: WorkpackageTable;

  const name = `Auto WP ${Date.now()}`;
  const description = `Auto description ${Date.now()}`;

  await test.step('When the user creates a new work package of type "task"', async () => {
    // Navigate to Work packages page and open the "Create" menu
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    taskTypeMenu = await workPackagesPage.clickCreateButton();
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

  await test.step(`And the user filter for work package with name "${name}"`, async () => {
    // Activate the global filter and filter by the created work package name
    await readyOverviewPage.clickActivateFilterButton();
    await readyOverviewPage.fillFilterByText(name);
  });

  await test.step(`Then the work package named "${name}" exists in the work packages table`, async () => {
    workpackageTable = await workPackagesPage.workPackageTable();
    const exists = await workpackageTable.isWorkPackageBySubjectExists(name);
    expect(exists).toBeTruthy();
  });
});


test('Delete work package (task)', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let workpackageTable: WorkpackageTable;
  let workPackageRow: WorkPackageRow;
  let rowContextMenu: workPackageRowContextMenu;
  let deletionDialog: WorkPackageDeletionConfirmationDialogComp;

  // NOTE: This test assumes the work package with the given name was created by the test setup (API/setup step).
  const name = `Auto WP To Delete Task ${Date.now()}`;

  await test.step(`When the user deletes the work package named "${name}"`, async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    await readyOverviewPage.clickActivateFilterButton();
    await readyOverviewPage.fillFilterByText(name);

    workpackageTable = await workPackagesPage.workPackageTable();
    workPackageRow = await workpackageTable.getWorkPackageRowBySubject(name);
    rowContextMenu = await workPackageRow.clickOpenContextMenu();
    deletionDialog = await rowContextMenu.clickDeleteMenuItem();
    await deletionDialog.clickOnConfirmButton();
  });

  await test.step(`Then the work package named "${name}" does not exist in the work packages table`, async () => {
    workpackageTable = await workPackagesPage.workPackageTable();
    const exists = await workpackageTable.isWorkPackageBySubjectExists(name);
    expect(exists).toBeFalsy();
  });
});


test('Create work package (phase)', { tag: ['@ui', '@phase', '@regression'] }, async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let taskTypeMenu: TaskTypeMenu;
  let newPhasePage: NewPhasePage;
  let workpackageTable: WorkpackageTable;

  const name = `Auto WP ${Date.now()}`;
  const description = `Auto description ${Date.now()}`;

  await test.step('When the user creates a new work package of type "phase"', async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    taskTypeMenu = await workPackagesPage.clickCreateButton();
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
    workpackageTable = await workPackagesPage.workPackageTable();
    const exists = await workpackageTable.isWorkPackageBySubjectExists(name);
    expect(exists).toBeTruthy();
  });
});


test('Delete work package (phase)', { tag: ['@ui', '@phase', '@regression'] }, async ({ readyOverviewPage }) => {
  let workPackagesPage: WorkPackagesPage;
  let workpackageTable: WorkpackageTable;
  let workPackageRow: WorkPackageRow;
  let rowContextMenu: workPackageRowContextMenu;
  let deletionDialog: WorkPackageDeletionConfirmationDialogComp;

  // NOTE: This test assumes the work package with the given name was created by the test setup (API/setup step).
  const name = `Auto WP To Delete Phase ${Date.now()}`;

  await test.step(`When the user deletes the work package named "${name}"`, async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    await readyOverviewPage.clickActivateFilterButton();
    await readyOverviewPage.fillFilterByText(name);

    workpackageTable = await workPackagesPage.workPackageTable();
    workPackageRow = await workpackageTable.getWorkPackageRowBySubject(name);
    rowContextMenu = await workPackageRow.clickOpenContextMenu();
    deletionDialog = await rowContextMenu.clickDeleteMenuItem();
    await deletionDialog.clickOnConfirmButton();
  });

  await test.step(`Then the work package named "${name}" does not exist in the work packages table`, async () => {
    workpackageTable = await workPackagesPage.workPackageTable();
    const exists = await workpackageTable.isWorkPackageBySubjectExists(name);
    expect(exists).toBeFalsy();
  });
});
