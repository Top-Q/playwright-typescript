import { BaseComponent, BasePage, BoardsPage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # List Component Class
 * This class represents a list component within a board in the OpenProject application.
 */
export class ListComp extends BaseComponent {
    
    /**
     * Locator for the title of the list.
     * To assert the title value use the `toHaveValue` method.
     * 
     * @example
     * ```typescript
     * await expect(list.title).toHaveValue('Expected List Name');
     * ```
     */
    readonly title: Locator;

    constructor(protected readonly page: Page, protected readonly locator: Locator) {
        super(page, locator);
        this.title = this.rootComponent.locator('[name="editable-toolbar-title"]').describe('Title of the list');
    }

    /**
     * Set the name of the list.
     * 
     * @param name - The name to set for the list.
     */
    async fillListName(name: string): Promise<void> {
        await this.title.fill(name); // Fill the input field
        await this.title.press('Enter'); // Commit the input by pressing Enter
    }


}


/**
 * # New Board Page Class
 * 
 * ## Description
 * This class represents the new board page in the OpenProject application.
 * Users can create and manage boards, including adding lists and setting the board name.
 * 
 * ## Usage
 * * There is no need to save the board after filling the name, as it is automatically saved.
 * * Use the `clickBoardsLink` method to navigate back to the boards list page.
 */
export class NewBoardPage extends BasePage {

    private readonly boardNameTextbox: Locator;    
    private readonly addListToBoardLink: Locator;
    private readonly boardsLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.addListToBoardLink = page.getByText('Add list to board')
            .describe('Link to add a new list to the board');
        this.boardNameTextbox = page.getByPlaceholder("Name of this view").first()
            .describe('Textbox for entering the board name');
        this.boardsLink = page.getByRole('link', { name: 'Boards' })
            .describe('Link to navigate back to the boards list page');
    }

    /**
     * Get the list component by its index.
     * 
     * @param index - The index of the list to retrieve.
     * @returns ListComp - An instance of the ListComp class representing the list at the specified index.
     */
    getListByIndex(index: number): ListComp {
        const listLocator = this.page.locator("board-list").nth(index);
        return new ListComp(this.page, listLocator);
    }

    /**
     * Fills the board name textbox with the provided name.
     * @param name - The name to set for the board.
     */
    async fillBoardName(name: string): Promise<void> {
        await this.boardNameTextbox.fill(name);
        await this.boardNameTextbox.press('Enter'); // Commit the input by pressing Enter
    }

    /**
     * ## Description
     * 
     * Clicks the link to add a new list to the board.
     * 
     * ## Usage
     * Use this method to add a new list to the board being created.
     * You can then use the `getListByIndex` method to interact with the newly added list.
     * 
     * ## Aliases
     * ```ts     
     * clickAddListToBoardLink();
     * addList();
     * ```
     * 
     * ## Example
     * ```typescript
     * await newBoardPage.clickAddListToBoard();
     * let list: ListComp = newBoardPage.getListByIndex(0);
     * ```
     * ## Results
     * The new list will be added to the board, and you can interact with it.
     */
    async clickAddListToBoardLink(): Promise<void> {
        await this.addListToBoardLink.click();
    }

    /**
     * ## Description
     * Clicks the link to navigate back to the boards list page.
     * 
     * ## Aliases
     * clickBackToBoardsPage()
     * 
     * ## Results
     * Return to the boards list page where all boards are displayed.
     * 
     * @returns BoardsPage - Returns an instance of the BoardsPage class after clicking the link.
     */
    async clickBoardsLink(): Promise<BoardsPage> {
        await this.boardsLink.click();
        return new BoardsPage(this.page);
    }

}
