import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';

/**
 * # Board Type Page Class
 * This class represents the board type selection page in the OpenProject application, Users can choose the type of board they want to create.
 * The available board types are Basic, Assignee, Subproject, Status, Version and Parent-child.
 */
export class BoardTypePage extends BasePage {

    private readonly basicBoardButton: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.basicBoardButton = page.getByRole('button', { name: 'Basic Start from scratch with a blank board' });
    }

    async clickBasicBoardButton(): Promise<void> {
        await this.basicBoardButton.click();
    }
}
