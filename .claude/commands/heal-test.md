# Heal Test: $ARGUMENTS

Run and fix the specified Playwright test.

## Steps

1. **Display the command** before execution:
   ```
   npx playwright test -g "$ARGUMENTS"
   ```

2. **Run the test** using `npx playwright test -g "$ARGUMENTS"`

3. **If the test passes**: Report success with a brief summary.

4. **If the test fails**:
   a. Summarize the error and identify the failing step
   b. Read the relevant test file and the page objects involved in the failure
   c. Diagnose the root cause (selector change, timing issue, data mismatch, missing element)
   d. Apply the **minimal fix** — prefer:
      - Updating a selector or locator
      - Adding or adjusting a wait condition
      - Fixing test data
   e. Re-run the test to verify the fix works

## Constraints

- Run **only** the specified test unless told otherwise
- Apply **minimal fixes only** — do not refactor unrelated code
- Prefer fixing selectors/waits over restructuring tests
- If the test requires a page object change, make the smallest change needed
- Follow all architecture rules from CLAUDE.md when making changes
- If the fix involves adding a new method to a page object, export it from `internals.ts`
