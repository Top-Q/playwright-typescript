import { Locator, Page } from '@playwright/test';
import { ProductsPage } from '../../../internals';

export class LoginPage {
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly loginButton: Locator;
    private readonly header: Locator;
    
    constructor(public readonly page: Page) {
        this.usernameInput = this.page.locator('[data-test="username"]').describe('Username input field');
        this.passwordInput = this.page.locator('[data-test="password"]').describe('Password input field');
        this.loginButton = this.page.locator('[data-test="login-button"]').describe('Login button');
        this.header = this.page.locator('.login_logo').describe('Login page header');
    }

    async fillUsername(username: string): Promise<void> {
        await this.usernameInput.fill(username);
    }

    async fillPassword(password: string): Promise<void> {
        await this.passwordInput.fill(password);
    }

    async clickLoginButton(): Promise<ProductsPage> {
        await this.loginButton.click();
        return new ProductsPage(this.page);
    }

    async isHeaderVisible(): Promise<boolean> {
        return await this.header.isVisible();
    }
}