import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';

/**
 * # Work Package Details Page
 *
 * This class represents the split-view work package details page rendered
 * after a work package is created or selected. The URL pattern is
 * `/projects/<projectId>/work_packages/details/<workPackageId>/overview`.
 *
 * The details panel is displayed on the right side, while the underlying
 * work packages table remains visible on the left. The page exposes a
 * "Close details view" button that hides the side panel and returns the
 * user to the full work packages list view.
 */
export class WorkPackageDetailsPage extends BasePage<WorkPackageDetailsPage> {
  private readonly closeDetailsViewButton: Locator;

  constructor(public readonly page: Page) {
    super(page);
    this.closeDetailsViewButton = this.page
      .locator('#work-packages-details-view-button')
      .describe('Close details view button on the work package details page');
  }

  async waitForLoad(): Promise<WorkPackageDetailsPage> {
    await this.page.waitForURL(/\/work_packages\/details\/\d+/);
    await this.closeDetailsViewButton.waitFor();
    return this;
  }

  /**
   * ## Description
   * Navigates back to the work packages list page by extracting the project
   * identifier from the current URL and navigating to `/projects/<id>/work_packages`.
   *
   * The intent of this method is to leave the work package details view and
   * return to the work packages table for further interaction (filtering,
   * deleting, asserting row existence, etc.).
   *
   * ## Aliases
   * ```ts
   * goBackToWorkPackagesList();
   * getBackToWorkPackagesPage();
   * ```
   */
  async goBackToWorkPackagesList(): Promise<void> {
    const url = this.page.url();
    const match = /\/projects\/([^/]+)\/work_packages\//.exec(url);
    if (!match) {
      throw new Error(`Could not determine project identifier from URL: ${url}`);
    }
    const projectIdentifier = match[1];
    const base = new URL(url);
    await this.page.goto(`${base.origin}/projects/${projectIdentifier}/work_packages`);
  }
}
