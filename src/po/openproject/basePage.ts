import { Page } from "@playwright/test";
/**
 * # Base Page Class
 * This class serves as a base for all page objects in the OpenProject application.
 */
export class BasePage {
    constructor(public readonly page: Page) {}
}