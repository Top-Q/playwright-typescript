import { Page } from "@playwright/test";
/**
 * # Base Page Class
 * This class serves as a base for all page objects in the OpenProject application.
 */
export abstract class BasePage<T = unknown> {
    constructor(protected readonly page: Page) {}

    async waitForLoad(): Promise<T>{
        // Wait for the page to be fully loaded.
        await this.page.waitForLoadState('load');
        return this as unknown as T;
    }
    
}

