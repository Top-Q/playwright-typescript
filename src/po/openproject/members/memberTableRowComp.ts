import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';

/**
 * Represents a single row in the members table.
 * Each row shows a member's name, email, roles, groups, shared status, status, and current rate.
 * The row has a "..." context menu with "Manage roles" and "Remove member" options.
 * "Manage roles" expands inline with role checkboxes and Change/Cancel buttons.
 *
 * @aliases MemberRow, MembersTableRow
 */
export class MemberTableRowComp extends BaseComponent<MemberTableRowComp> {
    private readonly nameLink: Locator;
    private readonly emailLink: Locator;
    private readonly rolesCell: Locator;
    private readonly statusCell: Locator;
    private readonly contextMenuButton: Locator;

    constructor(
        protected readonly page: Page,
        protected readonly rowLocator: Locator,
    ) {
        super(page, rowLocator);
        this.nameLink = this.rootComponent
            .locator('td.name a')
            .describe('Member name link');
        this.emailLink = this.rootComponent
            .locator('td.email a')
            .describe('Member email link');
        this.rolesCell = this.rootComponent
            .locator('td.roles')
            .describe('Member roles cell');
        this.statusCell = this.rootComponent
            .locator('td.status')
            .describe('Member status cell');
        this.contextMenuButton = this.rootComponent
            .getByRole('button', { name: 'Actions' })
            .describe('Row context menu button');
    }

    async waitForLoad(): Promise<MemberTableRowComp> {
        await this.rootComponent.waitFor();
        return this;
    }

    /**
     * Returns the member's display name from the Name column.
     *
     * @aliases getMemberName, name
     * @prerequisites This member row is displayed
     * @observable-state None — read-only query
     * @returns The member's display name.
     */
    async getName(): Promise<string> {
        return await this.nameLink.innerText();
    }

    /**
     * Returns the member's email address from the Email column.
     *
     * @aliases getMemberEmail, email
     * @prerequisites This member row is displayed and the Email column is populated
     * @observable-state None — read-only query
     * @returns The member's email address.
     */
    async getEmail(): Promise<string> {
        return await this.emailLink.innerText();
    }

    /**
     * Returns the raw text of the Roles cell. A member with several roles
     * yields them as a single string, so assert with `toContain` rather than
     * exact equality.
     *
     * @aliases getRoles, getMemberRoles, rolesText
     * @prerequisites This member row is displayed
     * @observable-state None — read-only query
     * @returns The roles cell's text content.
     */
    async getRolesText(): Promise<string> {
        return await this.rolesCell.innerText();
    }

    /**
     * Returns the member's status — typically "active", "locked", or "invited".
     *
     * @aliases getMemberStatus, status
     * @prerequisites This member row is displayed
     * @observable-state None — read-only query
     * @returns The status cell's text content.
     */
    async getStatus(): Promise<string> {
        return await this.statusCell.innerText();
    }

    /**
     * Opens the row's "..." context menu and clicks "Manage roles", then waits
     * for the inline role editor to appear. This is the gateway to
     * {@link toggleRole}, {@link isRoleChecked}, {@link clickChangeButton}, and
     * {@link clickCancelButton} — none of them work until it has been called.
     *
     * @aliases openManageRoles, editRoles, clickEditRoles
     * @prerequisites This member row is displayed
     * @observable-state The row expands inline showing a role checkbox per project role, plus Change and Cancel buttons
     */
    async clickManageRoles(): Promise<void> {
        await this.contextMenuButton.click();
        await this.page
            .getByRole('menuitem', { name: /Manage roles/i })
            .click();
        await this.rootComponent
            .getByRole('button', { name: 'Change' })
            .waitFor();
    }

    /**
     * Toggles a role checkbox in the inline manage roles editor. This flips the
     * current state rather than setting it, and the change is not saved until
     * {@link clickChangeButton} is called.
     *
     * @aliases checkRole, toggleRoleCheckbox, selectRole
     * @prerequisites The inline role editor is open — call {@link clickManageRoles} first
     * @observable-state The role checkbox flips state; nothing is persisted until Change is clicked
     * @param roleName - The role to toggle (e.g., "Member", "Reader", "Project admin").
     */
    async toggleRole(roleName: string): Promise<void> {
        await this.rootComponent
            .getByRole('checkbox', { name: roleName })
            .click();
    }

    /**
     * Returns whether a role checkbox is currently checked. Reflects unsaved
     * editor state, not necessarily what is persisted on the server.
     *
     * @aliases hasRole, isRoleSelected, roleIsChecked
     * @prerequisites The inline role editor is open — call {@link clickManageRoles} first
     * @observable-state None — read-only query
     * @param roleName - The role to inspect.
     * @returns True if that role's checkbox is checked.
     */
    async isRoleChecked(roleName: string): Promise<boolean> {
        return await this.rootComponent
            .getByRole('checkbox', { name: roleName })
            .isChecked();
    }

    /**
     * Clicks "Change" to save pending role edits, then waits for the page load.
     *
     * @aliases saveRoles, submitRoleChanges, confirmRoleChange
     * @prerequisites The inline role editor is open — call {@link clickManageRoles} first
     * @observable-state The role changes are persisted, the inline editor closes, and the row's Roles cell shows the new roles
     */
    async clickChangeButton(): Promise<void> {
        await this.rootComponent
            .getByRole('button', { name: 'Change' })
            .click();
        await this.page.waitForLoadState('load');
    }

    /**
     * Clicks "Cancel" to discard pending role edits.
     *
     * @aliases discardRoleChanges, cancelRoleEdit, closeRoleEditor
     * @prerequisites The inline role editor is open — call {@link clickManageRoles} first
     * @observable-state The inline editor closes and the member's roles are unchanged
     */
    async clickCancelButton(): Promise<void> {
        await this.rootComponent
            .getByRole('button', { name: 'Cancel' })
            .click();
    }

    /**
     * Removes this member from the project end to end: opens the row context
     * menu, clicks "Remove member", and confirms in the Primer dialog.
     *
     * The confirmation is a `data-turbo-method="delete"` link, clicked via
     * `dispatchEvent` because Primer dialogs otherwise detach the element
     * mid-click. Afterwards the browser navigates back to the members page URL
     * captured before the removal.
     *
     * @aliases deleteMember, removeFromProject, revokeMembership
     * @prerequisites This member row is displayed and the current user may remove members
     * @observable-state The member is removed from the project, their row disappears, and the browser returns to the members list
     */
    async removeMember(): Promise<void> {
        const membersPageUrl = this.page.url();

        // Open context menu and click "Remove member" to open the confirmation dialog
        await this.contextMenuButton.click();
        await this.page
            .getByRole('menuitem', { name: /Remove member/i })
            .click();

        // Wait for the Primer dialog to appear
        const dialog = this.page.getByRole('dialog', {
            name: /Remove member/i,
        });
        await dialog.waitFor();

        // Click the "Remove" danger link inside the dialog using JS dispatch
        // to avoid "element detached from DOM" issues with Primer dialogs
        const removeLink = dialog.locator('a.Button--danger');
        await removeLink.waitFor();
        await removeLink.dispatchEvent('click');

        // Wait for the page to settle and navigate back to the members list
        await this.page.waitForLoadState('load');
        await this.page.goto(membersPageUrl);
        await this.page.waitForLoadState('load');
    }
}
