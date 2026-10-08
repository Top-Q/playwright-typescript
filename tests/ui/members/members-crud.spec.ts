import { test } from '../fixtures';
import { GlobalHeaderComp, IntroPage, MembersPage, WorkPackagesPage } from '../../../internals';
import { expect } from '@playwright/test';

test(
    'Invite a new member via email and verify they appear in the members list',
    {
        tag: ['@ui', '@members', '@regression', '@TC-MEM-001-02'],
        annotation: { type: 'built-from', description: 'TC-MEM-001-02@85e65386d8a249d5' },
    },
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
    {
        tag: ['@ui', '@members', '@regression', '@TC-MEM-002-03'],
        annotation: { type: 'built-from', description: 'TC-MEM-002-03@82c04af9faf420b0' },
    },
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
    {
        tag: ['@ui', '@members', '@regression', '@TC-MEM-004-01'],
        annotation: { type: 'built-from', description: 'TC-MEM-004-01@8b0d826d28c89af2' },
    },
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
    {
        tag: ['@ui', '@members', '@regression', '@TC-MEM-005-01'],
        annotation: { type: 'built-from', description: 'TC-MEM-005-01@e4a941137e7c0342' },
    },
    async ({ readyOverviewPage, browser }) => {
        // Two sessions and about a dozen full page loads (admin pages, the
        // projects list, members, the second user's sign-in) run past the
        // 60s default on a members list padded by earlier runs.
        test.setTimeout(120_000);

        // A user who can actually sign in, so that losing the Member role's
        // permissions can be observed from their side. An invited email
        // address has no password and cannot.
        const stamp = Date.now();
        const memberName = `Removed Member${stamp}`;
        const memberEmail = `removeme-${stamp}@example.com`;
        const memberPassword = `Removed-${stamp}`;
        const adminPage = readyOverviewPage.page;
        const header = new GlobalHeaderComp(adminPage);

        await test.step(`Given a user "${memberName}" with a password exists`, async () => {
            const administrationPage = await header.clickAdministrationLink();
            const usersPage = await administrationPage.clickUsersAndPermissionsTile();
            const newUserPage = await usersPage.clickNewUserButton();
            const editUserPage = await newUserPage.createUser('Removed', `Member${stamp}`, memberEmail);
            await editUserPage.setPassword(memberPassword);
        });

        let membersPage: MembersPage;
        await test.step('And the user is a member of Demo project with the "Member" role', async () => {
            let projectsPage = await header.clickProjectsModuleLink();
            projectsPage = await projectsPage.filterByName('Demo project');
            const overviewPage = await projectsPage.getProjectRowByName('Demo project').clickName();
            membersPage = await overviewPage.mainMenu().clickMembersLink();
            await membersPage.addMember(memberName, 'Member');
            expect(await membersPage.hasMemberWithName(memberName)).toBe(true);
        });

        const memberContext = await browser.newContext();
        const memberPage = await memberContext.newPage();
        let memberWorkPackages: WorkPackagesPage;
        await test.step('And, signed in, the member can create work packages in Demo project', async () => {
            await memberPage.goto('http://localhost:8090/projects/demo-project/work_packages');
            const loginPage = await new IntroPage(memberPage).waitForLoad();
            memberWorkPackages = await loginPage.signInAndReturnTo(
                memberEmail,
                memberPassword,
                new WorkPackagesPage(memberPage),
            );
            await expect(memberWorkPackages.getCreateButton()).toBeEnabled();
        });

        await test.step('When the administrator removes the member', async () => {
            const row = await membersPage
                .memberTable()
                .getRowByMemberName(memberName);
            await row.removeMember();
        });

        await test.step('Then the member no longer appears in the list', async () => {
            membersPage = await new MembersPage(adminPage).waitForLoad();
            expect(await membersPage.hasMemberWithName(memberName)).toBe(false);
        });

        await test.step('And on their next page load the user can still view Demo project, as any non-member can', async () => {
            memberWorkPackages = await memberWorkPackages.reload();
        });

        await test.step('But can no longer create work packages there', async () => {
            await expect(memberWorkPackages.getCreateButton()).toBeDisabled();
        });

        await test.step('Cleanup: lock the user', async () => {
            await memberContext.close();
            const administrationPage = await header.clickAdministrationLink();
            let usersPage = await administrationPage.clickUsersAndPermissionsTile();
            usersPage = await usersPage.filterByName(memberEmail);
            const editUserPage = await usersPage.clickUserByLogin(memberEmail);
            await editUserPage.lockPermanently();
        });
    },
);

test(
    'Filter members by name and verify filtered results',
    {
        tag: ['@ui', '@members', '@regression', '@TC-MEM-003-03'],
        annotation: { type: 'built-from', description: 'TC-MEM-003-03@c85003b2f83c3c19' },
    },
    async ({ readyOverviewPage }) => {
        const nameFragment = `filterable-${Date.now()}`;
        const memberEmail = `${nameFragment}@example.com`;

        let membersPage: MembersPage;
        await test.step('Given a member is added to the project', async () => {
            membersPage = await readyOverviewPage
                .mainMenu()
                .clickMembersLink();
            await membersPage.addMember(memberEmail, 'Member');
        });

        await test.step('And other members whose names do not match are listed', async () => {
            const names = await membersPage.memberTable().getAllMemberNames();
            expect(names.filter((name) => !name.includes(nameFragment)).length).toBeGreaterThan(0);
        });

        await test.step(`When the user filters by the partial name "${nameFragment}"`, async () => {
            await membersPage.openFilter();
            membersPage = await membersPage.filterByName(nameFragment);
        });

        await test.step('Then only members whose name matches are shown', async () => {
            const names = await membersPage.memberTable().getAllMemberNames();
            expect(names.length).toBeGreaterThan(0);
            expect(names.filter((name) => !name.includes(nameFragment))).toEqual([]);
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
