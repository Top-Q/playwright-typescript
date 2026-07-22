import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { MeetingShowPage } from './meetingShowPage';

/**
 * Represents the create/edit meeting dialog (#new-meeting-dialog).
 * Contains fields for title, location, start time, and duration.
 *
 * @aliases NewMeetingDialog, MeetingDialog, CreateMeetingForm
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

    /**
     * Fills the meeting title field. Returns this component so calls can be
     * chained with {@link fillLocation} and {@link clickCreate}.
     *
     * @aliases setTitle, enterTitle, fillMeetingTitle
     * @prerequisites The create/edit meeting dialog is open
     * @observable-state The title field contains the given text
     * @param title - The meeting title.
     * @returns This `MeetingFormDialogComp`, for chaining.
     */
    async fillTitle(title: string): Promise<MeetingFormDialogComp> {
        await this.titleInput.fill(title);
        return this;
    }

    /**
     * Fills the meeting location field. Returns this component so calls can be
     * chained with {@link fillTitle} and {@link clickCreate}.
     *
     * @aliases setLocation, enterLocation, fillMeetingLocation
     * @prerequisites The create/edit meeting dialog is open
     * @observable-state The location field contains the given text
     * @param location - The meeting location.
     * @returns This `MeetingFormDialogComp`, for chaining.
     */
    async fillLocation(location: string): Promise<MeetingFormDialogComp> {
        await this.locationInput.fill(location);
        return this;
    }

    /**
     * Clicks Create to submit the meeting form.
     *
     * @aliases submitMeetingForm, saveMeeting, create
     * @prerequisites The create meeting dialog is open and the required title is filled
     * @observable-state The meeting is created, the dialog closes, and the browser navigates to the new meeting's detail page
     * @returns A `MeetingShowPage` for the created meeting.
     */
    async clickCreate(): Promise<MeetingShowPage> {
        await this.createButton.click();
        return await new MeetingShowPage(this.page).waitForLoad();
    }

    /**
     * Creates a meeting in one call — shorthand for {@link fillTitle}, then
     * {@link fillLocation} when a location is given, then {@link clickCreate}.
     * Leaves date, time and duration at their dialog defaults.
     *
     * @aliases createNewMeeting, addMeeting, submitMeeting
     * @prerequisites The create meeting dialog is open
     * @observable-state The meeting is created with the given title and appears in the meetings list; the browser navigates to its detail page
     * @param title - The meeting title.
     * @param location - Optional meeting location; skipped when omitted.
     * @returns A `MeetingShowPage` for the created meeting.
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
