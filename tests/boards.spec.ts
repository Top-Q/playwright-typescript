import { test } from './fixtures';
import { BoardsPage, BoardTypePage, NewBoardPage } from '../internals';
import { expect } from '@playwright/test';

test('Create basic board with a list', async ({ readyOverviewPage }) => {
  let boardsPage: BoardsPage;
  let boardTypePage: BoardTypePage;
  let newBoardPage: NewBoardPage;

  const boardName = `Automated board ${Date.now()}`;
  const listName = `Automated List ${Math.floor(Math.random() * 10000)}`;

  await test.step('Given the user is authenticated as "default"', async () => {
    // Auth handled by fixture
  });

  await test.step('And the user is on the Boards page', async () => {
    boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
  });

  await test.step('When the user creates a new basic board with the name "' + boardName + '"', async () => {
    boardTypePage = await boardsPage.clickCreateBoardButton();
    newBoardPage = await boardTypePage.clickBasicBoardButton();
    await newBoardPage.fillBoardName(boardName);
  });

  await test.step('And the user adds a list with the name "' + listName + '"', async () => {
    await newBoardPage.clickAddListToBoardLink();
    const list = newBoardPage.getListByIndex(0);
    await list.fillListName(listName);
  });

  await test.step('And the user returns to the Boards page', async () => {
    await newBoardPage.clickBoardsLink();
  });

  await test.step('Then the board named "' + boardName + '" is visible on the Boards page', async () => {
    const boardTable = boardsPage.boardTable();
    const exists = await boardTable.isRowForTableWithNameExists(boardName);
    expect(exists).toBeTruthy();
  });
});


test('Create and delete a board', async ({ readyOverviewPage }) => {
  let boardsPage: BoardsPage;
  let boardTypePage: BoardTypePage;
  let newBoardPage: NewBoardPage;

  const boardName = `Automated board ${Date.now()}`;

  await test.step('Given the user is authenticated as "default"', async () => {
    // Auth handled by fixture
  });

  await test.step('And the user is on the Boards page', async () => {
    boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
  });

  await test.step('When the user creates a new basic board with the name "' + boardName + '"', async () => {
    boardTypePage = await boardsPage.clickCreateBoardButton();
    newBoardPage = await boardTypePage.clickBasicBoardButton();
    await newBoardPage.fillBoardName(boardName);
  });

  await test.step('And the user returns to the Boards page', async () => {
    await newBoardPage.clickBoardsLink();
  });

  await test.step('And the user deletes the board named "' + boardName + '"', async () => {
    const boardTable = boardsPage.boardTable();
    const row = await boardTable.getRowByBoardName(boardName);
    await row.clickDeleteButtonAndAcceptDeletion();
  });

  await test.step('Then the board named "' + boardName + '" is not visible on the Boards page', async () => {
    const boardTable = boardsPage.boardTable();
    await boardTable.refresh();
    const exists = await boardTable.isRowForTableWithNameExists(boardName);
    expect(exists).toBeFalsy();
  });
});


test('Delete all boards', async ({ readyOverviewPage }) => {
  let boardsPage: BoardsPage;

  await test.step('Given the user is authenticated as "default"', async () => {
    // Auth handled by fixture
  });

  await test.step('And the user is on the Boards page', async () => {
    boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
  });

  await test.step('When the user deletes all boards in the table', async () => {
    const boardTable = boardsPage.boardTable();
    const count = await boardTable.getRowCount();
    for (let i = 0; i < count; i++) {
      const row = await boardTable.getRowByIndex(0);
      await row.clickDeleteButtonAndAcceptDeletion();
    }
  });

  await test.step('Then no boards are visible on the Boards page', async () => {
    const boardTable = boardsPage.boardTable();
    const num = await boardTable.getNumberOfRows();
    expect(num).toBe(0);
  });
});
