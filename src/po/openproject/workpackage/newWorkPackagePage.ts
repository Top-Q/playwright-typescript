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
   * ## Description
   * Fills the Subject field with the provided name.
   *
   * ## Aliases
   * ```ts
   * setName(name: string);
   * fillSubject(name: string);
   * setWorkPackageName(name: string);
   * ```
   *
   * @param name - The subject / name for the new work package.
   */
  async fillSubject(name: string): Promise<void> {
    await this.subjectTextbox.fill(name);
  }

  /**
   * ## Description
   * Fills the Description rich text editor with the provided text.
   *
   * The description is rendered through a CKEditor instance; clicking the
   * editor first ensures it receives focus before the text is typed.
   *
   * @param description - The description text for the new work package.
   */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionTextbox.click();
    await this.descriptionTextbox.fill(description);
  }

  /**
   * ## Description
   * Clicks the "Save" button to submit the create form. After saving,
   * the application navigates to the split-view work package details page.
   *
   * @returns A `WorkPackageDetailsPage` instance for the created work package.
   */
  async clickSaveButton(): Promise<WorkPackageDetailsPage> {
    await this.saveButton.click();
    return await new WorkPackageDetailsPage(this.page).waitForLoad();
  }

  /**
   * ## Description
   * Clicks the "Cancel" button to dismiss the create form without saving.
   * Cancelling closes the split-view form and returns the user to the
   * underlying work packages list page.
   */
  async clickCancelButton(): Promise<void> {
    await this.cancelButton.click();
  }
}
