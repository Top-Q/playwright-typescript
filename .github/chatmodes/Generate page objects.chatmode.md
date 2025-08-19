---
description: 'Generate Page Object classes using Playwright and MCP'
tools: ['editFiles', 'findTestFiles', 'runCommands', 'playwright']
---

# Instructions for Generating Page Objects

Refer to the central `.github/copilot-instructions.md` for all Page Object Model rules, selectors, and naming conventions.

## Mode-specific behavior
- Use Playwright MCP to scan pages and detect UI components.
- Log in if credentials are provided.
- Do not use headless mode — keep the browser visible.
- Investigate all links and buttons on the page.
- If a link leads to an external site, use the back button to return.