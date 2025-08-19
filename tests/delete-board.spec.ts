import { expect } from '@playwright/test';
import { test } from './fixtures';
import { BoardsPage, BoardTypePage, NewBoardPage, BoardTableRowComp } from '../internals';

test('create basic board and then delete it from the boards page', async ({ readyOverviewPage }) => {
    let boardsPage: BoardsPage;
    await test.step('Given the user is on the boards page', async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
    });

    let boardTypePage: BoardTypePage;
    let newBoardPage: NewBoardPage;
    let randomBoardName: string;

    await test.step('And the user creates a new basic board with a random name', async () => {
        boardTypePage = await boardsPage.clickCreateBoardButton();
        newBoardPage = await boardTypePage.clickBasicBoardButton();
        randomBoardName = `Automated board ${Date.now()}`;
        await newBoardPage.fillBoardName(randomBoardName);
    });

    await test.step('And the user returns to the boards page', async () => {
        boardsPage = await newBoardPage.clickBoardsLink();
        // ensure the table is loaded
        await boardsPage.boardTable().refresh();
    });

    let boardRow: BoardTableRowComp;
    await test.step('When the user deletes the board from the boards page', async () => {
        boardRow = await boardsPage.boardTable().getRowByBoardName(randomBoardName);
        await boardRow.clickDeleteButtonAndAcceptDeletion();
    });

    await test.step('Then the board is no longer visible on the boards page table', async () => {
        await boardsPage.boardTable().refresh();
        await expect(boardsPage.boardTable().isRowForTableWithNameExists(randomBoardName)).resolves.toBeFalsy();
    });
});
