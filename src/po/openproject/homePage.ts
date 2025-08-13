import {BasePage, ProjectSelectionComponent} from '../../../internals';
import { Locator, Page } from '@playwright/test';
export class HomePage extends BasePage {

    private readonly selectAProjectLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.selectAProjectLink = this.page.getByRole('link', { name: 'Select a project' });
    }

    async clickSelectAProjectLink(): Promise<ProjectSelectionComponent> {
        await this.selectAProjectLink.click();
        return new ProjectSelectionComponent(this.page);
    }
}