/* eslint-disable playwright/no-skipped-test, playwright/expect-expect --
 * This file is a debugging harness, not a test. The skip is the guard that keeps
 * a normal suite run from hanging on it, and it asserts nothing by design.
 */
import { test } from './ui/fixtures';

/**
 * Holds a logged-in browser open so `playwright-cli` can attach to it over CDP.
 *
 * This replaces `npx playwright test --debug=cli`, which does not exist in this
 * project's Playwright (1.56.1) — there, `--debug` is a boolean shortcut for
 * `PWDEBUG=1` and rejects a value. Rather than asking the runner to publish a
 * session, we launch Chromium with a CDP port of our own and never finish the
 * test, so the runner has no reason to tear the browser down.
 *
 * The payoff: the attached browser is the fixture's browser, so investigation
 * starts already logged in and already on the Demo project, instead of the
 * logged-out state a bare `playwright-cli open` gives you.
 *
 * Usage:
 *   PW_DEBUG_SESSION=1 PLAYWRIGHT_HTML_OPEN=never \
 *     npx playwright test tests/debug-session.spec.ts --project=chromium   # background
 *   # wait for "[debug-session] Logged in and holding"
 *   playwright-cli attach --cdp=http://localhost:9222
 *   ... snapshot / find / generate-locator ...
 *   playwright-cli detach
 *
 * Override the port with PW_CDP_PORT when running two sessions at once.
 *
 * TEARDOWN — all three steps are required. Verified 2026-07-23:
 *   1. `playwright-cli detach` clears the CLI session registry and leaves the
 *      browser running. `playwright-cli close` does NOT close a CDP-attached
 *      browser, so it is not a substitute.
 *   2. Kill the background test run.
 *   3. Kill the Chromium itself. Killing the runner does NOT take the browser
 *      with it — the browser is a grandchild and survives, holding the port:
 *        Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
 *          Where-Object { $_.ExecutablePath -like '*ms-playwright*' } |
 *          ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
 *      That path filter matters: it spares the user's own Chrome install.
 */

const CDP_PORT = process.env.PW_CDP_PORT ?? '9222';

// File-scope skip: keeps the login fixture from running during a normal suite run.
test.skip(
    !process.env.PW_DEBUG_SESSION,
    'Set PW_DEBUG_SESSION=1 to hold a browser open for playwright-cli attach.',
);

test.use({
    launchOptions: {
        args: [`--remote-debugging-port=${CDP_PORT}`],
    },
});

test('debug session — logged in, holds open for CDP attach', async ({
    readyOverviewPage,
}) => {
    // No timeout: this test is meant to be killed, not to finish.
    test.setTimeout(0);

    await readyOverviewPage.waitForLoad();

    console.log(
        `\n[debug-session] Logged in and holding. Attach with:\n` +
            `  playwright-cli attach --cdp=http://localhost:${CDP_PORT}\n`,
    );

    // Park forever. The fixtures have run, so the browser is in the exact state
    // a real test would see at its first line.
    await new Promise(() => {});
});
