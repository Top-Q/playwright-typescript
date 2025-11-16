# Create Task Work Package — Test Plan

## Executive summary
This test plan covers creating a Work Package of type "Task" in the Demo Project (OpenProject UI). It includes happy path flows, negative and edge cases, validation checks, UI and workflow interactions, and cleanup steps. All scenarios assume a fresh session and a user with permissions to create work packages (admin or project manager).

## Application / Page under test
- Project: Demo project
- Page: Work packages create form / Work packages list
- URL (example): http://localhost:8080/projects/demo-project/work_packages
- User role: Admin (or any role with create work package permission)

## Assumptions & starting state
1. Browser session is fresh (no pre-filled draft).  
2. Tester is logged in as a user with create permissions.  
3. Selected project is "Demo project".  
4. Work package type "Task" exists and is available in the type selector.  
5. No preconditions (parent work package linkage, specific custom fields, or required fields beyond defaults) unless noted in a scenario.

## Test data
- Valid short title: "Implement login feature"  
- Valid long title (boundary): 500 characters (generate programmatically)  
- Blank / empty title: ""  
- Valid description: "Implement authentication using OAuth2. Include unit tests."  
- Large description: ~50,000 chars  
- Dates: Start: 2025-11-11, Due: 2025-11-30  
- Invalid date: 2025-02-30  
- Assignee: existing user (e.g., `demo.user@example.com`)  
- Nonexistent assignee: `no-such-user@example.com`  
- Priority: Normal / High  
- Attachment: small image (png), large file (100MB)  
- Special chars: `<script>alert(1)</script>`, emoji, non-latin scripts  

## Success criteria (what "pass" looks like)
- Work package of type Task is created and visible in list and detail view.  
- All provided field values are persisted and displayed correctly.  
- Required validations prevent invalid submissions with clear messages.  
- UI shows expected states (loading, success banner, error messages).  

## Failure conditions (what to mark as fail)
- Form accepts invalid data (empty required fields, invalid dates) without validation.  
- Saved WP shows truncated/malformed data.  
- Attachments fail silently or cause UI crash.  
- Unexpected server errors (500) without actionable feedback.

---

## Test scenarios
Each scenario lists: assumptions (start state), step-by-step actions, expected outcomes, success criteria, and failure conditions.

### 1. Happy path — Create Task with minimum required fields
Assumptions: fresh state, user logged in, project selected, Task type available.
Steps:
1. Go to Project > Work packages.  
2. Click the "+" / "Create" / "New work package" button.  
3. Select type: `Task` (if not preselected).  
4. Enter Subject/Title: "Implement login feature".  
5. (Optional) Leave other fields empty or at default.  
6. Click `Save`.
Expected results:
- Form submission is accepted.  
- Navigator returns to work package list or opens new work package detail view.  
- New work package appears in the list with the correct subject and type indicator (Task).  
- No validation errors visible.
Success: new Task created and visible in detail and list.  
Failure: submission blocked incorrectly, or created item missing/incorrect.

### 2. Create Task with full fields populated
Assumptions: project has fields for Assignee, Dates, Priority, Attachments.
Steps:
1. Open create form and choose `Task`.  
2. Fill Title, Description, Assignee, Start/Due dates, Priority, Category and add an attachment.  
3. Click `Save`.
Expected:
- All values saved and visible in the work package detail (title, description, formatted dates, assignee name, priority, attachment visible with download link).  
- Attachment downloads correctly.
Success: all fields persist correctly.
Failure: missing fields, date mis-formatting, broken attachment link.

### 3. Validation — Empty required fields
Assumptions: Title (Subject) is required.
Steps:
1. Open create form, choose `Task`.  
2. Clear subject (leave blank).  
3. Click `Save`.
Expected:
- Form shows inline validation error for Subject (e.g., "Subject can't be blank").  
- Save is prevented.
Success: validation error displayed; no work package created.
Failure: form saves empty subject or shows unclear errors.

### 4. Validation — Invalid dates and chronologies
Assumptions: Start and Due date fields exist and expect valid dates.
Steps:
1. Set Start date to a date after Due date (or set invalid calendar date).  
2. Click `Save`.
Expected:
- Inline validation or global error explaining date inconsistency.  
- Save is prevented until fixed.
Success: clear message and blocked save.  
Failure: inconsistent dates accepted or crash.

### 5. Edge case — Extremely long title and description
Assumptions: UI and database have limits (unknown). Test how UI behaves.
Steps:
1. Create a Task with title 500+ chars and description ~50k chars.  
2. Click `Save`.
Expected:
- Either successful save and content truncated gracefully with a warning, or server returns a validation error with a clear message.  
- UI does not crash or hang.
Success: graceful handling (clear error or success).  
Failure: UI or server error, silent truncation without warning, corrupted display.

### 6. Special characters and XSS protection
Assumptions: Description & title are stored and rendered safely.
Steps:
1. Enter `<script>alert('x')</script>` in subject and description.  
2. Save the work package.  
3. View detail and list where the title/description is rendered.
Expected:
- Text is escaped; no script executes.  
- The literal script tags (or a sanitized form) are visible or replaced safely.
Success: no execution, safe rendering.  
Failure: alert executes or markup is injected.

### 7. Large file attachment handling
Assumptions: System has a file size limit; UI indicates progress.
Steps:
1. Attach a very large file (near or above server limit).  
2. Click Save.
Expected:
- Upload progress shown.  
- If file too big, user sees clear error (e.g., "file too large") and save is prevented or proceeds without the attachment.  
- If allowed, file attaches and is downloadable.
Success: clear feedback and graceful error handling.  
Failure: UI freeze, timeout without feedback, silent failure.

### 8. Save & create another / Draft behavior
Assumptions: UI provides "Save and create another" or auto-save draft.
Steps:
1. Fill some fields and click `Save and create another` (or equivalent).  
2. Observe whether the form resets and a new draft is created.  
Expected:
- The WP is saved, form cleared for new entry, and newly created WP is available in list.  
- Drafts (if auto-saved) appear in drafts area or are recoverable after navigation.
Success: workflow is consistent and no data loss.  
Failure: data lost or duplicate creation.

### 9. Cancel creation
Assumptions: Cancel button present and discards unsaved data.
Steps:
1. Fill multiple fields but click `Cancel` instead of save.  
2. Navigate back to Work packages list.
Expected:
- No new work package is created.  
- Optionally, confirmation appears asking to discard unsaved changes.
Success: no WP created; changes discarded.  
Failure: partial save or unexpected draft creation.

### 10. Permission checks
Assumptions: Test with a user lacking create permission.
Steps:
1. Log in as a read-only user.  
2. Navigate to Work packages.  
3. Confirm whether `Create` button is visible/functional.  
4. Attempt to access the create form by direct URL.
Expected:
- Create UI is hidden or disabled.  
- Direct URL returns access denied / redirect.  
Success: create denied for unauthorized users.  
Failure: unauthorized creation possible.

---

## Test execution notes
- Keep each scenario independent; where possible, create and then delete test artifacts in the same scenario.  
- Use unique subject names (e.g., prefix with `TEST-YYYYMMDD-HHMM-`) to avoid collisions.  
- Verify both list view and detail view for persisted values.  

## Cleanup steps
- Delete test work packages created during testing (filter by subject prefix).  
- Remove uploaded attachments if they remain.  

## Traceability / Coverage
- Happy path: Scenario 1 & 2.  
- Validation: Scenarios 3 & 4.  
- Security/XSS: Scenario 6.  
- Performance / large payloads: Scenario 5 & 7.  
- Workflow UX: Scenarios 8 & 9.  
- Permissions: Scenario 10.

## Risk & priorities
1. Validation checks (high priority) — prevents bad data.  
2. XSS/security (high) — prevent script injection.  
3. Attachments and large payloads (medium) — common failure point.  
4. Workflow UX (medium) — drafts and save flows.

## Recommended automation candidates
- Happy path create & verify detail (smoke).  
- Validation for empty subject and invalid dates.  
- XSS test for rendering sanitized content.  

## Appendix — Quick checklist for each scenario
1. Start: fresh session, correct project, correct role.  
2. Run steps exactly in order.  
3. Capture screenshots for failure cases and server logs.  
4. Verify data persisted in both UI and API (where applicable).  

---

End of test plan.
