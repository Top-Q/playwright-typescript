import { BasePage, NewBoardPage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Type Page Class
 * This class represents the board type selection page in the OpenProject application.
 * Users can choose the type of board they want to create.
 */
export class BoardTypePage extends BasePage<BoardTypePage> {

    private readonly basicBoardButton: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.basicBoardButton = page.getByRole('button', { name: 'Basic Start from scratch with a blank board' })
            .describe('Button to select the Basic board type');
    }

    async waitForLoad(): Promise<BoardTypePage> {
        await this.basicBoardButton.waitFor();
        return this;
    }

   /**
    *
    * ## Method Aliases
    * - Aliases
    * ```ts
    * createBasicBoard();
    * selectBasicBoardType();
    * ```
    *
    * ## Example Usage
    * ```ts
    * const boardPage: NewBoardPage = await boardTypePage.clickBasicBoardButton();
    * ```
    * ## Expected Result
    * - New Board Page is returned after clicking the Basic board button.
    */
    async clickBasicBoardButton(): Promise<NewBoardPage> {
        await this.basicBoardButton.click();
        return new NewBoardPage(this.page);
    }
}
