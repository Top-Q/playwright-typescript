import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # New Workpackage Page Class
 * This class represents the base page for creating new work packages in OpenProject.
 * It includes common fields used across different types of work packages.
 */
abstract class NewWorkpackagePage extends BasePage {
    /**
     * ## Navigation
     * - Used to enter the subject of a new work package
     *
     * ## Example Usage
     * ```typescript
     * await newWorkpackagePage.subjectTextBox.fill('My new work package');
     * ```
     */
    subjectTextBox: Locator;


    /**
     * ## Purpose
     * - Description area for the work package
     */
    descriptionTextBox: Locator;

    /**
     * ## Navigation
     * *Successful* - New work package is created and saved.
     * *Failure* - If the work package cannot be saved, an error message is displayed. 
     * The error can be asserted using the following expression: `await getByText('Subject can't be blank.', { exact: true })`
     * 
     * ## Example Usage
     * ```typescript
     * await newPhasePage.saveButton.click();
     * 
     * // or, in case of failure in saving the work package
     * await newPhasePage.saveButton.click();
     * await getByText('Subject can't be blank.', { exact: true })
     * 
     * ```
     */
    saveButton: Locator;


    constructor(page: Page) {
        super(page);
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' }).describe('Subject text box');
        this.descriptionTextBox = this.page.getByRole('textbox', { name: 'Rich Text Editor, main' }).describe('Description text box');
        this.saveButton = this.page.getByRole('button', { name: 'Save' }).describe('Save button');
    }
}

/**
 * # New Milestone Page Class
 * This class represents the page for creating a new milestone in OpenProject.
 * Milestones are significant points in a project timeline.
 */
export class NewMilestonePage extends NewWorkpackagePage {}


/**
 * # New Phase Page Class
 * This class represents the page for creating a new phase in OpenProject.
 * Phases are used to organize and manage different stages of a project.
 */
export class NewPhasePage extends NewWorkpackagePage {}


/**
 * # New Task Page Class
 * This class represents the page for creating a new task in OpenProject.
 * Tasks are the fundamental units of work in a project.
 * 
 */
export class NewTaskPage extends NewWorkpackagePage {}