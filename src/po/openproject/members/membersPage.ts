import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { MemberTableComp } from './memberTableComp';

/**
 * Represents the Members list page at /projects/:id/members.
 * Shows project members in a table with options to add, filter, and manage members.
 * The "+ Member" button toggles an inline form for adding new members.
 *
 * Sidebar navigation: All | Locked | Invited, Project roles, Work package shares.
 * Filter panel: Status, Role, Work package shares, Name.
 *
 * @aliases ProjectMembersPage, MemberListPage, TeamPage
 * @url /projects/:projectId/members
 */
export class MembersPage extends BasePage<MembersPage> {
  private readonly addMemberButton: Locator;
  private readonly filterButton: Locator;
  private readonly memberTableRoot: Locator;
  private readonly addMemberForm: Locator;
  private readonly closeFormLink: Locator;
  // Add member form locators
  private readonly memberSearchInput: Locator;
  private readonly autocompleterOptions: Locator;
  private readonly selectedPrincipals: Locator;
  private readonly roleSelect: Locator;
  private readonly submitAddMemberButton: Locator;
  // Filter panel locators
  private readonly filterNameInput: Locator;
  private readonly filterApplyButton: Locator;
  private readonly filterClearButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addMemberButton = page
      .getByRole('button', { name: 'Add member' })
      .describe('Add member button');
    this.filterButton = page
      .getByRole('button', { name: 'Filter' })
      .describe('Filter toggle button');
    this.memberTableRoot = page.locator('table.generic-table').describe('Members table');
    this.addMemberForm = page.locator('#members_add_form').describe('Add member inline form');
    this.closeFormLink = page
      .getByRole('link', { name: 'Close form' })
      .describe('Close add member form link');

    // Add member form. The user field is an ng-select rendered by the
    // `opce-members-autocompleter` Angular component; the role field is a
    // plain `select_tag` (#member_role_ids), so `selectOption` works on it.
    this.memberSearchInput = this.addMemberForm
      .getByRole('combobox', { name: 'Search', exact: true })
      .describe('Add member user search field');
    // The ng-select panel is configured with `appendTo: "body"`, so it
    // renders outside the form and must be located from the page.
    this.autocompleterOptions = page
      .locator('.ng-dropdown-panel')
      .getByRole('option')
      .describe('Add member autocompleter options');
    this.selectedPrincipals = this.addMemberForm
      .locator('.ng-value')
      .describe('Selected principals in add member form');
    this.roleSelect = this.addMemberForm
      .getByRole('combobox', { name: 'Assign role to new members' })
      .describe('Add member role dropdown');
    // The submit button carries the `icon-checkmark` class, whose
    // `::before` renders an icon-font glyph (U+F138). Playwright folds
    // CSS `content` into the accessible name, so the real name is that
    // glyph followed by "Add" — an exact match on "Add" resolves to zero
    // elements. Scoping to the form already excludes the page-header
    // "Add member" button, so a substring match is unambiguous here.
    this.submitAddMemberButton = this.addMemberForm
      .getByRole('button', { name: 'Add' })
      .describe('Add member submit button');

    // Filter panel
    this.filterNameInput = page
      .getByRole('textbox', { name: /Name/ })
      .describe('Name filter input');
    this.filterApplyButton = page
      .getByRole('button', { name: 'Apply' })
      .describe('Apply filter button');
    this.filterClearButton = page
      .getByRole('button', { name: 'Clear' })
      .describe('Clear filter button');
  }

  async waitForLoad(): Promise<MembersPage> {
    await this.addMemberButton.waitFor();
    return this;
  }

  /**
   * Returns the member table component, used to count members, list their
   * names, and reach individual rows for role changes or removal.
   *
   * @aliases getMemberTable, table, membersTable
   * @prerequisites The Members page is open
   * @observable-state None — returns a component wrapper without interacting
   * @returns A `MemberTableComp` for the members table.
   */
  memberTable(): MemberTableComp {
    return new MemberTableComp(this.page, this.memberTableRoot);
  }

  /**
   * Opens the inline add member form via the "+ Member" button. Idempotent —
   * if the form is already open this does nothing.
   *
   * @aliases showAddMemberForm, clickAddMember, openInviteForm
   * @prerequisites The Members page is open
   * @observable-state The inline add member form is visible, exposing the user search field and role dropdown
   */
  async openAddMemberForm(): Promise<void> {
    if (!(await this.addMemberForm.isVisible())) {
      await this.addMemberButton.click();
      await this.addMemberForm.waitFor();
    }
  }

  /**
   * Checks whether the inline add member form is currently visible.
   *
   * @aliases isAddFormOpen, addMemberFormIsVisible
   * @prerequisites The Members page is open
   * @observable-state None — read-only query
   * @returns True if the add member form is visible, false otherwise.
   */
  async isAddMemberFormVisible(): Promise<boolean> {
    return await this.addMemberForm.isVisible();
  }

  /**
   * Closes the inline add member form. Idempotent — does nothing if the form
   * is already closed.
   *
   * @aliases hideAddMemberForm, cancelAddMember, dismissAddForm
   * @prerequisites The Members page is open
   * @observable-state The add member form is hidden and no member is added
   */
  async closeAddMemberForm(): Promise<void> {
    if (await this.addMemberForm.isVisible()) {
      await this.closeFormLink.click();
    }
  }

  /**
   * Selects the principal to add in the inline add member form: types the
   * given name or email into the user search field and picks the matching
   * entry from the autocompleter. When the value is an email address with no
   * existing account, the autocompleter offers an "invite by email" entry —
   * this selects that entry, which is what turns the submission into an
   * external invite.
   *
   * @aliases enterExternalEmail, inviteByEmail, searchForUser, selectPrincipal
   * @prerequisites The inline add member form is open — call {@link openAddMemberForm} first
   * @observable-state The chosen user or email is selected in the add form's search field; nothing is persisted until the form is submitted
   * @param nameOrEmail - The user name or email address to select or invite.
   */
  async selectMemberToAdd(nameOrEmail: string): Promise<void> {
    await this.memberSearchInput.click();
    await this.memberSearchInput.fill(nameOrEmail);

    // For an existing user the option is their display name; for an address
    // with no account it is "Send invite to <email>". Both contain the query.
    const option = this.autocompleterOptions.filter({ hasText: nameOrEmail }).first();
    await option.click();

    // Confirm the pick actually registered before the caller moves on.
    await this.selectedPrincipals.filter({ hasText: nameOrEmail }).waitFor();
  }

  /**
   * Selects a role in the inline add member form's role dropdown. This sets
   * the role for the member about to be added; it does not change the role of
   * an existing member (use {@link MemberTableRowComp.clickManageRoles} for
   * that).
   *
   * @aliases chooseRole, setMemberRole, pickRole, selectMemberRole
   * @prerequisites The inline add member form is open — call {@link openAddMemberForm} first
   * @observable-state The role dropdown shows the given role as selected; nothing is persisted until the form is submitted
   * @param role - The role to assign, e.g. "Member", "Reader", "Project admin".
   */
  async selectRole(role: string): Promise<void> {
    await this.roleSelect.selectOption({ label: role });
  }

  /**
   * Clicks "Add" to submit the inline add member form, waits for the create
   * request to complete, and returns the reloaded Members page so the members
   * table reliably reflects the new member.
   *
   * Submitting posts the form and the server redirects to the members list
   * with `?status=all`, so this is a full page load rather than a Turbo swap.
   *
   * @aliases clickAdd, confirmAddMember, saveMember, submitInvite
   * @prerequisites A principal and a role have been chosen in the open add member form
   * @observable-state The member is created, the add form closes, and a new row appears in the members table
   * @returns The reloaded `MembersPage`.
   */
  async submitAddMemberForm(): Promise<MembersPage> {
    await this.submitAddMemberButton.click();
    // `waitForLoadState` alone resolves against the still-current
    // document, so it returns before the POST has even left the page.
    // The form closing marks the document swap, and the redirect to
    // `?status=all` (members_controller.rb#create) marks a *successful*
    // create — an invalid submission re-renders the form in place, so
    // this fails fast instead of reporting a member that was never added.
    await this.addMemberForm.waitFor({ state: 'hidden' });
    await this.page.waitForURL(/[?&]status=all/);
    return await new MembersPage(this.page).waitForLoad();
  }

  /**
   * Adds a member end to end: opens the add form if needed, selects the user
   * or email, assigns the role, and submits. Use this when a test only needs
   * a member to exist; drive {@link selectMemberToAdd}, {@link selectRole}
   * and {@link submitAddMemberForm} separately when it needs to observe or
   * assert on the intermediate form state.
   *
   * @aliases addMemberToProject, inviteUser, createMember, addUser
   * @prerequisites The Members page is open and the named user (or email) can be granted the role
   * @observable-state The member is added and appears as a new row in the members table
   * @param userNameOrEmail - The name or email to search for.
   * @param role - The role to assign. Defaults to 'Member'.
   */
  async addMember(userNameOrEmail: string, role: string = 'Member'): Promise<void> {
    await this.openAddMemberForm();
    await this.selectMemberToAdd(userNameOrEmail);
    await this.selectRole(role);
    await this.submitAddMemberForm();
  }

  // --- Filter methods ---

  /**
   * Opens the filter panel and waits for its Apply button, making the filter
   * fields usable.
   *
   * @aliases showFilterPanel, clickFilter, toggleFilterPanel
   * @prerequisites The Members page is open
   * @observable-state The filter panel opens, exposing the Status, Role, and Name filter fields
   */
  async openFilter(): Promise<void> {
    await this.filterButton.click();
    await this.filterApplyButton.waitFor();
  }

  /**
   * Types a name into the filter panel's Name field and applies the filter,
   * waiting for the resulting page load.
   *
   * @aliases searchMemberByName, applyNameFilter, filterMembers
   * @prerequisites The filter panel is open — call {@link openFilter} first
   * @observable-state The members table reloads showing only members matching the name
   * @param name - The member name to filter by.
   */
  async filterByName(name: string): Promise<void> {
    await this.filterNameInput.fill(name);
    await this.filterApplyButton.click();
    await this.page.waitForLoadState('load');
  }

  /**
   * Clears all active filters and waits for the resulting page load.
   *
   * @aliases resetFilter, removeFilters, clearAllFilters
   * @prerequisites The filter panel is open — call {@link openFilter} first
   * @observable-state The members table reloads showing the unfiltered member list
   */
  async clearFilter(): Promise<void> {
    await this.filterClearButton.click();
    await this.page.waitForLoadState('load');
  }

  // --- Sidebar navigation ---

  /**
   * Navigates to the "All" members view via the sidebar link.
   *
   * @aliases showAllMembers, viewAll
   * @prerequisites The Members page is open
   * @observable-state The table reloads showing every member regardless of status
   * @returns A `MembersPage` for the reloaded view.
   */
  async clickSidebarAll(): Promise<MembersPage> {
    await this.page.getByRole('link', { name: 'All', exact: true }).click();
    return await new MembersPage(this.page).waitForLoad();
  }

  /**
   * Navigates to the "Locked" members view via the sidebar link.
   *
   * @aliases showLockedMembers, viewLocked
   * @prerequisites The Members page is open
   * @observable-state The table reloads showing only members whose account is locked
   * @returns A `MembersPage` for the reloaded view.
   */
  async clickSidebarLocked(): Promise<MembersPage> {
    await this.page.getByRole('link', { name: 'Locked', exact: true }).click();
    return await new MembersPage(this.page).waitForLoad();
  }

  /**
   * Navigates to the "Invited" members view via the sidebar link.
   *
   * @aliases showInvitedMembers, viewInvited, viewPendingInvitations
   * @prerequisites The Members page is open
   * @observable-state The table reloads showing only members with a pending invitation
   * @returns A `MembersPage` for the reloaded view.
   */
  async clickSidebarInvited(): Promise<MembersPage> {
    await this.page.getByRole('link', { name: 'Invited', exact: true }).click();
    return await new MembersPage(this.page).waitForLoad();
  }

  /**
   * Checks whether a member with the given name exists in the table.
   * Convenience delegate to {@link MemberTableComp.hasMemberWithName}.
   *
   * Only inspects the rows currently displayed, so an active filter or a
   * status view other than "All" can hide an existing member.
   *
   * @aliases memberExists, isMemberVisible, hasMember
   * @prerequisites The Members page is open
   * @observable-state None — read-only query
   * @param name - The member name to look for.
   * @returns True if a matching row is displayed, false otherwise.
   */
  async hasMemberWithName(name: string): Promise<boolean> {
    return await this.memberTable().hasMemberWithName(name);
  }
}
