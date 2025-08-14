import { BaseComponent, BasePage, NewMilestonePage, NewPhasePage, NewTaskPage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

export class TaskTypeMenu {

    private readonly taskLink: Locator;
    private readonly milestoneLink: Locator;
    private readonly phaseLink: Locator;

    constructor(readonly page: Page) {
        const menu: Locator = this.page.getByRole("menu");
        this.taskLink = menu.getByRole("link", {name:"Task"});
        this.milestoneLink = menu.getByRole("link", {name:"Milestone"});
        this.phaseLink = menu.getByRole("link", {name:"Phase"});
    }

    async clickTaskLink(): Promise<NewTaskPage> {
        await this.taskLink.click();
        return new NewTaskPage(this.page);
    }

    async clickMilestoneLink(): Promise<NewMilestonePage> {
        await this.milestoneLink.click();
        return new NewMilestonePage(this.page);
    }

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
