# Driving the live app

Used by **po-builder** (to find real locators) and **test-healer** (to see why a step failed).

The mechanism is `playwright-cli` attached to a **paused Playwright test**, not to a standalone browser. That matters: `tests/ui/fixtures.ts` logs in as `admin`/`adminadmin` and selects the Demo project, so attaching to the paused test drops you exactly where the test under construction will be. A browser you drive yourself starts logged out and diverges from test reality.

## The recipe

```bash
# 1. Start the seed test paused, in the background.
PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/seed.spec.ts --debug=cli

# 2. Read the background output until "Debugging Instructions" prints a session
#    name of the form tw-XXXXXX. Do not guess it.
playwright-cli attach tw-XXXXXX

# 3. Let the fixture run: logs in, opens the Demo project overview.
playwright-cli resume

# 4. Explore.
playwright-cli snapshot
playwright-cli click e15
playwright-cli generate-locator e15 --raw
```

`tests/seed.spec.ts` has an empty body on purpose — it exists as this anchor point.

**Always stop the background run before you return.** A leaked debug session holds the browser and its port, and the next stage will fail to attach.

## Getting a locator you can trust

`playwright-cli generate-locator <ref> --raw` emits a real Playwright locator for an element. Use it rather than composing a locator by eye from the snapshot — it accounts for role, accessible name, and disambiguation that reading YAML does not.

Keep snapshots small; a full OpenProject page is large:

```bash
playwright-cli snapshot "#content"      # scope to a container
playwright-cli snapshot --depth=4       # shallow first, then drill in
playwright-cli snapshot e34             # subtree of one element
```

To read attributes the ARIA tree does not show:

```bash
playwright-cli eval "el => el.id" e5
playwright-cli eval "el => el.getAttribute('data-test-selector')" e5
```

## Evidence ranking

1. **Rails source** — `C:\Users\itaiag\git\ruby\openproject`. Verify the branch matches the deployed Docker tag before trusting it (see the `investigate-module` skill). Good for URL patterns (`config/routes.rb`), structure (`app/components/**/*.html.erb`), and resolving i18n keys to the accessible names they render as (`config/locales/en.yml`).
2. **The live DOM** via the recipe above.

**When they disagree, the live DOM wins.** The deployed build does not always render what the source implies — `data-test-selector` attributes in particular are frequently absent. Source tells you what to look for; the browser tells you what is there.

## OpenProject specifics that have cost time before

- **Action "buttons" are often `<a>`.** Use `getByRole('link')`, not `getByRole('button')`. Board delete controls are `<a title="Delete">`.
- **Duplicate IDs.** `#add-board-button` exists twice (text + icon-only mobile variant). Disambiguate: `#add-board-button[aria-label="Create new board"]`.
- **`ng-select` dropdowns** are not native `<select>`. They need click-then-pick, not `selectOption`.
- **Turbo navigation** does not always trigger a full load, so `waitForURL` patterns may need adjusting. A Turbo `DELETE` following a 302 re-issues as `DELETE` and 404s — capture the URL first, wait for the 302, then `page.goto` the saved URL.
- **Elements that vanish entirely.** When all boards are deleted, `table.generic-table` is removed rather than rendered empty, so a row count must check for the table's existence first.
- **Ambiguous links.** `getByRole('link', { name: 'Boards' })` matches two elements on a board view; scope it: `locator('#content-body').getByRole('link', ...)`.

## Debugging a specific failure (healer)

Attach at the failing test rather than the seed, so the state matches:

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/ui/<module>/<file>.spec.ts:<line> --debug=cli
playwright-cli attach tw-XXXXXX
```

Then step to just before the failing action and inspect:

```bash
playwright-cli snapshot     # did the element move, rename, or change role?
playwright-cli console      # app-side JS errors?
playwright-cli requests     # failed request, wrong payload?
```

The `playwright-trace` skill reads the trace from the failed run, which is often faster than reproducing — start there when a trace exists.
