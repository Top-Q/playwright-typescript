import { Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { LogTimeDialogComp } from '../timeandcosts/logTimeDialogComp';

/**
 * Work package detail / single-item view (split or full).
 * TODO: add locators once DOM is confirmed via playwright-cli snapshot.
 */
export class WorkPackageDetailPage extends BasePage<WorkPackageDetailPage> {
  constructor(public readonly page: Page) {
    super(page);
  }

  async waitForLoad(): Promise<WorkPackageDetailPage> {
    await this.page.waitForLoadState('networkidle');
    return this;
  }

  async openLogTimeDialog(): Promise<LogTimeDialogComp> {
    throw new Error('WorkPackageDetailPage.openLogTimeDialog() is not yet implemented — add the log-time button locator');
  }
}
