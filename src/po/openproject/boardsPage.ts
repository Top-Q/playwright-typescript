import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

export class BoardsPage extends BasePage {

    private readonly createNewBoardButton: Locator;
    private readonly boardNamesTds: Locator;
    private readonly deleteButtons: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.createNewBoardButton = page.locator('.toolbar-items [title="Create new board"]');
        this.boardNamesTds = page.locator('table.generic-table td.name > a');
        this.deleteButtons = page.locator("button[title='Delete']");
    }

    async clickCreateNewBoardButton(): Promise<void> {
        await this.createNewBoardButton.click();
    }

    async clickBoardByName(boardName: string): Promise<void> {
        await this.boardNamesTds.getByText(boardName).click();
    }

    async deleteAllBoards(): Promise<void> {
        while (await this.deleteButtons.count() > 0) {
            await this.deleteButtons.first().click();
        }
    }

    async isAnyBoardVisible(): Promise<boolean> {
        return await this.boardNamesTds.first().isVisible();
    }

    async getBoardCount(): Promise<number> {
        return await this.boardNamesTds.count();
    }

    async getBoardNameByIndex(index: number): Promise<string> {
        return await this.boardNamesTds.nth(index).innerText();
    }
}
