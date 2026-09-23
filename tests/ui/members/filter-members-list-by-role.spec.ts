import { test } from '../fixtures';
import { MembersPage, MemberTableComp, MemberTableRowComp } from '../../../internals';
import { expect } from '@playwright/test';

test(
    'Filter Members list by Role',
    { tag: ['@ui', '@members', '@regression'] },
    async ({ readyOverviewPage }) => {
        // The two members this test filters over are created by this test, so it
        // never depends on the project roster another test happened to leave
        // behind. Unique local parts guarantee the addresses have no account and
        // take the invite-by-email path.
        const stamp = Date.now();
        const filteredRole = 'Reader';
        const otherRole = 'Member';
        // Neither role name is a substring of the other, so a `toContain` on the
        // Roles cell cannot pass by accident.
        const readerEmail = `filter-reader-${stamp}@example.com`;
        const memberEmail = `filter-member-${stamp}@example.com`;

        let membersPage: MembersPage;
        let memberTable: MemberTableComp;
        let row: MemberTableRowComp;

        await test.step('Given Members exist with different Roles', async () => {
            membersPage = await readyOverviewPage.mainMenu().clickMembersLink();

            await membersPage.addMember(readerEmail, filteredRole);
            await membersPage.addMember(memberEmail, otherRole);

            membersPage = await membersPage.showAllOnOnePage();
            memberTable = membersPage.memberTable();

            row = await memberTable.getRowByMemberName(readerEmail);
            expect(await row.getRolesText()).toContain(filteredRole);

            row = await memberTable.getRowByMemberName(memberEmail);
            expect(await row.getRolesText()).toContain(otherRole);
        });

        await test.step('When Apply a filter for a specific Role', async () => {
            membersPage = await membersPage.filterByRole(filteredRole);
        });

        await test.step('Then Only Members holding that Role are shown.', async () => {
            memberTable = membersPage.memberTable();

            // Every row that survived the filter must carry the role. On its own
            // this would also pass on an empty table, hence the membership
            // checks below.
            const rowCount = await memberTable.getNumberOfRows();
            expect(rowCount).toBeGreaterThan(0);
            for (let index = 0; index < rowCount; index++) {
                row = await memberTable.getRowByIndex(index);
                expect(await row.getRolesText()).toContain(filteredRole);
            }

            // And the two members this test controls land on the sides they
            // should: one shown, one filtered out.
            expect(await membersPage.hasMemberWithName(readerEmail)).toBe(true);
            expect(await membersPage.hasMemberWithName(memberEmail)).toBe(false);
        });

        await test.step('Cleanup: remove the two members created by this test', async () => {
            membersPage = await membersPage.clickSidebarAll();

            row = await membersPage.memberTable().getRowByMemberName(readerEmail);
            await row.removeMember();

            row = await membersPage.memberTable().getRowByMemberName(memberEmail);
            await row.removeMember();
        });
    },
);
