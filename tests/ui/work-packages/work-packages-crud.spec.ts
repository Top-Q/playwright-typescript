import { test } from '../fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewTaskPage, WorkpackageTable } from '../../../internals';
import { expect } from '@playwright/test';

test('Create work package (task)', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
  
  let workPackagesPage: WorkPackagesPage;
  await test.step("Given the user is authenticated as \"default\"", async () => {
    // Already authenticated via fixture
  });

  await test.step("And the user is on the Work packages page", async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
  });

  const workPackageName = `Auto WP ${crypto.randomUUID()}`;
  const workPackageDescription = `Auto description ${Date.now()}`;

  let taskTypeMenu: TaskTypeMenu;
  let newTaskPage: NewTaskPage;
  await test.step(`When the user creates a new work package of type "task"`, async () => {
    taskTypeMenu = await workPackagesPage.clickCreateButton();
    newTaskPage = await taskTypeMenu.clickTaskMenuItem();
  });

  await test.step(`And the user sets the work package name to "${workPackageName}"`, async () => {
    await newTaskPage.fillSubject(workPackageName);
  });

  await test.step(`And the user sets the work package description to "${workPackageDescription}"`, async () => {
    await newTaskPage.fillDescription(workPackageDescription);
  });

  await test.step("And the user saves the work package", async () => {
    await newTaskPage.clickSaveButton();
  });

  await test.step(`And the user filter for work package with name "${workPackageName}"`, async () => {
    // TODO: Need a method in OverviewPage to ensure filter is active without conditional logic
    // Currently using isFilterActive() requires conditional which violates linting rules
    await readyOverviewPage.fillFilterByText(workPackageName);
  });

  await test.step(`Then the work package named "${workPackageName}" exists in the work packages table`, async () => {
    const workPackageTable: WorkpackageTable = await workPackagesPage.workPackageTable();
    const exists = await workPackageTable.isWorkPackageBySubjectExists(workPackageName);
    expect(exists).toBe(true);
  });
});
