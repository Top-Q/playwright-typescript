import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';
/**
 * # New Milestone Page Class
 * This class represents the page for creating a new milestone in OpenProject.
 * Milestones are used to track significant points in a project timeline.
 */
export class NewMilestonePage extends BasePage {
    
    
    /**
    *
    * ## Example Usage
    * ```typescript
    * await newMilestonePage.subjectTextBox.fill('My new milestone');
    * ```
    */
    subjectTextBox: Locator;

    /**
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
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' }).describe('Subject text box');
        this.saveButton = this.page.getByRole('button', { name: 'Save' }).describe('Save button');
    }
}
