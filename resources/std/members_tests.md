---
id: MEM-Invite-Member
suite: Members
feature: Members CRUD
component: members
priority: P1
tags: [ui, members, regression]
variables:
  memberEmail: "testmember-<uuid4>@example.com"
  role: "Member"
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Members page

Scenario: Invite a new member via email and verify they appear in the members list
  When the user invites a new member with email "<memberEmail>" and role "<role>"
  Then the invited member appears in the members list with email "<memberEmail>"
  And the invited member has "invited" status

---
id: MEM-Invite-Reader
suite: Members
feature: Members CRUD
component: members
priority: P1
tags: [ui, members, regression]
variables:
  memberEmail: "reader-<uuid4>@example.com"
  role: "Reader"
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Members page

Scenario: Invite a member with "Reader" role and verify the assigned role
  When the user invites a new member with email "<memberEmail>" and role "<role>"
  Then the member has the "<role>" role assigned

---
id: MEM-Change-Role
suite: Members
feature: Members role management
component: members
priority: P1
tags: [ui, members, regression]
variables:
  memberEmail: "rolechange-<uuid4>@example.com"
  initialRole: "Member"
  newRole: "Project admin"
setup:
  - invite_member: { email: "{{ memberEmail }}", role: "{{ initialRole }}" }
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Members page

Scenario: Change a member role from Member to Project admin
  When the user opens the manage roles dialog for member "<memberEmail>"
  And the user toggles the "<initialRole>" role
  And the user toggles the "<newRole>" role
  And the user saves the role changes
  Then the member now has the "<newRole>" role assigned

---
id: MEM-Remove-Member
suite: Members
feature: Members CRUD
component: members
priority: P1
tags: [ui, members, regression]
variables:
  memberEmail: "removeme-<uuid4>@example.com"
  role: "Member"
setup:
  - invite_member: { email: "{{ memberEmail }}", role: "{{ role }}" }
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Members page

Scenario: Remove a member from the project
  When the user removes the member with email "<memberEmail>"
  Then the member no longer appears in the members list

---
id: MEM-Filter-Members
suite: Members
feature: Members filtering
component: members
priority: P2
tags: [ui, members, regression]
variables:
  memberEmail: "filterable-<uuid4>@example.com"
  role: "Member"
setup:
  - invite_member: { email: "{{ memberEmail }}", role: "{{ role }}" }
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Members page

Scenario: Filter members by name and verify filtered results
  When the user opens the filter panel
  And the user filters members by name "<memberEmail>"
  Then the matching member is shown in the filtered results with email "<memberEmail>"

---
id: MEM-Sidebar-Invited
suite: Members
feature: Members sidebar navigation
component: members
priority: P2
tags: [ui, members, regression]
variables:
  memberEmail: "invited-<uuid4>@example.com"
  role: "Member"
setup:
  - invite_member: { email: "{{ memberEmail }}", role: "{{ role }}" }
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Members page

Scenario: Sidebar navigation shows invited members
  When the user clicks the "Invited" sidebar link
  Then the invited member with email "<memberEmail>" is shown in the list
