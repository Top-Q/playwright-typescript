import { test } from '../fixtures';
import { dumpDom } from '../../../src/utils/dumpDom';
import { expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('dumpDom creates expected artifact files', { tag: ['@ui', '@utils'] }, async ({ readyOverviewPage }) => {

    let dumpDir: string;

    await test.step('Given the user is on the Overview page', () => {
        // Already on the overview page via fixture
    });

    await test.step('When dumpDom is called with a label', async () => {
        dumpDir = await dumpDom(readyOverviewPage.page, { label: 'test-dump' });
    });

    await test.step('Then the output directory is created', () => {
        expect(fs.existsSync(dumpDir)).toBe(true);
    });

    await test.step('And aria.yml is created with content', () => {
        const ariaPath = path.join(dumpDir, 'aria.yml');
        expect(fs.existsSync(ariaPath)).toBe(true);
        const content = fs.readFileSync(ariaPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
    });

    await test.step('And content.html is created with content', () => {
        const htmlPath = path.join(dumpDir, 'content.html');
        expect(fs.existsSync(htmlPath)).toBe(true);
        const content = fs.readFileSync(htmlPath, 'utf-8');
        expect(content).toContain('<html');
    });

    await test.step('And screenshot.png is created', () => {
        const screenshotPath = path.join(dumpDir, 'screenshot.png');
        expect(fs.existsSync(screenshotPath)).toBe(true);
        const stat = fs.statSync(screenshotPath);
        expect(stat.size).toBeGreaterThan(0);
    });

});
