import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

abstract class NewWorkpackagePage extends BasePage {
    private readonly subjectTextBox: Locator;
    private readonly descriptionTextBox: Locator;
    private readonly saveButton: Locator;

    constructor(page: Page) {
        super(page);
        this.subjectTextBox = this.page.getByRole('textbox', { name: 'Subject' });
        this.descriptionTextBox = this.page.getByRole('textbox', { name: 'Rich Text Editor, main' });
        this.saveButton = this.page.getByRole('button', { name: 'Save' });
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

export class NewMilestonePage extends NewWorkpackagePage {}

export class NewPhasePage extends NewWorkpackagePage {}

export class NewTaskPage extends NewWorkpackagePage {}