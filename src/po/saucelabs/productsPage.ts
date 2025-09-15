import { Locator, Page } from '@playwright/test';
import { CartPage, SidebarMenu } from '../../../internals';

export class ProductsPage {
    private readonly addBackpackButton: Locator;
    private readonly cartLink: Locator;
    private readonly openMenuButton: Locator;

    constructor(public readonly page: Page) {
        this.addBackpackButton = this.page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').describe('Add to cart - Sauce Labs Backpack');
        this.cartLink = this.page.locator('[data-test="shopping-cart-link"]').describe('Shopping cart link');
        this.openMenuButton = this.page.getByRole('button', { name: 'Open Menu' }).describe('Open menu button');
    }

    async addProductToCart(productName: string): Promise<void> {
        const classProductName = productName.toLowerCase().replace(/ /g, '-');
        const productButton = this.page.locator(`[data-test="add-to-cart-${classProductName}"]`).describe(`Add to cart - ${productName}`);
        await productButton.click();
    }


    async goToCart(): Promise<CartPage> {
        await this.cartLink.click();
        return new CartPage(this.page);
    }

    async openMenu(): Promise<SidebarMenu> {
        await this.openMenuButton.click();
        return new SidebarMenu(this.page);
    }
}