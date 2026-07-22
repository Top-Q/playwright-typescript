import { BasePage, NewBoardPage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Type Page Class
 * This class represents the "Create new board" form page in the OpenProject application.
 * Users fill in a title, choose the board type (Basic is pre-selected), and click Create.
 *
 * @aliases CreateBoardPage, NewBoardFormPage
 * @url /projects/:projectId/boards/new
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
     * Fills in the board name on the creation form.
     *
     * @aliases setBoardName, fillTitle, enterBoardName
     * @prerequisites The board creation form is open
     * @observable-state The Title field contains the given name
     * @param name - The name to set for the new board.
     */
    async fillBoardName(name: string): Promise<void> {
        await this.titleTextbox.fill(name);
    }

    /**
     * Clicks the Create button to create a Basic board (the pre-selected type)
     * and returns the resulting board view page.
     *
     * @aliases createBasicBoard, selectBasicBoardType, submitBoardForm
     * @prerequisites The board creation form is open and the title has been filled
     * @observable-state The board is created and the browser navigates to the new board's view
     * @returns A `NewBoardPage` for the newly created board.
     * @example
     * ```ts
     * await boardTypePage.fillBoardName('My Board');
     * const boardPage: NewBoardPage = await boardTypePage.clickBasicBoardButton();
     * ```
     */
    async clickBasicBoardButton(): Promise<NewBoardPage> {
        await this.createButton.click();
        return await new NewBoardPage(this.page).waitForLoad();
    }
}
