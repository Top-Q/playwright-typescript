import { BaseComponent, BasePage, BoardsPage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # List Component Class
 * This class represents a list component within a board in the OpenProject application.
 *
 * @aliases BoardList, BoardColumn
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
     * Sets the name of the list, committing the value with Enter.
     *
     * @aliases setListName, renameList, fillTitle
     * @prerequisites The list exists on the board
     * @observable-state The list's title shows the new name and the change is persisted
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
 * Represents the board view page in the OpenProject application, where users
 * manage a board by adding lists and setting the board name.
 *
 * Notable behaviours:
 * - The board saves automatically; there is no save action after setting the name.
 * - Use {@link NewBoardPage.clickBoardsLink} to navigate back to the boards list.
 *
 * @aliases BoardPage, BoardViewPage
 */
export class NewBoardPage extends BasePage<NewBoardPage> {

    private readonly boardNameTextbox: Locator;    
    private readonly addListToBoardLink: Locator;
    private readonly boardsLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.addListToBoardLink = page.getByText('Add list to board')
            .describe('Link to add a new list to the board');
        this.boardNameTextbox = page.getByPlaceholder("Name of this view").first()
            .describe('Textbox for entering the board name');
        this.boardsLink = page.locator('#content-body').getByRole('link', { name: 'Boards' })
            .describe('Breadcrumb link to navigate back to the boards list page');
    }

    async waitForLoad(): Promise<NewBoardPage> {
        await this.addListToBoardLink.waitFor();
        return this;
    }

    /**
     * Gets a list on the board by its zero-based index.
     *
     * @aliases getList, getListAt
     * @prerequisites The board view is open and has at least `index + 1` lists
     * @observable-state None — returns a component wrapper without interacting
     * @param index - The index of the list to retrieve.
     * @returns A `ListComp` for the list at the specified index.
     */
    getListByIndex(index: number): ListComp {
        const listLocator = this.page.locator("board-list").nth(index);
        return new ListComp(this.page, listLocator);
    }

    /**
     * Fills the board name textbox and commits the value with Enter.
     * The board saves automatically — no separate save action is needed.
     *
     * @aliases setBoardName, renameBoard
     * @prerequisites The board view is open
     * @observable-state The board title shows the new name and is persisted automatically
     * @param name - The name to set for the board.
     */
    async fillBoardName(name: string): Promise<void> {
        await this.boardNameTextbox.fill(name);
        await this.boardNameTextbox.press('Enter'); // Commit the input by pressing Enter
    }

    /**
     * Clicks the "Add list to board" link to append a new list to the board.
     * Reach the new list afterwards with {@link getListByIndex}.
     *
     * @aliases addList, addListToBoard, createList
     * @prerequisites The board view is open
     * @observable-state A new empty list is appended to the board and becomes interactable
     * @example
     * ```typescript
     * await newBoardPage.clickAddListToBoardLink();
     * const list: ListComp = newBoardPage.getListByIndex(0);
     * ```
     */
    async clickAddListToBoardLink(): Promise<void> {
        await this.addListToBoardLink.click();
    }

    /**
     * Clicks the breadcrumb link to navigate back to the boards list page.
     *
     * @aliases clickBackToBoardsPage, goBackToBoards, navigateToBoards
     * @prerequisites A board view is open
     * @observable-state The browser returns to the boards list page showing all boards
     * @returns A `BoardsPage` for the boards list.
     */
    async clickBoardsLink(): Promise<BoardsPage> {
        await this.boardsLink.click();
        return await new BoardsPage(this.page).waitForLoad();
    }

}
