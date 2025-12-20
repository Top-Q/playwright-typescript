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

}