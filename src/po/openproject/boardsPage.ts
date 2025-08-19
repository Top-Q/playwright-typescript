import { BaseComponent, BasePage, BoardTypePage } from '../../../internals';
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

    readonly deleteButton: Locator;

       
    constructor(protected readonly page: Page, protected readonly locator: Locator) {
        super(page, locator);
        this.name = this.rootComponent.getByRole('cell').nth(0).describe('Name of the board');
        this.boardType = this.rootComponent.getByRole('cell').nth(1).describe('Type of the board');
        this.createdOn = this.rootComponent.getByRole('cell').nth(2).describe('Creation date of the board');
        this.deleteButton = this.rootComponent.getByRole('button', { name: 'Delete' }).describe('Delete button for the board');
    }

    /**
     * Clicks the delete button for the board.
     * This method will trigger a dialog to confirm the deletion.
     * The dialog will be automatically accepted by the test framework.
     */
    async clickDeleteButton(): Promise<void> {
        await this.deleteButton.click();
    }

}

/**
 * # Board Table Component Class
 * This class represents a table component that displays a list of boards in the OpenProject application.
 * It provides methods to interact with the rows of the table.
 */
export class BoardTableComp extends BaseComponent {
    constructor(protected readonly page: Page, protected readonly locator: Locator) {
        super(page, locator);
    }

    /**
     * Get a board table row by its index. This method returns an instance of the BoardTableRowComp class,
     * 
     * @param index - The index of the row to retrieve.
     * @returns BoardTableRowComp - An instance of the BoardTableRowComp class representing the row at the specified index.
     */
    async getRowByIndex(index: number): Promise<BoardTableRowComp> {
        const rowLocator = this.locator.locator('tbody tr').nth(index);
        return new BoardTableRowComp(this.page, rowLocator);
    }

    /**
     * Get the row of the board by its name.
     * This method returns an instance of the BoardTableRowComp class.
     * @param boardName 
     * @returns 
     */
    async getRowByBoardName(boardName: string, index: number = 0): Promise<BoardTableRowComp> {
        const rowLocator = this.locator.locator('tbody tr').filter({ hasText: boardName });
        if (await rowLocator.count() === 0) {
            throw new Error(`No row found with board name: ${boardName}`);
        }
        if (index >= await rowLocator.count()) {
            throw new Error(`Index ${index} is out of bounds for board name: ${boardName}`);
        }
        return new BoardTableRowComp(this.page, rowLocator.nth(index));
    }

    async getRowCount(): Promise<number> {
        return await this.locator.locator('tbody tr').count();
    }   

}

/**
 * # Boards Page Class
 * This class represents the boards list page in the OpenProject application.
 * Users can view, create, and delete boards from this page.
 */
export class BoardsPage extends BasePage {

    readonly createNewBoardButton: Locator;
    readonly boardNamesTds: Locator;
    readonly deleteButtons: Locator;
    readonly boardTableRoot: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.createNewBoardButton = page.locator('.toolbar-items [title="Create new board"]')
            .describe('Button to create a new board');
        this.boardNamesTds = page.locator('table.generic-table td.name > a')
            .describe('List of board names');
        this.deleteButtons = page.locator("button[title='Delete']")
            .describe('Delete buttons for boards');
        this.boardTableRoot = page.locator('table.generic-table')
            .describe('Root locator for the board table');
    }

    async waitForPageToLoad() {        
        await this.boardTableRoot.waitFor({ state: 'visible' });
    }


    /**
     * Returns the board table component on the boards page.
     * The board table contains rows of boards with their details.
     * * This method is useful for interacting with the board list, such as retrieving board names or deleting boards.
     * 
     * @returns A BoardTableComp instance representing the board table on the page.
     */
    async boardTable(): Promise<BoardTableComp> {
        return new BoardTableComp(this.page, this.boardTableRoot);
    }
    /**
     * Clicks the button to create a new board.
     * This will navigate the user to the board type selection page.
     * The user will usually select board type
     */
    async clickCreateBoardButton(): Promise<BoardTypePage> {
        await this.createNewBoardButton.click();
        return new BoardTypePage(this.page);
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
