import { test as base, expect } from '@playwright/test';
import { IntroPage, OverviewPage, WorkPackagesPage, NewTaskPage, NewPhasePage, NewMilestonePage, ProjectSelectionComponent, HomePage, BoardsPage, BoardTypePage, BoardPage } from '../internals';

// Custom fixture for login, project selection, and returning OverviewPage
const test = base.extend<{
    overviewPage: OverviewPage;
}>({
    overviewPage: async ({ page }, use) => {
        await test.step("Given the user is logged in with username 'admin' and password 'adminadmin'", async () => {
            const introPage = new IntroPage(page);
            await introPage.goto('http://localhost:8080');
            await introPage.signInLink.click();
            await introPage.userNameTextBox.fill('admin');
            await introPage.passwordTextBox.fill('adminadmin');
            await introPage.signInButton.click();
        });
        await test.step("And the user selects the 'Demo project'", async () => {
            const homePage = new HomePage(page);
            await homePage.selectAProjectLink.click();
            const projectSelectionComponent = new ProjectSelectionComponent(page);
            await projectSelectionComponent.projectsListContainer.getByText('Demo project').click();
        });
        // Now on OverviewPage
        await use(new OverviewPage(page));
    },
});

test('add task', async ({ page, overviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await overviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomTaskName: string;
    await test.step("When the user creates new task and provide the name 'My new task'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        await workPackagesPage.taskTypeContainer.getByText('Task').click();
        const newTaskPage = new NewTaskPage(page);
        randomTaskName = `My new task ${Date.now()}`;
        await newTaskPage.subjectTextBox.fill(randomTaskName);
        await newTaskPage.saveButton.click();
    });
    await test.step("Then the task is created", async () => {
        await overviewPage.activateFilterButton.click();
        await overviewPage.filterByTextTextBox.fill(randomTaskName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomTaskName)).toBeVisible();
    });
});

test('add phase', async ({ page, overviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await overviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomPhaseName: string;
    await test.step("When the user creates new phase and provide the name 'My new phase'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        await workPackagesPage.taskTypeContainer.getByText('Phase').click();
        const newPhasePage = new NewPhasePage(page);
        randomPhaseName = `My new phase ${Date.now()}`;
        await newPhasePage.subjectTextBox.fill(randomPhaseName);
        await newPhasePage.saveButton.click();
    });
    await test.step("Then the phase is created", async () => {
        await overviewPage.activateFilterButton.click();
        await overviewPage.filterByTextTextBox.fill(randomPhaseName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomPhaseName)).toBeVisible();
    });
});

test('add milestone', async ({ page, overviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await overviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let randomMilestoneName: string;
    await test.step("When the user creates new milestone and provide the name 'My new milestone'", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        await workPackagesPage.taskTypeContainer.getByText('Milestone').click();
        const newMilestonePage = new NewMilestonePage(page);
        randomMilestoneName = `My new milestone ${Date.now()}`;
        await newMilestonePage.subjectTextBox.fill(randomMilestoneName);
        await newMilestonePage.saveButton.click();
    });
    await test.step("Then the milestone is created", async () => {
        await overviewPage.activateFilterButton.click();
        await overviewPage.filterByTextTextBox.fill(randomMilestoneName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(randomMilestoneName)).toBeVisible();
    });
});

test('add task with very long name', async ({ page, overviewPage }) => {
    await test.step("And the user selects the 'Work packages' item from the sidebar menu", async () => {
        await overviewPage.menuSidebarContainer.getByText('Work packages').click();
    });
    let longTaskName: string;
    await test.step("When the user creates new task and provide a very long name", async () => {
        const workPackagesPage = new WorkPackagesPage(page);
        await workPackagesPage.createButton.click();
        await workPackagesPage.taskTypeContainer.getByText('Task').click();
        const newTaskPage = new NewTaskPage(page);
        longTaskName = `My new task with a very long name ${'x'.repeat(70)} ${Date.now()}`;
        await newTaskPage.subjectTextBox.fill(longTaskName);
        await newTaskPage.saveButton.click();
    });
    await test.step("Then the task with the long name is created", async () => {
        await overviewPage.activateFilterButton.click();
        await overviewPage.filterByTextTextBox.fill(longTaskName);
        const workPackagesPage = new WorkPackagesPage(page);
        await expect(workPackagesPage.workPackagesResultTableContainer.getByText(longTaskName)).toBeVisible();
    });
});

test('create new basic board and add 3 lists', async ({ page, overviewPage }) => {
    let boardName: string;
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        await overviewPage.menuSidebarContainer.getByText('Boards').click();
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

test('boards page shows more than one board', async ({ page, overviewPage }) => {
    await test.step("And the user selects the 'Boards' item from the sidebar menu", async () => {
        await overviewPage.menuSidebarContainer.getByText('Boards').click();
    });
    await test.step("Then there are more than one board listed", async () => {
        const boardsPage = new BoardsPage(page);
        // Wait for at least one board to appear (timeout 10s)
        await expect(boardsPage.boardNamesTds.first()).toBeVisible({ timeout: 10000 });
        const boardCount = await boardsPage.boardNamesTds.count();
        expect(boardCount).toBeGreaterThan(1);
    });
});