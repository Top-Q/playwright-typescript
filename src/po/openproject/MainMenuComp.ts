import { Locator, Page } from '@playwright/test';
import { BaseComponent, BoardsPage, WorkPackagesPage } from '../../../internals';

/**
 * Represents the main menu component in OpenProject on the left of the page.
 * Allows navigation to different sections like Work Packages and Boards.
 */
export class MainMenuComp extends BaseComponent {

    private readonly workPackagesLink: Locator;

    private readonly boardsLink: Locator;
 
    constructor(page: Page) {
        super(page, page.locator('.main-menu'));
        this.workPackagesLink = this.rootComponent.getByRole('link', { name: 'Work packages' });
        this.boardsLink = this.rootComponent.getByRole('link', { name: 'Boards' });
        
    }

    /**
     * Click on the 'Work packages' menu item and returns a WorkPackagesPage.
     * It will also change the menu to the work packages menu.
     * @returns Work Packages Page
     */
    async clickWorkPackagesLink(): Promise<WorkPackagesPage> {
        await this.workPackagesLink.click();
        return new WorkPackagesPage(this.page);
    }

    /**
     * Click on the 'Boards' menu item and returns a BoardsPage.
     * It will also change the menu to the boards menu.
     * 
     * @returns 
     */
    async clickBoardsLink(): Promise<BoardsPage> {
        await this.boardsLink.click();
        return new BoardsPage(this.page);
    }



}