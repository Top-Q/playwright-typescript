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
    private readonly lists: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // One `<board-list>` Angular element per list, in board order. It has no
        // ARIA role, so it is matched by tag
        // (`frontend/src/app/features/boards/board/board-list/board-list.component.html`).
        this.lists = page.locator('board-list').describe('Board lists');
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
        return new ListComp(this.page, this.lists.nth(index));
    }

    /**
     * Returns the title of every list on the board, in board order.
     *
     * A new Basic board already has one list, "Unnamed list"
     * (`modules/boards/app/services/boards/basic_board_create_service.rb:8`),
     * so this is never empty for a board that has not had lists deleted.
     *
     * @aliases getListNames, listTitles, getColumns, getColumnNames
     * @prerequisites The board view is open and has at least one list
     * @observable-state None — read-only query
     * @returns The list titles, left to right.
     */
    async getListTitles(): Promise<string[]> {
        await this.lists.first().waitFor();
        const titles: string[] = [];
        for (let i = 0; i < (await this.lists.count()); i++) {
            titles.push(await this.getListByIndex(i).title.inputValue());
        }
        return titles;
    }

    /**
     * Reloads the board, so it shows what the server saved rather than what
     * the page last rendered.
     *
     * @aliases refresh, reloadBoard, refreshBoard
     * @prerequisites The board view is open
     * @observable-state The board is rendered afresh from the server
     * @returns The reloaded `NewBoardPage`.
     */
    async reload(): Promise<NewBoardPage> {
        await this.page.reload();
        return await new NewBoardPage(this.page).waitForLoad();
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
     * Clicks "Add list to board", waits for the new list, and returns it.
     *
     * The new list is **appended** — it is not the board's first list. A new
     * Basic board already has a default list at index 0, so a caller that
     * adds a list and then works on index 0 is editing the default list, not
     * the one it added (`addList` → `BoardListsService.addQuery`,
     * `board-list-container.component.html:43-47`,
     * `board-lists.service.ts:77-96`; appending verified live).
     *
     * @aliases addList, addListToBoard, createList
     * @prerequisites The board view is open
     * @observable-state A new list titled "Unnamed list" is appended to the board
     * @returns A `ListComp` for the new list.
     * @example
     * ```typescript
     * const list: ListComp = await newBoardPage.clickAddListToBoardLink();
     * await list.fillListName('Backlog');
     * ```
     */
    async clickAddListToBoardLink(): Promise<ListComp> {
        await this.lists.first().waitFor();
        const before = await this.lists.count();
        await this.addListToBoardLink.click();
        await this.lists.nth(before).waitFor();
        return this.getListByIndex(before);
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
