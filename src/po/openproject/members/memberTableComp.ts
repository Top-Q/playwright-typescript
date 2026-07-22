import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { MemberTableRowComp } from './memberTableRowComp';

/**
 * Represents the members table component on the Members page.
 * Contains rows of members with their name, email, roles, groups, status, etc.
 * The table columns are: Name, Email, Roles, Groups, Shared, Status, Current Rate.
 *
 * @aliases MembersTable, MemberList
 */
export class MemberTableComp extends BaseComponent<MemberTableComp> {
    private readonly nameColumnHeader: Locator;

    constructor(
        protected readonly page: Page,
        protected readonly rootLocator: Locator,
    ) {
        super(page, rootLocator);
        this.nameColumnHeader = this.rootComponent
            .getByRole('link', { name: 'Name' })
            .describe('Name column header');
    }

    async waitForLoad(): Promise<MemberTableComp> {
        await this.nameColumnHeader.waitFor();
        return this;
    }

    /**
     * Returns the number of member rows in the table, or 0 when the table is
     * absent entirely.
     *
     * Unlike the boards table, this does not special-case an empty-state
     * placeholder row, so verify the members table's empty rendering before
     * relying on a result of 1.
     *
     * @aliases getMemberCount, countMembers, getNumberOfMembers
     * @prerequisites The Members page is open
     * @observable-state None — read-only query
     * @returns The number of member rows currently displayed.
     */
    async getNumberOfRows(): Promise<number> {
        await this.page.waitForLoadState('domcontentloaded');
        const tableCount = await this.rootLocator.count();
        if (tableCount === 0) {
            return 0;
        }
        await this.nameColumnHeader.waitFor();
        return await this.rootLocator.locator('tbody tr').count();
    }

    /**
     * Gets a member row by its zero-based index.
     *
     * @aliases getMemberByIndex, getRowAt
     * @prerequisites The Members page is open and the table has at least `index + 1` rows
     * @observable-state None — read-only query
     * @param index - The index of the row to retrieve.
     * @returns A `MemberTableRowComp` for the row at that index.
     */
    async getRowByIndex(index: number): Promise<MemberTableRowComp> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator.locator('tbody tr').nth(index);
        return new MemberTableRowComp(this.page, rowLocator);
    }

    /**
     * Gets a member row by the member's name, returning the first match.
     * Throws if no row matches.
     *
     * @aliases findMemberByName, getMemberRow, getRowForMember
     * @prerequisites The Members page is open and a member with this name is displayed
     * @observable-state None — read-only query
     * @param name - The member name to look up.
     * @returns A `MemberTableRowComp` for the first matching row.
     */
    async getRowByMemberName(name: string): Promise<MemberTableRowComp> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator
            .locator('tbody tr')
            .filter({ hasText: name });
        if ((await rowLocator.count()) === 0) {
            throw new Error(`No row found for member: ${name}`);
        }
        return new MemberTableRowComp(this.page, rowLocator.first());
    }

    /**
     * Checks whether a member with the given name is present in the table.
     * Matches against the whole row's text, so a name appearing in another
     * column (an email, for example) also counts as a match.
     *
     * @aliases memberExists, isMemberVisible, hasMember
     * @prerequisites The Members page is open
     * @observable-state None — read-only query
     * @param name - The member name to look for.
     * @returns True if a matching row is displayed, false otherwise.
     */
    async hasMemberWithName(name: string): Promise<boolean> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator
            .locator('tbody tr')
            .filter({ hasText: name });
        return (await rowLocator.count()) > 0;
    }

    /**
     * Returns the names of all members currently displayed in the table.
     * Reflects the active filter and status view, not the full project roster.
     *
     * @aliases listMemberNames, getMemberNames, getAllMembers
     * @prerequisites The Members page is open
     * @observable-state None — read-only query
     * @returns The displayed member names, in table order.
     */
    async getAllMemberNames(): Promise<string[]> {
        await this.nameColumnHeader.waitFor();
        const nameLinks = this.rootLocator.locator('tbody tr td.name a');
        return await nameLinks.allInnerTexts();
    }
}
