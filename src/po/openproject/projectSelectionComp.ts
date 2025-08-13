import { BasePage, OverviewPage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

export class ProjectSelectionComponent extends BasePage {

    private readonly projectsListContainer: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.projectsListContainer = this.page.locator('#project_autocompletion_wrapper');
    }

    async clickProjectByName(projectName: string): Promise<OverviewPage> {
        await this.projectsListContainer.getByText(projectName).click();
        return new OverviewPage(this.page);
    }
}