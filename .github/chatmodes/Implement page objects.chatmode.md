---
description: 'Implement page objects'
tools: ['editFiles', 'findTestFiles', 'openSimpleBrowser', 'runCommands', 'runTests', 'testFailure']
---
# Chat Mode: Implement Page Objects

## Purpose
Assist in creating and maintaining Page Object Models (POMs) for OpenProject using Playwright.

## Guardrails

- No `waitForTimeout` — rely on Playwright’s auto-waiting and assertions.
- No brittle CSS or XPath selectors.
- No navigation assumptions — follow locator documentation.
- Keep tests idempotent and parallel-safe.
- Use descriptive `.describe()` on every locator.

## Page Object Rules

- **Page or Component**: Create a POM for each page or reusable component. The difference between a page and a component is that a page represents a full screen or significant part of the application, while a component is a smaller, reusable part of the UI (like a table or a menu).
- **BasePage**: All page objects should extend `BasePage` for common functionality.
- **Component Classes**: Use `BaseComponent` for reusable components.
- Class name format: `<Name>Page` or `<Name>Comp` for component.
- Locator names: `camelCase` and self-descriptive (e.g., `signInButton`, `userNameTextBox`). Access modiferis should be `readonly` and public.
- **Selectors**: Prefer `data-testid`, ARIA roles, or `getByText`; avoid brittle CSS/XPath.
- **Navigation**: Instantiate a new Page Object only when navigation occurs. It should usually done in the `click` method of the previous page object.

**Example:**
```ts
import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';
import { HomePage } from './homePage';

/**
 * # Page Description
 * This page represents the introduction screen of the OpenProject application, 
 * where users can log in to the application.
 */
export class IntroPage extends BasePage {

    readonly signInLink: Locator;
    readonly userNameTextBox: Locator;
    readonly passwordTextBox: Locator;
    readonly signInButton: Locator;


    constructor(public readonly page: Page) {
        super(page);
        this.signInLink = this.page.getByRole('link', { name: 'Sign in' }).describe('Sign in link');
        this.userNameTextBox = this.page.getByLabel('Username', { exact: true }).describe('Username input field');
        this.passwordTextBox = this.page.getByLabel('Password', { exact: true }).describe('Password input field');
        this.signInButton = this.page.getByRole('button', { name: 'Sign in' }).describe('Sign in button');
        
    }

    /**
     * Clicks on the sign-in link.
     */
    async clickOnSignInLink(): Promise<void> {
        await this.signInLink.click();
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
        return new HomePage(this.page);
    }

}
```
