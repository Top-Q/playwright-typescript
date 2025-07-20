import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # New Task Page Class
 * This class represents the page for creating a new task in OpenProject.
 * Tasks are the fundamental units of work in a project.
 * 
 */
export class NewTaskPage extends BasePage {

    /**
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
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' }).describe('Subject text box');
        this.saveButton = this.page.getByRole('button', { name: 'Save' }).describe('Save button');
    }
}