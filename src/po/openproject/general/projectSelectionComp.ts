import { BasePage, OverviewPage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * A dialog component with dropdown for project selection.
 */
export class ProjectSelectionDropdown extends BasePage<ProjectSelectionDropdown> {

    readonly projectsListContainer: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.projectsListContainer = this.page.locator('.spot-drop-modal--body').describe('Projects List Container');
    }

    async waitForLoad(): Promise<ProjectSelectionDropdown> {
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