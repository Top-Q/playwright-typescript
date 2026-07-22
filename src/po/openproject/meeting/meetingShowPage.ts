import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { AgendaItemsComp } from './agendaItemsComp';
import { MeetingSidePanelComp } from './meetingSidePanelComp';

/**
 * Represents the meeting detail/show page at /projects/:id/meetings/:meeting_id.
 * Contains the meeting header with title and action menu,
 * an agenda items section, and a side panel with details/participants.
 *
 * @aliases MeetingDetailPage, MeetingPage
 * @url /projects/:projectId/meetings/:meetingId
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

    /**
     * Returns the meeting's title from the page heading, or an empty string if
     * the heading has no text content.
     *
     * @aliases getTitle, meetingTitle
     * @prerequisites The meeting detail page is open
     * @observable-state None — read-only query
     * @returns The meeting title, or '' when the heading is empty.
     */
    async getMeetingTitle(): Promise<string> {
        return (await this.meetingTitle.textContent()) ?? '';
    }

    /**
     * Returns the agenda items component, used to add agenda items and assert
     * on the meeting's agenda.
     *
     * @aliases getAgendaItems, agenda
     * @prerequisites The meeting detail page is open
     * @observable-state None — returns a component wrapper without interacting
     * @returns An `AgendaItemsComp` for the agenda section.
     */
    agendaItems(): AgendaItemsComp {
        return new AgendaItemsComp(this.page);
    }

    /**
     * Returns the side panel component, covering meeting details (date, time,
     * duration, location), state controls, and participants.
     *
     * @aliases getSidePanel, detailsPanel
     * @prerequisites The meeting detail page is open
     * @observable-state None — returns a component wrapper without interacting
     * @returns A `MeetingSidePanelComp` for the side panel.
     */
    sidePanel(): MeetingSidePanelComp {
        return new MeetingSidePanelComp(this.page);
    }

    /**
     * Opens the meeting's header action ("kebab") menu, which holds the Delete
     * and Close actions.
     *
     * @aliases openActionMenu, openKebabMenu, clickMeetingActions
     * @prerequisites The meeting detail page is open
     * @observable-state The header action menu opens, exposing its menu items
     */
    async openHeaderActionMenu(): Promise<void> {
        await this.headerActionTrigger.click();
    }

    /**
     * Deletes this meeting end to end: opens the header action menu, clicks
     * Delete, and confirms in the dialog.
     *
     * Does not wait for or assert the resulting navigation, so callers that
     * need the meetings list should navigate to it explicitly.
     *
     * @aliases removeMeeting, deleteThisMeeting
     * @prerequisites The meeting detail page is open and the current user may delete the meeting
     * @observable-state The meeting is permanently deleted and no longer appears in the meetings list
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
     * Closes the meeting, moving its state from Draft/Open to Closed, via the
     * header action menu. Closing is not the same as deleting — the meeting
     * remains listed.
     *
     * @aliases closeThisMeeting, markMeetingClosed, setMeetingClosed
     * @prerequisites The meeting detail page is open and the meeting is not already closed
     * @observable-state The meeting's state becomes Closed and its agenda becomes read-only
     */
    async closeMeeting(): Promise<void> {
        await this.openHeaderActionMenu();
        await this.page
            .getByRole('menuitem', { name: /close/i })
            .click();
    }
}
