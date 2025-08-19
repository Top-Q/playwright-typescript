import { expect } from '@playwright/test';
import { test } from './fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewWorkpackagePage, BoardsPage, BoardPage } from '../internals';

test('create single task and assert creation', async ({ readyOverviewPage }) => {
    let workPackagesPage: WorkPackagesPage;
    await test.step("Given the user navigates to the 'Work packages' section", async () => {
        workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
    });

    let randomTaskName: string;
    await test.step("When the user creates a new task and provides a name", async () => {
        const taskTypeMenu: TaskTypeMenu = await workPackagesPage.clickCreateButton();
        const newWorkPackagePage: NewWorkpackagePage = await taskTypeMenu.clickTaskLink();
        randomTaskName = `My new task ${Date.now()}`;
        await newWorkPackagePage.fillSubject(randomTaskName);
        await newWorkPackagePage.fillDescription(`Task description ${Date.now()}`);
        await newWorkPackagePage.clickSaveButton();
    });

    await test.step("Then the task is created successfully", async () => {
        await readyOverviewPage.clickActivateFilterButton();
        await readyOverviewPage.fillFilterByText(randomTaskName);
        await workPackagesPage.workPackageTable().waitForTableToLoad();
        await expect(workPackagesPage.workPackageTable().isWorkPackageVisible(randomTaskName)).resolves.toBeTruthy();
    });
});

test('create new basic board and add a list', async ({ readyOverviewPage }) => {
    let boardsPage: BoardsPage;
    await test.step("Given the user is in the boards page", async () => {
        boardsPage = await readyOverviewPage.mainMenu().clickBoardsLink();
    });

    let boardPage: BoardPage;
    await test.step("When the user creates a new basic board with name 'Automated board'", async () => {
        const boardTypePage = await boardsPage.clickCreateBoardButton();
        boardPage = await boardTypePage.clickBasicBoardButton();
        await boardPage.fillBoardName('Automated board');
    });

    await test.step("And the user adds one list with name 'My list'", async () => {
        await boardPage.clickAddListToBoard();
        const list = await boardPage.getListByIndex(0);
        await list.fillListName('My list');
    });

    await test.step("Then the new board is created", async () => {
        await expect(boardPage.boardNameTextbox).toHaveValue('Automated board');
        boardsPage = await boardPage.clickBoardsLink();
        await boardsPage.waitForPageToLoad();
        const boardTable = await boardsPage.boardTable();
        const boardRow = await boardTable.getRowByBoardName('Automated board');
        await expect(boardRow.name).toHaveText('Automated board');
    });
});

