import {BasePage} from '../../../internals';
import { Locator, Page } from '@playwright/test';
/**
 * # Home Page Class
 * This class represents the home page of the OpenProject application.
 * It includes a link to select a project, which opens the project selection dialog.
 * It also includes *NEW FEATURES*, *PROJECTS*, *WELCOME TO OPENPROJECT* and other sections.
 * 
 */
export class HomePage extends BasePage {

    /**
     * ## Navigation
     * - Opens the project selection dialog `ProjectSelectionComponent` that will allow the user to select a project.
     * - 
     *
     * ## Example Usage
     * ```typescript
     * await homePage.selectAProjectLink.click();
     * await homePage.selectAProjectLink.getByText('Project name').click();
     * const projectSelectionComponent = new ProjectSelectionComponent(page);
     * await projectSelectionComponent.projectsListContainer.getByText('Demo project').click();
     * ```
     */
    selectAProjectLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.selectAProjectLink = this.page.getByRole('link', { name: 'Select a project' }).describe('Select a project link');
    }


}