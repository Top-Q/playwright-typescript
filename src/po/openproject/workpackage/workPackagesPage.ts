import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { WorkPackageTypeMenuComp } from './workPackageTypeMenuComp';
import { NewWorkPackagePage } from './newWorkPackagePage';
import { DeleteWorkPackageDialogComp } from './deleteWorkPackageDialogComp';

/**
 * # Work Packages Page
 *
 * This class represents the work packages list page in the OpenProject
 * application, at `/projects/<projectId>/work_packages`.
 *
 * The page renders an Angular-driven table of work packages, with toolbar
 * controls for creating, filtering and viewing work packages. Each row
 * exposes a context menu link that lets the user open the details view,
 * duplicate, delete, log time, etc.
 *
 * Notable behaviours:
 * - The "Create new work package" toolbar button opens a dropdown menu of
 *   work package types (Task, Milestone, Phase, etc.). The dropdown items
 *   live in an Angular overlay outside the regular DOM tree.
 * - The filter panel is hidden by default; clicking "Activate Filter"
 *   reveals a "Filter by text" textbox that quick-filters the table.
 * - After saving a new work package the URL changes to the details view
 *   (`/work_packages/details/<id>/overview`).
 */
export class WorkPackagesPage extends BasePage<WorkPackagesPage> {
  private readonly createButton: Locator;
  private readonly activateFilterButton: Locator;
  private readonly filterByTextTextbox: Locator;
  private readonly workPackagesTable: Locator;

  constructor(public readonly page: Page) {
    super(page);
    this.createButton = this.page
      .locator('button.add-work-package')
      .describe('Create new work package toolbar button');
    this.activateFilterButton = this.page
      .getByRole('button', { name: 'Activate Filter' })
      .describe('Activate filter toolbar button');
    this.filterByTextTextbox = this.page
      .getByRole('textbox', { name: 'Filter by text' })
      .describe('Filter by text textbox');
    this.workPackagesTable = this.page
      .locator(
        '.work-package-table, table.work-package--results-table, table.keyboard-accessible-list',
      )
      .first()
      .describe('Work packages table');
  }

  async waitForLoad(): Promise<WorkPackagesPage> {
    await this.page.waitForURL(/\/work_packages(\?|$|\/?)/);
    await this.createButton.waitFor();
    return this;
  }

  /**
   * ## Description
   * Clicks the "+ Create" toolbar button to open the work package type
   * dropdown. Use the returned `WorkPackageTypeMenuComp` to select a type
   * (Task, Milestone, Phase, etc.).
   *
   * ## Aliases
   * ```ts
   * clickCreateButton();
   * openCreateMenu();
   * ```
   *
   * @returns A `WorkPackageTypeMenuComp` instance for the open dropdown menu.
   */
  async clickCreateButton(): Promise<WorkPackageTypeMenuComp> {
    await this.createButton.click();
    return await new WorkPackageTypeMenuComp(this.page).waitForLoad();
  }

  /**
   * ## Description
   * Convenience method that opens the create dropdown and selects the
   * requested work package type in a single call, returning the resulting
   * `NewWorkPackagePage`.
   *
   * ## Aliases
   * ```ts
   * createNewWorkPackageOfType(type: string);
   * createWorkPackage(type: string);
   * ```
   *
   * @param type - The work package type label (e.g. 'Task', 'Phase', 'Milestone').
   * @returns A `NewWorkPackagePage` instance for the create form.
   */
  async createNewWorkPackageOfType(type: string): Promise<NewWorkPackagePage> {
    const menu = await this.clickCreateButton();
    return await menu.selectType(type);
  }

  /**
   * ## Description
   * Clicks the "Activate Filter" button to reveal (or hide, if already
   * active) the filter panel. The "Filter by text" textbox only becomes
   * usable after this button has been clicked.
   *
   * ## Aliases
   * ```ts
   * clickActivateFilter();
   * clickActivateFilterButton();
   * ```
   */
  async clickActivateFilterButton(): Promise<void> {
    await this.activateFilterButton.click();
    await this.filterByTextTextbox.waitFor();
  }

  /**
   * ## Description
   * Returns whether the "Filter by text" textbox is currently visible,
   * which corresponds to the filter panel being active.
   */
  async isFilterActive(): Promise<boolean> {
    return await this.filterByTextTextbox.isVisible();
  }

  /**
   * ## Description
   * Fills the "Filter by text" textbox with the provided value. The work
   * packages table is automatically re-queried as the user types.
   *
   * This will fail if the filter panel has not been activated first via
   * `clickActivateFilterButton`.
   *
   * @param text - The text used to filter the work packages table.
   */
  async fillFilterByText(text: string): Promise<void> {
    await this.filterByTextTextbox.fill('');
    const queryPromise = this.page.waitForResponse(
      (response) => response.url().includes('/queries/') && response.request().method() === 'GET',
    );
    await this.filterByTextTextbox.fill(text);
    await queryPromise;
  }

  /**
   * ## Description
   * Returns whether at least one row in the work packages table contains
   * the provided work package subject. Matching is performed against the
   * row's accessible text content.
   *
   * The work packages table is paginated (20 rows per page by default).
   * To make the check reliable regardless of how many work packages exist,
   * this method ensures the quick text filter is active and applies the
   * subject as the filter value so the matching row is brought into view.
   *
   * ## Aliases
   * ```ts
   * isWorkPackageVisible(name: string);
   * hasWorkPackageWithName(name: string);
   * existsInTable(name: string);
   * ```
   *
   * @param name - The work package subject to look for.
   */
  async isWorkPackageVisible(name: string): Promise<boolean> {
    if (!(await this.isFilterActive())) {
      await this.clickActivateFilterButton();
    }
    await this.fillFilterByText(name);
    const row = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('button', { name: `Subject ${name}: Edit` }) });
    return (await row.count()) > 0;
  }

  /**
   * ## Description
   * Opens the row context menu for the work package with the given subject
   * and clicks the "Delete" menuitem. Returns the resulting confirmation
   * dialog so the caller can decide whether to confirm or cancel.
   *
   * Throws if no row with the given subject is found.
   *
   * ## Aliases
   * ```ts
   * openDeleteDialogForWorkPackage(name: string);
   * ```
   *
   * @param name - The work package subject to delete.
   * @returns A `DeleteWorkPackageDialogComp` instance for the open dialog.
   */
  async openDeleteDialogForWorkPackage(name: string): Promise<DeleteWorkPackageDialogComp> {
    if (!(await this.isFilterActive())) {
      await this.clickActivateFilterButton();
    }
    await this.fillFilterByText(name);
    const row = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('button', { name: `Subject ${name}: Edit` }) })
      .first();
    if ((await row.count()) === 0) {
      throw new Error(`No work package row found for subject: ${name}`);
    }
    await row.getByRole('link', { name: 'Open context menu' }).click();
    await this.page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    return await new DeleteWorkPackageDialogComp(this.page).waitForLoad();
  }

  /**
   * ## Description
   * Deletes the work package with the given subject end-to-end: opens the
   * row context menu, clicks Delete, and confirms the dialog.
   *
   * After the dialog closes, the row is removed from the table.
   *
   * ## Aliases
   * ```ts
   * deleteWorkPackageByName(name: string);
   * deleteWorkPackage(name: string);
   * ```
   *
   * @param name - The work package subject to delete.
   */
  async deleteWorkPackageByName(name: string): Promise<void> {
    const dialog = await this.openDeleteDialogForWorkPackage(name);
    await dialog.clickConfirmDeleteButton();
  }
}
