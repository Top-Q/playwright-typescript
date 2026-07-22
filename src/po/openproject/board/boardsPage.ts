import { BaseComponent, BasePage, BoardTypePage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Table Row Component Class
 * This class represents a row in the board table on the boards page in the OpenProject application.
 * It provides methods to interact with the board's details such as name, type, creation date, and delete button.
 *
 * @aliases BoardRow, BoardsTableRow
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
     * Clicks the delete link for this board and accepts the confirmation dialog.
     *
     * @aliases clickDeleteButton, clickDelete, deleteBoard
     * @prerequisites The boards list is displayed and this row's board exists
     * @observable-state The board's row is removed from the boards table; the
     * confirmation dialog is auto-accepted and the browser returns to the boards list
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
 *
 * @aliases BoardsTable, BoardList
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
     * Reloads the page so the board table shows the latest server-side data.
     * Useful after creating or deleting a board.
     *
     * @aliases waitForTableToLoad, reloadTable, refreshBoards
     * @prerequisites The boards page is open
     * @observable-state The page reloads and the board table re-renders with current data
     * @example
     * ```typescript
     * await boardTable.refresh();
     * await expect(boardTable.isRowForTableWithNameExists(boardName)).resolves.toBeFalsy();
     * ```
     */
    async refresh(): Promise<void> {
        await this.page.reload();
    }

    /**
     * Returns the number of rows in the board table, which is the number of boards.
     * Returns 0 both when the table is absent entirely (all boards deleted) and
     * when it renders a single "No visible results to display." placeholder row.
     *
     * @aliases getNumberOfBoards, countBoards, getBoardCount, getRowCount
     * @prerequisites The boards page is open
     * @observable-state None — read-only query
     * @returns The number of boards currently listed.
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
     * Gets a board table row by its zero-based index.
     *
     * @aliases getBoardByIndex, getRowAt
     * @prerequisites The boards page is open and the table has at least `index + 1` rows
     * @observable-state None — read-only query
     * @param index - The index of the row to retrieve.
     * @returns A `BoardTableRowComp` for the row at the specified index.
     */
    async getRowByIndex(index: number): Promise<BoardTableRowComp> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator.locator('tbody tr').nth(index);
        return new BoardTableRowComp(this.page, rowLocator);
    }

    /**
     * Checks whether a row for the board with the specified name exists in the table.
     *
     * @aliases isBoardVisible, hasBoardWithName, boardExists
     * @prerequisites The boards page is open
     * @observable-state None — read-only query
     * @param boardName - The name of the board to check for.
     * @returns True if a matching row exists, false otherwise.
     */
    async isRowForTableWithNameExists(boardName: string): Promise<boolean> {
        await this.nameColumnHeader.waitFor();
        const rowLocator = this.rootLocator.locator('tbody tr').filter({ hasText: boardName });
        return await rowLocator.count() > 0;
    }

    /**
     * Gets the row for a board by its name. When several boards share a name,
     * `index` selects which of the matches to return. Throws if no row matches,
     * or if `index` is out of bounds for the matches found.
     *
     * @aliases getBoardRowByName, findBoardByName
     * @prerequisites The boards page is open and a board with this name exists
     * @observable-state None — read-only query
     * @param boardName - The name of the board to look up.
     * @param index - Which match to return when the name is not unique. Defaults to 0.
     * @returns A `BoardTableRowComp` for the matching row.
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

}

/**
 * # Boards Page Class
 * This class represents the boards list page in the OpenProject application.
 * Users can view, create, and delete boards from this page.
 *
 * @aliases BoardsListPage, BoardOverviewPage
 * @url /projects/:projectId/boards
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
     * Returns the board table component on the boards page, used to read board
     * names, count boards, and reach individual rows for deletion.
     *
     * @aliases getBoardTable, table
     * @prerequisites The boards page is open
     * @observable-state None — returns a component wrapper without interacting
     * @returns A `BoardTableComp` for the board table on the page.
     */
    boardTable(): BoardTableComp {
        return new BoardTableComp(this.page, this.boardTableRoot);
    }
    /**
     * Clicks the "Create new board" button, opening the board creation form.
     *
     * @aliases createBoard, clickNewBoard, addBoard
     * @prerequisites The boards page is open
     * @observable-state Navigates to the combined board creation form (title, type, Create button)
     * @returns A `BoardTypePage` for the creation form.
     * @example
     * ```typescript
     * const boardTypePage = await boardsPage.clickCreateBoardButton();
     * const boardPage = await boardTypePage.clickBasicBoardButton();
     * await boardPage.fillBoardName('Automated board');
     * ```
     */
    async clickCreateBoardButton(): Promise<BoardTypePage> {
        await this.createNewBoardButton.click();
        return await new BoardTypePage(this.page).waitForLoad();
    }


    /**
     * Gets the name of a board by its position in the list.
     *
     * @aliases getBoardName, getBoardTitleByIndex
     * @prerequisites The boards page is open and the list has at least `index + 1` boards
     * @observable-state None — read-only query
     * @param index - The zero-based index of the board.
     * @returns The board's name.
     */
    async getBoardNameByIndex(index: number): Promise<string> {
        return await this.boardNamesTds.nth(index).innerText();
    }
}
