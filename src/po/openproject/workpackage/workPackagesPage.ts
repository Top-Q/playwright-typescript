import { BaseComponent, BasePage, NewMilestonePage, NewPhasePage, NewTaskPage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Task Type Menu Class
 * Small component that represents the task type menu tha appears when the user clicks the "Create" button.
 * It allows the user to select the type of work package they want to create, such as Task, Milestone, or Phase.
 */
export class TaskTypeMenu extends BaseComponent<TaskTypeMenu> {

    readonly taskLink: Locator;
    readonly milestoneLink: Locator;
    readonly phaseLink: Locator;

    constructor(readonly page: Page) {
        super(page, page.locator("ul.dropdown-menu[role='menu']"));
        this.taskLink = this.rootComponent.getByRole("link", { name: "Task" });
        this.milestoneLink = this.rootComponent.getByRole("link", { name: "Milestone" });
        this.phaseLink = this.rootComponent.getByRole("link", { name: "Phase" });
    }

    async waitForLoad(): Promise<TaskTypeMenu> {
        await this.rootComponent.first().waitFor();
        return this;
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

export class WorkPackageDeletionConfirmationDialogComp extends BaseComponent<WorkPackageDeletionConfirmationDialogComp> {
    constructor(readonly page: Page) {
        super(page, page.locator("#wp_destroy_modal"));
    }

    async waitForLoad(): Promise<WorkPackageDeletionConfirmationDialogComp> {
        await this.rootComponent.waitFor();
        return this;
    }

    /**
     * ## Description
     * This method clicks the "Confirm" button in the work package deletion confirmation dialog.
     * 
     * ## Aliases
     * - `clickConfirmButton()`
     * - `confirmDeletion()`
     */
    async clickOnConfirmButton(): Promise<void> {
        const queryPromise = this.page.waitForResponse("**/queries/**");
        // There is a bug here. When deleting a work package in the filter 
        // page the message is "Successful creation" instead of "Successfully deleted work packages"

        const SuccessfullyDelete: Locator = this.page.getByRole('alert').getByText('Successfully deleted work packages.');
        const SuccessfulCreation: Locator = this.page.getByRole('alert').getByText('Successful creation');
        const combinedSuccessfulMessageLocators = SuccessfullyDelete.or(SuccessfulCreation);
        await this.rootComponent.getByRole("button", { name: "Confirm" }).click();
        await combinedSuccessfulMessageLocators.waitFor({ state: 'visible', timeout: 5000 });
        await queryPromise;
    }
}


/**
 * # Work Package Row Context Menu Class
 * This class represents the context menu that appears when a user clicks on a work package row.
 * It allows the user to perform actions on the work package, such as deleting, copying, Open details and more.
 */
export class workPackageRowContextMenu extends BaseComponent<workPackageRowContextMenu> {
    constructor(readonly page: Page, readonly locator: Locator) {
        super(page, locator);
    }

    async waitForLoad(): Promise<workPackageRowContextMenu> {
        await this.rootComponent.first().waitFor();
        return this;
    }


    /**
     * ## Description
     * This method clicks the "Delete" menu item in the work package context menu.
     * 
     * ## Aliases
     * - `clickDeleteMenuItem()`
     * - `deleteWorkPackage()`
     * - `clickDelete()`
     * - `clickDeleteOption()`
     * 
     */
    async clickDeleteMenuItem(): Promise<WorkPackageDeletionConfirmationDialogComp> {
        await this.page.getByRole("menu").getByRole("button", { name: "Delete" }).click();
        return new WorkPackageDeletionConfirmationDialogComp(this.page);

    }
}

/**
 * # Work Package Row Class
 * This class represents a single row in the work package table.
 * 
 */
export class WorkPackageRow extends BaseComponent<WorkPackageRow> {
    constructor(readonly page: Page, readonly locator: Locator) {
        super(page, locator);
    }

    async clickOpenContextMenu(): Promise<workPackageRowContextMenu> {
        // We have to hover the row first to make the context menu appear.
        await this.rootComponent.hover();
        await this.rootComponent.getByRole('link', { name: 'Open context menu' }).click();
        return new workPackageRowContextMenu(this.page, this.rootComponent.locator("#work-package-context-menu"));
    }

    async waitForLoad(): Promise<WorkPackageRow> {
        await this.rootComponent.waitFor();
        return this;
    }

}


/**
 * # Workpackage Table Class
 * This class represents the work package table in the OpenProject application.
 * The table displays a list of work packages, the type (PHASE, STATUS, ASSIGNEE, PRIOORITY, etc.)
 * 
 */
export class WorkpackageTable extends BaseComponent<WorkpackageTable> {
    private readonly workPackageRows: Locator;

    constructor(page: Page) {
        super(page, page.locator('table tbody'));
        this.workPackageRows = this.rootComponent.locator('tr');
    }

    /**
     * Waits for the work package table to load.    
     */
    async waitForLoad(): Promise<WorkpackageTable> {
        await this.rootComponent.first().waitFor();        
        return this;
    }

    // /**
    //  * ## Description
    //  * Refreshes the work package table by reloading the page and waiting for the table to load.
    //  * 
    //  * ## Usage
    //  * ```ts
    //  * await workpackageTable.refreshTableAndWaitForLoad();
    //  * const exists = await workpackageTable.isWorkPackageBySubjectExists(wpName);
    //  * ```
    //  */
    // async refreshTableAndWaitForLoad(): Promise<void> {
    //     const queryPromise = this.page.waitForResponse("**/queries/**");
    //     await this.page.reload();
    //     await queryPromise;
    // }

    /**
     * Checks if a work package with the given name is visible in the table.
     * It is common to call the `waitForTableToLoad` method before calling this method.
     * @param subject 
     * @returns true if the work package is visible, false otherwise.
     */
    async isWorkPackageBySubjectExists(subject: string): Promise<boolean> {
        return await this.workPackageRows.filter({ has: this.page.locator(`td.subject span:has-text("${subject}")`) }).count() > 0;
    }


    async getWorkPackageRowBySubject(subject: string): Promise<WorkPackageRow> {
        const rowLocator = this.workPackageRows.filter({ has: this.page.locator(`td.subject span:has-text("${subject}")`) });
        if (await rowLocator.count() === 0) {
            throw new Error(`Work package with subject "${subject}" not found.`);
        }
        return new WorkPackageRow(this.page, rowLocator);
    }
}

/**
 * # Work Packages Page Class
 * This class represents the work packages page in the OpenProject application.
 * User can create, view, and manage work packages such as tasks, milestones, and phases.
 * It includes a table to display work packages and a button to create new ones.
 */
export class WorkPackagesPage extends BasePage<WorkPackagesPage> {

    private readonly createButton: Locator;


    constructor(readonly page: Page) {
        super(page);
        this.createButton = this.page.locator("div.wp-create-button > [aria-label='Create new work package']");
    }

    async waitForLoad(): Promise<WorkPackagesPage> {
        await this.createButton.first().waitFor();
        return this;
    }

    async clickCreateButton(): Promise<TaskTypeMenu> {
        await this.createButton.click();
        return await new TaskTypeMenu(this.page).waitForLoad();
    }

    async workPackageTable(): Promise<WorkpackageTable> {
        return await new WorkpackageTable(this.page).waitForLoad();
    }

}
