import { expect } from '@playwright/test';
import { test } from './fixtures';
import { BoardsPage, BoardTypePage, BoardPage } from '../internals';

/**
 * Test suite for board-related functionality in the OpenProject application.
 */
test('create new basic board and add 3 lists', async ({ readyOverviewPage }) => {
    let boardName: string;
    let boardsPage: BoardsPage;
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
    });

    let newBoardPage: BoardPage;
    await test.step("When the user creates a new basic board", async () => {
        const boardTypePage: BoardTypePage = await boardsPage.clickCreateNewBoardButton();
        newBoardPage = await boardTypePage.clickBasicBoardButton();
        boardName = `Board for list test ${Date.now()}`;
        await newBoardPage.fillBoardName(boardName); // Set board name
    });

    await test.step("And the user adds 3 lists to the board", async () => {
        await newBoardPage.fillBoardName('list1');
        for (let i = 2; i <= 3; i++) {
            await newBoardPage.clickAddListToBoard();
            await newBoardPage.fillBoardName(`list${i}`);
        }
    });

    await test.step("Then all 3 lists are visible on the board", async () => {
        for (let i = 1; i <= 3; i++) {
            await expect(newBoardPage.isBoardNameVisible(`list${i}`)).resolves.toBeTruthy();
        }
    });
});

test('boards page shows more than one board', async ({ readyOverviewPage }) => {
    let boardsPage: BoardsPage;
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
    });

    await test.step("Then there are more than one board listed", async () => {
        await expect(boardsPage.isAnyBoardVisible()).resolves.toBeTruthy();
        const boardCount = await boardsPage.getBoardCount();
        expect(boardCount).toBeGreaterThan(1);
    });
});

test('all listed boards can be opened and have correct name', async ({ readyOverviewPage }) => {
    let boardsPage: BoardsPage;
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
    });

    await test.step("Then each listed board can be opened and its name matches", async () => {
        await expect(boardsPage.isAnyBoardVisible()).resolves.toBeTruthy();
        const boardCount = await boardsPage.getBoardCount();
        expect(boardCount).toBeGreaterThan(0);
        for (let i = 0; i < boardCount; i++) {
            const boardName = await boardsPage.getBoardNameByIndex(i);
            await boardsPage.clickBoardByName(boardName);
            const boardPage = new BoardPage(boardsPage.page);
            await expect(boardPage.isBoardNameVisible(boardName)).resolves.toBeTruthy();
            await boardsPage.page.goBack();
            await expect(boardsPage.isAnyBoardVisible()).resolves.toBeTruthy();
        }
    });
});

test('add two boards and then delete all boards', async ({ readyOverviewPage }) => {
    const boardNames: string[] = [];
    let boardsPage: BoardsPage;
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
    });

    await test.step("When the user creates two new boards", async () => {
        for (let i = 0; i < 2; i++) {
            const boardTypePage = await boardsPage.clickCreateNewBoardButton();
            const newBoardPage = await boardTypePage.clickBasicBoardButton();
            const boardName = `Board to delete ${Date.now()}-${i}`;
            await newBoardPage.fillBoardName(boardName);
            boardNames.push(boardName);
            await newBoardPage.clickBoardsLink();
            await expect(boardsPage.isAnyBoardVisible()).resolves.toBeTruthy();
        }
    });

    await test.step("Then all boards are deleted from the boards list", async () => {
        boardsPage.page.on('dialog', dialog => dialog.accept());
        await boardsPage.deleteAllBoards();
        expect(await boardsPage.getBoardCount()).toBe(0);
    });
});

