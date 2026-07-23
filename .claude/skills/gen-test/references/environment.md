# The environment under test

Everything machine- and instance-specific that an agent needs, in one place. This is
the file to rewrite when this approach is pointed at a different OpenProject instance —
or a different application entirely, alongside a replacement for
[`openproject-dom.md`](openproject-dom.md).

Nothing here is a runtime config file. Tests read `.env` and `playwright.config.ts`;
this file exists so that **agents and docs stop hardcoding the same values in a dozen
places** and disagreeing when one of them changes.

## Addresses

| What | Where |
| --- | --- |
| **UI** — everything the browser recipes and UI tests touch | `http://localhost:8090` |
| **API** — `OpenProjectClient`, API tests, `/api/docs` | `http://localhost:8080` |

These are **two different ports for two different surfaces**, which is the trap. `.env`
defines `OPENPROJECT_BASE_URL` as the *API* URL (`:8080`) despite the unqualified name;
it says nothing about the UI. If you are driving a browser, `:8090` is the only correct
answer and `.env` will mislead you.

`.env` is gitignored. Do not assume it exists, and do not cite values from it in a doc.

## Credentials

`admin` / `adminadmin` — the OpenProject demo instance defaults.

**Prefer not to use them.** `tests/ui/fixtures.ts` logs in and selects the Demo project
for you, and Recipe A inherits that fixture. Typing credentials by hand means you are on
Recipe B, which `browser.md` calls the last resort — see [`browser.md`](browser.md) for
why the state you land in differs from what a test sees.

The literal strings live in `tests/ui/fixtures.ts`. They are repeated here only so an
agent debugging a login problem does not have to go hunting.

## Project context

Tests run as **admin** against the **Demo project** (`demo-project` in URLs). Module
paths follow `/projects/demo-project/<module>`.

## Rails source

`C:\Users\itaiag\git\ruby\openproject`

Read-only reference for locators, routes and i18n strings. It is an *aid*, not a
dependency: this approach has to work where the customer's source is unavailable, so
nothing may be blocked on it. When it is absent, the live DOM is the sole authority.

### Verify the version before trusting it

Source at a different version than the deployed build produces locators that look
authoritative and are wrong — a worse outcome than not reading it.

```bash
git -C C:/Users/itaiag/git/ruby/openproject branch --show-current   # e.g. stable/16
# compare against the deployed image tag, e.g. TAG=16-slim in the compose .env
```

The major versions must match. If they do not, or you cannot determine the deployed
tag, **skip the source and use the browser.** Say so in your report — an unverified
source read is not evidence.

## Who reads this

`module-investigator`, `po-builder` and `test-healer` read it directly.
`browser.md` and `gates.md` keep concrete URLs in their command examples on purpose —
a recipe you have to assemble from two files is a recipe people get wrong — but this
file is what they defer to when the two disagree.
