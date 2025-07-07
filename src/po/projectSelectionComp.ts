import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

export class ProjectSelectionComponent extends BasePage {

    /**
     * ## Purpose
     * Locator for the project selection list container.
     *
     * ## Available Actions
     * - Get text
     * - Click (on child elements)
     *
     * ## Navigation
     * - Used to select a project from the list
     *
     * ## Example Usage
     * ```typescript
     * await projectSelectionComponent.projectsListContainer.getByText('My Project').click();
     * ```
     */
    projectsListContainer: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.projectsListContainer = this.page.locator('#project_autocompletion_wrapper');
    }
}