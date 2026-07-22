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
 *
 * @aliases ConfirmDeleteDialog, DeleteConfirmationDialog
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
   * Clicks "Cancel" to dismiss the dialog without deleting.
   *
   * @aliases cancel, dismissDialog, abortDeletion
   * @prerequisites The delete confirmation dialog is open
   * @observable-state The dialog closes and the work package remains in the table
   */
  async clickCancelButton(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Clicks "Delete" to confirm deletion, then waits for the dialog to detach.
   *
   * @aliases confirmDelete, clickDelete, acceptDeletion
   * @prerequisites The delete confirmation dialog is open
   * @observable-state The work package is permanently deleted, the dialog closes, and the row disappears from the table
   */
  async clickConfirmDeleteButton(): Promise<void> {
    await this.confirmDeleteButton.click();
    await this.rootComponent.waitFor({ state: 'detached' });
  }
}
