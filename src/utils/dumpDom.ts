import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface DumpDomOptions {
    /** Label used in the output folder name (default: 'dump') */
    label?: string;
    /** Milliseconds to sleep before capturing (default: 0) */
    sleepMs?: number;
    /** Wait for network to be idle before capturing (default: false) */
    waitForNetworkIdle?: boolean;
    /** Output directory relative to cwd (default: 'test-results/debug-dumps') */
    outputDir?: string;
}

/**
 * Captures DOM artifacts to disk for debugging and investigation.
 *
 * Writes three files to `<outputDir>/<timestamp>-<label>/`:
 * - `aria.yml`       — ARIA accessibility tree (compatible with `toMatchAriaSnapshot()`)
 * - `content.html`   — Raw page HTML
 * - `screenshot.png` — Full-page screenshot
 *
 * The test **resumes automatically** — no `page.pause()` or manual interaction needed.
 *
 * ### When to use
 * Drop a call anywhere in a test or page-object method to snapshot the page state
 * at that moment. Remove it once you've finished investigating.
 *
 * ### Reading the output
 * - `aria.yml` — use to write `getByRole()` locators and `toMatchAriaSnapshot()` assertions
 * - `content.html` — use to find element IDs, classes, and data attributes
 * - `screenshot.png` — visual confirmation of what the page looked like
 *
 * @param page    Playwright Page instance
 * @param options Optional configuration
 * @returns       Absolute path to the directory containing the dump files
 *
 * @example
 * // Drop anywhere in a test — the test continues automatically
 * await dumpDom(page);
 *
 * @example
 * // Wait for dynamic content to settle, then capture with a meaningful label
 * await someButton.click();
 * const dir = await dumpDom(page, { waitForNetworkIdle: true, label: 'after-click' });
 * console.log('Artifacts at:', dir);
 *
 * @example
 * // Give the UI a moment to animate before snapshotting
 * await dumpDom(page, { sleepMs: 500, label: 'modal-open' });
 */
export async function dumpDom(page: Page, options: DumpDomOptions = {}): Promise<string> {
    const {
        label = 'dump',
        sleepMs = 0,
        waitForNetworkIdle = false,
        outputDir = 'test-results/debug-dumps',
    } = options;

    if (sleepMs > 0) {
        await page.waitForTimeout(sleepMs);
    }

    if (waitForNetworkIdle) {
        await page.waitForLoadState('networkidle');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpDir = path.join(outputDir, `${timestamp}-${label}`);
    fs.mkdirSync(dumpDir, { recursive: true });

    const ariaSnapshot = await page.locator('body').ariaSnapshot();
    fs.writeFileSync(path.join(dumpDir, 'aria.yml'), ariaSnapshot, 'utf-8');

    const html = await page.content();
    fs.writeFileSync(path.join(dumpDir, 'content.html'), html, 'utf-8');

    await page.screenshot({ path: path.join(dumpDir, 'screenshot.png'), fullPage: true });

    const absoluteDir = path.resolve(dumpDir);
    console.log(`[dumpDom] Artifacts saved to: ${absoluteDir}`);
    return absoluteDir;
}
