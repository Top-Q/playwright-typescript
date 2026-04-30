import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';

/**
 * Represents a single row in the members table.
 * Each row shows a member's name, email, roles, groups, shared status, status, and current rate.
 * The row has a "..." context menu with "Manage roles" and "Remove member" options.
 * "Manage roles" expands inline with role checkboxes and Change/Cancel buttons.
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

    /** Returns the member's display name. */
    async getName(): Promise<string> {
        return await this.nameLink.innerText();
    }

    /** Returns the member's email address. */
    async getEmail(): Promise<string> {
        return await this.emailLink.innerText();
    }

    /** Returns the text content of the roles cell. */
    async getRolesText(): Promise<string> {
        return await this.rolesCell.innerText();
    }

    /** Returns the member's status (e.g., "active", "locked", "invited"). */
    async getStatus(): Promise<string> {
        return await this.statusCell.innerText();
    }

    /**
     * Opens the context menu ("...") and clicks "Manage roles".
     * This expands the row inline with role checkboxes.
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
     * Toggles a role checkbox in the inline manage roles form.
     * Must call `clickManageRoles()` first.
     * @param roleName - The role to toggle (e.g., "Member", "Reader", "Project admin").
     */
    async toggleRole(roleName: string): Promise<void> {
        await this.rootComponent
            .getByRole('checkbox', { name: roleName })
            .click();
    }

    /** Returns whether a role checkbox is checked. Must call `clickManageRoles()` first. */
    async isRoleChecked(roleName: string): Promise<boolean> {
        return await this.rootComponent
            .getByRole('checkbox', { name: roleName })
            .isChecked();
    }

    /** Clicks the "Change" button to save role changes. */
    async clickChangeButton(): Promise<void> {
        await this.rootComponent
            .getByRole('button', { name: 'Change' })
            .click();
        await this.page.waitForLoadState('load');
    }

    /** Clicks the "Cancel" button to discard role changes. */
    async clickCancelButton(): Promise<void> {
        await this.rootComponent
            .getByRole('button', { name: 'Cancel' })
            .click();
    }

    /**
     * Opens the context menu, clicks "Remove member", and confirms in the Primer dialog.
     * The dialog contains a "Remove" link with data-turbo-method="delete".
     * After deletion, Turbo redirects back to the members page.
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
