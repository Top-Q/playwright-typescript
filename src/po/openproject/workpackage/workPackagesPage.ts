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
 *
 * @aliases WorkPackageListPage, TasksPage, WorkPackagesTablePage
 * @url /projects/:projectId/work_packages
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
   * Clicks the "+ Create" toolbar button to open the work package type dropdown.
   * Use the returned component to select a type (Task, Milestone, Phase, etc.).
   *
   * @aliases openCreateMenu, clickCreate, openTypeDropdown
   * @prerequisites The work packages list page is open
   * @observable-state The work package type dropdown opens in an Angular overlay
   * @returns A `WorkPackageTypeMenuComp` for the open dropdown menu.
   */
  async clickCreateButton(): Promise<WorkPackageTypeMenuComp> {
    await this.createButton.click();
    return await new WorkPackageTypeMenuComp(this.page).waitForLoad();
  }

  /**
   * Opens the create dropdown and selects the requested work package type in a
   * single call — a convenience wrapper over {@link clickCreateButton} followed
   * by `selectType`.
   *
   * @aliases createWorkPackage, newWorkPackage, startCreatingWorkPackage
   * @prerequisites The work packages list page is open
   * @observable-state The split-view create form opens for the chosen type
   * @param type - The work package type label (e.g. 'Task', 'Phase', 'Milestone').
   * @returns A `NewWorkPackagePage` for the create form.
   */
  async createNewWorkPackageOfType(type: string): Promise<NewWorkPackagePage> {
    const menu = await this.clickCreateButton();
    return await menu.selectType(type);
  }

  /**
   * Clicks the "Activate Filter" button to reveal the filter panel, then waits
   * for the "Filter by text" textbox to appear. The button toggles, so guard
   * the call with {@link isFilterActive}.
   *
   * @aliases clickActivateFilter, toggleFilter, showFilterPanel
   * @prerequisites The work packages list page is open
   * @observable-state The filter panel opens and the "Filter by text" textbox becomes usable
   */
  async clickActivateFilterButton(): Promise<void> {
    await this.activateFilterButton.click();
    await this.filterByTextTextbox.waitFor();
  }

  /**
   * Returns whether the "Filter by text" textbox is visible, which corresponds
   * to the filter panel being active.
   *
   * @aliases isFilterEnabled, filterIsActive
   * @prerequisites The work packages list page is open
   * @observable-state None — read-only query
   * @returns True if the filter panel is active, false otherwise.
   */
  async isFilterActive(): Promise<boolean> {
    return await this.filterByTextTextbox.isVisible();
  }

  /**
   * Clears the "Filter by text" textbox, types the given value, and waits for
   * the resulting table query to complete before returning.
   *
   * @aliases filterByText, searchWorkPackages, applyTextFilter
   * @prerequisites The filter panel is active — call {@link clickActivateFilterButton} first
   * @observable-state The work packages table re-queries and shows only rows matching the text
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
   * Returns whether a work package with the given subject exists in the table.
   *
   * The table is paginated (20 rows per page by default), so this method
   * activates the quick text filter if needed and applies the subject as the
   * filter value, bringing any matching row into view regardless of how many
   * work packages exist.
   *
   * @aliases hasWorkPackageWithName, existsInTable, workPackageExists
   * @prerequisites The work packages list page is open
   * @observable-state Side effect — activates the filter panel if inactive and leaves the text filter set to `name`
   * @param name - The work package subject to look for.
   * @returns True if a matching row exists, false otherwise.
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
   * Opens the row context menu for the work package with the given subject and
   * clicks "Delete", returning the confirmation dialog so the caller can decide
   * whether to confirm or cancel. Throws if no matching row is found.
   *
   * @aliases openDeleteDialog, startDeletingWorkPackage
   * @prerequisites The work packages list page is open and a work package with this subject exists
   * @observable-state The filter is set to `name`, the row context menu opens, and the delete confirmation dialog appears
   * @param name - The work package subject to delete.
   * @returns A `DeleteWorkPackageDialogComp` for the open dialog.
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
   * Deletes the work package with the given subject end to end: opens the row
   * context menu, clicks Delete, and confirms the dialog.
   *
   * @aliases deleteWorkPackage, removeWorkPackage, deleteByName
   * @prerequisites The work packages list page is open and a work package with this subject exists
   * @observable-state The work package is permanently deleted and its row disappears from the table
   * @param name - The work package subject to delete.
   */
  async deleteWorkPackageByName(name: string): Promise<void> {
    const dialog = await this.openDeleteDialogForWorkPackage(name);
    await dialog.clickConfirmDeleteButton();
  }
}
