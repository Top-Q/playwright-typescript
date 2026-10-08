import { test } from '../fixtures';
import { BoardsPage, BoardTableComp, NewBoardPage, ListComp } from '../../../internals';
import { expect } from '@playwright/test';

test('Create basic board with a list', {
  tag: ['@ui', '@board', '@regression', '@TC-BRD-001-01', '@TC-BRD-003-01'],
  annotation: [
    { type: 'built-from', description: 'TC-BRD-001-01@a4131e4e5423f2a9' },
    { type: 'built-from', description: 'TC-BRD-003-01@96d99d94ab66ba96' },
  ],
}, async ({ readyOverviewPage }) => {

  let boardsPage: BoardsPage;
  await test.step('Given the user is authenticated as "default"', async () => {
    // Already authenticated via fixture
  });

  await test.step('And the user is on the Boards page', async () => {
    boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
  });

  const boardName = `Automated board ${crypto.randomUUID().slice(0, 8)}`;
  const listName = `Automated List ${Math.random().toString(36).slice(2, 6)}`;

  let newBoardPage: NewBoardPage;
  await test.step(`When the user creates a new basic board with the name "${boardName}"`, async () => {
    const boardTypePage = await boardsPage.clickCreateBoardButton();
    await boardTypePage.fillBoardName(boardName);
    newBoardPage = await boardTypePage.clickBasicBoardButton();
  });

  await test.step('Then the board opens with one default list', async () => {
    expect(await newBoardPage.getListTitles()).toEqual(['Unnamed list']);
  });

  await test.step(`When the user adds a list and names it "${listName}"`, async () => {
    const list: ListComp = await newBoardPage.clickAddListToBoardLink();
    await list.fillListName(listName);
  });

  await test.step('Then, after a reload, the new list follows the default list on the board', async () => {
    newBoardPage = await newBoardPage.reload();
    expect(await newBoardPage.getListTitles()).toEqual(['Unnamed list', listName]);
  });

  await test.step('And the user returns to the Boards page', async () => {
    boardsPage = await newBoardPage.clickBoardsLink();
  });

  await test.step(`And the board named "${boardName}" is visible on the Boards page`, async () => {
    const boardTable: BoardTableComp = boardsPage.boardTable();
    const exists = await boardTable.isRowForTableWithNameExists(boardName);
    expect(exists).toBe(true);
  });
});

test('Rename an existing list', {
  tag: ['@ui', '@board', '@regression', '@TC-BRD-003-02'],
  annotation: { type: 'built-from', description: 'TC-BRD-003-02@d2a8960f06ae19e6' },
}, async ({ readyOverviewPage }) => {

  const boardName = `Automated board ${crypto.randomUUID().slice(0, 8)}`;

  let newBoardPage: NewBoardPage;
  await test.step(`Given a basic board "${boardName}" has a list named "To Do"`, async () => {
    const boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
    const boardTypePage = await boardsPage.clickCreateBoardButton();
    await boardTypePage.fillBoardName(boardName);
    newBoardPage = await boardTypePage.clickBasicBoardButton();
    await newBoardPage.getListByIndex(0).fillListName('To Do');
    newBoardPage = await newBoardPage.reload();
    expect(await newBoardPage.getListTitles()).toEqual(['To Do']);
  });

  await test.step('When the user renames the list to "Backlog"', async () => {
    await newBoardPage.getListByIndex(0).fillListName('Backlog');
  });

  await test.step('Then the list is named "Backlog"', async () => {
    expect(await newBoardPage.getListTitles()).toEqual(['Backlog']);
  });

  await test.step('And the name persists after a reload', async () => {
    newBoardPage = await newBoardPage.reload();
    expect(await newBoardPage.getListTitles()).toEqual(['Backlog']);
  });
});

test('Create and delete a board', {
  tag: ['@ui', '@board', '@regression', '@TC-BRD-007-01'],
  annotation: { type: 'built-from', description: 'TC-BRD-007-01@f1fd4c0fe4864f6b' },
}, async ({ readyOverviewPage }) => {

  let boardsPage: BoardsPage;
  await test.step('Given the user is authenticated as "default"', async () => {
    // Already authenticated via fixture
  });

  await test.step('And the user is on the Boards page', async () => {
    boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
  });

  const boardName = `Automated board ${crypto.randomUUID().slice(0, 8)}`;

  await test.step(`When the user creates a new basic board with the name "${boardName}"`, async () => {
    const boardTypePage = await boardsPage.clickCreateBoardButton();
    await boardTypePage.fillBoardName(boardName);
    const newBoardPage = await boardTypePage.clickBasicBoardButton();
    boardsPage = await newBoardPage.clickBoardsLink();
  });

  await test.step('And the user returns to the Boards page', async () => {
    // Already on boards page from previous step
  });

  await test.step(`And the user deletes the board named "${boardName}"`, async () => {
    const boardTable: BoardTableComp = boardsPage.boardTable();
    const row = await boardTable.getRowByBoardName(boardName);
    await row.clickDeleteButtonAndAcceptDeletion();
  });

  await test.step(`Then the board named "${boardName}" is not visible on the Boards page`, async () => {
    const boardTable: BoardTableComp = boardsPage.boardTable();
    await boardTable.refresh();
    const exists = await boardTable.isRowForTableWithNameExists(boardName);
    expect(exists).toBe(false);
  });
});

test('Delete all boards', { tag: ['@ui', '@board', '@regression'] }, async ({ readyOverviewPage }) => {
  test.setTimeout(180_000);

  let boardsPage: BoardsPage;
  await test.step('Given the user is authenticated as "default"', async () => {
    // Already authenticated via fixture
  });

  await test.step('And the user is on the Boards page', async () => {
    boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
  });

  await test.step('When the user deletes all boards in the table', async () => {
    const boardTable: BoardTableComp = boardsPage.boardTable();
    let rowCount = await boardTable.getNumberOfRows();
    while (rowCount > 0) {
      const row = await boardTable.getRowByIndex(0);
      await row.clickDeleteButtonAndAcceptDeletion();
      await boardTable.refresh();
      rowCount = await boardTable.getNumberOfRows();
    }
  });

  await test.step('Then no boards are visible on the Boards page', async () => {
    const boardTable: BoardTableComp = boardsPage.boardTable();
    const rowCount = await boardTable.getNumberOfRows();
    expect(rowCount).toBe(0);
  });
});
