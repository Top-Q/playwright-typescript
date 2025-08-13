import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Page Class
 * This class represents the new board page in the OpenProject application, where users can create and manage boards.
 * It includes lists of work items, each list representing a stage in the workflow.
 * Users can add lists to the board and set the board name. They can also add tasks to the lists.
 */
export class BoardPage extends BasePage {

    private readonly boardNameTextbox: Locator;
    private readonly listNameTextbox: Locator;
    private readonly addListToBoardLink: Locator;
    private readonly boardsLink: Locator;

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

    async fillBoardName(name: string): Promise<void> {
        await this.boardNameTextbox.fill(name);
    }

    async clickAddListToBoard(): Promise<void> {
        await this.addListToBoardLink.click();
    }

    async clickBoardsLink(): Promise<void> {
        await this.boardsLink.click();
    }

    async isBoardNameVisible(name: string): Promise<boolean> {
        return await this.boardNameTextbox.isVisible() && (await this.boardNameTextbox.inputValue()) === name;
    }
}
