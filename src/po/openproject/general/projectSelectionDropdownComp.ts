import { Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { OverviewPage } from './overviewPage';

/**
 * A dialog component with a dropdown for project selection.
 * Opened from the home page via the 'All projects' button, it lists every
 * project the user can reach and navigates to the selected project's overview.
 */
export class ProjectSelectionDropdownComp extends BaseComponent<ProjectSelectionDropdownComp> {
    constructor(page: Page) {
        super(
            page,
            page
                .locator('.spot-drop-modal--body')
                .describe('Projects list container'),
        );
    }

    async waitForLoad(): Promise<ProjectSelectionDropdownComp> {
        await this.rootComponent.first().waitFor();
        return this;
    }

    /**
     * Selects a project from the project selection list by its name.
     * @param projectName The name of the project to select.
     * @returns OverviewPage
     */
    async clickProjectByName(projectName: string): Promise<OverviewPage> {
        await this.rootComponent.getByText(projectName).click();
        return await new OverviewPage(this.page).waitForLoad();
    }
}
