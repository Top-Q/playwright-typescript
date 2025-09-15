import { Locator, Page } from '@playwright/test';
import { ProductsPage } from '../../../internals';

export class CheckoutOverviewPage {
    private readonly finishButton: Locator;
    private readonly backToProductsButton: Locator;

    constructor(public readonly page: Page) {
        this.finishButton = this.page.locator('[data-test="finish"]').describe('Finish button');
        this.backToProductsButton = this.page.locator('[data-test="back-to-products"]').describe('Back to products button');
    }

    async clickFinish(): Promise<void> {
        await this.finishButton.click();
    }

    async backToProducts(): Promise<ProductsPage> {
        await this.backToProductsButton.click();
        return new ProductsPage(this.page);
    }

    async getProductNames(): Promise<string[]> {
        const numOfItems = await this.page.locator('.cart_item').count();
        const productNames: string[] = [];
        for (let i = 0; i < numOfItems; i++) {
            const productName = await this.page.locator('.inventory_item_name').nth(i).innerText();
            productNames.push(productName);
        }
        return productNames;
    }
}
