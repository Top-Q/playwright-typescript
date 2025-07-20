import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Type Page Class
 * This class represents the board type selection page in the OpenProject application, Users can choose the type of board they want to create.
 * The available board types are Basic, Assignee, Subproject, Status, Version and Parent-child.
 */
export class BoardTypePage extends BasePage {
    
    /**
     * ## Navigation
     * - Open the `NewBoardPage` when clicked
     * 
     * ## Example Usage
     * 
     * ```typescript
     * await boardTypePage.basicBoardButton.click();
     * await boardTypePage.basicBoardButton.getByText('Basic').click();
     * ```
     * 
     */
    basicBoardButton: Locator;
 
    constructor(public readonly page: Page) {
        super(page);
        // Add your locators here
        this.basicBoardButton = page.getByRole('button', { name: 'Basic Start from scratch with a blank board' })
        .describe('Select basic board button');   
    }

}
