import { test } from '../fixtures';
import { MembersPage } from '../../../internals';
import { expect } from '@playwright/test';

test(
    'Invite a new member via email and verify they appear in the members list',
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        const memberEmail = `testmember-${Date.now()}@example.com`;

        let membersPage: MembersPage;
        await test.step('Given the user navigates to the Members page', async () => {
            membersPage = await readyOverviewPage
                .mainMenu()
                .clickMembersLink();
        });

        await test.step('When the user invites a new member via email with the "Member" role', async () => {
            await membersPage.addMember(memberEmail, 'Member');
        });

        await test.step('Then the invited member appears in the members list', async () => {
            const hasMember = await membersPage.hasMemberWithName(memberEmail);
            expect(hasMember).toBe(true);
        });

        await test.step('And the invited member has "invited" status', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            const status = await row.getStatus();
            expect(status.toLowerCase()).toContain('invited');
        });

        // Cleanup: remove the member
        await test.step('Cleanup: remove the invited member', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            await row.removeMember();
        });
    },
);

test(
    'Invite a member with "Reader" role and verify the assigned role',
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        const memberEmail = `reader-${Date.now()}@example.com`;

        let membersPage: MembersPage;
        await test.step('Given the user navigates to the Members page', async () => {
            membersPage = await readyOverviewPage
                .mainMenu()
                .clickMembersLink();
        });

        await test.step('When the user invites a member with the "Reader" role', async () => {
            await membersPage.addMember(memberEmail, 'Reader');
        });

        await test.step('Then the member has the "Reader" role assigned', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            const roles = await row.getRolesText();
            expect(roles).toContain('Reader');
        });

        // Cleanup
        await test.step('Cleanup: remove the member', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            await row.removeMember();
        });
    },
);

test(
    'Change a member role from Member to Project admin',
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        const memberEmail = `rolechange-${Date.now()}@example.com`;

        let membersPage: MembersPage;
        await test.step('Given a member is added with the "Member" role', async () => {
            membersPage = await readyOverviewPage
                .mainMenu()
                .clickMembersLink();
            await membersPage.addMember(memberEmail, 'Member');
        });

        await test.step('When the user changes the role to "Project admin"', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            await row.clickManageRoles();
            await row.toggleRole('Member');
            await row.toggleRole('Project admin');
            await row.clickChangeButton();
        });

        await test.step('Then the member now has the "Project admin" role', async () => {
            membersPage = await new MembersPage(
                readyOverviewPage.page,
            ).waitForLoad();
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            const roles = await row.getRolesText();
            expect(roles).toContain('Project admin');
        });

        // Cleanup
        await test.step('Cleanup: remove the member', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            await row.removeMember();
        });
    },
);

test(
    'Remove a member from the project',
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        const memberEmail = `removeme-${Date.now()}@example.com`;

        let membersPage: MembersPage;
        await test.step('Given a member is added to the project', async () => {
            membersPage = await readyOverviewPage
                .mainMenu()
                .clickMembersLink();
            await membersPage.addMember(memberEmail, 'Member');
            const hasMember = await membersPage.hasMemberWithName(memberEmail);
            expect(hasMember).toBe(true);
        });

        await test.step('When the user removes the member', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            await row.removeMember();
        });

        await test.step('Then the member no longer appears in the list', async () => {
            membersPage = await new MembersPage(
                readyOverviewPage.page,
            ).waitForLoad();
            const hasMember = await membersPage.hasMemberWithName(memberEmail);
            expect(hasMember).toBe(false);
        });
    },
);

test(
    'Filter members by name and verify filtered results',
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        const memberEmail = `filterable-${Date.now()}@example.com`;

        let membersPage: MembersPage;
        await test.step('Given a member is added to the project', async () => {
            membersPage = await readyOverviewPage
                .mainMenu()
                .clickMembersLink();
            await membersPage.addMember(memberEmail, 'Member');
        });

        await test.step('When the user filters by the member email', async () => {
            await membersPage.openFilter();
            await membersPage.filterByName(memberEmail);
        });

        await test.step('Then the matching member is shown in filtered results', async () => {
            const hasMember = await membersPage.hasMemberWithName(memberEmail);
            expect(hasMember).toBe(true);
        });

        // Cleanup: reload page to clear filter, then remove the member
        await test.step('Cleanup: remove the member', async () => {
            await readyOverviewPage.page.goto(
                readyOverviewPage.page
                    .url()
                    .replace(/\?.*$/, ''),
            );
            membersPage = await new MembersPage(
                readyOverviewPage.page,
            ).waitForLoad();
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            await row.removeMember();
        });
    },
);

test(
    'Sidebar navigation shows invited members',
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        const memberEmail = `invited-${Date.now()}@example.com`;

        let membersPage: MembersPage;
        await test.step('Given a member is invited to the project', async () => {
            membersPage = await readyOverviewPage
                .mainMenu()
                .clickMembersLink();
            await membersPage.addMember(memberEmail, 'Member');
        });

        await test.step('When the user clicks the "Invited" sidebar link', async () => {
            membersPage = await membersPage.clickSidebarInvited();
        });

        await test.step('Then the invited member is shown in the list', async () => {
            const hasMember = await membersPage.hasMemberWithName(memberEmail);
            expect(hasMember).toBe(true);
        });

        // Cleanup: go back to All and remove
        await test.step('Cleanup: remove the member', async () => {
            membersPage = await membersPage.clickSidebarAll();
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberEmail);
            await row.removeMember();
        });
    },
);
