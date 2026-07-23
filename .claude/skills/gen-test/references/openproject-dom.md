# OpenProject DOM facts that have cost time before

What you will actually see when you look at the running app. Every entry here was
paid for by a failed run or a wasted heal iteration — check this list before
concluding you have found something novel, and add to it when you find something new.

This file is about **OpenProject**, not about tooling. It stays true across
`playwright-cli` and Playwright upgrades. For how to *get* a browser in front of the
app, see [`browser.md`](browser.md); for addresses, credentials and the source
checkout, [`environment.md`](environment.md).

## Roles and structure

- **Action "buttons" are often `<a>`.** Use `getByRole('link')`, not
  `getByRole('button')`. Board delete controls are `<a title="Delete">`.
- **Duplicate IDs.** `#add-board-button` exists twice (text + icon-only mobile
  variant). Disambiguate: `#add-board-button[aria-label="Create new board"]`.
- **Ambiguous links.** `getByRole('link', { name: 'Boards' })` matches two elements on
  a board view; scope it: `locator('#content-body').getByRole('link', ...)`.
- **Elements that vanish entirely.** When all boards are deleted,
  `table.generic-table` is removed rather than rendered empty, so a row count must
  check for the table's existence first.

- **Heading levels are set by Primer layout components**, not by the page author, so an
  `h1` in the ERB may render as an `h2`. Do not pin `getByRole('heading', { level: n })`
  from source alone; confirm the level against the DOM.

## Modules

- **Not every module is enabled.** Several are off by default (Costs is the usual
  surprise), and a disabled module has no sidebar link and no routes — which looks
  identical to a module you cannot find. Check Project settings → Modules before
  concluding the UI is missing.

## Accessible names

- **Never use `exact: true` on a button with an `icon-*` class.** Those classes render
  an icon-font glyph via `::before`, and Playwright folds CSS `content` into the
  accessible name. The add-member submit button's real name is `U+F138` + `Add`, so
  `{ name: 'Add', exact: true }` matches **zero** elements.

  This is invisible in every human-readable view — the ARIA snapshot,
  `error-context.md`, and `toHaveAccessibleName` failures all print a bare `"Add"`.
  Scope to a container and use a substring match instead. If you suspect it, decode the
  bytes: a raw snapshot shows `button "U+f138Add"`.

- **Required fields carry the asterisk in the name.** The login fields are
  `"Username*"` and `"Password*"`, not `"Username"` / `"Password"`. Matching the bare
  label returns *"does not match any elements"*.

- **Two `Sign in` buttons** on the login page: one in the page header, one in the form.
  Scope to the form.

## Widgets

- **`ng-select` dropdowns** are not native `<select>`. They need click-then-pick, not
  `selectOption`. But **check before assuming** — on the add-member form the *user*
  field is an ng-select while the *role* field (`#member_role_ids`) is a plain
  `select_tag`, so `selectOption` is correct there.
- **ng-select panels render outside their form.** `appendTo: "body"` means
  `.ng-dropdown-panel .ng-option` must be scoped to the page, not to the form; scoping
  it to the form matches nothing. After picking, wait on `.ng-value` inside the form to
  confirm the selection actually took.
- **Escape closes dialogs and dropdowns.** Useful as a component's dismiss method, and
  worth remembering when a stray open panel is intercepting your clicks.

## Waiting and navigation

- **`waitForLoadState('load')` after a form submit is a no-op.** The current document is
  already loaded, so it resolves instantly — before the POST navigates. Combined with a
  `waitForLoad()` that keys on an element present both before and after, a method will
  return on the stale document and the failure surfaces much later as a missing row.
  Wait for something that actually changes: the form going hidden, or `waitForURL()` on
  the controller's success-redirect.
- **Turbo navigation** does not always trigger a full load, so `waitForURL` patterns may
  need adjusting. A Turbo `DELETE` following a 302 re-issues as `DELETE` and 404s —
  capture the URL first, wait for the 302, then `page.goto` the saved URL.

## Members module

- **The members list paginates at 20.** Row lookups that filter rendered `tbody tr`
  report an existing member as missing once the project passes one page. Force the full
  list (`per_page=100`) before asserting absence.
- **The name cell is not the email.** Inviting `a@b.com` renders a name cell of
  `a @b.com` (firstname/lastname split) and an email cell of `a@b.com`. Row lookup by
  email works only because the filter is `hasText` over the whole row. The email column
  renders only for users holding `view_user_email`.
- **Removing a member does not delete the user account.** It revokes project access only
  — OpenProject's own dialog says so. Tests that invite by a unique address leave one
  account per run on the instance.
- **The sidebar status links carry no `status=` param** in the default "All" view, so
  `waitForURL(/status=all/)` never resolves. Wait for the URL to *change* instead.
