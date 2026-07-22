# Driving the live app

Used by **po-builder** (to find real locators) and **test-healer** (to see why a step failed).

You drive a **standalone `playwright-cli` browser** and log in yourself. The login is three commands; do not skip it, because every interesting page is behind it.

> **Do not use `npx playwright test --debug=cli`.** That flag does not exist in this project's Playwright (1.56.1) and fails with `error: unknown option '--debug=cli'`. The bundled `playwright-cli` skill under `.claude/skills/playwright-cli/` still documents it — that documentation is written against a newer Playwright and **does not apply here**. `PWDEBUG=1` is not a substitute either: it pauses the test but exposes no session for `playwright-cli` to attach to (`playwright-cli list` reports no browsers). There is currently no way to attach to a paused Playwright test in this repo.

## The recipe

Verified working on Playwright 1.56.1 / `playwright-cli` 0.1.17:

```bash
# 1. Open a browser on the login page. Creates a session named "default".
playwright-cli open http://localhost:8090/login

# 2. Snapshot to get element refs. Never guess a ref — they change per page.
playwright-cli snapshot --depth=8

# 3. Log in using the refs from that snapshot (see the caution below).
playwright-cli fill <username-ref> admin
playwright-cli fill <password-ref> adminadmin
playwright-cli click <signin-ref>

# 4. Go straight to the page you care about.
playwright-cli goto http://localhost:8090/projects/demo-project/members

# 5. Explore.
playwright-cli find "Add member"
playwright-cli snapshot "#content"
playwright-cli generate-locator <ref> --raw
```

**Two things that will waste your time on the login page:**

- The fields' accessible names include the required asterisk — `"Username*"`, not `"Username"`. Matching by the bare label returns _"does not match any elements"_.
- There are **two** `Sign in` buttons: one in the page header, one in the form. Use the form's ref.

Both are why step 2 is a snapshot and steps 3–5 use refs rather than text.

Refs are scoped to the frame and re-issued on navigation — after a `goto` they come back with a prefix (`f3e43` rather than `e43`). Re-snapshot after every navigation; never carry a ref across one.

**Always `playwright-cli close-all` before you return.** A leaked session holds a browser, and `playwright-cli list` should print `(no browsers)` when you are done.

### What this costs

You start logged out, so you do not inherit `tests/ui/fixtures.ts` (which logs in as admin and selects the Demo project). Your browser state is therefore _not_ identical to the state the test under construction will see. Land on the same page the test would before trusting a snapshot, and prefer navigating by URL over clicking through the app.

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

1. **Rails source** — `C:\Users\itaiag\git\ruby\openproject`. Verify the branch matches the deployed Docker tag before trusting it (see the `investigate-module` skill); state the result in your report. Good for URL patterns (`config/routes.rb`), structure (`app/components/**/*.html.erb`), and resolving i18n keys to the accessible names they render as (`config/locales/en.yml`).
2. **OpenProject's own test suite** — `spec/support/pages/**/*.rb` and `spec/features/**/*_spec.rb`. These are page objects the OpenProject team maintains against the same UI, so they encode selectors already known to work, and they are cheap to read. Start here when a widget's structure is not obvious from the ERB.
3. **The live DOM** via the recipe above.

**When they disagree, the live DOM wins.** The deployed build does not always render what the source implies — `data-test-selector` attributes in particular are frequently absent. Source tells you what to look for; the browser tells you what is there.

## OpenProject specifics that have cost time before

- **Action "buttons" are often `<a>`.** Use `getByRole('link')`, not `getByRole('button')`. Board delete controls are `<a title="Delete">`.
- **Duplicate IDs.** `#add-board-button` exists twice (text + icon-only mobile variant). Disambiguate: `#add-board-button[aria-label="Create new board"]`.
- **`ng-select` dropdowns** are not native `<select>`. They need click-then-pick, not `selectOption`. But **check before assuming** — on the add-member form the _user_ field is an ng-select while the _role_ field (`#member_role_ids`) is a plain `select_tag`, so `selectOption` is correct there.
- **ng-select panels render outside their form.** `appendTo: "body"` means `.ng-dropdown-panel .ng-option` must be scoped to the page, not to the form; scoping it to the form matches nothing. After picking, wait on `.ng-value` inside the form to confirm the selection actually took.
- **Members: the name cell is not the email.** Inviting `a@b.com` renders a name cell of `a @b.com` (firstname/lastname split) and an email cell of `a@b.com`. Row lookup by email works only because the filter is `hasText` over the whole row. The email column renders only for users holding `view_user_email`.
- **Removing a member does not delete the user account.** It revokes project access only — OpenProject's own dialog says so. Tests that invite by a unique address leave one account per run on the instance.
- **Never use `exact: true` on a button with an `icon-*` class.** Those classes render an icon-font glyph via `::before`, and Playwright folds CSS `content` into the accessible name. The add-member submit button's real name is `U+F138` + `Add`, so `{ name: 'Add', exact: true }` matches **zero** elements. This is invisible in every human-readable view — the ARIA snapshot, `error-context.md`, and `toHaveAccessibleName` failures all print a bare `"Add"`. Scope to a container and use a substring match instead. If you suspect it, decode the bytes: a raw snapshot shows `button "U+f138Add"`.
- **`waitForLoadState('load')` after a form submit is a no-op.** The current document is already loaded, so it resolves instantly — before the POST navigates. Combined with a `waitForLoad()` that keys on an element present both before and after, a method will return on the stale document and the failure surfaces much later as a missing row. Wait for something that actually changes: the form going hidden, or `waitForURL()` on the controller's success-redirect.
- **Turbo navigation** does not always trigger a full load, so `waitForURL` patterns may need adjusting. A Turbo `DELETE` following a 302 re-issues as `DELETE` and 404s — capture the URL first, wait for the 302, then `page.goto` the saved URL.
- **Elements that vanish entirely.** When all boards are deleted, `table.generic-table` is removed rather than rendered empty, so a row count must check for the table's existence first.
- **Ambiguous links.** `getByRole('link', { name: 'Boards' })` matches two elements on a board view; scope it: `locator('#content-body').getByRole('link', ...)`.

## Debugging a specific failure (healer)

**Read the trace first.** You cannot pause the failing test and attach to it — see the caution at the top — so the trace from the failed run is your only view of the actual failure state. The `playwright-trace` skill reads it from the command line, and it is usually faster than reproducing anyway.

When the trace is not enough, reproduce the state by hand with the recipe above: log in, navigate to the page, and drive it to the point of failure. Then inspect:

```bash
playwright-cli snapshot     # did the element move, rename, or change role?
playwright-cli console      # app-side JS errors?
playwright-cli requests     # failed request, wrong payload?
```
