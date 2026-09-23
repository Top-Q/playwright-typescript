import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { NewProjectPage } from './newProjectPage';
import { ProjectRowComp } from './projectRowComp';

/**
 * Represents the global projects list at /projects — the application-wide list
 * of every project the current user can see, not a page inside a project.
 *
 * The page is assembled from several turbo-frames (`projects-index-page-header`,
 * `projects-index-sub-header`, `filter-button`, `projects-table`,
 * `projects_sidemenu`); filtering and sorting replace a frame rather than the
 * document, so waiting on a load state after them is a no-op.
 *
 * Its sub-header carries the project name filter and the "+ Project" action,
 * which is the entry point for creating a **top-level** project.
 *
 * @aliases ProjectListPage, GlobalProjectsPage, AllProjectsPage, ProjectsIndexPage
 * @url /projects
 */
export class ProjectsPage extends BasePage<ProjectsPage> {
    private readonly projectNameFilterInput: Locator;
    private readonly newProjectLink: Locator;
    private readonly projectRows: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // Rendered unconditionally by
        // `app/components/projects/index_sub_header_component.html.erb`
        // (`with_filter_input name: "name_and_identifier"`), so it is present
        // whatever the user may do here — which makes it a safer readiness
        // signal than the "+ Project" action (permission-dependent) or the
        // page heading (it is the query's name: "Active projects", "My
        // projects", ...).
        this.projectNameFilterInput = this.page
            .getByRole('textbox', { name: 'Project name filter' })
            .describe('Project name filter field');
        // Same component's `with_action_button`. It exists twice in the DOM —
        // a labelled desktop variant and an icon-only mobile one that carries
        // no accessible name — so an accessible-name match resolves to the
        // visible one only. `[data-test-selector="workspace-new-button"]`
        // matches both and must not be used bare.
        this.newProjectLink = this.page
            .getByRole('link', { name: 'Project', exact: true })
            .describe('New project action link');
        // Real rows are `tr.op-project-row-component` with `id="project-<id>"`.
        // The class matters: when nothing matches the filter the table is still
        // rendered, holding a single `tr.generic-table--empty-row` placeholder,
        // so counting `tbody tr` reports 1 for an empty list.
        this.projectRows = this.page
            .locator('table#project-table tbody tr.op-project-row-component')
            .describe('Project table rows');
    }

    async waitForLoad(): Promise<ProjectsPage> {
        // Guarding on the path as well as the field keeps this from reporting
        // itself loaded against a page the browser is still leaving — the
        // filter field lives in a turbo-frame that survives longer than the
        // eye suggests.
        await this.page.waitForURL((url) => url.pathname === '/projects');
        await this.projectNameFilterInput.waitFor();
        return this;
    }

    /**
     * Opens the New project form via the sub-header's "+ Project" action.
     *
     * This route always yields a **top-level** project — unlike the header
     * quick-add menu, which passes `parent_id` when a project is open and so
     * silently creates a subproject.
     *
     * @aliases clickNewProject, createProject, addProject, openNewProjectForm, clickAddProject, newProject
     * @prerequisites The projects list is open and the user may create projects
     * @observable-state The browser navigates to /projects/new with no parent pre-selected
     * @returns A `NewProjectPage` for the empty create form.
     */
    async clickNewProjectButton(): Promise<NewProjectPage> {
        await this.newProjectLink.click();
        return await new NewProjectPage(this.page).waitForLoad();
    }

    /**
     * Filters the list by project name (the filter also matches identifiers)
     * and waits for the filtered result.
     *
     * The field applies itself as you type, pushing the filter into the URL as
     * `filters=name_and_identifier ~ "<text>"`; the wait is on that parameter
     * carrying this text, so it does not resolve against a filter left over
     * from a previous call.
     *
     * Do not pass an empty string to clear the filter: every filter value
     * contains the empty string, so the wait resolves immediately and the
     * table read afterwards may still be the previous result. Navigate to
     * /projects again for an unfiltered list.
     *
     * @aliases searchByName, filterProjects, searchProjects, filterByProjectName, applyNameFilter
     * @prerequisites The projects list is open
     * @observable-state The table reloads showing only projects whose name or identifier contains the text
     * @param name - The text to filter by.
     * @returns This `ProjectsPage`, filtered.
     */
    async filterByName(name: string): Promise<ProjectsPage> {
        await this.projectNameFilterInput.fill(name);
        await this.page.waitForURL(
            (url) => url.searchParams.get('filters')?.includes(name) ?? false,
        );
        return this;
    }

    /**
     * Returns the number of project rows currently listed, ignoring the
     * "There is currently nothing to display." placeholder row.
     *
     * @aliases getProjectCount, countProjects, getNumberOfProjects, getRowCount
     * @prerequisites The projects list is open
     * @observable-state None — read-only query
     * @returns The number of project rows displayed.
     */
    async getNumberOfRows(): Promise<number> {
        return await this.projectRows.count();
    }

    /**
     * Returns the names of the projects currently listed. Only the rows on the
     * current page and under the current filter are visible to this.
     *
     * @aliases getProjectNames, listProjects, getAllProjectNames
     * @prerequisites The projects list is open
     * @observable-state None — read-only query
     * @returns The project names in table order.
     */
    async getProjectNames(): Promise<string[]> {
        return await this.projectRows.locator('td.name a').allInnerTexts();
    }

    /**
     * Returns the row for a project, matched on the name cell's exact text.
     * The row is a lazy locator — it is not resolved until a method on it is
     * called — so this does not throw for a project that is not listed;
     * {@link hasProjectWithName} answers that.
     *
     * @aliases getProjectRow, findProjectByName, getRowForProject, projectRow
     * @prerequisites The projects list is open
     * @observable-state None — returns a component wrapper without interacting
     * @param name - The exact project name.
     * @returns A `ProjectRowComp` for that project's row.
     */
    getProjectRowByName(name: string): ProjectRowComp {
        const rowLocator = this.projectRows
            .filter({ has: this.page.getByRole('link', { name, exact: true }) })
            .first()
            .describe(`Project row for "${name}"`);
        return new ProjectRowComp(this.page, rowLocator);
    }

    /**
     * Reports whether a project with this exact name is listed. Only inspects
     * the rows currently rendered, so an active filter or a sidebar view other
     * than "Active projects" can hide an existing project.
     *
     * @aliases projectExists, hasProject, isProjectListed, containsProject
     * @prerequisites The projects list is open
     * @observable-state None — read-only query
     * @param name - The exact project name to look for.
     * @returns True if a matching row is displayed.
     */
    async hasProjectWithName(name: string): Promise<boolean> {
        return (
            (await this.projectRows
                .filter({
                    has: this.page.getByRole('link', { name, exact: true }),
                })
                .count()) > 0
        );
    }
}
