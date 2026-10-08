import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { EditUserPage } from './editUserPage';

/**
 * # Page Description
 * The administrator's New user form at `/users/new`
 * (`app/views/users/new.html.erb`).
 *
 * It asks only for a name and an email: **there is no password field**. The
 * account is created with status *invited* and its login set to the email
 * (`users_controller.rb:309-314`), and creating it lands on the user's edit
 * page — where {@link EditUserPage.setPassword} gives it a password and, by
 * doing so, activates it.
 *
 * @aliases CreateUserPage, AddUserPage, UserFormPage
 */
export class NewUserPage extends BasePage<NewUserPage> {
    private readonly firstNameInput: Locator;
    private readonly lastNameInput: Locator;
    private readonly emailInput: Locator;
    private readonly createButton: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // `f.text_field :firstname` / `:lastname` / `:mail`, each `required`,
        // so the label carries a trailing "*"
        // (`app/views/users/form/_basic_attributes.html.erb`).
        this.firstNameInput = this.page
            .getByRole('textbox', { name: 'First name' })
            .describe('New user: First name');
        this.lastNameInput = this.page
            .getByRole('textbox', { name: 'Last name' })
            .describe('New user: Last name');
        this.emailInput = this.page
            .getByRole('textbox', { name: 'Email' })
            .describe('New user: Email');
        // Two submit buttons: "Create" and "Create and continue", which
        // returns to an empty form instead. Both are `icon-checkmark` buttons,
        // whose accessible name starts with an icon-font glyph (see
        // docs/app-under-test/openproject-dom.md), so `exact` matches nothing;
        // anchoring on the *end* of the name tells the two apart.
        this.createButton = this.page
            .locator('#content')
            .getByRole('button', { name: /Create$/ })
            .describe('New user: Create button');
    }

    async waitForLoad(): Promise<NewUserPage> {
        await this.page.waitForURL(/\/users\/new\/?(\?|$)/);
        await this.firstNameInput.waitFor();
        return this;
    }

    /**
     * Fills the First name field.
     *
     * @aliases enterFirstName, setFirstName, typeFirstName
     * @prerequisites The New user form is open
     * @observable-state The First name field holds the text; nothing is saved until {@link clickCreateButton}
     * @param firstName - The user's first name.
     */
    async fillFirstName(firstName: string): Promise<void> {
        await this.firstNameInput.fill(firstName);
    }

    /**
     * Fills the Last name field.
     *
     * @aliases enterLastName, setLastName, typeLastName
     * @prerequisites The New user form is open
     * @observable-state The Last name field holds the text; nothing is saved until {@link clickCreateButton}
     * @param lastName - The user's last name.
     */
    async fillLastName(lastName: string): Promise<void> {
        await this.lastNameInput.fill(lastName);
    }

    /**
     * Fills the Email field. The new user's login defaults to this address.
     *
     * @aliases enterEmail, setEmail, typeEmail, fillMail
     * @prerequisites The New user form is open
     * @observable-state The Email field holds the text; nothing is saved until {@link clickCreateButton}
     * @param email - The user's email address.
     */
    async fillEmail(email: string): Promise<void> {
        await this.emailInput.fill(email);
    }

    /**
     * Submits the form with "Create". On success the server redirects to the
     * new user's edit page (`users_controller.rb:96`); an invalid submission
     * re-renders the form at `/users`, so waiting for the edit page also fails
     * fast on a rejected user.
     *
     * @aliases submit, saveUser, clickCreate, confirmCreateUser
     * @prerequisites First name, last name and email are filled
     * @observable-state The user exists with status invited, and the browser shows /users/<id>/edit
     * @returns An `EditUserPage` for the new user.
     */
    async clickCreateButton(): Promise<EditUserPage> {
        await this.createButton.click();
        return await new EditUserPage(this.page).waitForLoad();
    }

    /**
     * Creates a user end to end: fills the name and email and submits. Use the
     * individual fill methods when a test needs to observe the form itself.
     *
     * @aliases addUser, createAccount, registerUser, newUser
     * @prerequisites The New user form is open
     * @observable-state The user exists with status invited and login equal to the email; the browser shows its edit page
     * @param firstName - The user's first name.
     * @param lastName - The user's last name.
     * @param email - The user's email, which also becomes the login.
     * @returns An `EditUserPage` for the new user.
     */
    async createUser(firstName: string, lastName: string, email: string): Promise<EditUserPage> {
        await this.fillFirstName(firstName);
        await this.fillLastName(lastName);
        await this.fillEmail(email);
        return await this.clickCreateButton();
    }
}
