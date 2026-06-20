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
     * Checks if the filter is currently active. 
     * If active, there is no need to click the activate filter button again by clicking on the `clickActivateFilterButton`. 
     * Clickin on the button when the filter is already active will deactivate it.
     * 
     * @returns true if the filter is active, false otherwise.
     */
    async isFilterActive(): Promise<boolean> {
        return await this.activateFilterButton.isVisible();        
    }

    /**
     * ## Description
     * Clicks the activate filter button. Use the `isFilterActive` method to check if the filter is already active.
     * If the filter is not active, this method will activate it, otherwise it will deactivate it.
     *
     * 
     * ## Behavior
     * If the filter is already active, it will be deactivated.
     * 
     * ## Usage
     * 
     * ```typescript
     * if (!(await overviewPage.isFilterActive())) {
     *     await overviewPage.clickActivateFilterButton();
     * }
     * ```
     */
    async clickActivateFilterButton(): Promise<void> {
        await this.activateFilterButton.click();
    }

    /**
     * ## Description
     *
     * Fills the filter by text textbox with the provided text.
     * This will not work if the `clickActivateFilterButton` has not been clicked first.
     * @param text - The text to filter by.
     *
     * ## Behavior
     * Filling the textbox will trigger a query to the server to filter the results.
     * This will populate the results table with the filtered results.
     *
     * ## Usage
     * ```typescript
     * if (!(await overviewPage.isFilterActive())) {
     *     await overviewPage.clickActivateFilterButton();
     * }
     * await overviewPage.fillFilterByText('My Search Term');
     *
     */
    async fillFilterByText(text: string): Promise<void> {
        // Clear existing text. This is useful when re-applying the same filter.
        await this.filterByTextTextBox.fill(""); 
        const queryPromise = this.page.waitForResponse("**/queries/**");        
        await this.filterByTextTextBox.fill(text);
        await queryPromise;
    }

}
