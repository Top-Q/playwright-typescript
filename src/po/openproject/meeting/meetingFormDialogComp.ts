import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { MeetingShowPage } from './meetingShowPage';

/**
 * Represents the create/edit meeting dialog (#new-meeting-dialog).
 * Contains fields for title, location, start time, and duration.
 */
export class MeetingFormDialogComp extends BaseComponent<MeetingFormDialogComp> {
    private readonly titleInput: Locator;
    private readonly locationInput: Locator;
    private readonly startDateInput: Locator;
    private readonly startTimeInput: Locator;
    private readonly durationInput: Locator;
    private readonly createButton: Locator;

    constructor(page: Page, rootComponent: Locator) {
        super(page, rootComponent);
        this.titleInput = rootComponent
            .getByLabel(/title/i)
            .describe('Meeting title input');
        this.locationInput = rootComponent
            .getByLabel(/location/i)
            .describe('Meeting location input');
        this.startDateInput = rootComponent
            .locator('input[type="date"]')
            .describe('Meeting start date input');
        this.startTimeInput = rootComponent
            .locator('input[type="time"]')
            .describe('Meeting start time input');
        this.durationInput = rootComponent
            .getByLabel(/duration/i)
            .describe('Meeting duration input');
        this.createButton = rootComponent
            .getByRole('button', { name: /create/i })
            .describe('Create meeting button');
    }

    async waitForLoad(): Promise<MeetingFormDialogComp> {
        await this.titleInput.waitFor();
        return this;
    }

    /** Fill in the meeting title. */
    async fillTitle(title: string): Promise<MeetingFormDialogComp> {
        await this.titleInput.fill(title);
        return this;
    }

    /** Fill in the meeting location. */
    async fillLocation(location: string): Promise<MeetingFormDialogComp> {
        await this.locationInput.fill(location);
        return this;
    }

    /** Click Create to submit the form and navigate to the meeting show page. */
    async clickCreate(): Promise<MeetingShowPage> {
        await this.createButton.click();
        return await new MeetingShowPage(this.page).waitForLoad();
    }

    /**
     * Create a meeting with the given title and optional location.
     * Shorthand for fillTitle + fillLocation + clickCreate.
     */
    async createMeeting(
        title: string,
        location?: string,
    ): Promise<MeetingShowPage> {
        await this.fillTitle(title);
        if (location) await this.fillLocation(location);
        return await this.clickCreate();
    }
}
