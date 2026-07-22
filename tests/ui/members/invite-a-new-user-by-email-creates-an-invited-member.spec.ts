import { test } from '../fixtures';
import { MembersPage, MemberTableRowComp } from '../../../internals';
import { expect } from '@playwright/test';

test(
    "Invite a new user by email creates an 'Invited' member",
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        // Unique local part guarantees the target email has no existing account
        // and keeps the test re-runnable without depending on other tests.
        const invitedEmail = `external-invitee-${Date.now()}@example.com`;
        const role = 'Member';

        let membersPage: MembersPage;
        let invitedRow: MemberTableRowComp;

        await test.step('Given Logged in as a Project Manager', async () => {
            membersPage = await readyOverviewPage.mainMenu().clickMembersLink();
        });

        await test.step('And Target email has no existing account', async () => {
            const alreadyMember =
                await membersPage.hasMemberWithName(invitedEmail);
            expect(alreadyMember).toBe(false);
        });

        await test.step("When Click 'Add member'", async () => {
            await membersPage.openAddMemberForm();
            const formVisible = await membersPage.isAddMemberFormVisible();
            expect(formVisible).toBe(true);
        });

        await test.step('And Enter an external email address', async () => {
            await membersPage.selectMemberToAdd(invitedEmail);
        });

        await test.step('And Select a Role', async () => {
            await membersPage.selectRole(role);
        });

        await test.step('And Click Add', async () => {
            membersPage = await membersPage.submitAddMemberForm();
        });

        await test.step("Then User appears in the Members list with Status 'Invited'; the invited user has no Project access until they complete registration/activation.", async () => {
            const isListed = await membersPage.hasMemberWithName(invitedEmail);
            expect(isListed).toBe(true);

            invitedRow = await membersPage
                .memberTable()
                .getRowByMemberName(invitedEmail);

            const status = await invitedRow.getStatus();
            expect(status.toLowerCase()).toContain('invited');

            const roles = await invitedRow.getRolesText();
            expect(roles).toContain(role);

            // Access is pending activation: the server-side "Invited" view
            // classifies the membership as an unaccepted invitation rather than
            // an active one.
            membersPage = await membersPage.clickSidebarInvited();
            const isPending = await membersPage.hasMemberWithName(invitedEmail);
            expect(isPending).toBe(true);
        });

        await test.step('Cleanup: remove the invited member created by this test', async () => {
            membersPage = await membersPage.clickSidebarAll();
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(invitedEmail);
            await row.removeMember();
        });
    },
);
