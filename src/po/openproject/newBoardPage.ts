import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Page Class
 * This class represents the new board page in the OpenProject application, where users can create and manage boards.
 * It includes lists of work items, each list representing a stage in the workflow.
 * Users can add lists to the board and set the board name. They can also add tasks to the lists.
 */
export class BoardPage extends BasePage {
    
    /**
     *
     * ## Example Usage
     * ```typescript
     * await newBoardPage.boardNameTextbox.fill('My Board Name');
     * const boardName = await newBoardPage.boardNameTextbox.textContent(); // to get the current value
     * await expect(newBoardPage.boardNameTextbox).toHaveText('My Board Name');
     * ```
     */
    boardNameTextbox: Locator;
    
    /**
     *
     * ## Example Usage
     * There can be multiple lists on a board, each with a name.
     * Use the `nth()` method to access a specific list by its index. or use the `getByText` method to find a list by its name.
     * 
     * *Important* The first list name is the board name, and subsequent names are for the lists on the board. So if you want to access the first
     * list name, you need to use 'nth(1)'.
     * *important* When new board is create, there is only one list in the page. It is called 'Unnamed list'.
     * *important* To set the borad name, you need to click 'enter' after filling the name.   
     * 
     * ```typescript
     * await newBoardPage.listName.nth(1).fill('My List Name');
     * await page.keyboard.press('Enter'); // to save the name
          
     * // or
     * await newBoardPage.listName.getByText('My List Name').fill('Updated List Name');
     * await page.keyboard.press('Enter'); // to save the name
     * ```
     */
    listNameTextbox: Locator;


    /**
     * ## Example Usage
     * ```typescript
     * await newBoardPage.addListToBoard.click();
     * ```
     */
    addListToBoardLink: Locator;

    /**
     * ## Usage
     * Used to go back to the boards list page `BoardsPage`.
     * 
     * ## Example Usage
     * 
     * ```typescript
     * await newBoardPage.boardsLink.click();
     * let boardsPage = new BoardsPage(page);
     * ```     
     */
    boardsLink: Locator;
 
    constructor(public readonly page: Page) {
        super(page);
        
        this.listNameTextbox = page.getByPlaceholder("Name of this view")
            .describe('List name textbox');
        
        this.addListToBoardLink = page.getByText('Add list to board')
            .describe('Add list to board link');
        
        // Assuming the first list name is the board name
        this.boardNameTextbox = this.listNameTextbox.first()
            .describe("Board name textbox");

        this.boardsLink = page.getByRole('link', { name: 'Boards' })
            .describe('Link to the boards list page');
        
        
    }

    
}
