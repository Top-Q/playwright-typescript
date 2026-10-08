import { BasePage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';
import { HomePage } from './homePage';

/**
 * # Page Description
 * This page represents the introduction screen of the OpenProject application, 
 * where users can log in to the application.
 */
export class IntroPage extends BasePage<IntroPage> {

    private readonly userNameTextBox: Locator;
    private readonly passwordTextBox: Locator;
    private readonly signInButton: Locator;


    constructor(public readonly page: Page) {
        super(page);        
        this.userNameTextBox = this.page.locator("id=username").describe('Username input field');
        this.passwordTextBox = this.page.locator("id=password").describe('Password input field');
        this.signInButton = this.page.locator("div.login-form--footer > input[name='login']").describe('Log in button');
        
    }

    async waitForLoad(): Promise<IntroPage> {
        await this.userNameTextBox.waitFor({ state: 'visible' });
        return this;
    }

  
    /**
     * Fills the username text box with the provided text.
     * @param username - The username to fill in.
     */
    async fillUserNameTextBox(username: string): Promise<void> {
        await this.userNameTextBox.fill(username);
    }

    /**
     * Fills the password text box with the provided text.
     * @param password - The password to fill in.
     */
    async fillPasswordTextBox(password: string): Promise<void> {
        await this.passwordTextBox.fill(password);
    }

    /**
     * Clicks on the sign-in button and returns a new instance of the HomePage.
     */
    async clickOnSignInButton(): Promise<HomePage> {
        await this.signInButton.click();
        return await new HomePage(this.page).waitForLoad();
    }

    /**
     * Signs in on a login page that was reached by opening a protected URL
     * while signed out, and returns the page object for that URL.
     *
     * Opening a page that needs a session redirects to
     * `/login?back_url=<that page>`, and signing in returns there
     * (`redirect_back_or_default`,
     * `app/controllers/concerns/accounts/redirect_after_login.rb`). That also
     * holds on a user's **first** sign-in, which otherwise lands on
     * `/?first_time_user=true` behind a language dialog and an onboarding
     * tour (`homescreen_helper.rb:53`, `onboarding_tour_trigger.ts:37`) — so
     * this is the way to sign in a freshly created user.
     *
     * @aliases signInReturningTo, loginTo, signInAs, loginAndContinue, signInToDeepLink
     * @prerequisites The login page is open, reached through a redirect from the page `destination` represents
     * @observable-state The user is signed in and the browser is back on the page originally requested
     * @param username - The login (for a user created by an administrator, their email).
     * @param password - The password.
     * @param destination - A page object for the page the redirect returns to.
     * @returns `destination`, once loaded.
     */
    async signInAndReturnTo<T>(username: string, password: string, destination: BasePage<T>): Promise<T> {
        await this.fillUserNameTextBox(username);
        await this.fillPasswordTextBox(password);
        await this.signInButton.click();
        return await destination.waitForLoad();
    }

}