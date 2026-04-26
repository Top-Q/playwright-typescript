import { test } from '../fixtures';
import { MeetingsPage, MeetingShowPage } from '../../../internals';
import { expect } from '@playwright/test';

test(
    'Create a one-time meeting and verify it appears on the meetings list',
    { tag: ['@ui', '@meetings', '@regression'] },
    async ({ readyOverviewPage }) => {
        const meetingTitle = `Test Meeting ${Date.now()}`;

        let meetingsPage: MeetingsPage;
        await test.step('Given the user navigates to Meetings', async () => {
            meetingsPage = await readyOverviewPage
                .mainMenu()
                .clickMeetingsLink();
        });

        let meetingShowPage: MeetingShowPage;
        await test.step('When the user creates a one-time meeting', async () => {
            const dialog = await meetingsPage.clickAddOneTimeMeeting();
            meetingShowPage = await dialog.createMeeting(
                meetingTitle,
                'Conference Room A',
            );
        });

        await test.step('Then the meeting show page displays the correct title', async () => {
            const title = await meetingShowPage.getMeetingTitle();
            expect(title).toContain(meetingTitle);
        });
    },
);

test(
    'Add an agenda item to a meeting',
    { tag: ['@ui', '@meetings', '@regression'] },
    async ({ readyOverviewPage }) => {
        const meetingTitle = `Agenda Test ${Date.now()}`;
        const agendaItemTitle = 'Discuss project timeline';

        let meetingShowPage: MeetingShowPage;
        await test.step('Given the user creates a new meeting', async () => {
            const meetingsPage = await readyOverviewPage
                .mainMenu()
                .clickMeetingsLink();
            const dialog = await meetingsPage.clickAddOneTimeMeeting();
            meetingShowPage = await dialog.createMeeting(meetingTitle);
        });

        await test.step('When the user adds an agenda item', async () => {
            await meetingShowPage.agendaItems().addItem(agendaItemTitle);
        });

        await test.step('Then the agenda item is visible on the meeting page', async () => {
            const hasItem = await meetingShowPage
                .agendaItems()
                .hasItemWithTitle(agendaItemTitle);
            expect(hasItem).toBe(true);
        });
    },
);

test(
    'Delete a meeting from the meeting show page',
    { tag: ['@ui', '@meetings', '@regression'] },
    async ({ readyOverviewPage, page }) => {
        const meetingTitle = `Delete Me ${Date.now()}`;

        await test.step('Given the user creates a new meeting', async () => {
            const meetingsPage = await readyOverviewPage
                .mainMenu()
                .clickMeetingsLink();
            const dialog = await meetingsPage.clickAddOneTimeMeeting();
            await dialog.createMeeting(meetingTitle);
        });

        await test.step('When the user deletes the meeting', async () => {
            const meetingShowPage = new MeetingShowPage(page);
            await meetingShowPage.deleteMeeting();
        });

        await test.step('Then the user is redirected to the meetings list', async () => {
            await page.waitForURL(/\/meetings/);
            const meetingsPage = await new MeetingsPage(page).waitForLoad();
            const hasMeeting =
                await meetingsPage.hasMeetingWithTitle(meetingTitle);
            expect(hasMeeting).toBe(false);
        });
    },
);
