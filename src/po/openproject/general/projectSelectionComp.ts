import { BasePage, OverviewPage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * A dialog component with dropdown for project selection.
 */
export class ProjectSelectionComponent extends BasePage<ProjectSelectionComponent> {

    readonly projectsListContainer: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.projectsListContainer = this.page.locator('#project_autocompletion_wrapper');
    }

    async waitForLoad(): Promise<ProjectSelectionComponent> {
        await this.projectsListContainer.first().waitFor();
        return this;
    }

    /**
     * Selects a project from the project selection list by its name.
     * @param projectName The name of the project to select.
     * @returns OverviewPage
     */
    async clickProjectByName(projectName: string): Promise<OverviewPage> {
        await this.projectsListContainer.getByText(projectName).click();
        return new OverviewPage(this.page).waitForLoad();
    }
}