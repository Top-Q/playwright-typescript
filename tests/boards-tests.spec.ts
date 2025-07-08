import { expect } from '@playwright/test';
import { test } from './fixtures/overview-page-fixture'
import { BoardsPage, BoardTypePage, BoardPage } from '../internals';


test('create new basic board and add 3 lists', async ({ page, readyOverviewPage }) => {
    let boardName: string;
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Boards').click();
    });
    await test.step("When the user creates a new basic board", async () => {
        const boardsPage = new BoardsPage(page);
        await boardsPage.createNewBoardButton.click();
        const boardTypePage = new BoardTypePage(page);
        await boardTypePage.basicBoardButton.click();
        boardName = `Board for list test ${Date.now()}`;
        const newBoardPage = new BoardPage(page);
        await newBoardPage.listNameTextbox.nth(0).fill(boardName); // Set board name
        // The first list is 'Unamed list', so we will rename it to 'list1' below
    });
    await test.step("And the user adds 3 lists to the board", async () => {
        const newBoardPage = new BoardPage(page);
        // Rename the first list (Unamed list) to 'list1'
        await newBoardPage.listNameTextbox.nth(1).fill('list1');
        // Add two more lists: 'list2' and 'list3'
        for (let i = 2; i <= 3; i++) {
            await newBoardPage.addListToBoardLink.click();
            await newBoardPage.listNameTextbox.nth(i).fill(`list${i}`);
        }
    });
    await test.step("Then all 3 lists are visible on the board", async () => {
        const newBoardPage = new BoardPage(page);
        for (let i = 1; i <= 3; i++) {
            await expect(newBoardPage.listNameTextbox.nth(i)).toHaveValue(`list${i}`);
        }
    });
});

test('boards page shows more than one board', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Boards').click();
    });
    await test.step("Then there are more than one board listed", async () => {
        const boardsPage = new BoardsPage(page);
        // Wait for at least one board to appear (timeout 10s)
        await expect(boardsPage.boardNamesTds.first()).toBeVisible({ timeout: 10000 });
        const boardCount = await boardsPage.boardNamesTds.count();
        expect(boardCount).toBeGreaterThan(1);
    });
});

test('all listed boards can be opened and have correct name', async ({ page, readyOverviewPage }) => {
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        await readyOverviewPage.menuSidebarContainer.getByText('Boards').click();
    });
    await test.step("Then each listed board can be opened and its name matches", async () => {
        const boardsPage = new BoardsPage(page);
        await expect(boardsPage.boardNamesTds.first()).toBeVisible({ timeout: 10000 });
        const boardCount = await boardsPage.boardNamesTds.count();
        expect(boardCount).toBeGreaterThan(0);
        for (let i = 0; i < boardCount; i++) {
            // Get the board name as listed
            const boardName = await boardsPage.boardNamesTds.nth(i).innerText();
            // Click the board to open it
            await boardsPage.boardNamesTds.nth(i).click();
            // Wait for the board page to load and check the board name using the BoardPage.pageObject
            const boardPage = new BoardPage(page);
            await expect(boardPage.boardNameTextbox).toHaveText(boardName, { timeout: 10000 });
            // Go back to the boards list
            await page.goBack();
            // Wait for the boards table to be visible again
            await expect(boardsPage.boardNamesTds.first()).toBeVisible({ timeout: 10000 });
        }
    });
});
