import { BasePage, BoardTypePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Boards Page Class
 * This class represents the boards list page in the OpenProject application.
 * Users can view, create, and delete boards from this page.
 */
export class BoardsPage extends BasePage {

    private readonly createNewBoardButton: Locator;
    private readonly boardNamesTds: Locator;
    private readonly deleteButtons: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.createNewBoardButton = page.locator('.toolbar-items [title="Create new board"]')
            .describe('Button to create a new board');
        this.boardNamesTds = page.locator('table.generic-table td.name > a')
            .describe('List of board names');
        this.deleteButtons = page.locator("button[title='Delete']")
            .describe('Delete buttons for boards');
    }

    /**
     * Clicks the button to create a new board.
     */
    async clickCreateNewBoardButton(): Promise<BoardTypePage> {
        await this.createNewBoardButton.click();
        return new BoardTypePage(this.page);
    }

    /**
     * Clicks on a board by its name.
     * @param boardName - The name of the board to click.
     */
    async clickBoardByName(boardName: string): Promise<void> {
        await this.boardNamesTds.getByText(boardName).click();
    }

    /**
     * Deletes all boards listed on the page.
     */
    async deleteAllBoards(): Promise<void> {
        while (await this.deleteButtons.count() > 0) {
            await this.deleteButtons.first().click();
        }
    }

    /**
     * Checks if any board is visible on the page.
     * @returns True if at least one board is visible, false otherwise.
     */
    async isAnyBoardVisible(): Promise<boolean> {
        return await this.boardNamesTds.first().isVisible();
    }

    /**
     * Gets the count of boards listed on the page.
     * @returns The number of boards.
     */
    async getBoardCount(): Promise<number> {
        return await this.boardNamesTds.count();
    }

    /**
     * Gets the name of a board by its index in the list.
     * @param index - The index of the board.
     * @returns The name of the board.
     */
    async getBoardNameByIndex(index: number): Promise<string> {
        return await this.boardNamesTds.nth(index).innerText();
    }
}
