import { test } from '../fixtures';
import { NewWorkPackagePage, WorkPackageDetailsPage, WorkPackagesPage } from '../../../internals';
import { expect } from '@playwright/test';

test(
    "New Work Package defaults to Status='New' and Priority='Normal'",
    { tag: ['@ui', '@workpackage', '@regression'] },
    async ({ readyOverviewPage }) => {
        // The work package is created and deleted by this test, under a subject
        // unique to this run, so nothing here depends on data another test or an
        // earlier run left behind.
        const workPackageType = 'task';
        const subject = `Auto WP defaults ${Date.now()}`;

        let workPackagesPage: WorkPackagesPage;
        let newWorkPackagePage: NewWorkPackagePage;
        let workPackageDetailsPage: WorkPackageDetailsPage;

        await test.step('Given Logged in as a Project Member', () => {
            // Satisfied by the readyOverviewPage fixture, which signs in and
            // opens the Demo project before the test body runs.
        });

        await test.step('And Project uses the default (unmodified) workflow/Type seed data (per global constraint)', () => {
            // Environment precondition, not a user action: the instance runs the
            // seeded workflow and type configuration. Nothing to drive in the UI
            // and no observable outcome to assert.
        });

        await test.step("When Create a new Work Package of Type 'Task', supplying only Subject", async () => {
            workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
            newWorkPackagePage = await workPackagesPage.createNewWorkPackageOfType(workPackageType);
            // Only the Subject is supplied - Status and Priority are left for the
            // application to default, which is the whole point of this test.
            await newWorkPackagePage.fillSubject(subject);
        });

        await test.step('And Save', async () => {
            // Reaching the details view is itself the proof that the work package
            // was persisted: clickSaveButton() returns through waitForLoad(), which
            // waits for the /work_packages/details/<id> URL. Asserting that URL
            // again here would restate what the navigation already guaranteed.
            workPackageDetailsPage = await newWorkPackagePage.clickSaveButton();
        });

        await test.step('And Open the Work Package detail view', async () => {
            // Re-opened from the list rather than relying on the view left behind
            // by the save, so the fields read next come from stored state instead
            // of from the form that was just submitted.
            workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
            workPackageDetailsPage = await workPackagesPage.openWorkPackageByName(subject);
        });

        await test.step("Then Status field reads 'New' and Priority field reads 'Normal' without the user having set either explicitly.", async () => {
            // Compared case-insensitively: the seeded workflow's initial status
            // and default priority are what matter, not their casing.
            expect(await workPackageDetailsPage.getStatus()).toMatch(/^New$/i);
            expect(await workPackageDetailsPage.getPriority()).toMatch(/^Normal$/i);
        });

        await test.step('Cleanup: delete the work package created by this test', async () => {
            workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
            await workPackagesPage.deleteWorkPackageByName(subject);
            expect(await workPackagesPage.isWorkPackageVisible(subject)).toBe(false);
        });
    },
);
