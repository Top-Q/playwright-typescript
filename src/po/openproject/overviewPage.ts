import { BasePage } from '../../../internals';
import { Locator, Page } from '@playwright/test';
import { MainMenuComp } from './MainMenuComp';
export class OverviewPage extends BasePage {

    private readonly menuSidebarContainer: Locator;
    private readonly activateFilterButton: Locator;
    private readonly filterByTextTextBox: Locator;

    constructor(public readonly page: Page) {
        super(page);
        this.menuSidebarContainer = this.page.locator('#menu-sidebar span.ellipsis');
        this.activateFilterButton = this.page.getByRole('button', { name: 'Activate filter' });
        this.filterByTextTextBox = this.page.getByRole('textbox', { name: 'Filter by text' });  
    }


    mainMenu(): MainMenuComp {
        return new MainMenuComp(this.page);
    }

    async clickActivateFilterButton(): Promise<void> {
        await this.activateFilterButton.click();
    }

    async fillFilterByText(text: string): Promise<void> {
        await this.filterByTextTextBox.fill(text);
    }
}
