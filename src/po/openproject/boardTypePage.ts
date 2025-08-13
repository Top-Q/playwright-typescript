import { BasePage, BoardPage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Type Page Class
 * This class represents the board type selection page in the OpenProject application.
 * Users can choose the type of board they want to create.
 */
export class BoardTypePage extends BasePage {

    private readonly basicBoardButton: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.basicBoardButton = page.getByRole('button', { name: 'Basic Start from scratch with a blank board' })
            .describe('Button to select the Basic board type');
    }

    /**
     * Clicks the button to select the Basic board type.
     */
    async clickBasicBoardButton(): Promise<BoardPage> {
        await this.basicBoardButton.click();
        return new BoardPage(this.page);
    }
}
