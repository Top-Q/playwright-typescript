import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { AdminUsersPage } from './adminUsersPage';

/**
 * # Page Description
 * The Administration overview at `/admin`: a grid of tiles, one per
 * administration area. Only administrators can open it; it is reached from
 * the header's user menu via {@link GlobalHeaderComp.clickAdministrationLink}.
 *
 * @aliases AdminPage, AdminOverviewPage, AdministrationOverviewPage
 */
export class AdministrationPage extends BasePage<AdministrationPage> {
    private readonly usersAndPermissionsTile: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // `<a class="menu-block" href="/users">` whose only accessible text is
        // the tile icon's `aria-label` and the tile caption, both "Users and
        // permissions" (`app/views/admin/index.html.erb`). The sidebar carries
        // a link with the same name, so the tile is scoped to the content area.
        this.usersAndPermissionsTile = this.page
            .locator('#content')
            .getByRole('link', { name: 'Users and permissions' })
            .describe('Users and permissions tile');
    }

    async waitForLoad(): Promise<AdministrationPage> {
        await this.page.waitForURL(/\/admin\/?$/);
        await this.usersAndPermissionsTile.waitFor();
        return this;
    }

    /**
     * Opens the users list from the "Users and permissions" tile.
     *
     * @aliases openUsers, goToUsers, clickUsers, openUserAdministration
     * @prerequisites The Administration overview is open and the user is an administrator
     * @observable-state The browser navigates to /users, the list of every user account
     * @returns An `AdminUsersPage` for the users list.
     */
    async clickUsersAndPermissionsTile(): Promise<AdminUsersPage> {
        await this.usersAndPermissionsTile.click();
        return await new AdminUsersPage(this.page).waitForLoad();
    }
}
