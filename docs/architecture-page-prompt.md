# Reusable prompt — "architecture one-pager for management"

Hand this to any coding agent working in a test-automation repo. Fill in the `{{...}}`
placeholders, delete the bracketed notes, and send. Everything else is deliberate.

---

## The prompt

> **Goal.** Produce a single self-contained HTML page that explains the architecture of this
> test-automation project to a **management audience** — engineering managers and stakeholders who
> are technical enough to follow a diagram but will not read code. It must open by double-clicking
> the file: no server, no build step, no external CSS/JS/fonts/images (inline everything).
>
> **Step 1 — read the repo before you design anything.** Do not write a line of HTML until you
> have inspected the actual source. Specifically find:
>
> - the page-object / component classes and the base class they share
> - the test spec files, and the real titles of a handful of tests
> - the fixture or setup mechanism
> - the API-testing client, if there is one
> - the runner config (browsers, tracing, parallelism, base URLs)
>
> Every name on the page must be a name that exists in this repo. **Do not invent classes, tests
> or layers to fill out the diagram.** If something is documented but not present in the working
> tree, either mark it on the page as planned or leave it out — and tell me which you did and why.
> Count things (tests, page objects, modules) rather than estimating, and say in a footnote what
> the counts include and exclude.
>
> **Step 2 — content.** Structure the page as **layers**, drawn as a vertical stack read top to
> bottom, where each layer calls only the one beneath it. Label each boundary with what actually
> crosses it. Cover:
>
> 1. **Test cases** — the business-intent layer. Include real test titles with their tags.
> 2. **Fixtures / setup** — what is shared, and what teardown guarantees.
> 3. **Page objects and components** — name real ones. Explain the payoff in one sentence:
>    when the UI changes, one class changes.
> 4. **The runner** — Playwright: locators, waiting strategy, and what
>    evidence a run produces (traces, video, screenshots, reports).
> 5. **Transport** — how the suite reaches the product. Show this as a **fork**:
>    - the **UI path**, driving a real browser over CDP — 
>      include a diagram of test process → browser → application, and show the *return* channel
>      (events, DOM state, screenshots) separately from the outbound commands, because that return
>      channel is what produces failure evidence;
>    - the **HTTP API path**, calling {{the REST/GraphQL API}} directly, with the auth mechanism
>      and a few real client calls.
>
>   Make it visually obvious that both paths end at the **same deployed application** — that is the
>   point of showing them together.
>
> Add a short closing section on what the browser-driver integration buys the business in plain
> language (stability, diagnosis speed, nothing installed into the product, network visibility) and
> one on how UI and API coverage divide the work between them.
>
> **Step 3 — calibration.** This is a briefing document, not a landing page and not a design
> spec. Aim for one screen of orientation followed by detail that rewards scrolling. No code
> listings, no method signatures beyond a few illustrative one-liners, no file paths in the body
> text. If a manager cannot say what a section is *for* after reading its first sentence, cut it.
>
> **Step 4 — craft.** Real typographic hierarchy and a deliberate palette; class and test names set
> in a monospace face so they read as identifiers. Define colors as CSS custom properties and
> support light **and** dark (`prefers-color-scheme`), with an explicit background on `body`.
> Responsive down to a phone; any wide diagram or table scrolls inside its own container so the
> page body never scrolls sideways. Draw diagrams as inline SVG with an `aria-label` describing
> them — no image files, no diagram libraries.
>
> **Step 5 — report back.** Tell me where the file is, list the sections, state the figures you
> counted and how, and flag anything you could not verify in the source.
>
> Write the file to `architecture.html`.

---

## Why each part is there

| Instruction                          | What it prevents                                                        |
| ------------------------------------ | ----------------------------------------------------------------------- |
| "Read the repo before designing"     | A generic diagram of some other project's architecture                   |
| "Do not invent … tell me which"      | Plausible-looking classes that do not exist, presented to management     |
| "Count rather than estimate"         | Round numbers in a document someone will quote in a status meeting       |
| "Label each boundary"                | A stack of boxes that shows nesting but not the contract between layers  |
| "Show the return channel separately" | The transport reading as a one-way pipe, which hides where evidence comes from |
| "Briefing document, not a spec"      | Method signatures and file paths crowding out the message                |
| "Both paths end at the same app"     | UI and API testing reading as two unrelated efforts                      |

## Adapting it

- **Other stacks.** Replace the transport placeholders: WebDriver/W3C protocol for Selenium,
  in-browser execution for Cypress, HTTP client only for a pure API suite (then drop the fork and
  keep a single lane).
- **Non-test projects.** The skeleton — layers, boundary labels, one fork where the system meets
  the outside world — carries over to any architecture briefing. Steps 1, 3 and 5 are the
  transferable parts.
- **If the audience is engineers instead**, swap Step 3 for: include method signatures, the
  locator strategy, and the failure-diagnosis workflow; drop the business-payoff section.
