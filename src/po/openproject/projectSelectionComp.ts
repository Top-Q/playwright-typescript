import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';
/**
 * # Project Selection Component Class
 * This class represents the project selection component in OpenProject.
 * It allows users to select a project from a list of available projects.
 */
export class ProjectSelectionComponent extends BasePage {

    /**
     * ## Example Usage
     * ```typescript
     * await projectSelectionComponent.projectsListContainer.getByText('My Project').click();
     * ```
     */
    projectsListContainer: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.projectsListContainer = this.page.locator('#project_autocompletion_wrapper')
            .describe('Projects list container');
    }
}