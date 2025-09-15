import { Locator, Page } from '@playwright/test';
import { CheckoutCustomerInfoPage } from '../../../internals';

export class CartPage {
    private readonly checkoutButton: Locator;

    constructor(public readonly page: Page) {
        this.checkoutButton = this.page.locator('[data-test="checkout"]').describe('Checkout button');
    }

    async getProductNames(): Promise<string[]> {
        const numOfItemsInCart = await this.page.locator('.cart_item').count();
        const productNames: string[] = [];
        for (let i = 0; i < numOfItemsInCart; i++) {
            const productName = await this.page.locator('.inventory_item_name').nth(i).innerText();
            productNames.push(productName);
        }
        return productNames;
    }


    async clickCheckout(): Promise<CheckoutCustomerInfoPage> {
        await this.checkoutButton.click();
        return new CheckoutCustomerInfoPage(this.page);
    }
}
