import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';

/**
 * Represents the meeting side panel on the meeting show page.
 * Contains meeting details (date, time, duration, location),
 * state controls, and participants list.
 *
 * The root is the wrapper rendered by `Meetings::SidePanelComponent`, whose id
 * comes from OpenProject's `component_wrapper` helper
 * (`name.underscore.tr('/', '-').tr('_', '-')`).
 *
 * Both controls are `link`s, not buttons, and OpenProject does not emit a
 * `data-test-selector` for either despite the ERB requesting one — verified
 * against a live ARIA snapshot. "Manage participants" appears twice inside the
 * panel (section header and participant list), hence `.first()`.
 *
 * @aliases MeetingDetailsPanel, SidePanelComp
 */
export class MeetingSidePanelComp extends BaseComponent<MeetingSidePanelComp> {
    private readonly editDetailsButton: Locator;
    private readonly manageParticipantsButton: Locator;
    private readonly detailsSection: Locator;

    constructor(page: Page) {
        super(
            page,
            page
                .locator('#meetings-side-panel-component')
                .describe('Meeting side panel'),
        );
        this.editDetailsButton = this.rootComponent
            .getByRole('link', { name: 'Edit meeting details' })
            .describe('Edit meeting details link');
        this.manageParticipantsButton = this.rootComponent
            .getByRole('link', { name: 'Manage participants' })
            .first()
            .describe('Manage participants link');
        this.detailsSection = page
            .locator('#meetings-side-panel-details-component')
            .describe('Meeting details section');
    }

    async waitForLoad(): Promise<MeetingSidePanelComp> {
        await this.rootComponent.waitFor();
        return this;
    }

    /**
     * Clicks the edit details button to open the meeting details dialog, where
     * date, time, duration and location can be changed.
     *
     * @aliases editMeetingDetails, openDetailsDialog, clickEdit
     * @prerequisites The meeting detail page is open and the current user may edit the meeting
     * @observable-state The edit meeting details dialog opens, pre-filled with the current values
     */
    async clickEditDetails(): Promise<void> {
        await this.editDetailsButton.click();
    }

    /**
     * Clicks the manage participants button to open the participants dialog,
     * where invitees and attendees are selected.
     *
     * @aliases manageParticipants, openParticipantsDialog, editAttendees
     * @prerequisites The meeting detail page is open and the current user may edit participants
     * @observable-state The manage participants dialog opens, listing project members with invited/attended checkboxes
     */
    async clickManageParticipants(): Promise<void> {
        await this.manageParticipantsButton.click();
    }

    /**
     * Returns the meeting details text block, which includes the date, time,
     * zone, duration and — when set — the location.
     *
     * The location has no element of its own: OpenProject renders it via
     * `render_meeting_attribute_row(:location)` as an Octicon plus bare text,
     * with no id, class, or test selector. A live ARIA snapshot shows it merged
     * into one text run, e.g. `07/22/2026 10:00 AM - 11:00 AM UTC 1 hr Room 42`.
     * So this cannot return the location alone — assert with `toContain`.
     *
     * @aliases getMeetingDetailsText, getDetailsText
     * @prerequisites The meeting detail page is open
     * @observable-state None — read-only query
     * @returns The details section text, or '' when the section is not visible.
     */
    async getDetailsText(): Promise<string> {
        if (!(await this.detailsSection.isVisible())) {
            return '';
        }
        return (await this.detailsSection.innerText()) ?? '';
    }
}
