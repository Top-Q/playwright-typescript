import { BasePage, NewMilestonePage, NewPhasePage, NewTaskPage } from '../../../internals';
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

export class WorkPackagesPage extends BasePage {

    private readonly createButton: Locator;
    private readonly workPackagesResultTableContainer: Locator;

    constructor(readonly page: Page) {
        super(page);
        this.createButton = this.page.locator("div.wp-create-button > [aria-label='Create new work package']");
        this.workPackagesResultTableContainer = this.page.locator('table tbody');
    }

    async clickCreateButton(): Promise<TaskTypeMenu> {
        await this.createButton.click();
        return new TaskTypeMenu(this.page);
    }

    async isWorkPackagesResultTableVisible(): Promise<boolean> {
        return await this.workPackagesResultTableContainer.isVisible();
    }

    async isWorkPackageVisible(name: string): Promise<boolean> {
        return await this.workPackagesResultTableContainer.getByText(name).isVisible();
    }
}
