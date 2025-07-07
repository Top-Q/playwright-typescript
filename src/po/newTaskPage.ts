import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';


export class NewTaskPage extends BasePage {

    /**
    * ## Purpose
    * Locator for the subject text box on the new task page.
    *
    * ## Available Actions
    * - Fill
    * - Get value
    *
    * ## Navigation
    * - Used to enter the subject of a new task
    *
    * ## Example Usage
    * ```typescript
    * await newTaskPage.subjectTextBox.fill('My new task');
    * ```
    */
    subjectTextBox: Locator;

    /**
    * ## Purpose
    * Locator for the save button on the new task page.
    *
    * ## Available Actions
    * - Click
    *
    * ## Navigation
    * - Saves the new task
    *
    * ## Example Usage
    * ```typescript
    * await newTaskPage.saveButton.click();
    * ```
    */
    saveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' });
        this.saveButton = this.page.getByRole('button', { name: 'Save' });
    }
}