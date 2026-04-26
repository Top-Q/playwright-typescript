---
name: investigate-module
description: Interactively investigate an unfamiliar OpenProject module by browsing its pages, capturing DOM snapshots, and producing a structured report. Use when you need to automate a module that has no page objects yet.
allowed-tools:
  - Bash(playwright-cli:*)
  - Bash(npx:*)
---

# Investigate Module

Use this skill when you encounter a **new OpenProject module** that has no existing page objects. The goal is to produce a structured report that drives PO creation.

## Source Code First (Preferred Approach)

If the OpenProject source code is available locally at the **same version** as the running application, prefer reading the source over live browser investigation. Source code provides locators, URL patterns, and component hierarchy directly — eliminating most DOM discovery iterations.

### How to check source availability and version match

1. Ask if the source is available and where (e.g. `C:\Users\...\git\ruby\openproject`)
2. Verify the source branch matches the deployed version:
   - Check the Docker tag: `cat <docker-dir>/.env | grep TAG` (e.g. `TAG=16-slim`)
   - Check the source branch: `git -C <source-path> branch --show-current` (e.g. `stable/16`)
   - They must match (e.g. both `16`) — if they don't, fall back to live browser investigation

### Source code investigation workflow

Look in the module directory (usually `modules/<module-name>/`):

| What to find | Where to look |
|---|---|
| URL patterns | `modules/<module>/config/routes.rb` |
| Page structure + locators | `modules/<module>/app/components/**/*.html.erb` |
| Button labels, menu items | `modules/<module>/config/locales/en.yml` (i18n keys) |
| Dialog IDs | Component templates — search for `id:` in `.html.erb` files |
| Test selectors | Search for `data-test-selector` or `test-selector` in templates |
| Component hierarchy | `modules/<module>/app/components/` directory tree |

Use a sub-agent (Explore type) to scan the module directory and extract all of the above in one pass.

### Handling i18n keys

Button labels and menu items are often i18n keys like `t("meeting.types.one_time")`. Always resolve them against the locale file to get the actual English string used as the accessible name.

### Verifying locators against runtime

Even with source code, verify ambiguous locators against the live DOM using `error-context.md` from a failed test run (cheaper than `dumpDom`). The most common mismatches are:
- `data-test-selector` attributes present in source but not rendered in the deployed build
- i18n keys resolving to different text than expected
- Heading levels (`h1` vs `h2`) set by Primer layout components

## Prerequisites

- OpenProject is running at `http://localhost:8090`
- The module may need to be enabled in Project Settings > Modules
- Chrome is available for browser automation (or use the playwright-cli skill)

## Live Browser Investigation Workflow (Fallback)

Use this when source code is unavailable or versions don't match.

### 1. Open the browser and log in

Log in as `admin` / `adminadmin` at `http://localhost:8090/login`.

### 2. Navigate to the Demo project

Go to the Demo project overview page.

### 3. Check if the module is enabled

Navigate to **Project Settings > Modules** and verify the target module is checked. If not, enable it and save.

### 4. Navigate to the module

Use the main menu sidebar to reach the module's landing page. Note:
- The exact link text in the sidebar
- The URL pattern (e.g., `/projects/demo-project/cost_reports`)

### 5. Explore each page and dialog

For every distinct page or dialog in the module:

1. **Take a snapshot** — use `dumpDom(page, { label: '<page-name>', waitForNetworkIdle: true })` to capture `aria.yml`, `content.html`, and `screenshot.png`
2. **Note the URL** — record the full path pattern
3. **Identify the key load indicator** — the element that confirms the page is ready (used for `waitForLoad()`)
4. **Catalog interactive elements** — buttons, links, dropdowns, form fields, tables
5. **Note DOM quirks** — duplicate IDs, elements that appear/disappear, ng-select dropdowns, Turbo frames, elements that are `<a>` instead of `<button>`, etc.

### 6. Test interactions

- Fill forms, click buttons, open dialogs, delete entities
- Note any confirmation dialogs, redirects, or Turbo-driven navigation
- Watch for elements that change after actions (tables reloading, flash messages)

## Output Format

After investigation, produce a report with these sections:

```markdown
# Module Investigation Report: <Module Name>

## Module Activation
- Enabled by default: yes/no
- Settings path: Project Settings > Modules > <checkbox label>

## Navigation
- Main menu link text: "<exact text>"
- Main menu link selector: `<CSS or role selector>`
- Landing URL: `/projects/demo-project/<path>`

## Pages Discovered

| Page | URL Pattern | Key Load Element | Notes |
|------|-------------|-----------------|-------|
| ...  | ...         | ...             | ...   |

## Components Discovered

| Component | Found On | Root Element | Purpose |
|-----------|----------|-------------|---------|
| ...       | ...      | ...         | ...     |

## DOM Quirks
- <list any non-obvious behaviors, duplicate elements, etc.>

## Suggested File Structure
```
src/po/openproject/<module>/
├── <page1>Page.ts
├── <page2>Page.ts
└── <component>Comp.ts
```

## MainMenuComp Addition
- Locator: `<suggested locator for sidebar link>`
- Method: `click<Module>Link(): Promise<<LandingPage>>`
```

## Tips from Past Investigations

- **Module enablement**: Some modules (e.g., "Costs") are disabled by default. Always check Project Settings > Modules first.
- **ng-select dropdowns**: OpenProject uses `ng-select` for many dropdowns. These are not native `<select>` elements — look for `ng-select` in the DOM and use `.locator('ng-select')` patterns.
- **`<a href="#">` links**: Many action "buttons" are actually `<a>` tags. Use `getByRole('link')` not `getByRole('button')`.
- **Hidden DOM elements**: Some elements exist in DOM but are visually hidden (mobile variants, collapsed menus). Check `aria.yml` for duplicates.
- **Escape key**: Dialogs and dropdowns often close with Escape. Note this for component methods.
- **Turbo navigation**: OpenProject uses Hotwire Turbo. Page transitions may not trigger full reloads — `waitForURL()` patterns may need adjustment.

## Next Steps

After completing the investigation report:
1. Follow the **architecture skill's module-scaffold checklist** to create POs and components
2. Then use the **write-web-test skill** to create tests against the new POs
