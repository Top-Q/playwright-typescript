---
description: 'Write tests'
tools: ['editFiles', 'findTestFiles', 'openSimpleBrowser', 'problems', 'runCommands', 'testFailure', 'usages', 'context7']
---

# Instructions for Writing Test Cases


## Guardrails
- **Importing Test Function**: Always import the `test` function from the `./fixtures` file.
- **Importing Page Objects**: Import Page Objects from the `../internals`
- **Page Object Insantiation**: Except the first page object instantiation, do not use `new` keyword to instantiate Page Objects. Use the methods provided by the previous page object to get the next page object.

---

## Gherkin Step Rules
- **Given**: Initial state or preconditions (e.g., "Given the user is on the home page").
- **When**: Actions taken by the user (e.g., "When the user clicks the 'Create Work Package' button").
- **Then**: Expected outcomes (e.g., "Then the work package should be created successfully").
- **And/But**: Additional conditions or actions (e.g., "And the user should see a confirmation message").

