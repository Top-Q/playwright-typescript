import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { MemberTableComp } from './memberTableComp';

/**
 * Represents the Members list page at /projects/:id/members.
 * Shows project members in a table with options to add, filter, and manage members.
 * The "+ Member" button toggles an inline form for adding new members.
 *
 * Sidebar navigation: All | Locked | Invited, Project roles, Work package shares.
 * Filter panel: Status, Role, Work package shares, Name.
 */
export class MembersPage extends BasePage<MembersPage> {
    private readonly addMemberButton: Locator;
    private readonly filterButton: Locator;
    private readonly memberTableRoot: Locator;
    private readonly addMemberForm: Locator;
    private readonly userSearchInput: Locator;
    private readonly roleSelect: Locator;
    private readonly addButton: Locator;
    private readonly closeFormLink: Locator;
    // Filter panel locators
    private readonly filterNameInput: Locator;
    private readonly filterApplyButton: Locator;
    private readonly filterClearButton: Locator;

    constructor(page: Page) {
        super(page);
        this.addMemberButton = page
            .getByRole('button', { name: 'Add member' })
            .describe('Add member button');
        this.filterButton = page
            .getByRole('button', { name: 'Filter' })
            .describe('Filter toggle button');
        this.memberTableRoot = page
            .locator('table.generic-table')
            .describe('Members table');
        this.addMemberForm = page
            .locator('#members_add_form')
            .describe('Add member inline form');
        this.userSearchInput = page
            .locator('#members_add_form')
            .getByRole('combobox', { name: 'Search' })
            .describe('User search input');
        this.roleSelect = page
            .locator('#member_role_ids')
            .describe('Role select dropdown');
        this.addButton = page
            .locator('#members_add_form')
            .getByRole('button', { name: 'Add' })
            .describe('Add button in member form');
        this.closeFormLink = page
            .getByRole('link', { name: 'Close form' })
            .describe('Close add member form link');

        // Filter panel
        this.filterNameInput = page
            .getByRole('textbox', { name: /Name/ })
            .describe('Name filter input');
        this.filterApplyButton = page
            .getByRole('button', { name: 'Apply' })
            .describe('Apply filter button');
        this.filterClearButton = page
            .getByRole('button', { name: 'Clear' })
            .describe('Clear filter button');
    }

    async waitForLoad(): Promise<MembersPage> {
        await this.addMemberButton.waitFor();
        return this;
    }

    /** Returns the member table component for interacting with member rows. */
    memberTable(): MemberTableComp {
        return new MemberTableComp(this.page, this.memberTableRoot);
    }

    /**
     * Opens the add member form by clicking the "+ Member" button.
     * If the form is already open, this is a no-op.
     */
    async openAddMemberForm(): Promise<void> {
        if (!(await this.addMemberForm.isVisible())) {
            await this.addMemberButton.click();
            await this.addMemberForm.waitFor();
        }
    }

    /**
     * Adds a member to the project by searching for a user name or inviting by email.
     * When an email is provided and no matching user exists, it selects the
     * "Send invite to ..." option from the dropdown.
     * After the member is added, the page reloads and a success flash is shown.
     * @param userNameOrEmail - The name or email to search for.
     * @param role - The role to assign. Defaults to 'Member'.
     */
    async addMember(
        userNameOrEmail: string,
        role: string = 'Member',
    ): Promise<void> {
        await this.openAddMemberForm();

        // Select role
        await this.roleSelect.selectOption({ label: role });

        // Type in the search field and select the matching dropdown option
        await this.userSearchInput.fill(userNameOrEmail);
        const dropdownOption = this.page
            .locator('.ng-dropdown-panel .ng-option')
            .filter({ hasText: userNameOrEmail })
            .first();
        await dropdownOption.waitFor();
        await dropdownOption.click();

        // Click Add, wait for the POST response, then reload to ensure table is current
        const responsePromise = this.page.waitForResponse(
            (response) =>
                response.url().includes('/members') &&
                response.request().method() === 'POST',
        );
        await this.addButton.click();
        await responsePromise;
        await this.page.waitForLoadState('load');
        // Reload to ensure the table reflects the new member reliably
        await this.page.reload();
        await this.page.waitForLoadState('load');
    }

    /** Checks if the add member form is currently visible. */
    async isAddMemberFormVisible(): Promise<boolean> {
        return await this.addMemberForm.isVisible();
    }

    /** Closes the add member form. */
    async closeAddMemberForm(): Promise<void> {
        if (await this.addMemberForm.isVisible()) {
            await this.closeFormLink.click();
        }
    }

    // --- Filter methods ---

    /** Opens the filter panel by clicking the Filter button. */
    async openFilter(): Promise<void> {
        await this.filterButton.click();
        await this.filterApplyButton.waitFor();
    }

    /** Filters members by name using the filter panel. */
    async filterByName(name: string): Promise<void> {
        await this.filterNameInput.fill(name);
        await this.filterApplyButton.click();
        await this.page.waitForLoadState('load');
    }

    /** Clears all active filters. */
    async clearFilter(): Promise<void> {
        await this.filterClearButton.click();
        await this.page.waitForLoadState('load');
    }

    // --- Sidebar navigation ---

    /** Navigates to the "All" members view via sidebar link. */
    async clickSidebarAll(): Promise<MembersPage> {
        await this.page
            .getByRole('link', { name: 'All', exact: true })
            .click();
        return await new MembersPage(this.page).waitForLoad();
    }

    /** Navigates to the "Locked" members view via sidebar link. */
    async clickSidebarLocked(): Promise<MembersPage> {
        await this.page
            .getByRole('link', { name: 'Locked', exact: true })
            .click();
        return await new MembersPage(this.page).waitForLoad();
    }

    /** Navigates to the "Invited" members view via sidebar link. */
    async clickSidebarInvited(): Promise<MembersPage> {
        await this.page
            .getByRole('link', { name: 'Invited', exact: true })
            .click();
        return await new MembersPage(this.page).waitForLoad();
    }

    /** Checks if a member with the given name exists in the table. */
    async hasMemberWithName(name: string): Promise<boolean> {
        return await this.memberTable().hasMemberWithName(name);
    }
}
