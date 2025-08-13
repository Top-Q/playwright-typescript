import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

export class SideMenuPage extends BasePage {
    
    LocatorName: Locator;
 
    constructor(public readonly page: Page) {
        super(page);
        // Add your locators here
        this.LocatorName = page.locator('locator-selector');
    }

    // Add your methods here
}
