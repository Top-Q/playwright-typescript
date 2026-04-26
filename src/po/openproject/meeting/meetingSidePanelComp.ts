import { Locator, Page } from '@playwright/test';

/**
 * Represents the meeting side panel on the meeting show page.
 * Contains meeting details (date, time, duration, location),
 * state controls, and participants list.
 */
export class MeetingSidePanelComp {
    private readonly page: Page;
    private readonly editDetailsButton: Locator;
    private readonly manageParticipantsButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.editDetailsButton = page
            .locator('[data-test-selector="edit-meeting-details-button"]')
            .describe('Edit meeting details button');
        this.manageParticipantsButton = page
            .locator('[data-test-selector="manage-participants-button"]')
            .describe('Manage participants button');
    }

    /** Click the edit details button to open the edit details dialog. */
    async clickEditDetails(): Promise<void> {
        await this.editDetailsButton.click();
    }

    /** Click the manage participants button to open the participants dialog. */
    async clickManageParticipants(): Promise<void> {
        await this.manageParticipantsButton.click();
    }

    /** Get the meeting location text from the side panel. */
    async getLocation(): Promise<string> {
        const locationElement = this.page
            .locator('.location-info, [data-test-selector*="location"]')
            .describe('Location info in side panel');
        if (await locationElement.isVisible()) {
            return (await locationElement.textContent()) ?? '';
        }
        return '';
    }
}
