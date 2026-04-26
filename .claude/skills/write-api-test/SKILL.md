---
name: write-api-test
description: Generate API test cases using the fluent OpenProjectClient and API fixtures. Use when the user asks to write, create, or generate an API test.
---

# Writing API Tests

Use this skill when creating new API test cases for the OpenProject backend.

## API Documentation

OpenProject API docs are accessible at `http://localhost:8080/api/docs`.

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
