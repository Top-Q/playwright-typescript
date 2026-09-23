import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { ProjectsPage } from './projectsPage';

/**
 * Represents the "Delete project" confirmation dialog, opened from Project
 * settings → More → Delete.
 *
 * It is a checkbox-gated destructive confirm: "Delete permanently" is
 * **disabled until** the "I understand that this deletion cannot be reversed"
 * checkbox is ticked. That makes it the one place in this module where a
 * disabled-button assertion is meaningful — the create form's Create button
 * never is.
 *
 * The dialog is an `alertdialog` with id `delete-project-dialog`, rendered on
 * the body rather than inside `#content`, so it is located from the page.
 *
 * @aliases ConfirmDeleteProjectDialog, DeleteProjectConfirmation, ProjectDeletionDialog
 */
export class DeleteProjectDialogComp extends BaseComponent<DeleteProjectDialogComp> {
    private readonly confirmationCheckbox: Locator;
    private readonly deletePermanentlyButton: Locator;
    private readonly cancelButton: Locator;

    constructor(protected readonly page: Page) {
        super(
            page,
            page
                .getByRole('alertdialog', { name: 'Delete project' })
                .describe('Delete project confirmation dialog'),
        );
        this.confirmationCheckbox = this.rootComponent
            .getByRole('checkbox', {
                name: 'I understand that this deletion cannot be reversed',
            })
            .describe('Deletion is irreversible checkbox');
        this.deletePermanentlyButton = this.rootComponent
            .getByRole('button', { name: 'Delete permanently' })
            .describe('Delete permanently button');
        this.cancelButton = this.rootComponent
            .getByRole('button', { name: 'Cancel' })
            .describe('Cancel deletion button');
    }

    async waitForLoad(): Promise<DeleteProjectDialogComp> {
        await this.deletePermanentlyButton.waitFor();
        return this;
    }

    /**
     * Ticks "I understand that this deletion cannot be reversed", which is
     * what enables the confirm button. Idempotent.
     *
     * @aliases confirmUnderstanding, tickCheckbox, acceptIrreversible, checkConfirmation
     * @prerequisites The delete confirmation dialog is open
     * @observable-state The checkbox is ticked and "Delete permanently" becomes enabled; nothing is deleted yet
     */
    async checkConfirmationCheckbox(): Promise<void> {
        await this.confirmationCheckbox.check();
    }

    /**
     * Reports whether "Delete permanently" is currently enabled — false until
     * the confirmation checkbox is ticked.
     *
     * @aliases isDeleteEnabled, isConfirmEnabled, canDelete, isDeleteButtonDisabled, isEnabled
     * @prerequisites The delete confirmation dialog is open
     * @observable-state None — read-only query
     * @returns True if the confirm button is enabled.
     */
    async isDeletePermanentlyButtonEnabled(): Promise<boolean> {
        return await this.deletePermanentlyButton.isEnabled();
    }

    /**
     * Confirms the deletion and waits for the redirect to the global projects
     * list.
     *
     * @aliases confirmDelete, clickDeletePermanently, acceptDeletion, deleteNow
     * @prerequisites The confirmation checkbox has been ticked — call {@link checkConfirmationCheckbox} first
     * @observable-state The project and all its data are permanently deleted and the browser lands on /projects without it
     * @returns The global `ProjectsPage`.
     */
    async clickDeletePermanentlyButton(): Promise<ProjectsPage> {
        await this.deletePermanentlyButton.click();
        // The controller redirects to the projects list once the deletion has
        // been accepted; waiting for it keeps a caller from asserting against
        // the settings page it is about to leave.
        await this.page.waitForURL(/\/projects(\?|$)/);
        return await new ProjectsPage(this.page).waitForLoad();
    }

    /**
     * Dismisses the dialog without deleting anything.
     *
     * @aliases cancel, dismissDialog, abortDeletion, closeDialog
     * @prerequisites The delete confirmation dialog is open
     * @observable-state The dialog closes and the project is untouched
     */
    async clickCancelButton(): Promise<void> {
        await this.cancelButton.click();
        await this.rootComponent.waitFor({ state: 'hidden' });
    }
}
