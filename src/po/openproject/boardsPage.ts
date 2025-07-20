import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * This page lists all boards in the current project and allows to select boards and add new boards.
 * Boards are used to organize work items in a project in a canban style.
 * It include lists of work items, each list representing a stage in the workflow.
 */
export class BoardsPage extends BasePage {
    /**
     *
     * ## Navigation
     * - Navigate to `BoardPage` when clicked
     *
     * ## Example Usage
     * ```typescript
     * await boardsPage.createNewBoardButton.click();
     * 
     * ```
     */
    createNewBoardButton: Locator;

    /**
     * 
     * ## Example Usage
     * 
     * ```typescript
     * await boardsPage.boardNamesTds.getByText('Board Name').click();
     * // or
     * await boardsPage.boardNamesTds.first().click();
     * 
     * // Count the number of boards
     * const boardCount = await boardsPage.boardNamesTds.count();
     * ```
     */
    boardNamesTds: Locator;

    /**
     * ## Usage 
     * Used to delete boards from the list.  
     * This locator finds all delete buttons in each row in the boards table.
     * After clicking a delete button, a confirmation dialog will appear and the user must confirm the deletion.
     * 
     * ## Example Usage
     * 
     * ```typescript
     *  const dialogPromise = page.waitForEvent('dialog');
     *  await boardsPage.deleteButtons.first().click();
     *  const dialog = await dialogPromise;
     *  await dialog.accept();
     * 
     * // or to delete all boards
     * page.on('dialog', dialog => dialog.accept());
     * while (await boardsPage.deleteButtons.count() > 0) {
     *     await boardsPage.deleteButtons.first().click(); 
     * }
     * ```
     */
    deleteButtons: Locator;
 
    constructor(public readonly page: Page) {
        super(page);
        // Add your locators here
        this.createNewBoardButton = page.locator('.toolbar-items [title="Create new board"]')
            .describe('Create new board button');
        this.boardNamesTds = page.locator('table.generic-table td.name > a').describe('Board names in the boards list');
        // this.deleteButtons = page.getByRole('button', { name: 'Delete' }).describe('Delete buttons in each row in the borads table');    
        this.deleteButtons = page.locator("button[title='Delete']").describe('Delete buttons in each row in the borads table');    
    }

}
