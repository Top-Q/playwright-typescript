import { test } from '../fixtures';
import { expect } from '@playwright/test';
import {
    BoardsPage,
    BoardTypePage,
    NewBoardPage,
    BoardTableComp,
    ListComp,
} from '../../internals';

test('Create basic board with a list', { tag: ['@ui', '@board', '@regression'] }, async ({ readyOverviewPage }) => {
    let boardsPage: BoardsPage;
    let boardTypePage: BoardTypePage;
    let newBoardPage: NewBoardPage;
    let boardTable: BoardTableComp;
    let list: ListComp;

    const boardName: string = `Automated board ${crypto.randomUUID()}`;
    const listName: string = `Automated List ${Math.random().toString(36).slice(2, 6)}`;

    await test.step('Given the user is authenticated as "default"', async () => {
        // Authentication is handled by the fixture `readyOverviewPage`.
    });

    await test.step('And the user is on the Boards page', async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
        await boardsPage.waitForLoad();
    });

    await test.step(`When the user creates a new basic board with the name "${boardName}"`, async () => {
        boardTypePage = await boardsPage.clickCreateBoardButton();
        newBoardPage = await boardTypePage.clickBasicBoardButton();
        await newBoardPage.waitForLoad();
        await newBoardPage.fillBoardName(boardName);
    });

    await test.step(`And the user adds a list with the name "${listName}"`, async () => {
        await newBoardPage.clickAddListToBoardLink();
        list = newBoardPage.getListByIndex(0);
        await list.fillListName(listName);
    });

    await test.step('And the user returns to the Boards page', async () => {
        boardsPage = await newBoardPage.clickBoardsLink();
        await boardsPage.waitForLoad();
    });

    await test.step(`Then the board named "${boardName}" is visible on the Boards page`, async () => {
        boardTable = boardsPage.boardTable();
        await boardTable.waitForLoad();
        const exists = await boardTable.isRowForTableWithNameExists(boardName);
        expect(exists, `Board with name "${boardName}" was not found on the Boards page.`).toBeTruthy();
    });
});
