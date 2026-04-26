import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { AgendaItemsComp } from './agendaItemsComp';
import { MeetingSidePanelComp } from './meetingSidePanelComp';

/**
 * Represents the meeting detail/show page at /projects/:id/meetings/:meeting_id.
 * Contains the meeting header with title and action menu,
 * an agenda items section, and a side panel with details/participants.
 */
export class MeetingShowPage extends BasePage<MeetingShowPage> {
    private readonly meetingTitle: Locator;
    private readonly headerActionTrigger: Locator;

    constructor(page: Page) {
        super(page);
        this.meetingTitle = page
            .getByRole('main')
            .getByRole('heading', { level: 2 })
            .first()
            .describe('Meeting title heading');
        this.headerActionTrigger = page
            .getByRole('button', { name: 'Meeting actions' })
            .describe('Meeting actions menu trigger');
    }

    async waitForLoad(): Promise<MeetingShowPage> {
        await this.page.waitForURL(/\/meetings\/\d+$/);
        await this.meetingTitle.waitFor();
        return this;
    }

    /** Get the meeting title text. */
    async getMeetingTitle(): Promise<string> {
        return (await this.meetingTitle.textContent()) ?? '';
    }

    /** Get the agenda items component for interacting with agenda items. */
    agendaItems(): AgendaItemsComp {
        return new AgendaItemsComp(this.page);
    }

    /** Get the side panel component for meeting details, state, and participants. */
    sidePanel(): MeetingSidePanelComp {
        return new MeetingSidePanelComp(this.page);
    }

    /** Open the header action menu (kebab). */
    async openHeaderActionMenu(): Promise<void> {
        await this.headerActionTrigger.click();
    }

    /**
     * Delete this meeting via the header action menu.
     * Opens menu, clicks Delete, confirms in the dialog.
     */
    async deleteMeeting(): Promise<void> {
        await this.openHeaderActionMenu();
        await this.page.getByRole('menuitem', { name: /delete/i }).click();
        await this.page
            .getByRole('button', { name: /delete/i })
            .last()
            .click();
    }

    /**
     * Close the meeting (change state from Draft/Open to Closed).
     * Uses the header action menu.
     */
    async closeMeeting(): Promise<void> {
        await this.openHeaderActionMenu();
        await this.page
            .getByRole('menuitem', { name: /close/i })
            .click();
    }
}
