import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

export class NewPhasePage extends BasePage {
    /**
     * ## Purpose
     * Locator for the subject text box on the new phase page.
     *
     * ## Available Actions
     * - Fill
     * - Get value
     *
     * ## Navigation
     * - Used to enter the subject of a new phase
     *
     * ## Example Usage
     * ```typescript
     * await newPhasePage.subjectTextBox.fill('My new phase');
     * ```
     */
    subjectTextBox: Locator;

    /**
     * ## Purpose
     * Locator for the save button on the new phase page.
     *
     * ## Available Actions
     * - Click
     *
     * ## Navigation
     * - Saves the new phase
     *
     * ## Example Usage
     * ```typescript
     * await newPhasePage.saveButton.click();
     * ```
     */
    saveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' });
        this.saveButton = this.page.getByRole('button', { name: 'Save' });
    }
    // You can add more methods or locators as needed
}
