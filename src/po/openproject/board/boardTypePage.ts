import { BasePage, NewBoardPage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Type Page Class
 * This class represents the "Create new board" form page in the OpenProject application.
 * Users fill in a title, choose the board type (Basic is pre-selected), and click Create.
 */
export class BoardTypePage extends BasePage<BoardTypePage> {

    private readonly createButton: Locator;
    private readonly titleTextbox: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.createButton = page.getByRole('button', { name: 'Create' })
            .describe('Button to submit the new board creation form');
        this.titleTextbox = page.getByRole('textbox', { name: 'Title*' })
            .describe('Title input for the new board');
    }

    async waitForLoad(): Promise<BoardTypePage> {
        await this.createButton.waitFor();
        return this;
    }

    /**
     * ## Description
     * Fills in the board name on the creation form.
     *
     * @param name - The name to set for the new board.
     */
    async fillBoardName(name: string): Promise<void> {
        await this.titleTextbox.fill(name);
    }

    /**
     * ## Description
     * Clicks the Create button to create a Basic board (pre-selected by default)
     * and returns the resulting board view page.
     *
     * ## Method Aliases
     * ```ts
     * createBasicBoard();
     * selectBasicBoardType();
     * ```
     *
     * ## Example Usage
     * ```ts
     * await boardTypePage.fillBoardName('My Board');
     * const boardPage: NewBoardPage = await boardTypePage.clickBasicBoardButton();
     * ```
     * ## Expected Result
     * - New Board Page is returned after clicking the Create button.
     */
    async clickBasicBoardButton(): Promise<NewBoardPage> {
        await this.createButton.click();
        return await new NewBoardPage(this.page).waitForLoad();
    }
}
