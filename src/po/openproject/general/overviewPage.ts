import { BasePage } from '../../../../internals';
import { Locator, Page } from '@playwright/test';
import { MainMenuComp } from './mainMenuComp';

/**
 * # Overview Page Class
 * This class represents the overview page in the OpenProject application.
 * It provides access to the main menu and filtering options.
 *
 * @aliases ProjectOverviewPage, ProjectHomePage
 * @url /projects/:projectId
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
     * Returns the project's main menu component, used to navigate between modules
     * (Work packages, Boards, Meetings, Members, Time and costs).
     *
     * @aliases getMainMenu, sidebar, menu
     * @prerequisites A project overview page is open
     * @observable-state None — returns a component wrapper without interacting
     * @returns A `MainMenuComp` for the project sidebar menu.
     */
    mainMenu(): MainMenuComp {
        return new MainMenuComp(this.page);
    }

    /**
     * Checks whether the filter is currently active. Guard calls to
     * {@link clickActivateFilterButton} with this — that button toggles, so
     * clicking it while the filter is already active deactivates it.
     *
     * @aliases isFilterEnabled, filterIsActive
     * @prerequisites The overview page is open
     * @observable-state None — read-only query
     * @returns True if the filter is active, false otherwise.
     */
    async isFilterActive(): Promise<boolean> {
        return await this.activateFilterButton.isVisible();        
    }

    /**
     * Toggles the filter panel. This does not unconditionally activate it — if
     * the filter is already active the click deactivates it, so guard the call
     * with {@link isFilterActive}.
     *
     * @aliases clickActivateFilter, toggleFilter, activateFilter
     * @prerequisites The overview page is open
     * @observable-state The filter panel toggles; when activated the "Filter by text" textbox becomes available
     * @example
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
     * Clears the "Filter by text" textbox, types the given text, and waits for
     * the resulting server query to complete before returning.
     *
     * @aliases filterByText, searchByText, applyTextFilter
     * @prerequisites The filter panel is active — call {@link clickActivateFilterButton} first
     * @observable-state The results table re-queries and shows only rows matching the text
     * @param text - The text to filter by.
     * @example
     * ```typescript
     * if (!(await overviewPage.isFilterActive())) {
     *     await overviewPage.clickActivateFilterButton();
     * }
     * await overviewPage.fillFilterByText('My Search Term');
     * ```
     */
    async fillFilterByText(text: string): Promise<void> {
        // Clear existing text. This is useful when re-applying the same filter.
        await this.filterByTextTextBox.fill(""); 
        const queryPromise = this.page.waitForResponse("**/queries/**");        
        await this.filterByTextTextBox.fill(text);
        await queryPromise;
    }

}
