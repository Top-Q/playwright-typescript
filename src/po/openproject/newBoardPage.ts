import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Page Class
 * This class represents the new board page in the OpenProject application.
 * Users can create and manage boards, including adding lists and setting the board name.
 */
export class BoardPage extends BasePage {

    private readonly boardNameTextbox: Locator;
    private readonly listNameTextbox: Locator;
    private readonly addListToBoardLink: Locator;
    private readonly boardsLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.listNameTextbox = page.getByPlaceholder("Name of this view")
            .describe('Textbox for entering the name of a list');
        this.addListToBoardLink = page.getByText('Add list to board')
            .describe('Link to add a new list to the board');
        this.boardNameTextbox = this.listNameTextbox.first()
            .describe('Textbox for entering the board name');
        this.boardsLink = page.getByRole('link', { name: 'Boards' })
            .describe('Link to navigate back to the boards list page');
    }

    /**
     * Fills the board name textbox with the provided name.
     * @param name - The name to set for the board.
     */
    async fillBoardName(name: string): Promise<void> {
        await this.boardNameTextbox.fill(name);
    }

    /**
     * Clicks the link to add a new list to the board.
     */
    async clickAddListToBoard(): Promise<void> {
        await this.addListToBoardLink.click();
    }

    /**
     * Clicks the link to navigate back to the boards list page.
     */
    async clickBoardsLink(): Promise<void> {
        await this.boardsLink.click();
    }

    /**
     * Checks if the board name is visible and matches the provided name.
     * @param name - The name to check for.
     * @returns True if the board name is visible and matches, false otherwise.
     */
    async isBoardNameVisible(name: string): Promise<boolean> {
        return await this.boardNameTextbox.isVisible() && (await this.boardNameTextbox.inputValue()) === name;
    }
}
