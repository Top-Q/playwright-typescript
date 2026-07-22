import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { WorkPackageDetailsPage } from './workPackageDetailsPage';

/**
 * # New Work Package Page
 *
 * This class represents the split-view "Create new work package" form rendered
 * after the user selects a work package type from the toolbar dropdown.
 *
 * The form is shown on the right side of the work packages page at
 * `/projects/<id>/work_packages/create_new?type=<typeId>` and contains:
 * - Subject (required)
 * - Description (rich text editor)
 * - People / Estimates / Details sections
 * - Save and Cancel action buttons at the bottom of the form
 *
 * After saving, the URL changes to `/projects/<id>/work_packages/details/<id>/overview`
 * and the application navigates to the work package details page (also rendered
 * as a split view alongside the work packages table).
 *
 * @aliases CreateWorkPackagePage, WorkPackageForm
 * @url /projects/:projectId/work_packages/create_new?type=:typeId
 */
export class NewWorkPackagePage extends BasePage<NewWorkPackagePage> {
  private readonly subjectTextbox: Locator;
  private readonly descriptionTextbox: Locator;
  private readonly saveButton: Locator;
  private readonly cancelButton: Locator;

  constructor(public readonly page: Page) {
    super(page);
    this.subjectTextbox = this.page
      .getByRole('textbox', { name: 'Subject' })
      .describe('Subject input for the new work package');
    this.descriptionTextbox = this.page
      .getByRole('textbox', { name: /Rich Text Editor/ })
      .describe('Description rich text editor for the new work package');
    this.saveButton = this.page
      .getByRole('button', { name: 'Save' })
      .describe('Save button for the new work package form');
    this.cancelButton = this.page
      .getByRole('button', { name: 'Cancel' })
      .describe('Cancel button for the new work package form');
  }

  async waitForLoad(): Promise<NewWorkPackagePage> {
    await this.page.waitForURL(/\/work_packages\/(create_new|new)(\?|$)/);
    await this.subjectTextbox.waitFor();
    return this;
  }

  /**
   * Fills the Subject field, which is the work package's name and is required
   * before the form can be saved.
   *
   * @aliases setName, setWorkPackageName, fillName, enterSubject
   * @prerequisites The create work package form is open
   * @observable-state The Subject field contains the given name
   * @param name - The subject / name for the new work package.
   */
  async fillSubject(name: string): Promise<void> {
    await this.subjectTextbox.fill(name);
  }

  /**
   * Fills the Description rich text editor. The editor is a CKEditor instance,
   * so it is clicked first to ensure it has focus before the text is typed.
   *
   * @aliases setDescription, fillBody, enterDescription
   * @prerequisites The create work package form is open
   * @observable-state The Description editor contains the given text
   * @param description - The description text for the new work package.
   */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionTextbox.click();
    await this.descriptionTextbox.fill(description);
  }

  /**
   * Clicks "Save" to submit the create form.
   *
   * @aliases save, submitForm, createWorkPackage
   * @prerequisites The create form is open and the required Subject field is filled
   * @observable-state The work package is created, appears in the table, and the URL changes to `/work_packages/details/<id>/overview`
   * @returns A `WorkPackageDetailsPage` for the created work package.
   */
  async clickSaveButton(): Promise<WorkPackageDetailsPage> {
    await this.saveButton.click();
    return await new WorkPackageDetailsPage(this.page).waitForLoad();
  }

  /**
   * Clicks "Cancel" to dismiss the create form without saving.
   *
   * @aliases cancel, discardForm, closeWithoutSaving
   * @prerequisites The create work package form is open
   * @observable-state The split-view form closes, no work package is created, and the work packages list is shown
   */
  async clickCancelButton(): Promise<void> {
    await this.cancelButton.click();
  }
}
