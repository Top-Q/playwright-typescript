import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { NewProjectPage } from '../projects/newProjectPage';
import { ProjectsPage } from '../projects/projectsPage';

/**
 * Represents the application header (the top banner), which is present on
 * every page whether or not a project is open.
 *
 * This is the entry point for everything **global**: the quick-add ("+") menu
 * and the "Global modules" menu. Project creation lives here rather than in
 * `MainMenuComp` — that component is scoped to `.main-menu`, the project
 * sidebar, which does not exist on /projects/new at all.
 *
 * It is constructed directly from the page rather than handed out by a page
 * object, so that it stays usable from any page:
 *
 * ```typescript
 * test('...', async ({ page, readyOverviewPage }) => {
 *     void readyOverviewPage;
 *     const projectsPage = await new GlobalHeaderComp(page).clickProjectsModuleLink();
 * });
 * ```
 *
 * Both of its menus render **outside** the banner element (a popover and a
 * `dialog` on the body), so their contents are located from the page rather
 * than from the component root.
 *
 * @aliases HeaderComp, TopMenuComp, AppHeaderComp, QuickAddComp, GlobalMenuComp
 */
export class GlobalHeaderComp extends BaseComponent<GlobalHeaderComp> {
    private readonly quickAddButton: Locator;
    private readonly quickAddMenu: Locator;
    private readonly newProjectMenuItem: Locator;
    private readonly globalModulesButton: Locator;
    private readonly globalModulesDialog: Locator;
    private readonly projectsModuleLink: Locator;

    constructor(page: Page) {
        super(page, page.getByRole('banner').describe('Application header'));
        // `button#op-app-header--quick-add-menu-button`; its accessible name
        // comes from the icon's alt text and ends in an ellipsis character.
        this.quickAddButton = this.rootComponent
            .getByRole('button', { name: 'Add…' })
            .describe('Quick add menu button');
        this.quickAddMenu = this.page
            .getByRole('menu', { name: 'Add…' })
            .describe('Quick add menu');
        // Visible text "Project", accessible name "New project" from its
        // aria-label (`lib/redmine/menu_manager/top_menu/quick_add_menu.rb`).
        this.newProjectMenuItem = this.quickAddMenu
            .getByRole('menuitem', { name: 'New project' })
            .describe('Quick add: New project menu item');
        this.globalModulesButton = this.rootComponent
            .getByRole('button', { name: 'Global modules' })
            .describe('Global modules menu button');
        // A Primer overlay `dialog` on the body. It must be matched by name:
        // the user menu is a second `dialog` in the same document.
        this.globalModulesDialog = this.page
            .getByRole('dialog', { name: 'Global modules' })
            .describe('Global modules menu');
        this.projectsModuleLink = this.globalModulesDialog
            .getByRole('link', { name: 'Projects', exact: true })
            .describe('Global modules: Projects link');
    }

    async waitForLoad(): Promise<GlobalHeaderComp> {
        await this.quickAddButton.waitFor();
        return this;
    }

    /**
     * Opens the header's quick-add ("+") menu. Idempotent.
     *
     * @aliases openQuickAdd, clickQuickAdd, openAddMenu, clickPlusButton, openCreateMenu
     * @prerequisites Any page is open and the user is signed in
     * @observable-state The quick-add menu opens, offering "New project", "Invite user" and a work package type per project type
     */
    async openQuickAddMenu(): Promise<void> {
        if (await this.quickAddMenu.isVisible()) {
            return;
        }
        await this.quickAddButton.click();
        await this.quickAddMenu.waitFor();
    }

    /**
     * Opens the New project form from the quick-add menu, opening the menu
     * first if it is closed.
     *
     * **This route is context-sensitive.** From inside a project the menu item
     * carries `?parent_id=<that project>` and the form opens with "Subproject
     * of" pre-filled, so the project created is a *sub*project. For a
     * guaranteed top-level project use
     * {@link ProjectsPage.clickNewProjectButton} instead.
     *
     * @aliases clickNewProject, quickAddNewProject, createProject, addProject, openNewProjectForm, newProject
     * @prerequisites Any page is open and the user may create projects
     * @observable-state The browser navigates to /projects/new, with the parent pre-filled when a project was open
     * @returns A `NewProjectPage` for the create form.
     */
    async clickNewProjectMenuItem(): Promise<NewProjectPage> {
        await this.openQuickAddMenu();
        await this.newProjectMenuItem.click();
        return await new NewProjectPage(this.page).waitForLoad();
    }

    /**
     * Opens the "Global modules" menu. Idempotent.
     *
     * @aliases openGlobalModules, clickGlobalModules, openModulesMenu, globalMenu
     * @prerequisites Any page is open and the user is signed in
     * @observable-state The global modules menu opens, listing Projects, Work packages, Gantt charts and the other global areas
     */
    async openGlobalModulesMenu(): Promise<void> {
        if (await this.globalModulesDialog.isVisible()) {
            return;
        }
        await this.globalModulesButton.click();
        await this.globalModulesDialog.waitFor();
    }

    /**
     * Opens the global projects list via Global modules → Projects, opening
     * the menu first if it is closed.
     *
     * @aliases clickProjects, openProjectsList, goToProjects, navigateToProjects, viewAllProjects
     * @prerequisites Any page is open and the user is signed in
     * @observable-state The browser navigates to /projects, the application-wide project list
     * @returns A `ProjectsPage` for the global projects list.
     */
    async clickProjectsModuleLink(): Promise<ProjectsPage> {
        await this.openGlobalModulesMenu();
        await this.projectsModuleLink.click();
        return await new ProjectsPage(this.page).waitForLoad();
    }
}
