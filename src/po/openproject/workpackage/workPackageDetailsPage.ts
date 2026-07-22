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
 *
 * @aliases WorkPackageOverviewPage, WorkPackageSplitView
 * @url /projects/:projectId/work_packages/details/:workPackageId/overview
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
   * Leaves the details view and returns to the work packages table, so the
   * caller can filter, delete, or assert on rows. Navigates by extracting the
   * project identifier from the current URL. Throws if the URL does not contain
   * a project identifier.
   *
   * @aliases getBackToWorkPackagesPage, closeDetailsView, returnToWorkPackages
   * @prerequisites The work package details view is open
   * @observable-state The browser navigates to `/projects/<id>/work_packages` and the full table is shown
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
