import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { WorkPackageTypeMenuComp } from './workPackageTypeMenuComp';
import { NewWorkPackagePage } from './newWorkPackagePage';
import { DeleteWorkPackageDialogComp } from './deleteWorkPackageDialogComp';
import { WorkPackageDetailsPage } from './workPackageDetailsPage';

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
 * - The same panel carries an "Add filter" autocompleter, through which
 *   attribute filters such as Assignee are added. Each added filter renders as
 *   `li#filter_<name>` with an operator `select#operators-<name>` and a value
 *   `ng-select#values-<name>`.
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
  private readonly addFilterCombobox: Locator;
  private readonly assigneeFilter: Locator;
  private readonly assigneeFilterValueCombobox: Locator;
  private readonly autocompleterPanel: Locator;
  private readonly filterCountBadge: Locator;
  private readonly tableLoadingIndicator: Locator;

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
    this.addFilterCombobox = this.page
      .locator('#add_filter_select')
      .getByRole('combobox')
      .describe('Add filter autocompleter in the filter panel');
    this.assigneeFilter = this.page
      .locator('#filter_assignee')
      .describe('Assignee filter row in the filter panel');
    this.assigneeFilterValueCombobox = this.page
      .locator('#values-assignee')
      .getByRole('combobox')
      .describe('Assignee filter value autocompleter');
    // ng-select panels are rendered with appendTo="body", so they live outside
    // the filter panel and must be scoped to the page rather than to the field.
    this.autocompleterPanel = this.page
      .locator('.ng-dropdown-panel')
      .describe('Open ng-select autocompleter panel');
    // The badge holding the active filter count is only rendered once the
    // Angular filter component has initialised — until then the toggle button
    // is in the DOM but swallows clicks.
    this.filterCountBadge = this.page
      .locator('#work-packages-filter-toggle-button .badge')
      .describe('Active filter count badge on the filter toggle button');
    this.tableLoadingIndicator = this.page
      .locator('[data-indicator-name="table"] .loading-indicator--background')
      .describe('Work packages table loading overlay');
  }

  async waitForLoad(): Promise<WorkPackagesPage> {
    // The list URL must be matched to its end: `/work_packages/details/<id>/…`
    // and `/work_packages/create_new` are also work-package URLs and carry the
    // same toolbar, so a looser pattern lets this resolve on the split view and
    // hands back a page object whose table is still the previous one.
    await this.page.waitForURL(/\/work_packages\/?(\?|$)/);
    // Angular swaps the table in place, so the URL changing is not enough: for
    // roughly half a second afterwards the previous view is still rendered, and
    // a caller reading it sees the old rows and the old, possibly open, filter
    // panel. The table's loading overlay marks the rebuild - it goes up about
    // 350ms after the URL changes and comes down when the new rows are in - so
    // it is waited for here, before anything else, because it is short-lived
    // and a wait that starts later misses it. Never seeing it is tolerated: a
    // navigation that is already complete shows no overlay.
    await this.tableLoadingIndicator
      .waitFor({ state: 'visible', timeout: 2_000 })
      .catch(() => undefined);
    await this.tableLoadingIndicator.waitFor({ state: 'hidden' });
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
    // The toggle does nothing while the filter component is still loading, and
    // fails silently when it does — OpenProject's own feature specs wrap this
    // click in a retry for the same reason
    // (spec/support/components/work_packages/filters.rb#open).
    await this.filterCountBadge.waitFor({ state: 'attached' });
    await this.activateFilterButton.click();
    const opened = await this.filterByTextTextbox.waitFor({ timeout: 10_000 }).then(
      () => true,
      () => false,
    );
    if (!opened) {
      await this.activateFilterButton.click();
      await this.filterByTextTextbox.waitFor();
    }
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
    return (await this.rowForSubject(name).count()) > 0;
  }

  /**
   * Returns the table row whose Subject cell holds the given subject. The cell
   * renders as `role="button"` with the accessible name
   * `Subject <subject>: Edit`, which is what identifies the row.
   */
  private rowForSubject(name: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('button', { name: `Subject ${name}: Edit` }) })
      .describe(`Work package row for subject "${name}"`);
  }

  /**
   * Opens the split-view details of the work package with the given subject.
   *
   * The table paginates at 20 rows, so the subject is first applied as the
   * quick text filter to bring the row into view; the row's "Open details view"
   * icon link is then clicked. Throws if no matching row is found.
   *
   * @aliases openWorkPackage, openWorkPackageDetails, clickWorkPackage, selectWorkPackage, viewWorkPackage, openDetails
   * @prerequisites The work packages list page is open and a work package with this subject exists
   * @observable-state The filter is set to `name` and the URL changes to `/work_packages/details/<id>/overview`, showing the details panel beside the table
   * @param name - The work package subject to open.
   * @returns A `WorkPackageDetailsPage` for the opened work package.
   */
  async openWorkPackageByName(name: string): Promise<WorkPackageDetailsPage> {
    if (!(await this.isFilterActive())) {
      await this.clickActivateFilterButton();
    }
    await this.fillFilterByText(name);
    const row = this.rowForSubject(name).first();
    if ((await row.count()) === 0) {
      throw new Error(`No work package row found for subject: ${name}`);
    }
    await row.getByRole('link', { name: 'Open details view' }).click();
    return await new WorkPackageDetailsPage(this.page).waitForLoad();
  }

  /**
   * Restricts the table to the work packages assigned to a given member — the
   * "assigned items" view of that member.
   *
   * Adds the Assignee filter to the filter panel if it is not present yet, then
   * picks the member in its value autocompleter and waits for the table query
   * to complete. The panel's default Status filter ("open") stays in place, so
   * closed work packages are not listed. The filter combines with
   * {@link fillFilterByText}, which is how {@link isWorkPackageVisible} can then
   * confirm a single subject is among the member's items.
   *
   * @aliases filterByAssignee, showAssignedTo, assignedItems, filterByUser, myWorkPackages
   * @prerequisites The work packages list page is open and the member is assignable in this project
   * @observable-state The filter panel shows an Assignee filter set to the member, and the table lists only that member's open work packages
   * @param memberName - The member's display name, as rendered by the members table.
   */
  async filterByAssignee(memberName: string): Promise<void> {
    if (!(await this.isFilterActive())) {
      await this.clickActivateFilterButton();
    }

    if ((await this.assigneeFilter.count()) === 0) {
      // "Assignee" also prefixes "Assignee or belonging group" and
      // "Assignee's role", so the option name has to match exactly.
      await this.addFilterCombobox.fill('Assignee');
      await this.autocompleterPanel
        .getByRole('option', { name: 'Assignee', exact: true })
        .click();
      await this.assigneeFilter.waitFor();
    }

    await this.assigneeFilterValueCombobox.fill(memberName);
    // The option's accessible name folds in the avatar initials and the email,
    // so it is matched as a substring rather than exactly.
    const option = this.autocompleterPanel.getByRole('option', { name: memberName }).first();
    await option.waitFor();
    const queryPromise = this.page.waitForResponse(
      (response) => response.url().includes('/queries/') && response.request().method() === 'GET',
    );
    await option.click();
    await queryPromise;
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
    const row = this.rowForSubject(name).first();
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
