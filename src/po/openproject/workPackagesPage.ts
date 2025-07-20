import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Task Type Menu Class
 * This class represents the task type selection menu in OpenProject.
 * It provides links to create different types of work packages such as tasks, milestones, and phases.
 */
export class TaskTypeMenu {

    /**
     * ## Navigation
     * - Opens the `NewTaskPage` for creating a new task.
     */
    taskLink: Locator;

    /**
     * ## Navigation
     * - Opens the `NewMilestonePage` for creating a new milestone.
     */
    milestoneLink: Locator;

    /**
     * ## Navigation
     * - Opens the `NewPhasePage` for creating a new phase.
     */
    phaseLink: Locator;

    constructor(readonly page: Page) {
        const menu: Locator = this.page.getByRole("menu");
        this.taskLink = menu.getByRole("link", {name:"Task"}).describe('Task type link');
        this.milestoneLink = menu.getByRole("link", {name:"Milestone"}).describe('Milestone type link');
        this.phaseLink = menu.getByRole("link", {name:"Phase"}).describe('Phase type link');
    }

}

/**
 * # Work Packages Page Class
 * This class represents the work packages page in OpenProject.
 * It includes table for displaying work packages, a button for creating new work packages,
 */
export class WorkPackagesPage extends BasePage {

    /**
    * ## Navigation
    * - Opens the work package type selection menu
    *
    * ## Example Usage
    * ```typescript
    * await workPackagesPage.createButton.click();
    * let taskTypeMenu = new TaskTypeMenu(page);
    * await taskTypeMenu.taskLink.click();
    * ```
    */
    createButton: Locator;

   
    /**
    * ## Purpose
    * Locator for the work packages result table container.
    *
    * ## Available Actions
    * - Query for rows/cells
    * - Get text
    * 
    *   
    * ## Example Usage
    * ```typescript
    * await workPackagesPage.workPackagesResultTableContainer.getByText('My new task').isVisible();
    * ```
    */
    workPackagesResultTableContainer: Locator;

    constructor(readonly page: Page) {
        super(page);
        this.createButton = this.page.locator("div.wp-create-button > [aria-label='Create new work package']").describe('Create button');        
        this.workPackagesResultTableContainer = this.page.locator('table tbody').describe('Work packages result table container');
    }       

}
