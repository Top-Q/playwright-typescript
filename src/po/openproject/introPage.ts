import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Page Description
 * This page represents the introduction screen of the OpenProject application, 
 * where users can log in to the application.
 */
export class IntroPage extends BasePage {

    /**
    *
    * ## Navigation
    * - Successful: Shows login form on IntroPage
    *
    */
    signInLink: Locator;

    /**
    *
    *
    * ## Example Usage
    * ```typescript
    * await introPage.userNameTextBox.fill('admin');
    * ```
    */
    userNameTextBox: Locator;

    /**
    *
    * ## Example Usage
    * ```typescript
    * await introPage.passwordTextBox.fill('adminadmin');
    * ```
    */
    passwordTextBox: Locator;

    /**
    * ## Navigation
    * - Successful: Redirects to the home page `HomePage` after signing in.
    *
    * ## Example Usage
    * ```typescript
    * await introPage.signInButton.click();
    * ```
    */
    signInButton: Locator;


    constructor(public readonly page: Page) {
        super(page);
        this.signInLink = this.page.getByRole('link', { name: 'Sign in' }).describe('Sign in link');
        this.userNameTextBox = this.page.getByLabel('Username', { exact: true }).describe('Username input field');
        this.passwordTextBox = this.page.getByLabel('Password', { exact: true }).describe('Password input field');
        this.signInButton = this.page.getByRole('button', { name: 'Sign in' }).describe('Sign in button');
        
    }


}