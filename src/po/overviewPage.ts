import { BasePage } from '../../internals';
import { Locator, Page } from '@playwright/test';

export class OverviewPage extends BasePage {

    /**
    * ## Purpose
    * Locator for the menu sidebar container on the overview page.
    *
    * ## Available Actions
    * - Click (on child elements)
    * - Get text
    *
    * ## Navigation
    * - Used to navigate to different sections from the sidebar
    *
    * ## Example Usage
    * ```typescript
    * await overviewPage.menuSidebarContainer.getByText('Work Packages').click();
    * ```
    */
    menuSidebarContainer: Locator;

    /**
    * ## Purpose
    * Locator for the "Activate filter" button on the overview page.
    *
    * ## Available Actions
    * - Click
    *
    * ## Navigation
    * - Opens the filter options dialog
    *
    * ## Example Usage
    * ```typescript
    * await overviewPage.activateFilterButton.click();
    * ```
    */
    activateFilterButton: Locator;

    /**
    * ## Purpose
    * Locator for the text box used to filter items by text on the overview page.
    *
    * ## Available Actions
    * - Fill
    * - Get value
    *
    * ## Navigation
    * - Used to filter the results table by text
    *
    * ## Example Usage
    * ```typescript
    * await overviewPage.filterByTextTextBox.fill('My new task');
    * ```
    */
    filterByTextTextBox: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.menuSidebarContainer = this.page.locator('#menu-sidebar span.ellipsis');
        this.activateFilterButton = this.page.getByRole('button', { name: 'Activate filter' });
        this.filterByTextTextBox = this.page.getByRole('textbox', { name: 'Filter by text' });  
    }
}
