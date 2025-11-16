import { BasePage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';
import { MainMenuComp } from './mainMenuComp';

/**
 * # Overview Page Class
 * This class represents the overview page in the OpenProject application.
 * It provides access to the main menu and filtering options.
 */
export class OverviewPage extends BasePage<OverviewPage> {

    readonly menuSidebarContainer: Locator;
    readonly activateFilterButton: Locator;
    readonly filterByTextTextBox: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.menuSidebarContainer = this.page.locator('#menu-sidebar span.ellipsis')
            .describe('Sidebar menu container');
        this.activateFilterButton = this.page.getByRole('button', { name: 'Activate filter' })
            .describe('Button to activate the filter');
        this.filterByTextTextBox = this.page.getByRole('textbox', { name: 'Filter by text' })
            .describe('Textbox to filter by text');
    }

    async waitForLoad(): Promise<OverviewPage> {
        await this.menuSidebarContainer.first().waitFor();
        return this;
    }

    /**
     * Returns an instance of the MainMenuComp class.
     */
    mainMenu(): MainMenuComp {
        return new MainMenuComp(this.page);
    }

    /**
     * ## Description
     * Clicks the activate filter button.
     * 
     * ## Behavior
     * If the filter is already active, it will be deactivated.
     */
    async clickActivateFilterButton(): Promise<void> {
        await this.activateFilterButton.click();
    }

    /**
     * Fills the filter by text textbox with the provided text.
     * @param text - The text to filter by.
     */
    async fillFilterByText(text: string): Promise<void> {
        // Clear existing text. This is useful when re-applying the same filter.
        await this.filterByTextTextBox.fill(""); 
        const queryPromise = this.page.waitForResponse("**/queries/**");        
        await this.filterByTextTextBox.fill(text);
        await queryPromise;
    }

}
