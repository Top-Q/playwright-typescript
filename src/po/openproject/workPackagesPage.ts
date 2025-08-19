import { BaseComponent, BasePage, NewMilestonePage, NewPhasePage, NewTaskPage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Task Type Menu Class
 * Small component that represents the task type menu tha appears when the user clicks the "Create" button.
 * It allows the user to select the type of work package they want to create, such as Task, Milestone, or Phase.
 */
export class TaskTypeMenu extends BaseComponent {

    readonly taskLink: Locator;
    readonly milestoneLink: Locator;
    readonly phaseLink: Locator;

    constructor(readonly page: Page) {
        super(page, page.locator("ul.dropdown-menu[role='menu']")); 
        this.taskLink = this.rootComponent.getByRole("link", {name:"Task"});
        this.milestoneLink = this.rootComponent.getByRole("link", {name:"Milestone"});
        this.phaseLink = this.rootComponent.getByRole("link", {name:"Phase"});
    }

    /**
     * Clicks the task link in the task type menu and returns a NewTaskPage instance.
     * @returns NewTaskPage
     */
    async clickTaskLink(): Promise<NewTaskPage> {
        await this.taskLink.click();
        return new NewTaskPage(this.page);
    }

    /**
     * Clicks the milestone link in the task type menu and returns a NewMilestonePage instance.
     * @returns NewMilestonePage
     */
    async clickMilestoneLink(): Promise<NewMilestonePage> {
        await this.milestoneLink.click();
        return new NewMilestonePage(this.page);
    }

    /**
     * Clicks the phase link in the task type menu and returns a NewPhasePage instance.
     * @returns NewPhasePage
     */
    async clickPhaseLink(): Promise<NewPhasePage> {
        await this.phaseLink.click();
        return new NewPhasePage(this.page);
    }
}

/**
 * # Workpackage Table Class
 * This class represents the work package table in the OpenProject application.
 * The table displays a list of work packages, the type (PHASE, STATUS, ASSIGNEE, PRIOORITY, etc.)
 * 
 */
export class WorkpackageTable extends BaseComponent {
    private readonly workPackageRows: Locator;

    constructor(page: Page) {
        super(page, page.locator('table tbody'));
        this.workPackageRows = this.rootComponent.locator('tr');
    }

    /**
     * Checks if a work package with the given name is visible in the table.
     * It is common to call the `waitForTableToLoad` method before calling this method.
     * @param name 
     * @returns true if the work package is visible, false otherwise.
     */
    async isWorkPackageVisible(name: string): Promise<boolean> {
        return await this.rootComponent.getByText(name).isVisible();
    }

    /**
     * Waits for the work package table to load.
     * This is typically used before performing actions that depend on the table being fully loaded.
     */
    async waitForTableToLoad(): Promise<void> {
        await this.page.waitForResponse("**/queries/*");
    }
}

/**
 * # Work Packages Page Class
 * This class represents the work packages page in the OpenProject application.
 * User can create, view, and manage work packages such as tasks, milestones, and phases.
 * It includes a table to display work packages and a button to create new ones.
 */
export class WorkPackagesPage extends BasePage {

    private readonly createButton: Locator;
    

    constructor(readonly page: Page) {
        super(page);
        this.createButton = this.page.locator("div.wp-create-button > [aria-label='Create new work package']");
    }

    async clickCreateButton(): Promise<TaskTypeMenu> {
        await this.createButton.click();
        return new TaskTypeMenu(this.page);
    }

    workPackageTable(): WorkpackageTable {
        return new WorkpackageTable(this.page);
    }

}
