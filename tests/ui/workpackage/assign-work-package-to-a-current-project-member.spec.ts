import { test } from '../fixtures';
import {
    MemberTableComp,
    MemberTableRowComp,
    MembersPage,
    NewWorkPackagePage,
    WorkPackageDetailsPage,
    WorkPackagesPage,
} from '../../../internals';
import { expect } from '@playwright/test';

test(
    'Assign Work Package to a current Project Member',
    { tag: ['@ui', '@workpackage', '@regression'] },
    async ({ readyOverviewPage }) => {
        // Step 2 reads the status of every project member one row at a time, and
        // the roster only ever grows on a shared instance, so this test runs for
        // ~50s of the 60s default and would start timing out on roster size
        // alone. Raised so the budget tracks the work, not the data.
        test.setTimeout(120_000);

        // The work package this test assigns is created by this test, with a
        // unique subject, so the run never depends on - or collides with - a
        // work package another test or an earlier run left behind.
        const workPackageType = 'task';
        const subject = `Auto WP assign ${Date.now()}`;

        // The assignee is discovered from the project's own roster rather than
        // hardcoded. Adding a member from a test can only be done by inviting an
        // email address, which yields status "invited", not "active", and no page
        // object activates an account - so an *active* member has to be one the
        // project already has, and which one that is must not be assumed.
        let assigneeName = '';

        let workPackagesPage: WorkPackagesPage;
        let newWorkPackagePage: NewWorkPackagePage;
        let workPackageDetailsPage: WorkPackageDetailsPage;
        let membersPage: MembersPage;
        let memberTable: MemberTableComp;
        let memberRow: MemberTableRowComp;

        await test.step('Given A Work Package exists', async () => {
            workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
            newWorkPackagePage = await workPackagesPage.createNewWorkPackageOfType(workPackageType);
            await newWorkPackagePage.fillSubject(subject);
            workPackageDetailsPage = await newWorkPackagePage.clickSaveButton();

            // The details URL carries the new work package's id, so reaching it
            // is the observable proof that the work package was persisted.
            expect(workPackageDetailsPage.page.url()).toMatch(/\/work_packages\/details\/\d+/);
        });

        await test.step('And Target user is an active Member of the Project', async () => {
            membersPage = await readyOverviewPage.mainMenu().clickMembersLink();
            // Members paginate at 20, and a member on page 2 is invisible to the
            // table component, so widen the page before reading the roster.
            membersPage = await membersPage.showAllOnOnePage();
            memberTable = membersPage.memberTable();

            const memberNames = await memberTable.getAllMemberNames();
            const statuses: string[] = [];
            for (const memberName of memberNames) {
                memberRow = await memberTable.getRowByMemberName(memberName);
                // The rendered casing of the status cell is not guaranteed.
                statuses.push((await memberRow.getStatus()).trim().toLowerCase());
            }

            const activeIndex = statuses.indexOf('active');
            expect(
                activeIndex,
                `the project needs at least one active member; found: ${memberNames
                    .map((name, index) => `${name} (${statuses[index]})`)
                    .join(', ')}`,
            ).toBeGreaterThanOrEqual(0);

            assigneeName = memberNames[activeIndex].trim();
            expect(assigneeName.length).toBeGreaterThan(0);
        });

        await test.step('When Open the Work Package', async () => {
            // Step 2 left the browser on the Members page, so the work packages
            // list has to be reached again before a row can be opened.
            workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
            workPackageDetailsPage = await workPackagesPage.openWorkPackageByName(subject);
        });

        await test.step('And Set Assignee to the target Member', async () => {
            await workPackageDetailsPage.setAssignee(assigneeName);
        });

        await test.step('And Save', async () => {
            // The details view persists an attribute edit as soon as a value is
            // picked - there is no Save control - so saving is confirmed by
            // re-reading the work package from the server. Everything the next
            // step asserts is therefore stored state, not editor state.
            workPackageDetailsPage = await workPackageDetailsPage.reloadFromServer();
        });

        await test.step("Then Assignee field updates and the Work Package appears in that Member's assigned-items view.", async () => {
            expect(await workPackageDetailsPage.getAssignee()).toBe(assigneeName);

            workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
            await workPackagesPage.filterByAssignee(assigneeName);
            expect(await workPackagesPage.isWorkPackageVisible(subject)).toBe(true);
        });

        await test.step('Cleanup: delete the work package created by this test', async () => {
            workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
            await workPackagesPage.deleteWorkPackageByName(subject);
            expect(await workPackagesPage.isWorkPackageVisible(subject)).toBe(false);
        });
    },
);
