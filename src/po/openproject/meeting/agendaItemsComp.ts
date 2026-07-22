import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';

/**
 * Represents the agenda items list on the meeting show page.
 * Each agenda item shows a title, duration, and action menu.
 *
 * The root is the agenda list wrapper rendered by
 * `MeetingAgendaItems::ListComponent`, whose id comes from OpenProject's
 * `component_wrapper` helper (`name.underscore.tr('/', '-').tr('_', '-')`).
 *
 * The "Add" split button is deliberately **outside** this root: the meeting
 * show page renders it as a sibling row via `MeetingAgendaItems::NewButtonComponent`,
 * tagged `data-test-selector="meeting-main-add-button"`.
 *
 * @aliases AgendaComp, MeetingAgenda
 */
export class AgendaItemsComp extends BaseComponent<AgendaItemsComp> {
    private readonly addButtonRow: Locator;

    constructor(page: Page) {
        super(
            page,
            page
                .locator('#meeting-agenda-items-list-component')
                .describe('Agenda items list'),
        );
        this.addButtonRow = page
            .locator('[data-test-selector="meeting-main-add-button"]')
            .describe('Agenda "Add" split button row');
    }

    async waitForLoad(): Promise<AgendaItemsComp> {
        await this.rootComponent.waitFor();
        return this;
    }

    /**
     * Adds an agenda item with the given title: opens the "Add" split button,
     * picks "Agenda item" from the dropdown, fills the title, saves, and waits
     * for the saved item to render in the list.
     *
     * Saving falls back to pressing Enter when no Save button is visible.
     *
     * @aliases addAgendaItem, createAgendaItem, newAgendaItem
     * @prerequisites The meeting detail page is open and the meeting is not closed
     * @observable-state A new agenda item with this title appears in the agenda list
     * @param title - The agenda item title.
     */
    async addItem(title: string): Promise<void> {
        await this.addButtonRow.getByRole('button', { name: 'Add' }).click();
        // The dropdown renders in an overlay outside the agenda list.
        await this.page.getByRole('menuitem', { name: /agenda item/i }).click();
        const titleInput = this.rootComponent
            .getByRole('textbox')
            .first()
            .describe('Agenda item title input');
        await titleInput.waitFor();
        await titleInput.fill(title);
        const saveButton = this.rootComponent.getByRole('button', {
            name: /save/i,
        });
        if (await saveButton.isVisible()) {
            await saveButton.click();
        } else {
            await titleInput.press('Enter');
        }
        await this.rootComponent.getByText(title).waitFor();
    }

    /**
     * Returns the number of list items in the agenda list.
     *
     * @aliases countAgendaItems, getNumberOfItems
     * @prerequisites The meeting detail page is open
     * @observable-state None — read-only query
     * @returns The number of agenda list items.
     */
    async getItemCount(): Promise<number> {
        return await this.rootComponent.getByRole('listitem').count();
    }

    /**
     * Checks whether text matching the given title is visible in the agenda
     * list. Matches any text within the list, not only item titles.
     *
     * @aliases agendaItemExists, hasAgendaItem, isItemVisible
     * @prerequisites The meeting detail page is open
     * @observable-state None — read-only query
     * @param title - The agenda item title to look for.
     * @returns True if matching text is visible in the agenda list.
     */
    async hasItemWithTitle(title: string): Promise<boolean> {
        return await this.rootComponent.getByText(title).isVisible();
    }
}
