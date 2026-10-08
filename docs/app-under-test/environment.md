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
| **API** — REST API v3, `/api/docs` | `http://localhost:8090/api/v3` |

**One port serves both.** The Docker Compose proxy publishes `127.0.0.1:8090` and routes
`/api/v3` to the same web container as the UI. That container listens on `8080`, but the
port is not published, so `http://localhost:8080` refuses connections — older docs and
`.env` files that point the API there are wrong for this setup.

**There is no API client or API test suite.** `src/api/` (`OpenProjectClient`) and
`tests/api/` were removed in `82ea368`. To call the API — for test cleanup, or to check a
fact — use an API token (avatar → Account settings → Access tokens) with basic auth:

```powershell
curl.exe -u "apikey:<token>" http://localhost:8090/api/v3/users/me
```

A `POST` with no body, such as `/api/v3/users/<id>/lock`, still needs
`-H "Content-Type: application/json"`, or it answers 406.

`.env` is gitignored and **read by nothing in the repository** (dotenv is commented out in
`playwright.config.ts`); its `OPENPROJECT_BASE_URL` points at `:8080`. It is only a place
to keep the token. Do not assume it exists, and do not cite values from it in a doc.

## Database

When a fact is easier to read from the data than from the UI — whether a project is
public, a setting's value, a role's permissions — query the database read-only:

```powershell
docker exec openproject-db-1 psql -U postgres -d openproject -c "select identifier, public from projects;"
```

Settings live in `settings` (`name`, `value`); built-in roles are `roles.builtin` 1 (Non
member) and 2 (Anonymous). Never write to it: change state through the UI or the API, so
the app's own rules run.

## Credentials

`admin` / `adminadmin` — the OpenProject demo instance defaults.

**Prefer not to use them.** `tests/ui/fixtures.ts` logs in and selects the Demo project
for you, and Recipe A inherits that fixture. Typing credentials by hand means you are on
Recipe B, which `browser.md` calls the last resort — see [`browser.md`](../../.claude/skills/gen-test/references/browser.md) for
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

Anyone working against the running app, by hand or through the pipeline. The
`module-investigator`, `po-builder` and `test-healer` agents read it directly; so should you,
before writing a locator or debugging a login.
`browser.md` and `gates.md` keep concrete URLs in their command examples on purpose —
a recipe you have to assemble from two files is a recipe people get wrong — but this
file is what they defer to when the two disagree.
