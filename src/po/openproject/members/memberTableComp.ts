import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { MemberTableRowComp } from './memberTableRowComp';

/**
 * Represents the members table component on the Members page.
 * Contains rows of members with their name, email, roles, groups, status, etc.
 * The table columns are: Name, Email, Roles, Groups, Shared, Status, Current Rate.
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

    /** Returns the number of member rows in the table. */
    async getNumberOfRows(): Promise<number> {
        await this.page.waitForLoadState('domcontentloaded');
        const tableCount = await this.rootLocator.count();
        if (tableCount === 0) {
            return 0;
        }
        await this.nameColumnHeader.waitFor();
        return await this.rootLocator.locator('tbody tr').count();
    }

    /** Gets a member row by its zero-based index. */
    async getRowByIndex(index: number): Promise<MemberTableRowComp> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator.locator('tbody tr').nth(index);
        return new MemberTableRowComp(this.page, rowLocator);
    }

    /** Gets a member row by the member's name. */
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

    /** Checks if a member with the given name exists in the table. */
    async hasMemberWithName(name: string): Promise<boolean> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator
            .locator('tbody tr')
            .filter({ hasText: name });
        return (await rowLocator.count()) > 0;
    }

    /** Returns an array of all member names displayed in the table. */
    async getAllMemberNames(): Promise<string[]> {
        await this.nameColumnHeader.waitFor();
        const nameLinks = this.rootLocator.locator('tbody tr td.name a');
        return await nameLinks.allInnerTexts();
    }
}
