import { Locator, Page } from '@playwright/test';

/**
 * Represents the agenda items list on the meeting show page.
 * The main content area contains agenda items and an "Add" split button.
 * Each agenda item shows a title, duration, and action menu.
 */
export class AgendaItemsComp {
    private readonly page: Page;
    private readonly contentArea: Locator;

    constructor(page: Page) {
        this.page = page;
        this.contentArea = page.getByRole('main').describe('Meeting content area');
    }

    /**
     * Add a new simple agenda item with the given title.
     * Clicks the Add button, selects "Simple" from the dropdown,
     * fills the title, and saves.
     */
    async addItem(title: string): Promise<void> {
        // Click the first "Add" button (main area, not backlog)
        const addButtons = this.contentArea.getByRole('button', { name: 'Add' });
        await addButtons.first().click();
        // Select "Agenda item" type from the dropdown
        await this.page.getByRole('menuitem', { name: /agenda item/i }).click();
        // Fill in the title in the inline form
        const titleInput = this.contentArea
            .getByRole('textbox')
            .first()
            .describe('Agenda item title input');
        await titleInput.waitFor();
        await titleInput.fill(title);
        // Save the agenda item
        const saveButton = this.contentArea.getByRole('button', { name: /save/i });
        if (await saveButton.isVisible()) {
            await saveButton.click();
        } else {
            await titleInput.press('Enter');
        }
        // Wait for the saved item to appear
        await this.contentArea.getByText(title).waitFor();
    }

    /** Get the count of agenda items on the page. */
    async getItemCount(): Promise<number> {
        return await this.contentArea.getByRole('listitem').count();
    }

    /** Check if an agenda item with the given title exists. */
    async hasItemWithTitle(title: string): Promise<boolean> {
        return await this.contentArea.getByText(title).isVisible();
    }
}
