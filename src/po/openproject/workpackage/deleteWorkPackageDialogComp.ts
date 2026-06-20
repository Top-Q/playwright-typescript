import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';

/**
 * # Delete Work Package Dialog Component
 *
 * This component represents the "Confirm deletion of work package" dialog
 * that appears when a user chooses "Delete" from a work package row context
 * menu on the work packages list page.
 *
 * The dialog contains two buttons:
 * - Cancel — dismisses the dialog without deleting the work package
 * - Delete — confirms the deletion and removes the work package
 */
export class DeleteWorkPackageDialogComp extends BaseComponent<DeleteWorkPackageDialogComp> {
  private readonly cancelButton: Locator;
  private readonly confirmDeleteButton: Locator;

  constructor(protected readonly page: Page) {
    super(
      page,
      page
        .getByRole('dialog', { name: 'Confirm deletion of work package' })
        .describe('Delete work package confirmation dialog'),
    );
    this.cancelButton = this.rootComponent
      .getByRole('button', { name: 'Cancel' })
      .describe('Cancel deletion button');
    this.confirmDeleteButton = this.rootComponent
      .getByRole('button', { name: 'Delete' })
      .describe('Confirm deletion button');
  }

  async waitForLoad(): Promise<DeleteWorkPackageDialogComp> {
    await this.rootComponent.waitFor();
    return this;
  }

  /**
   * Clicks the "Cancel" button to dismiss the dialog without deleting.
   */
  async clickCancelButton(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Clicks the "Delete" button to confirm the deletion of the work package.
   * Waits for the dialog to close after submission.
   */
  async clickConfirmDeleteButton(): Promise<void> {
    await this.confirmDeleteButton.click();
    await this.rootComponent.waitFor({ state: 'detached' });
  }
}
