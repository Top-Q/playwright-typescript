import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';
/**
 *  # Overview Page Class
 * This class represents the overview page of the OpenProject application.
 * It includes a sidebar for navigation, a filter button, and a text box for filtering items.
 * It also includes other sections that are not mapped to specific components. Such as *WELCOME*, *GETTING STARTED*, *NEW FEATURES* and more. 
 */
export class OverviewPage extends BasePage {

    /**
    * ## Example Usage
    * ```typescript
    * await overviewPage.menuSidebarContainer.getByText('Work Packages').click();
    * ```
    */
    menuSidebarContainer: Locator;

    /**
    * ## Navigation
    * - Opens the filter options dialog and allows to fill the `filterByTextTextBox` to filter the results table.
    *
    * ## Example Usage
    * ```typescript
    * await overviewPage.activateFilterButton.click();
    * ```
    */
    activateFilterButton: Locator;

    /**
    *
    * ## Example Usage
    * ```typescript
    * await overviewPage.filterByTextTextBox.fill('My new task');
    * ```
    */
    filterByTextTextBox: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.menuSidebarContainer = this.page.locator('#menu-sidebar span.ellipsis').describe('Menu sidebar menu');
        this.activateFilterButton = this.page.getByRole('button', { name: 'Activate filter' }).describe('Activate filter button');
        this.filterByTextTextBox = this.page.getByRole('textbox', { name: 'Filter by text' }).describe('Filter by text text box');  
    }
}
