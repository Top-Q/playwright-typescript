---
name: write-api-test
description: Generate API test cases using the fluent OpenProjectClient and API fixtures — currently out of date, the client was removed (see the notice in the body). Use when the user asks to write, create, or generate an API test.
---

# Writing API Tests

> **Out of date: the API client this skill describes no longer exists.** `src/api/`
> (`OpenProjectClient`) and `tests/api/` (the `opclient` fixture) were removed in `82ea368`.
> Before writing an API test, the client and fixture have to be restored or rebuilt — tell
> the user rather than writing a test against imports that do not resolve. How to call the
> API meanwhile: [`environment.md`](../../../docs/app-under-test/environment.md#addresses).

Use this skill when creating new API test cases for the OpenProject backend.

## API Documentation

OpenProject API docs are accessible at `http://localhost:8090/api/docs`.

## Imports

- Import `test` from `./fixtures` (the API fixtures at `tests/api/fixtures.ts`)
- Import `expect` from `@playwright/test`

## Fixtures

The `opclient` fixture provides an authenticated `OpenProjectClient` instance. The client uses a fluent API pattern:

```typescript
// List work packages in a project
await client.project(1).workPackages().get({ pageSize: 5 });

// Create a work package
await client.project(1).workPackages().post({ subject: 'New Task' });

// Get a single work package
await client.workPackage(123).get();

// Update a work package (with optimistic locking)
await client.workPackage(123).patch({ subject: 'Updated', lockVersion: 2 });

// Delete a work package
await client.workPackage(123).delete();
```

## Test Structure

Follow the same BDD step structure as UI tests:

```typescript
test('should create a work package via API', { tag: ['@api', '@task'] }, async ({ opclient }) => {
    await test.step('When user creates a work package', async () => {
        // API call
    });

    await test.step('Then the work package exists', async () => {
        // Assertion
    });
});
```

- Use `test.step()` with Given/When/Then descriptions
- Group related tests with `test.describe()`
- Use specific types for response bodies, not generic `Record<string, unknown>`

## Linking the test to the vault

`tests/api` is tracked in the requirement vault like `tests/ui`. When the test is built from a vault
test case, follow *Linking the test to the vault* in the
[write-web-test skill](../write-web-test/SKILL.md): the test case must be `approved` (never tick it
yourself, rule 30), and the test carries a `@TC-…` tag plus a `built-from` annotation naming the
test case's `approved_hash`. Then run `npm.cmd run vault:lint -- --fix`.

## Environment

Configuration is loaded from `.env`:
- `OPENPROJECT_BASE_URL` — API base URL
- `OPENPROJECT_API_KEY` — Authentication token
- `OPENPROJECT_PROJECT_ID` — Default project ID

## Linting

After generating the test file, always run `npx eslint <file>` and fix all reported errors before finishing.

## Cleanup

Always clean up created resources. Delete entities in a final step or use fixture teardown:

```typescript
await test.step('Cleanup: delete created work package', async () => {
    await opclient.workPackage(createdId).delete();
});
```
