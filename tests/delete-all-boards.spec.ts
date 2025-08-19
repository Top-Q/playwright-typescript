import { expect } from '@playwright/test';
import { test } from './fixtures';
import { BoardsPage, BoardTableRowComp } from '../internals';

test('delete all boards in the system', async ({ readyOverviewPage }) => {
    let boardsPage: BoardsPage;

    await test.step("Given the user navigates to the 'Boards' page", async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
        // ensure the table is loaded
        await boardsPage.boardTable().refresh();
    });

    await test.step('When the user deletes all boards one by one', async () => {
        let rowCount = await boardsPage.boardTable().getNumberOfRows();
        let boardRow: BoardTableRowComp;

        while (rowCount > 0) {
            // always delete the first row until none remain
            boardRow = await boardsPage.boardTable().getRowByIndex(0);
            await boardRow.clickDeleteButtonAndAcceptDeletion();

            // refresh and re-evaluate the number of rows
            await boardsPage.boardTable().refresh();
            rowCount = await boardsPage.boardTable().getNumberOfRows();
        }
    });

    await test.step('Then no boards remain in the boards table', async () => {
        const finalCount = await boardsPage.boardTable().getNumberOfRows();
        expect(finalCount).toBe(0);
    });
});
