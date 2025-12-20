import { BasePage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';
/**
 * # Base Workpackage Page Class
 * This class serves as a base for all workpackage creation pages in the OpenProject application.
 * The workpackage types include Milestone, Phase, and Task.
 * Do not use this class directly; instead, use the specific classes for each workpackage type.
 */
export abstract class NewWorkpackagePage extends BasePage<NewWorkpackagePage> {
    readonly subjectTextBox: Locator;
    readonly descriptionTextBox: Locator;
    readonly saveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' }).describe('Subject Textbox');
        this.descriptionTextBox = this.page.locator('.document-editor__editable').describe('Description Textbox');
        this.saveButton = this.page.getByRole('button', { name: 'Save' }).describe('Save Button');
    }

    
    async fillSubject(subject: string): Promise<void> {
        await this.subjectTextBox.fill(subject);
    }

    async fillDescription(description: string): Promise<void> {
        await this.descriptionTextBox.fill(description);
    }

    async clickSaveButton(): Promise<void> {
        await this.saveButton.click();
    }
}

/**
 * # New Workpackage Page Class
 * Most of the logic for creating workpackages is shared.
 * So, most of the changes are made in the base class.
 * 
 */
export class NewMilestonePage extends NewWorkpackagePage {}

/**
 * # New Phase Page Class
 * Most of the logic for creating workpackages is shared.
 * So, most of the changes are made in the base class.
 *  
 */
export class NewPhasePage extends NewWorkpackagePage {}

/**
 * # New Task Page Class
 * Most of the logic for creating workpackages is shared.
 * So, most of the changes are made in the base class.
 * 
 */
export class NewTaskPage extends NewWorkpackagePage {}