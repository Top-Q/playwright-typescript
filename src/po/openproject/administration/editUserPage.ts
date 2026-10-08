import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';

/**
 * # Page Description
 * The administrator's edit page for one user, `/users/<id>/edit`, on its
 * General tab: the user's attributes, an Authentication section with the
 * password fields, and status actions (Send invitation, Lock permanently /
 * Unlock) in the page header.
 *
 * Users cannot be deleted on this instance (`users_deletable_by_admins` is
 * off, so the header renders no Delete action); locking is how a test retires
 * a user it created.
 *
 * @aliases UserEditPage, UserSettingsPage, UserAdminPage, UserProfileEditPage
 */
export class EditUserPage extends BasePage<EditUserPage> {
    private readonly passwordInput: Locator;
    private readonly passwordConfirmationInput: Locator;
    private readonly saveButton: Locator;
    private readonly lockButton: Locator;
    private readonly unlockButton: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // `f.password_field :password` / `:password_confirmation`
        // (`app/views/users/form/authentication/_internal_password.html.erb`).
        // Neither is `required` on an existing user, so the labels carry no "*".
        this.passwordInput = this.page
            .getByRole('textbox', { name: 'Password', exact: true })
            .describe('Edit user: Password');
        this.passwordConfirmationInput = this.page
            .getByRole('textbox', { name: 'Confirmation', exact: true })
            .describe('Edit user: Password confirmation');
        // An `icon-checkmark` button: its accessible name starts with an
        // icon-font glyph, so it is a substring match scoped to the content
        // area (docs/app-under-test/openproject-dom.md).
        this.saveButton = this.page
            .locator('#content')
            .getByRole('button', { name: 'Save' })
            .describe('Edit user: Save button');
        // Page-header action links rendered per available status change, each
        // `<a data-turbo-method="post" aria-label="…">`
        // (`app/components/users/edit_page_header_component.html.erb:63-80`).
        // Their mobile copies are hidden menu items, which `getByRole` skips.
        this.lockButton = this.page
            .getByRole('link', { name: 'Lock permanently' })
            .describe('Edit user: Lock permanently');
        this.unlockButton = this.page
            .getByRole('link', { name: 'Unlock' })
            .describe('Edit user: Unlock');
    }

    async waitForLoad(): Promise<EditUserPage> {
        await this.page.waitForURL(/\/users\/\d+\/edit\/?(\?|$)/);
        await this.saveButton.waitFor();
        return this;
    }

    /**
     * Sets the user's password: fills Password and Confirmation and saves.
     *
     * Setting a password **activates an invited user**
     * (`users_controller.rb:107-116`), which is what makes a user created
     * through {@link NewUserPage} able to sign in. The save redirects back to
     * this page; the "Lock permanently" action appearing is what marks the
     * reloaded page, because it is only offered for an active user.
     *
     * The password must meet the instance's rules — on this one, at least 10
     * characters.
     *
     * @aliases changePassword, assignPassword, activateUser, setUserPassword
     * @prerequisites The edit page of a user with internal authentication is open
     * @observable-state The user has the password, its status is active, and "Lock permanently" is offered
     * @param password - The new password.
     * @returns The reloaded `EditUserPage`.
     */
    async setPassword(password: string): Promise<EditUserPage> {
        await this.passwordInput.fill(password);
        await this.passwordConfirmationInput.fill(password);
        await this.saveButton.click();
        await this.lockButton.waitFor();
        return await new EditUserPage(this.page).waitForLoad();
    }

    /**
     * Locks the user permanently, so the account can no longer sign in. The
     * header then offers "Unlock" in its place.
     *
     * @aliases lockUser, lock, disableUser, deactivateUser, blockUser
     * @prerequisites The edit page of an active user is open, and it is not the signed-in administrator's own
     * @observable-state The user's status is locked and "Unlock" is offered
     * @returns The reloaded `EditUserPage`.
     */
    async lockPermanently(): Promise<EditUserPage> {
        await this.lockButton.click();
        await this.unlockButton.waitFor();
        return await new EditUserPage(this.page).waitForLoad();
    }
}
