import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

export class BoardTypePage extends BasePage {
    
    basicBoardButton: Locator;
 
    constructor(public readonly page: Page) {
        super(page);
        // Add your locators here
        this.basicBoardButton = page.getByRole('button', { name: 'Basic Start from scratch with a blank board' });
    }

    // Add your methods here
}
