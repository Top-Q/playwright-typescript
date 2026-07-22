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
 *
 * @aliases ProjectMembersPage, MemberListPage, TeamPage
 * @url /projects/:projectId/members
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

    /**
     * Returns the member table component, used to count members, list their
     * names, and reach individual rows for role changes or removal.
     *
     * @aliases getMemberTable, table, membersTable
     * @prerequisites The Members page is open
     * @observable-state None — returns a component wrapper without interacting
     * @returns A `MemberTableComp` for the members table.
     */
    memberTable(): MemberTableComp {
        return new MemberTableComp(this.page, this.memberTableRoot);
    }

    /**
     * Opens the inline add member form via the "+ Member" button. Idempotent —
     * if the form is already open this does nothing.
     *
     * @aliases showAddMemberForm, clickAddMember, openInviteForm
     * @prerequisites The Members page is open
     * @observable-state The inline add member form is visible, exposing the user search field and role dropdown
     */
    async openAddMemberForm(): Promise<void> {
        if (!(await this.addMemberForm.isVisible())) {
            await this.addMemberButton.click();
            await this.addMemberForm.waitFor();
        }
    }

    /**
     * Adds a member to the project by searching for a user name, or inviting by
     * email when no matching user exists. Opens the add member form first if it
     * is not already open, so it can be called directly.
     *
     * Waits for the POST to complete and then reloads the page, so the members
     * table reliably reflects the new member on return.
     *
     * @aliases addMemberToProject, inviteUser, createMember, addUser
     * @prerequisites The Members page is open and the named user (or email) can be granted the role
     * @observable-state The member is added and appears as a new row in the members table; the page reloads and shows a success flash
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

    /**
     * Checks whether the inline add member form is currently visible.
     *
     * @aliases isAddFormOpen, addMemberFormIsVisible
     * @prerequisites The Members page is open
     * @observable-state None — read-only query
     * @returns True if the add member form is visible, false otherwise.
     */
    async isAddMemberFormVisible(): Promise<boolean> {
        return await this.addMemberForm.isVisible();
    }

    /**
     * Closes the inline add member form. Idempotent — does nothing if the form
     * is already closed.
     *
     * @aliases hideAddMemberForm, cancelAddMember, dismissAddForm
     * @prerequisites The Members page is open
     * @observable-state The add member form is hidden and no member is added
     */
    async closeAddMemberForm(): Promise<void> {
        if (await this.addMemberForm.isVisible()) {
            await this.closeFormLink.click();
        }
    }

    // --- Filter methods ---

    /**
     * Opens the filter panel and waits for its Apply button, making the filter
     * fields usable.
     *
     * @aliases showFilterPanel, clickFilter, toggleFilterPanel
     * @prerequisites The Members page is open
     * @observable-state The filter panel opens, exposing the Status, Role, and Name filter fields
     */
    async openFilter(): Promise<void> {
        await this.filterButton.click();
        await this.filterApplyButton.waitFor();
    }

    /**
     * Types a name into the filter panel's Name field and applies the filter,
     * waiting for the resulting page load.
     *
     * @aliases searchMemberByName, applyNameFilter, filterMembers
     * @prerequisites The filter panel is open — call {@link openFilter} first
     * @observable-state The members table reloads showing only members matching the name
     * @param name - The member name to filter by.
     */
    async filterByName(name: string): Promise<void> {
        await this.filterNameInput.fill(name);
        await this.filterApplyButton.click();
        await this.page.waitForLoadState('load');
    }

    /**
     * Clears all active filters and waits for the resulting page load.
     *
     * @aliases resetFilter, removeFilters, clearAllFilters
     * @prerequisites The filter panel is open — call {@link openFilter} first
     * @observable-state The members table reloads showing the unfiltered member list
     */
    async clearFilter(): Promise<void> {
        await this.filterClearButton.click();
        await this.page.waitForLoadState('load');
    }

    // --- Sidebar navigation ---

    /**
     * Navigates to the "All" members view via the sidebar link.
     *
     * @aliases showAllMembers, viewAll
     * @prerequisites The Members page is open
     * @observable-state The table reloads showing every member regardless of status
     * @returns A `MembersPage` for the reloaded view.
     */
    async clickSidebarAll(): Promise<MembersPage> {
        await this.page
            .getByRole('link', { name: 'All', exact: true })
            .click();
        return await new MembersPage(this.page).waitForLoad();
    }

    /**
     * Navigates to the "Locked" members view via the sidebar link.
     *
     * @aliases showLockedMembers, viewLocked
     * @prerequisites The Members page is open
     * @observable-state The table reloads showing only members whose account is locked
     * @returns A `MembersPage` for the reloaded view.
     */
    async clickSidebarLocked(): Promise<MembersPage> {
        await this.page
            .getByRole('link', { name: 'Locked', exact: true })
            .click();
        return await new MembersPage(this.page).waitForLoad();
    }

    /**
     * Navigates to the "Invited" members view via the sidebar link.
     *
     * @aliases showInvitedMembers, viewInvited, viewPendingInvitations
     * @prerequisites The Members page is open
     * @observable-state The table reloads showing only members with a pending invitation
     * @returns A `MembersPage` for the reloaded view.
     */
    async clickSidebarInvited(): Promise<MembersPage> {
        await this.page
            .getByRole('link', { name: 'Invited', exact: true })
            .click();
        return await new MembersPage(this.page).waitForLoad();
    }

    /**
     * Checks whether a member with the given name exists in the table.
     * Convenience delegate to {@link MemberTableComp.hasMemberWithName}.
     *
     * Only inspects the rows currently displayed, so an active filter or a
     * status view other than "All" can hide an existing member.
     *
     * @aliases memberExists, isMemberVisible, hasMember
     * @prerequisites The Members page is open
     * @observable-state None — read-only query
     * @param name - The member name to look for.
     * @returns True if a matching row is displayed, false otherwise.
     */
    async hasMemberWithName(name: string): Promise<boolean> {
        return await this.memberTable().hasMemberWithName(name);
    }
}
