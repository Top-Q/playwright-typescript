import { Locator, Page } from '@playwright/test';
import { BaseComponent, BasePage } from '../../../../internals';

/**
 * # Cost Report Table Component
 * Represents the result table in the cost reports page.
 * Shows time/cost data grouped by the configured rows and columns.
 */
export class CostReportTableComp extends BaseComponent<CostReportTableComp> {
    constructor(page: Page, rootComponent: Locator) {
        super(page, rootComponent);
    }

    async waitForLoad(): Promise<CostReportTableComp> {
        await this.rootComponent.waitFor();
        return this;
    }

    /**
     * Returns the number of data rows in the report table (excludes header and footer rows).
     */
    async getNumberOfDataRows(): Promise<number> {
        const tbody = this.rootComponent.locator('tbody').nth(2);
        return await tbody.locator('tr').count();
    }

    /**
     * Checks if a work package with the given subject appears in the report.
     */
    async isWorkPackageInReport(subject: string): Promise<boolean> {
        return (await this.rootComponent.getByText(subject).count()) > 0;
    }

    /**
     * Returns the hours value for a specific work package row.
     * @param subject - The work package subject text to find
     * @returns The hours text (e.g. "2.00 hours")
     */
    async getHoursForWorkPackage(subject: string): Promise<string> {
        const row = this.rootComponent.locator('tr', { hasText: subject });
        const cells = row.locator('td');
        return await cells.first().innerText();
    }

    /**
     * Returns the total hours shown in the footer row.
     */
    async getTotalHours(): Promise<string> {
        const footerRow = this.rootComponent.locator('tbody').nth(1).locator('tr');
        return await footerRow.locator('th').last().innerText();
    }
}

/**
 * # Cost Reports Page
 * Represents the "Time and costs" / "Cost reports" page in OpenProject.
 * This page allows users to create filtered reports of time and cost entries.
 * It includes filter, group-by, and units sections, plus action buttons (Apply, Save, Clear).
 */
export class CostReportsPage extends BasePage<CostReportsPage> {
    private readonly applyLink: Locator;
    private readonly saveLink: Locator;
    private readonly clearLink: Locator;
    private readonly reportHeading: Locator;
    private readonly reportTable: Locator;
    private readonly noDataMessage: Locator;
    private readonly laborRadio: Locator;
    private readonly cashValueRadio: Locator;

    constructor(readonly page: Page) {
        super(page);
        this.applyLink = this.page
            .getByRole('link', { name: 'Apply' })
            .describe('Apply report filters');
        this.saveLink = this.page
            .getByRole('link', { name: 'Save' })
            .describe('Save report');
        this.clearLink = this.page
            .getByRole('link', { name: 'Clear' })
            .describe('Clear report filters');
        this.reportHeading = this.page
            .locator('#content-body h2')
            .describe('Report page heading');
        this.reportTable = this.page
            .locator('table.report')
            .describe('Cost report results table');
        this.noDataMessage = this.page
            .locator('.generic-table--no-results-container')
            .describe('No data message');
        this.laborRadio = this.page
            .getByRole('radio', { name: 'Labor' })
            .describe('Labor units radio');
        this.cashValueRadio = this.page
            .getByRole('radio', { name: 'Cash value' })
            .describe('Cash value units radio');
    }

    async waitForLoad(): Promise<CostReportsPage> {
        await this.applyLink.waitFor();
        return this;
    }

    /**
     * Clicks the "Apply" link to run the report with current filters.
     */
    async clickApply(): Promise<void> {
        await this.applyLink.click();
        await this.page.waitForLoadState('load');
    }

    /**
     * Clicks the "Clear" link to reset all filters.
     */
    async clickClear(): Promise<void> {
        await this.clearLink.click();
        await this.page.waitForLoadState('load');
    }

    /**
     * Clicks the "Save" link to save the current report.
     */
    async clickSave(): Promise<void> {
        await this.saveLink.click();
    }

    /**
     * Returns true if the report table is visible (has data).
     */
    async hasReportData(): Promise<boolean> {
        return await this.reportTable.isVisible();
    }

    /**
     * Returns true if the "nothing to display" message is shown.
     */
    async hasNoDataMessage(): Promise<boolean> {
        return await this.noDataMessage.isVisible();
    }

    /**
     * Returns the report heading text (e.g. "New cost report").
     */
    async getReportHeading(): Promise<string> {
        return await this.reportHeading.innerText();
    }

    /**
     * Returns the cost report table component for reading report data.
     * Only call this when the report has data (after clickApply).
     */
    costReportTable(): CostReportTableComp {
        return new CostReportTableComp(this.page, this.reportTable);
    }

    /**
     * Selects "Labor" as the units option.
     */
    async selectLaborUnits(): Promise<void> {
        await this.laborRadio.check();
    }

    /**
     * Selects "Cash value" as the units option.
     */
    async selectCashValueUnits(): Promise<void> {
        await this.cashValueRadio.check();
    }

    /**
     * Removes the date filter by clicking its "Remove filter" link.
     * This broadens the report to show all dates.
     */
    async removeDateFilter(): Promise<void> {
        const dateFilterRow = this.page.locator('li', { hasText: 'Date (Spent)' });
        await dateFilterRow.getByRole('link', { name: 'Remove filter' }).click();
    }
}
