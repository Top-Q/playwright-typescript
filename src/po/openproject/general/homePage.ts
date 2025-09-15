import {BasePage, ProjectSelectionComponent} from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * Represents the home page of OpenProject.
 * This page shows WELCOME TO OPENPROJECT section, NEW FEATURES
 * existing PROJECT and also, allows the user to select a project by 
 * clicking on the `Select a project` link.
 */
export class HomePage extends BasePage<HomePage> {

    private readonly selectAProjectLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.selectAProjectLink = this.page.getByRole('link', { name: 'Select a project' });
    }

    async waitForLoad(): Promise<HomePage> {
        await this.selectAProjectLink.waitFor();
        return this;
    }   

    /**
     * Clicks on the 'Select a project' link and returns a ProjectSelectionComponent.
     * 
     * @returns ProjectSelectionComponent to select a project
     */
    async clickSelectAProjectLink(): Promise<ProjectSelectionComponent> {
        await this.selectAProjectLink.click();
        return await new ProjectSelectionComponent(this.page).waitForLoad();
    }
}