import { test } from '../fixtures';
import {
  WorkPackagesPage,
  WorkPackageTypeMenuComp,
  NewWorkPackagePage,
  WorkPackageDetailsPage,
} from '../../../internals';
import { expect } from '@playwright/test';

test.describe('Work Packages CRUD', () => {
  test(
    'Create work package (task)',
    { tag: ['@ui', '@task', '@regression'] },
    async ({ readyOverviewPage }) => {
      const workPackageType = 'task';
      const name = `Auto WP ${crypto.randomUUID()}`;
      const description = `Auto description ${Date.now()}`;

      let workPackagesPage: WorkPackagesPage;

      await test.step('Given the user is authenticated as "default"', async () => {
        // Already authenticated via readyOverviewPage fixture
      });

      await test.step('And the user selects the "Demo project"', async () => {
        // Already on Demo project via readyOverviewPage fixture
      });

      await test.step('And the user is on the Work packages page', async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
      });

      let typeMenuComp: WorkPackageTypeMenuComp;
      await test.step('When the user clicks on the create button', async () => {
        typeMenuComp = await workPackagesPage.clickCreateButton();
      });

      let newWorkPackagePage: NewWorkPackagePage;
      await test.step(`And the user selects "${workPackageType}"`, async () => {
        newWorkPackagePage = await typeMenuComp.selectType(workPackageType);
      });

      await test.step(`And the user sets the work package name to "${name}"`, async () => {
        await newWorkPackagePage.fillSubject(name);
      });

      await test.step(`And the user sets the work package description to "${description}"`, async () => {
        await newWorkPackagePage.fillDescription(description);
      });

      let workPackageDetailsPage: WorkPackageDetailsPage;
      await test.step('And the user saves the work package', async () => {
        workPackageDetailsPage = await newWorkPackagePage.clickSaveButton();
      });

      await test.step('And the user gets back to the work packages pages', async () => {
        await workPackageDetailsPage.goBackToWorkPackagesList();
        workPackagesPage = await new WorkPackagesPage(workPackageDetailsPage.page).waitForLoad();
      });

      await test.step('And the user clicks on the "Activate filter" button', async () => {
        if (!(await workPackagesPage.isFilterActive())) {
          await workPackagesPage.clickActivateFilterButton();
        }
      });

      await test.step(`And the user fills the "filter by text" textbox with name "${name}"`, async () => {
        await workPackagesPage.fillFilterByText(name);
      });

      await test.step(`Then the work package named "${name}" exists in the work packages table`, async () => {
        const exists = await workPackagesPage.isWorkPackageVisible(name);
        expect(exists).toBe(true);
      });
    },
  );

  test(
    'Delete work package (task)',
    { tag: ['@ui', '@task', '@regression'] },
    async ({ readyOverviewPage }) => {
      const workPackageType = 'task';
      const name = `Auto WP ${crypto.randomUUID()}`;
      const description = `Auto description ${Date.now()}`;

      let workPackagesPage: WorkPackagesPage;

      await test.step('Given the user is authenticated as "default"', async () => {
        // Already authenticated via readyOverviewPage fixture
      });

      await test.step('And the user selects the "Demo project"', async () => {
        // Already on Demo project via readyOverviewPage fixture
      });

      await test.step('And the user is on the Work packages page', async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
      });

      await test.step(`And the user creates a work package named "${name}" for deletion`, async () => {
        const newWorkPackagePage =
          await workPackagesPage.createNewWorkPackageOfType(workPackageType);
        await newWorkPackagePage.fillSubject(name);
        await newWorkPackagePage.fillDescription(description);
        const workPackageDetailsPage = await newWorkPackagePage.clickSaveButton();
        await workPackageDetailsPage.goBackToWorkPackagesList();
        workPackagesPage = await new WorkPackagesPage(workPackageDetailsPage.page).waitForLoad();
      });

      await test.step(`When the user deletes the work package named "${name}"`, async () => {
        await workPackagesPage.deleteWorkPackageByName(name);
      });

      await test.step(`Then the work package named "${name}" does not exist in the work packages table`, async () => {
        const exists = await workPackagesPage.isWorkPackageVisible(name);
        expect(exists).toBe(false);
      });
    },
  );

  test(
    'Create work package (phase)',
    { tag: ['@ui', '@phase', '@regression'] },
    async ({ readyOverviewPage }) => {
      const workPackageType = 'phase';
      const name = `Auto WP ${crypto.randomUUID()}`;
      const description = `Auto description ${Date.now()}`;

      let workPackagesPage: WorkPackagesPage;

      await test.step('Given the user is authenticated as "default"', async () => {
        // Already authenticated via readyOverviewPage fixture
      });

      await test.step('And the user selects the "Demo project"', async () => {
        // Already on Demo project via readyOverviewPage fixture
      });

      await test.step('And the user is on the Work packages page', async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
      });

      let newWorkPackagePage: NewWorkPackagePage;
      await test.step(`When the user creates a new work package of type "${workPackageType}"`, async () => {
        newWorkPackagePage = await workPackagesPage.createNewWorkPackageOfType(workPackageType);
      });

      await test.step(`And the user sets the work package name to "${name}"`, async () => {
        await newWorkPackagePage.fillSubject(name);
      });

      await test.step(`And the user sets the work package description to "${description}"`, async () => {
        await newWorkPackagePage.fillDescription(description);
      });

      let workPackageDetailsPage: WorkPackageDetailsPage;
      await test.step('And the user saves the work package', async () => {
        workPackageDetailsPage = await newWorkPackagePage.clickSaveButton();
      });

      await test.step(`Then the work package named "${name}" exists in the system`, async () => {
        await workPackageDetailsPage.goBackToWorkPackagesList();
        workPackagesPage = await new WorkPackagesPage(workPackageDetailsPage.page).waitForLoad();
        const exists = await workPackagesPage.isWorkPackageVisible(name);
        expect(exists).toBe(true);
      });
    },
  );

  test(
    'Delete work package (phase)',
    { tag: ['@ui', '@phase', '@regression'] },
    async ({ readyOverviewPage }) => {
      const workPackageType = 'phase';
      const name = `Auto WP ${crypto.randomUUID()}`;
      const description = `Auto description ${Date.now()}`;

      let workPackagesPage: WorkPackagesPage;

      await test.step('Given the user is authenticated as "default"', async () => {
        // Already authenticated via readyOverviewPage fixture
      });

      await test.step('And the user selects the "Demo project"', async () => {
        // Already on Demo project via readyOverviewPage fixture
      });

      await test.step('And the user is on the Work packages page', async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
      });

      await test.step(`And the user creates a work package named "${name}" for deletion`, async () => {
        const newWorkPackagePage =
          await workPackagesPage.createNewWorkPackageOfType(workPackageType);
        await newWorkPackagePage.fillSubject(name);
        await newWorkPackagePage.fillDescription(description);
        const workPackageDetailsPage = await newWorkPackagePage.clickSaveButton();
        await workPackageDetailsPage.goBackToWorkPackagesList();
        workPackagesPage = await new WorkPackagesPage(workPackageDetailsPage.page).waitForLoad();
      });

      await test.step(`When the user deletes the work package named "${name}"`, async () => {
        await workPackagesPage.deleteWorkPackageByName(name);
      });

      await test.step(`Then the work package named "${name}" does not exist in the system`, async () => {
        const exists = await workPackagesPage.isWorkPackageVisible(name);
        expect(exists).toBe(false);
      });
    },
  );
});
