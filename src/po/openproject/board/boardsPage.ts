import { BaseComponent, BasePage, BoardTypePage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Table Row Component Class
 * This class represents a row in the board table on the boards page in the OpenProject application.
 * It provides methods to interact with the board's details such as name, type, creation date, and delete button.
 */
export class BoardTableRowComp extends BaseComponent {

    /**
     * Locator for the name of the board.
     */
    readonly name: Locator;

    readonly boardType: Locator;

    readonly createdOn: Locator;

    private readonly deleteButton: Locator;


    constructor(protected readonly page: Page, protected readonly locator: Locator) {
        super(page, locator);
        this.name = this.rootComponent.getByRole('cell').nth(0).describe('Name of the board');
        this.boardType = this.rootComponent.getByRole('cell').nth(1).describe('Type of the board');
        this.createdOn = this.rootComponent.getByRole('cell').nth(2).describe('Creation date of the board');
        this.deleteButton = this.rootComponent.locator('[title="Delete"]').describe('Delete link for the board');
    }

    /**
     * ## Description
     * Clicks the delete button for the board.
     * 
     * ## Method Aliaes
     * ```ts
     * clickDeleteButton();
     * clickDelete();
     * ```
     * ----
     * 
     * ## Expected Result
     * * The board is deleted from the boards page.
     * * The deletion is confirmed automatically through a dialog.
     * 
     */
    async clickDeleteButtonAndAcceptDeletion(): Promise<void> {
        const boardsPageUrl = this.page.url();
        this.page.once('dialog', async dialog => {
            await dialog.accept();
        });
        // Wait for the DELETE request to complete before navigating away.
        // Turbo follows the 302 redirect as DELETE → 404, so we navigate back manually.
        const deleteResponse = this.page.waitForResponse(
            response => response.request().method() === 'DELETE' && response.status() === 302
        );
        await this.deleteButton.click();
        await deleteResponse;
        await this.page.goto(boardsPageUrl);
    }

}

/**
 * # Board Table Component Class
 * This class represents a table component that displays a list of boards in the OpenProject application.
 * It provides methods to interact with the rows of the table.
 */
export class BoardTableComp extends BaseComponent<BoardTableComp> {

    readonly nameColumnHeader: Locator

    constructor(protected readonly page: Page, protected readonly rootLocator: Locator) {
        super(page, rootLocator);
        this.nameColumnHeader = this.rootComponent.getByText('Name', { exact: true });
    }

    async waitForLoad(): Promise<BoardTableComp> {
        await this.nameColumnHeader.waitFor();
        return this;
    }

    /**
     * ## Description
     * Refreshes the board table by reloading the page.
     * This method is useful to ensure that the latest data is displayed in the table.
     * For example, after deleting a board, you might want to refresh the table to see the changes.
     * 
     * ---
     * ## Aliases
     * 
     * waitForTableToLoad();
     * 
     * ---
     * 
     * 
     * ## Example usage:
     * 
     * ```typescript
     * await boardTable.refresh();
     * await expect(boardTable.isRowForTableWithNameExists(boardName)).resolves.toBeFalsy();     
     * ```
     */
    async refresh(): Promise<void> {
        await this.page.reload();
    }

    /**
     * ## Description
     * Returns the number of rows in the board table. That is actually the number of boards in the table.
     * 
     * ## Aliases
     * ```ts
     * getRowCount();
     * getNumberOfBoards();
     * ```
     * 
     * @returns 
     */
    async getNumberOfRows(): Promise<number> {
        await this.page.waitForLoadState('domcontentloaded');
        // When all boards are deleted, the table disappears entirely.
        const tableCount = await this.rootLocator.count();
        if (tableCount === 0) {
            return 0;
        }
        await this.nameColumnHeader.waitFor();
        const numOfRows: number = await this.rootLocator.locator('tbody tr').count();
        if (numOfRows === 1) {
            if (await this.rootLocator.getByText('No visible results to display.').count() > 0) {
                // If there is only one row and it says "No visible results to display", then
                // there are no boards in the table.
                return 0;
            }
        }
        return numOfRows;
    }

    /**
     * Get a board table row by its index. This method returns an instance of the BoardTableRowComp class,
     * 
     * @param index - The index of the row to retrieve.
     * @returns BoardTableRowComp - An instance of the BoardTableRowComp class representing the row at the specified index.
     */
    async getRowByIndex(index: number): Promise<BoardTableRowComp> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator.locator('tbody tr').nth(index);
        return new BoardTableRowComp(this.page, rowLocator);
    }

    /**
     * ## Description
     * Checks if a row for the board with the specified name exists in the table.
     * 
     * ## Aliases
     * ```ts
     * isBoardVisible(boardName: string);
     * isRowForTableWithNameExists(boardName: string);
     * ```
     * 
     * @param boardName - The name of the board to check for.
     * @returns A promise that resolves to true if the row exists, false otherwise.
     */
    async isRowForTableWithNameExists(boardName: string): Promise<boolean> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator.locator('tbody tr').filter({ hasText: boardName });
        return await rowLocator.count() > 0;
    }

    /**
     * Get the row of the board by its name.
     * This method returns an instance of the BoardTableRowComp class.
     * @param boardName 
     * @returns 
     */
    async getRowByBoardName(boardName: string, index: number = 0): Promise<BoardTableRowComp> {
        await this.page.waitForLoadState('domcontentloaded');
        await this.nameColumnHeader.waitFor();
        await this.page.waitForTimeout(1000); // Ensure the table is fully loaded
        const rowLocator = this.rootLocator.locator('tbody tr').filter({ hasText: boardName });
        if (await rowLocator.count() === 0) {
            throw new Error(`No row found with board name: ${boardName}`);
        }
        if (index >= await rowLocator.count()) {
            throw new Error(`Index ${index} is out of bounds for board name: ${boardName}`);
        }
        return new BoardTableRowComp(this.page, rowLocator.nth(index));
    }

    async getRowCount(): Promise<number> {
        return await this.rootLocator.locator('tbody tr').count();
    }

}

/**
 * # Boards Page Class
 * This class represents the boards list page in the OpenProject application.
 * Users can view, create, and delete boards from this page.
 */
export class BoardsPage extends BasePage<BoardsPage> {

    readonly createNewBoardButton: Locator;
    readonly boardNamesTds: Locator;
    readonly deleteButtons: Locator;
    readonly boardTableRoot: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.createNewBoardButton = page.locator('#add-board-button[aria-label="Create new board"]')
            .describe('Button to create a new board');
        this.boardNamesTds = page.locator('table.generic-table td.name > a')
            .describe('List of board names');
        this.deleteButtons = page.locator("button[title='Delete']")
            .describe('Delete buttons for boards');
        this.boardTableRoot = page.locator('table.generic-table')
            .describe('Root locator for the board table');
    }

    async waitForLoad(): Promise<BoardsPage> {
        await this.createNewBoardButton.waitFor();
        return this;
    }

    /**
     * Returns the board table component on the boards page.
     * The board table contains rows of boards with their details.
     * * This method is useful for interacting with the board list, such as retrieving board names or deleting boards.
     * 
     * @returns A BoardTableComp instance representing the board table on the page.
     */
    boardTable(): BoardTableComp {
        return new BoardTableComp(this.page, this.boardTableRoot);
    }
    /**
     * Clicks the button to create a new board.
     * This will navigate the user to the board type selection page.
     * The user will usually select board type
     * 
     * Example usage:
     * ```typescript
     *       const boardTypePage = await boardsPage.clickCreateBoardButton();
     *       const boardPage: BoardPage = await boardTypePage.clickBasicBoardButton();
     *       await boardPage.fillBoardName('Automated board');
     * ```
     * 
     */
    async clickCreateBoardButton(): Promise<BoardTypePage> {
        await this.createNewBoardButton.click();
        return await new BoardTypePage(this.page).waitForLoad();
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
