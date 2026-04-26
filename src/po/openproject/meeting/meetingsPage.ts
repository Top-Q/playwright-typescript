import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { MeetingShowPage } from './meetingShowPage';
import { MeetingFormDialogComp } from './meetingFormDialogComp';

/**
 * Represents the meetings list page at /projects/:id/meetings.
 * Shows meetings grouped by date with options to create, filter, and navigate.
 * The "New Meeting" button is a split button with a dropdown for one-time vs recurring.
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

    /** Click "New Meeting" to open the submenu, then select "One-time" to open the dialog. */
    async clickAddOneTimeMeeting(): Promise<MeetingFormDialogComp> {
        await this.newMeetingButton.click();
        await this.page.getByRole('menuitem', { name: /one-time/i }).click();
        return await new MeetingFormDialogComp(
            this.page,
            this.page.locator('#new-meeting-dialog'),
        ).waitForLoad();
    }

    /** Click on a meeting by title to navigate to the meeting show page. */
    async clickMeetingByTitle(title: string): Promise<MeetingShowPage> {
        await this.contentArea.getByRole('link', { name: title }).click();
        return await new MeetingShowPage(this.page).waitForLoad();
    }

    /** Switch to the upcoming meetings tab. */
    async clickUpcomingTab(): Promise<MeetingsPage> {
        await this.upcomingTab.click();
        await this.page.waitForLoadState('load');
        return this;
    }

    /** Switch to the past meetings tab. */
    async clickPastTab(): Promise<MeetingsPage> {
        await this.pastTab.click();
        await this.page.waitForLoadState('load');
        return this;
    }

    /** Check if a meeting with the given title exists in the list. */
    async hasMeetingWithTitle(title: string): Promise<boolean> {
        return await this.contentArea
            .getByRole('link', { name: title })
            .isVisible();
    }

    /** Get the number of meeting items in the list. */
    async getMeetingCount(): Promise<number> {
        return await this.contentArea.getByRole('listitem').count();
    }
}
