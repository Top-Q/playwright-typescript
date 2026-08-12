# Page-object method metadata

CLAUDE.md rule 12. Write these tags on **every public page-object method**. They are what make
the POM catalog searchable by intent rather than by exact name — an agent looking for "invite a user"
finds `addMember` only because `@aliases` says so.

| Tag                 | Answers                                                    | Example                                                    |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `@aliases`          | Other names someone might search by (2–4, comma-separated) | `@aliases addMember, inviteUser, createMember`             |
| `@prerequisites`    | What must be true before calling — state, not narrative    | `@prerequisites The add-member form is open`               |
| `@observable-state` | What a test could assert after calling                     | `@observable-state A new row appears in the members table` |

Classes additionally take a class-level `@aliases`. The leading comment text becomes the description;
standard `@param` / `@returns` / `@deprecated` are recognized.

```typescript
/**
 * Adds a member to the project by searching for a user name or email.
 *
 * @aliases addMemberToProject, inviteUser, createMember
 * @prerequisites The Members page is open
 * @observable-state A new row appears in the members table; a success flash is shown
 * @param userNameOrEmail - The name or email to search for.
 * @param role - The role to assign. Defaults to 'Member'.
 */
async addMember(userNameOrEmail: string, role: string = 'Member'): Promise<void> { ... }
```

`waitForLoad()` and non-public methods are excluded from the catalog automatically — do not tag them
for coverage.

## Why `@prerequisites` is state and not narrative

"The add-member form is open" is checkable by the caller before it calls. "First navigate to the
members page and click Add" is a procedure, which tells a reader what the author did rather than what
the method needs, and goes stale the moment the navigation changes.

## What enforces this

Nothing does, which is the point of writing it carefully. `npm run gate:catalog` proves the committed
catalog **matches** the source; it does not prove the tags are present. Coverage is measured by
`npm run catalog:report` and gated by nothing — the widest hole in the current gate set, per the
the footnote to rule 12 in CLAUDE.md.

The parser lives in `scripts/pom-catalog/jsdoc.ts` if you need to know exactly what it accepts.
