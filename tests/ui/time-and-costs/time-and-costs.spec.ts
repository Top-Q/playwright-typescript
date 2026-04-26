import { test } from '../fixtures';
import {
    CostReportsPage,
    WorkPackageDetailPage,
} from '../../../internals';
import { expect } from '@playwright/test';

test(
    'Log time on a work package and verify it appears in the cost report',
    { tag: ['@ui', '@timeandcosts', '@regression'], timeout: 60_000 },
    async ({ readyOverviewPage, page }) => {
        const hours = '3';
        const activity = 'Development';
        const comment = `Auto time entry ${Date.now()}`;

        await test.step('Given the user navigates to Work Packages', async () => {
            await readyOverviewPage.mainMenu().clickWorkPackagesLink();
        });

        let wpDetailPage: WorkPackageDetailPage;
        await test.step('And the user opens work package #2 detail view', async () => {
            await page.goto('http://localhost:8090/projects/demo-project/work_packages/2');
            wpDetailPage = await new WorkPackageDetailPage(page).waitForLoad();
        });

        await test.step(`When the user logs ${hours} hours of ${activity}`, async () => {
            const dialog = await wpDetailPage.openLogTimeDialog();
            await dialog.logTime(hours, activity, comment);
        });

        let costReportsPage: CostReportsPage;
        await test.step('And the user navigates to Time and costs', async () => {
            await page.goto('http://localhost:8090/projects/demo-project/cost_reports');
            costReportsPage = await new CostReportsPage(page).waitForLoad();
        });

        await test.step('And the user removes the date filter and applies the report', async () => {
            await costReportsPage.removeDateFilter();
            await costReportsPage.clickApply();
        });

        await test.step('Then the cost report shows the logged time for the work package', async () => {
            expect(await costReportsPage.hasReportData()).toBe(true);
            const table = costReportsPage.costReportTable();
            expect(await table.isWorkPackageInReport('Organize open source conference')).toBe(true);
        });
    },
);

test(
    'Cost report shows "nothing to display" when no time is logged in date range',
    { tag: ['@ui', '@timeandcosts', '@regression'] },
    async ({ readyOverviewPage, page }) => {
        let costReportsPage: CostReportsPage;
        await test.step('Given the user navigates to Time and costs', async () => {
            costReportsPage = await readyOverviewPage.mainMenu().clickTimeAndCostsLink();
        });

        await test.step('When the user sets the date filter to a future date and applies', async () => {
            const dateInput = page.getByRole('textbox', { name: 'Date (Spent) Value' });
            await dateInput.fill('2099-01-01');
            await costReportsPage.clickApply();
        });

        await test.step('Then the report shows "nothing to display"', async () => {
            const noResultsContainer = page.locator('.generic-table--no-results-container');
            await expect(noResultsContainer).toBeVisible();
            const reportTable = page.locator('table.report');
            await expect(reportTable).toBeHidden();
        });
    },
);

test(
    'Cost report Clear removes all filters and resets to blank state',
    { tag: ['@ui', '@timeandcosts', '@regression'] },
    async ({ readyOverviewPage, page }) => {
        let costReportsPage: CostReportsPage;
        await test.step('Given the user navigates to Time and costs', async () => {
            costReportsPage = await readyOverviewPage.mainMenu().clickTimeAndCostsLink();
        });

        await test.step('When the user clicks Clear', async () => {
            await costReportsPage.clickClear();
        });

        await test.step('Then all filters are removed (only "Add filter" dropdown remains)', async () => {
            const visibleFilterRows = page.locator('li.advanced-filters--filter:visible');
            await expect(visibleFilterRows).toHaveCount(0);
        });

        await test.step('And the report heading is "New cost report"', async () => {
            expect(await costReportsPage.getReportHeading()).toContain('New cost report');
        });

        await test.step('And the group-by sections are empty (no attributes selected)', async () => {
            const columnAttributes = page.locator('.group-by--selected-element');
            await expect(columnAttributes).toHaveCount(0);
        });
    },
);
