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
 * Attributes are edited inline: the displayed value is a `role="button"`
 * element inside `.inline-edit--container.<attribute>`, clicking it swaps in an
 * editor, and **the change is persisted as soon as a value is chosen** — the
 * details view has no Save control for attribute edits. Because the table on
 * the left renders the same attribute containers, every field locator here is
 * scoped to the `.work-packages--details` panel.
 *
 * @aliases WorkPackageOverviewPage, WorkPackageSplitView
 * @url /projects/:projectId/work_packages/details/:workPackageId/overview
 */
export class WorkPackageDetailsPage extends BasePage<WorkPackageDetailsPage> {
  private readonly closeDetailsViewButton: Locator;
  private readonly detailsPanel: Locator;
  private readonly assigneeField: Locator;
  private readonly assigneeDisplayField: Locator;
  private readonly assigneeInput: Locator;
  private readonly assigneeName: Locator;
  private readonly autocompleterPanel: Locator;

  constructor(public readonly page: Page) {
    super(page);
    this.closeDetailsViewButton = this.page
      .locator('#work-packages-details-view-button')
      .describe('Close details view button on the work package details page');
    this.detailsPanel = this.page
      .locator('.work-packages--details')
      .describe('Work package details split panel');
    this.assigneeField = this.detailsPanel
      .locator('.inline-edit--container.assignee')
      .describe('Assignee inline edit container');
    // The display field is a <span role="button"> - the renderer sets that role on
    // every editable attribute (display-field-renderer.ts#setSpanAttributes) - and its
    // accessible name comes from the aria-label "Assignee <value>: Edit", which reads
    // "Assignee No value: Edit" while the work package is unassigned.
    this.assigneeDisplayField = this.assigneeField
      .getByRole('button', { name: /^Assignee/ })
      .describe('Assignee display field');
    this.assigneeInput = this.assigneeField
      .getByRole('combobox')
      .describe('Assignee autocompleter input');
    this.assigneeName = this.assigneeField
      .locator('.op-principal--name')
      .describe('Assignee principal name');
    // ng-select panels render with appendTo="body", outside the field.
    this.autocompleterPanel = this.page
      .locator('.ng-dropdown-panel')
      .describe('Open ng-select autocompleter panel');
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

  /**
   * Assigns the work package to a project member.
   *
   * Opens the Assignee inline editor, types the member's name into its
   * autocompleter and picks the matching entry. Selecting the entry is what
   * saves the work package — the method waits for the resulting
   * `PATCH /api/v3/work_packages/<id>` to return and for the editor to collapse
   * back to the display field, so it does not return before the change reached
   * the server.
   *
   * @aliases assignTo, setAssignedTo, assignWorkPackage, selectAssignee, setResponsible
   * @prerequisites The work package details view is open and the member is assignable in this project
   * @observable-state The Assignee field shows the member and the change is persisted; a reload still shows it
   * @param memberName - The member's display name, as rendered by the members table.
   */
  async setAssignee(memberName: string): Promise<void> {
    await this.assigneeDisplayField.click();
    await this.assigneeInput.waitFor();
    await this.assigneeInput.fill(memberName);

    // The option's accessible name folds in the avatar initials and the email,
    // so it is matched as a substring rather than exactly.
    const option = this.autocompleterPanel.getByRole('option', { name: memberName }).first();
    await option.waitFor();
    const savePromise = this.page.waitForResponse(
      (response) =>
        /\/api\/v3\/work_packages\/\d+$/.test(response.url()) &&
        response.request().method() === 'PATCH',
    );
    await option.click();
    await savePromise;

    // The display field is hidden while the editor is open, so waiting for it
    // to be visible again is the observable proof the edit was committed.
    await this.assigneeDisplayField.waitFor();
  }

  /**
   * Returns the Assignee currently shown on the work package, or an empty
   * string when it is unassigned (the field then renders the "-" placeholder).
   *
   * @aliases getAssignedTo, assignee, readAssignee, getAssigneeName
   * @prerequisites The work package details view is open
   * @observable-state None — read-only query
   * @returns The assignee's display name, or '' when no assignee is set.
   */
  async getAssignee(): Promise<string> {
    await this.assigneeDisplayField.waitFor();
    if ((await this.assigneeName.count()) === 0) {
      return '';
    }
    return (await this.assigneeName.innerText()).trim();
  }

  /**
   * Reloads the work package details view from the server and waits for it to
   * come back.
   *
   * Attribute edits in this view are persisted the moment a value is chosen —
   * there is no Save control — so this is how a test confirms a change was
   * actually stored rather than only reflected in the editor: everything read
   * after it is server state.
   *
   * @aliases reload, refresh, reloadWorkPackage, readFromServer, confirmSaved
   * @prerequisites The work package details view is open
   * @observable-state The browser reloads the same details URL and the panel re-renders with the stored attribute values
   * @returns This page, reloaded.
   */
  async reloadFromServer(): Promise<WorkPackageDetailsPage> {
    await this.page.reload();
    return await this.waitForLoad();
  }
}
