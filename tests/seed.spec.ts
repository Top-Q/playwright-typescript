import { test } from './ui/fixtures';

/**
 * Login smoke test, and the anchor for `--debug=cli` browser sessions.
 *
 * Requesting `readyOverviewPage` is what makes it both: Playwright only builds
 * fixtures a test actually destructures, so without it this file logged in to
 * nothing and passed in 3ms.
 *
 * To get a logged-in browser with no test in the way — used by
 * `module-investigator`, and by `po-builder` in scaffold mode:
 *
 *   PLAYWRIGHT_HTML_OPEN=never \
 *     npx playwright test tests/seed.spec.ts --project=chromium --debug=cli   # background
 *   playwright-cli attach tw-XXXXXX
 *   playwright-cli --s=tw-XXXXXX step-over        # x4: goto, fill, fill, sign-in click
 *   playwright-cli --s=tw-XXXXXX goto http://localhost:8090/projects/demo-project/<page>
 *   playwright-cli --s=tw-XXXXXX resume           # teardown; the run closes its browser
 *
 * Four `step-over`s clears the login fixture and leaves you authenticated. Do
 * NOT use `pause-at` — it fails open, silently running the test to completion
 * instead of pausing (verified 2026-07-23). See
 * `.claude/skills/gen-test/references/browser.md`.
 *
 * This test mutates nothing, which is why it is the safe thing to attach to.
 */
test('seed', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
    await readyOverviewPage.waitForLoad();
});
