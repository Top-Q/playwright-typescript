import {BasePage, ProjectSelectionDropdownComp} from '../../../../internals';
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
        await super.waitForLoad();
        await this.allProjectsButton.waitFor();
        return this;
    }   

    /**
     * Clicks on the 'All projects' button and returns the project selection dropdown.
     *
     * @returns ProjectSelectionDropdownComp to select a project
     */
    async clickAllProjectsButton(): Promise<ProjectSelectionDropdownComp> {
        await this.allProjectsButton.click();
        return await new ProjectSelectionDropdownComp(this.page).waitForLoad();
    }
}