---
name: write-web-test
description: Generate UI test cases from business requirements. Creates missing page objects and components when needed, or spawns module-investigator for entirely unknown modules. Use when the user asks to write, create, or generate a UI or web test.
---

# Writing UI Tests

Use this skill when creating new UI/web test cases from business requirements or test specifications.

## Imports

Tests live in `tests/ui/<module>/<name>.spec.ts`, so from a test file:

- Import `test` from `../fixtures` — **never** from `@playwright/test`
- Import `expect` from `@playwright/test`
- Import page objects only from `../../../internals` (the barrel at the project root)

If your test file sits at a different depth, adjust the relative path to `fixtures.ts` and `internals.ts` accordingly.

## Test Structure

```typescript
test('description', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
    // Test steps go here
});
```

- One `test.step()` per Gherkin sentence — use the sentence exactly (or a very close, readable phrasing) as the step description
- Use the `tag` field to categorize: `@ui`, `@api`, `@regression`, `@task`, `@board`, etc.

## Variable Typing

Always define variables with the specific page object type. Never use `any` or `unknown`.

Define variables **outside** the step scope so they are accessible across steps:

```typescript
let workPackagesPage: WorkPackagesPage;
let newTaskPage: NewWorkpackagePage;

await test.step("Given user is on Work packages page", async () => {
    workPackagesPage = await readyOverviewPage.mainMenu().clickWorkPackagesLink();
});

await test.step("When user clicks create button", async () => {
    const taskTypeMenu = await workPackagesPage.clickCreateButton();
    newTaskPage = await taskTypeMenu.clickTaskMenuItem();
});
```

## Page Object Instantiation

- The **first** page object comes from the fixture (`readyOverviewPage`)
- All subsequent page objects come from **navigation methods** on the previous page object (fluent chain)
- Do **not** use `new` to instantiate page objects after the first one

## Test Isolation

- Tests must be runnable in isolation — no dependency on other tests
- Never assume test execution order
- If a test deletes an entity, it must first create that entity within the same test
- Use unique names with `Date.now()` or `crypto.randomUUID()` for test data

## Missing Page Objects or Methods

When the test requires page objects or methods that don't exist, handle it in tiers:

### Tier 1: Missing method on an existing PO

If a page object exists but lacks a needed method:
1. Check thoroughly — look at all methods, including aliases
2. Check if a similar method exists that can achieve the goal
3. If truly missing, **add the method** to the existing PO following the architecture skill's patterns (locators as `private readonly` with `.describe()`, getter methods, fluent navigation returns)
4. Run `npx eslint` on the modified PO file

### Tier 2: Entire PO or component missing

If a page or component has no PO at all but the module is known:
1. Create the PO/component following the architecture skill's templates ([page-objects.md](../architecture/references/page-objects.md), [components.md](../architecture/references/components.md))
2. Use `playwright-cli snapshot` to capture the page's ARIA tree, then `playwright-cli generate-locator <ref> --raw` to turn a ref into a real locator
3. Update `internals.ts` with the new export
4. Update `MainMenuComp` if the module needs a new sidebar navigation method
5. Run `npx eslint` on all new/modified files

### Tier 3: Entirely unknown module

If the module has never been automated and you have no knowledge of its pages:
1. Spawn the **`module-investigator`** agent first, giving it the module name and a path to write its report to. It works from the Rails source where the version matches and from the live app otherwise, in its own context so the investigation does not crowd out yours.
2. Follow the **architecture skill's module-scaffold checklist** to create all POs
3. Then return here to write the test

## Investigating Unfamiliar Pages

When you need to understand a page's structure to write accurate locators, look at the
running app rather than editing the test to make it report back.

1. Get a logged-in browser — Recipe A in [`../gen-test/references/browser.md`](../gen-test/references/browser.md):

```bash
PLAYWRIGHT_HTML_OPEN=never \
  npx playwright test tests/seed.spec.ts --project=chromium --debug=cli   # background
playwright-cli attach tw-XXXXXX                       # name is printed by the run
playwright-cli --s=tw-XXXXXX step-over                # x4 — clears the login fixture
playwright-cli --s=tw-XXXXXX goto http://localhost:8090/projects/demo-project/<page>
```

2. `playwright-cli --s=tw-XXXXXX snapshot "#content"` — the ARIA tree, with a `ref` on every element.
3. `playwright-cli --s=tw-XXXXXX generate-locator <ref> --raw` — emits the actual Playwright locator, which is more reliable than composing one by reading the tree.
4. `playwright-cli --s=tw-XXXXXX resume` when done; the run tears its own browser down.

**`pause-at` is broken** — it fails open and runs the test to completion instead of pausing. `step-over` is the control that works. If the page state you care about occurs mid-test, attach to *that* test and step to it.

If the test has already failed, read its trace first — `trace: 'on'` means the DOM and a
screenshot were captured at every action, and that costs nothing to open.

For investigating an entire module (multiple pages, navigation flows), spawn the **`module-investigator`** agent instead. The recipe above is for one page you can hold in your head; a whole module is enough archaeology to crowd out the test you are trying to write.

## Step-by-Step Workflow

1. **Understand the requirement** — read the business requirement carefully
2. **Check what POs exist** — look in `src/po/openproject/` and `internals.ts` for relevant page objects
3. **Decision gate:**
   - **Unknown module** (no PO directory exists) → spawn **`module-investigator`**, then scaffold POs via architecture skill
   - **Missing POs/components** (module directory exists but specific pages aren't covered) → create them following Tier 2 above
   - **All POs exist** → proceed to write the test
4. **Create or update POs** if needed — follow the architecture skill's patterns, lint every file
5. **Write the test** — follow all conventions in this skill (imports, steps, typing, isolation)
6. **Run the test** — execute with `npx playwright test <file>` and verify it passes
7. **Debug failures** — if the test fails, diagnose and fix (up to 3 iterations)
8. **Lint all touched files** — run `npx eslint <file>` on every generated or modified file and fix all errors
