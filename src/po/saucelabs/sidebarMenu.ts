import { Locator, Page } from '@playwright/test';
import { ProductsPage } from '../../../internals';

export class SidebarMenu {
    private readonly logoutLink: Locator;

    constructor(public readonly page: Page) {
        this.logoutLink = this.page.locator('[data-test="logout-sidebar-link"]').describe('Logout link in sidebar');
    }

    async clickLogout(): Promise<ProductsPage> {
        await this.logoutLink.click();
        return new ProductsPage(this.page);
    }
}
