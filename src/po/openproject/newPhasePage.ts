import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # New Phase Page Class
 * This class represents the page for creating a new phase in OpenProject.
 * Phases are used to organize and manage different stages of a project.
 */
export class NewPhasePage extends BasePage {
    /**
     *
     * ## Example Usage
     * ```typescript
     * await newPhasePage.subjectTextBox.fill('My new phase');
     * ```
     */
    subjectTextBox: Locator;

    /**
     * ## Example Usage
     * ```typescript
     * await newPhasePage.saveButton.click();
     * ```
     */
    saveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' }).describe('Subject text box');
        this.saveButton = this.page.getByRole('button', { name: 'Save' }).describe('Save button');
    }
    
}
