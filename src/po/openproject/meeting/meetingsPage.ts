import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { MeetingShowPage } from './meetingShowPage';
import { MeetingFormDialogComp } from './meetingFormDialogComp';

/**
 * Represents the meetings list page at /projects/:id/meetings.
 * Shows meetings grouped by date with options to create, filter, and navigate.
 * The "New Meeting" button is a split button with a dropdown for one-time vs recurring.
 *
 * @aliases MeetingListPage, MeetingsListPage
 * @url /projects/:projectId/meetings
 */
export class MeetingsPage extends BasePage<MeetingsPage> {
    private readonly newMeetingButton: Locator;
    private readonly contentArea: Locator;
    private readonly upcomingTab: Locator;
    private readonly pastTab: Locator;

    constructor(page: Page) {
        super(page);
        this.newMeetingButton = page
            .getByRole('button', { name: 'New Meeting' })
            .describe('New Meeting button');
        this.contentArea = page
            .getByRole('main')
            .describe('Meetings content area');
        this.upcomingTab = page
            .getByRole('link', { name: 'Upcoming' })
            .describe('Upcoming meetings tab');
        this.pastTab = page
            .getByRole('link', { name: 'Past' })
            .describe('Past meetings tab');
    }

    async waitForLoad(): Promise<MeetingsPage> {
        await this.newMeetingButton.waitFor();
        return this;
    }

    /**
     * Clicks the "New Meeting" split button and selects "One-time" from its
     * dropdown, opening the meeting creation dialog.
     *
     * @aliases createOneTimeMeeting, newMeeting, openMeetingDialog
     * @prerequisites The meetings list page is open
     * @observable-state The create meeting dialog (#new-meeting-dialog) opens with empty title, location, date, time and duration fields
     * @returns A `MeetingFormDialogComp` for the open dialog.
     */
    async clickAddOneTimeMeeting(): Promise<MeetingFormDialogComp> {
        await this.newMeetingButton.click();
        await this.page.getByRole('menuitem', { name: /one-time/i }).click();
        return await new MeetingFormDialogComp(
            this.page,
            this.page.locator('#new-meeting-dialog'),
        ).waitForLoad();
    }

    /**
     * Clicks a meeting's title link to open its detail page.
     *
     * @aliases openMeeting, selectMeeting, goToMeeting
     * @prerequisites The meetings list page is open and a meeting with this title is listed in the current tab
     * @observable-state The browser navigates to the meeting detail page at `/meetings/:id`
     * @param title - The meeting title to open.
     * @returns A `MeetingShowPage` for the opened meeting.
     */
    async clickMeetingByTitle(title: string): Promise<MeetingShowPage> {
        await this.contentArea.getByRole('link', { name: title }).click();
        return await new MeetingShowPage(this.page).waitForLoad();
    }

    /**
     * Switches to the "Upcoming" meetings tab and waits for the page load.
     * Returns the same page instance rather than a fresh one.
     *
     * @aliases showUpcomingMeetings, viewUpcoming
     * @prerequisites The meetings list page is open
     * @observable-state The list reloads showing only meetings scheduled in the future
     * @returns This `MeetingsPage`.
     */
    async clickUpcomingTab(): Promise<MeetingsPage> {
        await this.upcomingTab.click();
        await this.page.waitForLoadState('load');
        return this;
    }

    /**
     * Switches to the "Past" meetings tab and waits for the page load.
     * Returns the same page instance rather than a fresh one.
     *
     * @aliases showPastMeetings, viewPast, viewHistory
     * @prerequisites The meetings list page is open
     * @observable-state The list reloads showing only meetings that have already occurred
     * @returns This `MeetingsPage`.
     */
    async clickPastTab(): Promise<MeetingsPage> {
        await this.pastTab.click();
        await this.page.waitForLoadState('load');
        return this;
    }

    /**
     * Checks whether a meeting with the given title is visible in the list.
     * Scoped to the active tab, so an existing past meeting reads as absent
     * while the Upcoming tab is selected.
     *
     * @aliases meetingExists, isMeetingVisible, hasMeeting
     * @prerequisites The meetings list page is open
     * @observable-state None — read-only query
     * @param title - The meeting title to look for.
     * @returns True if a matching meeting link is visible, false otherwise.
     */
    async hasMeetingWithTitle(title: string): Promise<boolean> {
        return await this.contentArea
            .getByRole('link', { name: title })
            .isVisible();
    }

    /**
     * Returns the number of list items in the meetings content area.
     *
     * Counts every `listitem` under `main`, so any other list rendered in the
     * content area inflates the result. Prefer
     * {@link hasMeetingWithTitle} when asserting about a specific meeting.
     *
     * @aliases countMeetings, getNumberOfMeetings
     * @prerequisites The meetings list page is open
     * @observable-state None — read-only query
     * @returns The number of list items in the content area.
     */
    async getMeetingCount(): Promise<number> {
        return await this.contentArea.getByRole('listitem').count();
    }
}
