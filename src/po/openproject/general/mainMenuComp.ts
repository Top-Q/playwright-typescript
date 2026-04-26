import { Locator, Page } from '@playwright/test';
import { BaseComponent, BoardsPage, WorkPackagesPage } from '../../../../internals';
import { CostReportsPage } from '../timeandcosts/costReportsPage';

/**
 * Represents the main menu component in OpenProject on the left of the page.
 * Allows navigation to different sections like Work Packages and Boards.
 */
export class MainMenuComp extends BaseComponent<MainMenuComp> {

    readonly workPackagesLink: Locator;

    readonly boardsLink: Locator;

    readonly timeAndCostsLink: Locator;

    constructor(page: Page) {
        super(page, page.locator('.main-menu'));
        this.workPackagesLink = this.rootComponent.getByRole('link', { name: 'Work packages' }).describe('Work Packages Link in Main Menu');
        this.boardsLink = this.rootComponent.getByRole('link', { name: 'Boards' }).describe('Boards Link in Main Menu');
        this.timeAndCostsLink = this.rootComponent.getByRole('link', { name: 'Time and costs' }).describe('Time and Costs Link in Main Menu');
    }

    async waitForLoad(): Promise<MainMenuComp> {
        await this.workPackagesLink.waitFor();  
        return this;
    }

    /**
     * Click on the 'Work packages' menu item and returns a WorkPackagesPage.
     * It will also change the menu to the work packages menu.
     * @returns Work Packages Page
     */
    async clickWorkPackagesLink(): Promise<WorkPackagesPage> {
        await this.workPackagesLink.click();
        return await new WorkPackagesPage(this.page).waitForLoad();
    }

    /**
     * Click on the 'Boards' menu item and returns a BoardsPage.
     * It will also change the menu to the boards menu.
     * 
     * @returns 
     */
    async clickBoardsLink(): Promise<BoardsPage> {
        await this.boardsLink.click();
        return await new BoardsPage(this.page).waitForLoad();
    }

    /**
     * Click on the 'Time and costs' menu item and returns a CostReportsPage.
     * @returns CostReportsPage
     */
    async clickTimeAndCostsLink(): Promise<CostReportsPage> {
        await this.timeAndCostsLink.click();
        return await new CostReportsPage(this.page).waitForLoad();
    }
}