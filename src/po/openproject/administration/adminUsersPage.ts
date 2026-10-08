import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { EditUserPage } from './editUserPage';
import { NewUserPage } from './newUserPage';

/**
 * # Page Description
 * The administration list of user accounts at `/users`, with a filter panel
 * (Status, Name) above the table. Administrators only.
 *
 * Not to be confused with a project's Members page ({@link MembersPage}),
 * which lists the users *of one project*: this lists every account.
 *
 * @aliases UsersPage, UserListPage, UsersAdminPage, AccountsPage
 */
export class AdminUsersPage extends BasePage<AdminUsersPage> {
    private readonly newUserButton: Locator;
    private readonly nameFilterInput: Locator;
    private readonly applyFilterButton: Locator;
    private readonly usersTable: Locator;
    private readonly loginLinks: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // A Primer sub-header action `<a href="/users/new">` whose visible
        // text is "User" and whose label is `t(:label_user_new)`, "New user"
        // (`app/components/users/index_sub_header_component.html.erb:3-11`).
        this.newUserButton = this.page
            .getByRole('link', { name: 'New user' })
            .describe('New user button');
        // The shared principal filter panel: a `GET` form with
        // `<label for="name">Name:</label>` and `text_field_tag "name"`
        // (`app/components/individual_principal_base_filter_component.html.erb:107`).
        this.nameFilterInput = this.page
            .getByRole('textbox', { name: 'Name:' })
            .describe('Users filter: Name');
        this.applyFilterButton = this.page
            .getByRole('button', { name: 'Apply' })
            .describe('Users filter: Apply');
        this.usersTable = this.page
            .locator('#content')
            .getByRole('table')
            .describe('Users table');
        // The Username cell's link carries `class: "op-principal--name"`
        // (`app/components/users/row_component.rb:49-52`). The Email cell's
        // `mailto:` link has the same text whenever the login is the email,
        // so the class is what tells the two apart.
        this.loginLinks = this.usersTable
            .locator('a.op-principal--name')
            .describe('Users table: Username links');
    }

    async waitForLoad(): Promise<AdminUsersPage> {
        await this.page.waitForURL(/\/users\/?(\?|$)/);
        await this.newUserButton.waitFor();
        return this;
    }

    /**
     * Opens the New user form.
     *
     * @aliases clickAddUser, openNewUserForm, createUser, addUser, newUser
     * @prerequisites The users list is open
     * @observable-state The browser navigates to /users/new
     * @returns A `NewUserPage` for the empty form.
     */
    async clickNewUserButton(): Promise<NewUserPage> {
        await this.newUserButton.click();
        return await new NewUserPage(this.page).waitForLoad();
    }

    /**
     * Filters the list by name and returns the reloaded list.
     *
     * The filter is a `GET` form, so applying navigates; the wait is on a
     * non-empty `name=` in the URL, because `waitForLoadState('load')` would
     * resolve against the document still on screen (the same trap as
     * {@link MembersPage.filterByName}). The filter matches login, first
     * name, last name and email.
     *
     * @aliases searchUsers, findUser, filterUsers, searchUserByName
     * @prerequisites The users list is open
     * @observable-state The table reloads showing only users matching the name; the URL carries `name`
     * @param name - The name, login or email, or part of one, to filter by.
     * @returns The reloaded `AdminUsersPage`.
     */
    async filterByName(name: string): Promise<AdminUsersPage> {
        await this.nameFilterInput.fill(name);
        await this.applyFilterButton.click();
        await this.page.waitForURL(/[?&]name=[^&]/);
        return await new AdminUsersPage(this.page).waitForLoad();
    }

    /**
     * Opens a user's edit page from the Username column.
     *
     * The link's text is the user's **login** (which, for a user created
     * through {@link NewUserPage}, is their email), and for an administrator it
     * leads to the edit page (`allowed_management_user_profile_path`,
     * `app/helpers/users_helper.rb:144`). Filter first with
     * {@link filterByName} — the list is paginated.
     *
     * @aliases openUser, editUser, clickUser, goToUser, openUserByLogin
     * @prerequisites The users list is open and shows the user
     * @observable-state The browser navigates to /users/<id>/edit
     * @param login - The user's login, exactly as shown in the Username column.
     * @returns An `EditUserPage` for that user.
     */
    async clickUserByLogin(login: string): Promise<EditUserPage> {
        await this.loginLinks.filter({ hasText: login }).first().click();
        return await new EditUserPage(this.page).waitForLoad();
    }
}
