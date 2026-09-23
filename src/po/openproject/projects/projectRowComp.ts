import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { OverviewPage } from '../general/overviewPage';

/**
 * Represents a single project row in the global projects table
 * (`table#project-table`).
 *
 * The row's name cell holds a link to the project, and that link's href is
 * `/projects/<identifier>` — which makes the row the one place in the UI where
 * a project's **name and its generated identifier** can be read side by side
 * without leaving the list. (The favourite control in the same row links by
 * numeric id instead, so do not read the identifier from it.)
 *
 * @aliases ProjectRow, ProjectsTableRow, ProjectListRow
 */
export class ProjectRowComp extends BaseComponent<ProjectRowComp> {
    private readonly nameLink: Locator;

    constructor(
        protected readonly page: Page,
        protected readonly rowLocator: Locator,
    ) {
        super(page, rowLocator);
        this.nameLink = this.rootComponent
            .locator('td.name a')
            .describe('Project name link');
    }

    async waitForLoad(): Promise<ProjectRowComp> {
        await this.nameLink.waitFor();
        return this;
    }

    /**
     * Returns the project's name as displayed in the Name column.
     *
     * @aliases getProjectName, name, getName
     * @prerequisites This project row is displayed
     * @observable-state None — read-only query
     * @returns The project name.
     */
    async getName(): Promise<string> {
        return await this.nameLink.innerText();
    }

    /**
     * Returns the project's identifier — its URL slug — taken from the name
     * link's href.
     *
     * This is the value the server generated from the name on create
     * (lower case, spaces and punctuation folded to `-`), and the same value
     * the "Change the project's identifier" page edits.
     *
     * @aliases getIdentifier, getSlug, getProjectIdentifier, readIdentifier, getProjectSlug
     * @prerequisites This project row is displayed
     * @observable-state None — read-only query
     * @returns The project identifier.
     */
    async getIdentifier(): Promise<string> {
        const href = await this.nameLink.getAttribute('href');
        const match = href === null ? null : /\/projects\/([^/?#]+)/.exec(href);
        if (match === null) {
            throw new Error(
                `Could not read a project identifier from the row's name link (href: ${String(href)})`,
            );
        }
        return match[1];
    }

    /**
     * Opens this project by clicking its name.
     *
     * @aliases clickProject, openProject, clickName, goToProject
     * @prerequisites This project row is displayed
     * @observable-state The browser navigates to the project's overview page
     * @returns An `OverviewPage` for this project.
     */
    async clickName(): Promise<OverviewPage> {
        await this.nameLink.click();
        return await new OverviewPage(this.page).waitForLoad();
    }
}
