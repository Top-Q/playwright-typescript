import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../../../../internals';

/**
 * # Log Time Dialog Component
 * Represents the "Log time" dialog that appears when logging time on a work package.
 * Contains fields: User, Date, Hours, Activity, and Comment.
 */
export class LogTimeDialogComp extends BaseComponent<LogTimeDialogComp> {
    private readonly hoursTextbox: Locator;
    private readonly dateTextbox: Locator;
    private readonly commentTextbox: Locator;
    private readonly activityDropdown: Locator;
    private readonly logButton: Locator;
    private readonly cancelButton: Locator;
    private readonly closeButton: Locator;

    constructor(page: Page, rootComponent: Locator) {
        super(page, rootComponent);
        this.hoursTextbox = this.rootComponent
            .getByRole('textbox', { name: 'Hours' })
            .describe('Hours input field');
        this.dateTextbox = this.rootComponent
            .getByRole('textbox', { name: 'Date' })
            .describe('Date input field');
        this.commentTextbox = this.rootComponent
            .getByRole('textbox', { name: 'Comment' })
            .describe('Comment input field');
        this.activityDropdown = this.rootComponent
            .locator('opce-autocompleter ng-select')
            .describe('Activity dropdown');
        this.logButton = this.rootComponent
            .getByRole('button', { name: 'Log' })
            .describe('Log submit button');
        this.cancelButton = this.rootComponent
            .getByRole('button', { name: 'Cancel' })
            .describe('Cancel button');
        this.closeButton = this.rootComponent
            .getByRole('button', { name: 'Close' })
            .describe('Close dialog button');
    }

    async waitForLoad(): Promise<LogTimeDialogComp> {
        await this.hoursTextbox.waitFor();
        return this;
    }

    /**
     * Fills in the hours field.
     */
    async fillHours(hours: string): Promise<void> {
        await this.hoursTextbox.fill(hours);
    }

    /**
     * Fills in the date field.
     */
    async fillDate(date: string): Promise<void> {
        await this.dateTextbox.fill(date);
    }

    /**
     * Fills in the comment field.
     */
    async fillComment(comment: string): Promise<void> {
        await this.commentTextbox.fill(comment);
    }

    /**
     * Selects an activity from the dropdown by visible text.
     * @param activityName - The activity name to select (e.g. "Development", "Management")
     */
    async selectActivity(activityName: string): Promise<void> {
        await this.activityDropdown.click();
        await this.page.getByText(activityName, { exact: true }).click();
    }

    /**
     * Clicks the "Log" button to submit the time entry.
     * Waits for the dialog to close after submission.
     */
    async clickLogButton(): Promise<void> {
        await this.logButton.click();
        await this.rootComponent.waitFor({ state: 'hidden', timeout: 10_000 });
    }

    /**
     * Clicks the "Cancel" button to dismiss the dialog.
     */
    async clickCancelButton(): Promise<void> {
        await this.cancelButton.click();
    }

    /**
     * Logs time in a single call: fills hours, selects activity, optionally sets comment, and submits.
     */
    async logTime(hours: string, activity: string, comment?: string): Promise<void> {
        await this.fillHours(hours);
        await this.selectActivity(activity);
        if (comment) {
            await this.fillComment(comment);
        }
        await this.clickLogButton();
    }
}
