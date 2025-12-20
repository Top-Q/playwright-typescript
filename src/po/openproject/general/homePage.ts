import {BasePage, ProjectSelectionDropdown} from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * Represents the home page of OpenProject.
 * This page shows WELCOME TO OPENPROJECT section, NEW FEATURES
 * existing PROJECT and also, allows the user to select a project by 
 * clicking on the `Select a project` link.
 */
export class HomePage extends BasePage<HomePage> {

    private readonly allProjectsButton: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.allProjectsButton = this.page.getByRole('button', { name: 'All projects' }).describe('All projects button');
    }

    async waitForLoad(): Promise<HomePage> {
        await this.allProjectsButton.waitFor();
        return this;
    }   

    /**
     * Clicks on the 'Select a project' link and returns a ProjectSelectionComponent.
     * 
     * @returns ProjectSelectionComponent to select a project
     */
    async clickAllProjectsButton(): Promise<ProjectSelectionDropdown> {
        await this.allProjectsButton.click();
        return await new ProjectSelectionDropdown(this.page).waitForLoad();
    }
}