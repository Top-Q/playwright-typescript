import { Locator, Page } from '@playwright/test';
import { BaseComponent, BoardsPage, WorkPackagesPage } from '../../../internals';

export class MainMenuComp extends BaseComponent {

    private readonly workPackagesLink: Locator;

    private readonly boardsLink: Locator;
 
    constructor(page: Page) {
        super(page, page.locator('.main-menu'));
        this.workPackagesLink = this.rootComponent.getByRole('link', { name: 'Work packages' });
        this.boardsLink = this.rootComponent.getByRole('link', { name: 'Boards' });
        
    }

    async clickWorkPackagesLink(): Promise<WorkPackagesPage> {
        await this.workPackagesLink.click();
        return new WorkPackagesPage(this.page);
    }

    async clickBoardsLink(): Promise<BoardsPage> {
        await this.boardsLink.click();
        return new BoardsPage(this.page);
    }



}