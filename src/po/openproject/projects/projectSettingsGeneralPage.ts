import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { DeleteProjectDialogComp } from './deleteProjectDialogComp';
import { ProjectIdentifierPage } from './projectIdentifierPage';
import { ProjectsPage } from './projectsPage';

/**
 * Represents Project settings → Information at
 * /projects/:identifier/settings/general.
 *
 * Besides the project's own attributes (Name, Description, ...) this page
 * carries the project-level actions in its page header: "New subproject",
 * "Change identifier", and a "More" menu holding Copy, Make public, Archive,
 * Set as template and Delete.
 *
 * It is where a test that created a project comes to remove it again
 * ({@link deleteProject}), and the way in to the identifier editor
 * ({@link clickChangeIdentifierLink}).
 *
 * @aliases ProjectSettingsPage, ProjectInformationPage, SettingsGeneralPage, ProjectGeneralSettingsPage
 * @url /projects/:projectIdentifier/settings/general
 */
export class ProjectSettingsGeneralPage extends BasePage<ProjectSettingsGeneralPage> {
    private readonly basicDetailsHeading: Locator;
    private readonly changeIdentifierLink: Locator;
    private readonly moreMenuButton: Locator;
    private readonly deleteMenuItem: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // The page header's own heading is the menu caption ("Information"),
        // which is not unique to this page; the "Basic details" section title
        // is. It renders as an h3 — Primer decides heading levels, so the level
        // is not asserted here.
        this.basicDetailsHeading = this.page
            .getByRole('heading', { name: 'Basic details' })
            .describe('Basic details section heading');
        this.changeIdentifierLink = this.page
            .getByRole('link', { name: 'Change identifier' })
            .describe('Change identifier action link');
        // Three controls are named "More"-ish on this page: this page-header
        // action, and the description editor's "Show more items" buttons.
        // `exact: true` on "More" picks out the page-header one.
        this.moreMenuButton = this.page
            .getByRole('button', { name: 'More', exact: true })
            .describe('Project settings More menu button');
        // The menu is a Primer popover rendered outside the page header, so it
        // is located from the page rather than from any container.
        this.deleteMenuItem = this.page
            .getByRole('menuitem', { name: 'Delete' })
            .describe('Delete project menu item');
    }

    async waitForLoad(): Promise<ProjectSettingsGeneralPage> {
        await this.page.waitForURL(/\/settings\/general/);
        await this.basicDetailsHeading.waitFor();
        return this;
    }

    /**
     * Navigates straight to a project's settings page by identifier.
     *
     * The UI route is the project sidebar's "Project settings" entry; this
     * deep link exists because the common caller is a test cleaning up a
     * project it just created, which knows the identifier and has no interest
     * in walking the menu to reach it.
     *
     * @aliases openSettings, gotoSettings, openProjectSettings, navigateToSettings, openForProject
     * @prerequisites A project with this identifier exists and the user may administer it
     * @observable-state The browser navigates to that project's settings page
     * @param projectIdentifier - The project's identifier (URL slug), e.g. "demo-project".
     * @returns A loaded `ProjectSettingsGeneralPage`.
     */
    async openForProject(
        projectIdentifier: string,
    ): Promise<ProjectSettingsGeneralPage> {
        const origin = new URL(this.page.url()).origin;
        await this.page.goto(
            `${origin}/projects/${projectIdentifier}/settings/general`,
        );
        return await this.waitForLoad();
    }

    /**
     * Opens the "Change the project's identifier" page.
     *
     * @aliases clickChangeIdentifier, openIdentifierPage, editIdentifier, changeIdentifier, openChangeIdentifier
     * @prerequisites The project settings page is open
     * @observable-state The browser navigates to the change-identifier page, its field pre-filled with the current identifier
     * @returns A `ProjectIdentifierPage`.
     */
    async clickChangeIdentifierLink(): Promise<ProjectIdentifierPage> {
        await this.changeIdentifierLink.click();
        return await new ProjectIdentifierPage(this.page).waitForLoad();
    }

    /**
     * Opens the "More" action menu in the page header.
     *
     * @aliases openMoreMenu, clickMore, openActionMenu, openProjectActions
     * @prerequisites The project settings page is open
     * @observable-state The action menu opens, offering Copy, Make public, Archive, Set as template and Delete
     */
    async openMoreMenu(): Promise<void> {
        await this.moreMenuButton.click();
        await this.deleteMenuItem.waitFor();
    }

    /**
     * Opens the delete-project confirmation dialog through the "More" menu.
     * Nothing is deleted until the dialog is confirmed.
     *
     * @aliases clickDelete, openDeleteDialog, clickDeleteProject, removeProject
     * @prerequisites The project settings page is open
     * @observable-state The confirmation dialog opens; the project still exists
     * @returns A `DeleteProjectDialogComp` for the open dialog.
     */
    async clickDeleteInMoreMenu(): Promise<DeleteProjectDialogComp> {
        await this.openMoreMenu();
        await this.deleteMenuItem.click();
        return await new DeleteProjectDialogComp(this.page).waitForLoad();
    }

    /**
     * Deletes this project end to end: opens the "More" menu, chooses Delete,
     * ticks the irreversibility checkbox and confirms.
     *
     * This is the cleanup call for a test that created a project (rule 20).
     * Deletion is permanent and takes every work package, meeting and board in
     * the project with it.
     *
     * @aliases deleteProject, removeProject, destroyProject, cleanupProject, deletePermanently
     * @prerequisites The project settings page is open for the project to delete
     * @observable-state The project and all its data are permanently deleted and the browser lands on the global projects list
     * @returns The global `ProjectsPage`, which no longer lists the project.
     */
    async deleteProject(): Promise<ProjectsPage> {
        const dialog = await this.clickDeleteInMoreMenu();
        await dialog.checkConfirmationCheckbox();
        return await dialog.clickDeletePermanentlyButton();
    }
}
