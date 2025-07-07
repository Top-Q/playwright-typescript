import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * This page lists all boards in the current project and allows to select boards and add new boards.
 */
export class BoardsPage extends BasePage {
    /**
     * ## Purpose
     * Creates a new board button on the boards page.
     *
     * ## Available Actions
     * - Click
     * - Get value
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
     * ## Purpose
     * Locator for the boards table on the boards page.
     * 
     * ## Available Actions
     * - Get text
     * - Click (on child elements)
     * 
     * ## Navigation
     * - Navigate to `BoardPage` when clicked
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
 
    constructor(public readonly page: Page) {
        super(page);
        // Add your locators here
        this.createNewBoardButton = page.locator('.toolbar-items [title="Create new board"]');
        this.boardNamesTds = page.locator('table.generic-table td.name');
    }

}
