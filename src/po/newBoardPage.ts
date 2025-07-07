import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

export class BoardPage extends BasePage {
    
    /**
     * ## Purpose
     * Locator for the board name textbox.
     *
     * ## Available Actions
     * - Fill
     * - Get value
     *
     * ## Example Usage
     * ```typescript
     * await newBoardPage.boardNameTextbox.fill('My Board Name');
     * ```
     */
    boardNameTextbox: Locator;
    
    /**
     * ## Purpose
     * Locator for the board list names.
     *
     * ## Available Actions
     * - Fill
     * - Get value
     *
     *
     * ## Example Usage
     * There can be multiple lists on a board, each with a name.
     * Use the `nth()` method to access a specific list by its index. or use the `getByText` method to find a list by its name.
     * *Important* The first list name is the board name, and subsequent names are for the lists on the board. So if you want to access the first
     * list name, you need to use 'nth(1)'.
     * *important* When new board is create, there is only one list in the page. It is call 'Unamed list'.
     * 
     * 
     * ```typescript
     * await newBoardPage.listName.nth(1).fill('My List Name');
          
     * // or
     * await newBoardPage.listName.getByText('My List Name').fill('Updated List Name');
     * ```
     */
    listNameTextbox: Locator;


    /**
     * ## Purpose
     * Locator for the button to add a list to the board.
     *
     * ## Available Actions
     * - Click
     *
     * ## Example Usage
     * ```typescript
     * await newBoardPage.addListToBoard.click();
     * ```
     */
    addListToBoardLink: Locator;
 
    constructor(public readonly page: Page) {
        super(page);
        // Add your locators here
        this.listNameTextbox = page.getByPlaceholder("Name of this view");
        this.addListToBoardLink = page.getByText('Add list to board');
        this.boardNameTextbox = page.getByText('Add list to board').first();
    }

    // Add your methods here
}
