import {BasePage} from '../../internals';
import { Locator, Page } from '@playwright/test';

export class HomePage extends BasePage {

    /**
     * ## Purpose
     * Locator for the "Select a project" link on the home page.
     *
     * ## Available Actions
     * - Click     
     *
     * ## Navigation
     * - Opens the project selection dialog and allows the user to select a project.
     *
     * ## Example Usage
     * ```typescript
     * await homePage.selectAProjectLink.click();
     * await homePage.selectAProjectLink.getByText('Project name').click();
     * ```
     */
    selectAProjectLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.selectAProjectLink = this.page.getByRole('link', { name: 'Select a project' });
    }


}