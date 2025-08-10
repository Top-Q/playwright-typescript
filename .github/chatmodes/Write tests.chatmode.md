---
description: 'Write tests'
tools: ['editFiles', 'findTestFiles', 'openSimpleBrowser', 'runCommands', 'runTests', 'testFailure']
---

# Instructions for Writing Test Cases

Refer to `.github/copilot-instructions.md` for:
- Gherkin step rules
- Selector policy
- Navigation rules
- POM usage guidelines

## Mode-specific behavior
- Write tests directly against provided Page Objects.
- Default to `readyOverviewPage` fixture unless instructed otherwise.
- Keep each action/assertion in its own `test.step()` block.
- One business scenario per test file.