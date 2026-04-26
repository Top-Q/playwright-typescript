import { Locator, Page } from '@playwright/test';
import { BasePage } from '../../../../internals';
import { LogTimeDialogComp } from '../timeandcosts/logTimeDialogComp';

/**
 * # Work Package Detail Page
 * Represents the detail view of a single work package.
 * Provides access to the "More" menu actions including "Log time".
 */
export class WorkPackageDetailPage extends BasePage<WorkPackageDetailPage> {
    private readonly moreButton: Locator;
    private readonly spentTimeValue: Locator;

    constructor(readonly page: Page) {
        super(page);
        this.moreButton = this.page
            .getByRole('button', { name: 'More' })
            .describe('More actions button on WP detail');
        this.spentTimeValue = this.page
            .locator('.detail-panel-description', { hasText: 'Spent time' })
            .locator('.inline-edit--active-field, .inline-edit--display-field')
            .describe('Spent time value');
    }

    async waitForLoad(): Promise<WorkPackageDetailPage> {
        await this.moreButton.waitFor();
        return this;
    }

    /**
     * Opens the "Log time" dialog from the "More" menu.
     * @returns LogTimeDialogComp
     */
    async openLogTimeDialog(): Promise<LogTimeDialogComp> {
        await this.moreButton.click();
        await this.page.getByText('Log time', { exact: true }).click();
        return await new LogTimeDialogComp(
            this.page,
            this.page.locator('#time-entry-dialog'),
        ).waitForLoad();
    }

    /**
     * Returns the displayed spent time text (e.g. "0h", "2h").
     */
    async getSpentTime(): Promise<string> {
        const spentTimeRow = this.page.locator('div', { hasText: /^Spent time$/ }).locator('..');
        return await spentTimeRow.locator('a, span').last().innerText();
    }
}
