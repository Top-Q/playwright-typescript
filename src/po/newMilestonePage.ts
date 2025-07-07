import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

export class NewMilestonePage extends BasePage {
    /**
    * ## Purpose
    * Locator for the subject text box on the new milestone page.
    *
    * ## Available Actions
    * - Fill
    * - Get value
    *
    * ## Navigation
    * - Used to enter the subject of a new milestone
    *
    * ## Example Usage
    * ```typescript
    * await newMilestonePage.subjectTextBox.fill('My new milestone');
    * ```
    */
    subjectTextBox: Locator;

    /**
    * ## Purpose
    * Locator for the save button on the new milestone page.
    *
    * ## Available Actions
    * - Click
    *
    * ## Navigation
    * - Saves the new milestone
    *
    * ## Example Usage
    * ```typescript
    * await newMilestonePage.saveButton.click();
    * ```
    */
    saveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' });
        this.saveButton = this.page.getByRole('button', { name: 'Save' });
    }
}
