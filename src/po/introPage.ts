import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # IntroPage
 * This page represents the introduction screen of the application, where users can log in.
 */
export class IntroPage extends BasePage {

    /**
    * ## Purpose
    * Clicking this link opens the login form.
    *
    * ## Available Actions
    * - Click
    * - Get text
    *
    * ## Navigation
    * - Successful: Shows login form on IntroPage
    *
    * ## Example Usage
    * ```typescript
    * await introPage.signInLink.click();
    * ```
    */
    signInLink: Locator;

    /**
    * ## Purpose
    * Enter the username for login.
    *
    * ## Available Actions
    * - Fill
    * - Get value
    *
    * ## Navigation
    * - Used in login form on IntroPage
    *
    * ## Example Usage
    * ```typescript
    * await introPage.userNameTextBox.fill('admin');
    * ```
    */
    userNameTextBox: Locator;

    /**
    * ## Purpose
    * Enter the password for login.
    *
    * ## Available Actions
    * - Fill
    * - Get value
    *
    * ## Navigation
    * - Used in login form on IntroPage
    *
    * ## Example Usage
    * ```typescript
    * await introPage.passwordTextBox.fill('adminadmin');
    * ```
    */
    passwordTextBox: Locator;

    /**
    * ## Purpose
    * Clicking this button submits the login form.
    *
    * ## Available Actions
    * - Click
    *
    * ## Navigation
    * - Successful: Redirects to the home page
    *
    * ## Example Usage
    * ```typescript
    * await introPage.signInButton.click();
    * ```
    */
    signInButton: Locator;


    constructor(public readonly page: Page) {
        super(page);
        this.signInLink = this.page.getByRole('link', { name: 'Sign in' });
        this.userNameTextBox = this.page.getByLabel('Username', { exact: true });
        this.passwordTextBox = this.page.getByLabel('Password', { exact: true });
        this.signInButton = this.page.getByRole('button', { name: 'Sign in' });
    }

    async goto(baseUrl: string) {
        await this.page.goto(baseUrl);
    }

}