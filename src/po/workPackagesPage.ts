import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

export class WorkPackagesPage extends BasePage {

    /**
    * ## Purpose
    * Locator for the "Create" button on the work packages page.
    *
    * ## Available Actions
    * - Click
    *
    * ## Navigation
    * - Opens the work package type selection menu
    *
    * ## Example Usage
    * ```typescript
    * await workPackagesPage.createButton.click();
    * ```
    */
    createButton: Locator;

    /**
    * ## Purpose
    * Locator for the task type container on the work packages page.
    *
    * ## Available Actions
    * - Click (on child elements)
    * - Get text
    *
    * ## Navigation
    * - Used to select the type of work package after clicking create
    *
    * ## Example Usage
    * ```typescript
    * await workPackagesPage.taskTypeContainer.getByText('Task').click();
    * ```
    */
    taskTypeContainer: Locator;

    /**
    * ## Purpose
    * Locator for the work packages result table container.
    *
    * ## Available Actions
    * - Query for rows/cells
    * - Get text
    *
    * ## Navigation
    * - Used to check for presence of work packages in the table
    *
    * ## Example Usage
    * ```typescript
    * await workPackagesPage.workPackagesResultTableContainer.getByText('My new task').isVisible();
    * ```
    */
    workPackagesResultTableContainer: Locator;

    constructor(readonly page: Page) {
        super(page);
        this.createButton = this.page.locator("div.wp-create-button > [aria-label='Create new work package']");
        this.taskTypeContainer = this.page.locator("#types-context-menu");
        this.workPackagesResultTableContainer = this.page.locator('table tbody');
    }       

}
