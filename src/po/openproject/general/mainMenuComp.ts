import { Locator, Page } from '@playwright/test';
import { BaseComponent, BoardsPage } from '../../../../internals';
import { CostReportsPage } from '../timeandcosts/costReportsPage';
import { MeetingsPage } from '../meeting/meetingsPage';
import { MembersPage } from '../members/membersPage';
import { WorkPackagesPage } from '../workpackage/workPackagesPage';

/**
 * Represents the main menu component in OpenProject on the left of the page.
 * Allows navigation to different sections like Boards, Time and Costs, Meetings, and Members.
 *
 * Some modules replace the project menu with their own submenu once opened —
 * the work packages list, for instance, swaps the project entries for its saved
 * queries and adds a "Go back one menu level" link. Every navigation method
 * therefore returns the menu to its project root first, so navigation works
 * from anywhere in the project.
 */
export class MainMenuComp extends BaseComponent<MainMenuComp> {
  readonly boardsLink: Locator;

  readonly timeAndCostsLink: Locator;

  readonly meetingsLink: Locator;

  readonly membersLink: Locator;

  readonly workPackagesLink: Locator;

  private readonly goBackOneMenuLevelLink: Locator;

  constructor(page: Page) {
    super(page, page.locator('.main-menu'));
    this.boardsLink = this.rootComponent
      .getByRole('link', { name: 'Boards' })
      .describe('Boards Link in Main Menu');
    this.timeAndCostsLink = this.rootComponent
      .getByRole('link', { name: 'Time and costs' })
      .describe('Time and Costs Link in Main Menu');
    this.meetingsLink = this.rootComponent
      .getByRole('link', { name: 'Meetings' })
      .describe('Meetings Link in Main Menu');
    this.membersLink = this.rootComponent
      .getByRole('link', { name: 'Members' })
      .describe('Members Link in Main Menu');
    this.workPackagesLink = this.rootComponent
      .getByRole('link', { name: 'Work packages', exact: true })
      .describe('Work packages Link in Main Menu');
    this.goBackOneMenuLevelLink = this.rootComponent
      .getByRole('link', { name: 'Go back one menu level' })
      .describe('Go back one menu level link in Main Menu');
  }

  async waitForLoad(): Promise<MainMenuComp> {
    await this.boardsLink.waitFor();
    return this;
  }

  /**
   * Returns the menu to the project's own entries when a module has replaced
   * them with its submenu. A no-op when the menu is already at that level.
   */
  private async showProjectMenu(): Promise<void> {
    // Bounded rather than unbounded so a menu that never collapses cannot spin.
    for (let level = 0; level < 3; level += 1) {
      if (!(await this.goBackOneMenuLevelLink.first().isVisible())) {
        return;
      }
      await this.goBackOneMenuLevelLink.first().click();
    }
  }

  /**
   * Click on the 'Boards' menu item and returns a BoardsPage.
   * It will also change the menu to the boards menu. The menu is returned to
   * the project level first, so this works from inside another module too.
   *
   * @aliases openBoards, goToBoards, navigateToBoards
   * @prerequisites A project is open
   * @observable-state The browser navigates to the project's boards list and the menu switches to the boards submenu
   * @returns A `BoardsPage` for the project's boards list.
   */
  async clickBoardsLink(): Promise<BoardsPage> {
    await this.showProjectMenu();
    await this.boardsLink.click();
    return await new BoardsPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Time and costs' menu item and returns a CostReportsPage.
   * The menu is returned to the project level first, so this works from inside
   * another module too.
   *
   * @aliases openTimeAndCosts, goToCostReports, navigateToTimeAndCosts
   * @prerequisites A project is open
   * @observable-state The browser navigates to the project's cost reports page
   * @returns A `CostReportsPage` for the project's cost reports.
   */
  async clickTimeAndCostsLink(): Promise<CostReportsPage> {
    await this.showProjectMenu();
    await this.timeAndCostsLink.click();
    return await new CostReportsPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Meetings' menu item and returns a MeetingsPage.
   * The menu is returned to the project level first, so this works from inside
   * another module too.
   *
   * @aliases openMeetings, goToMeetings, navigateToMeetings
   * @prerequisites A project is open
   * @observable-state The browser navigates to the project's meetings list
   * @returns A `MeetingsPage` for the project's meetings list.
   */
  async clickMeetingsLink(): Promise<MeetingsPage> {
    await this.showProjectMenu();
    await this.meetingsLink.click();
    return await new MeetingsPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Members' menu item and returns a MembersPage.
   * The menu is returned to the project level first, so this works from inside
   * another module too — inside the work packages module, for instance, the
   * project entries are replaced by that module's saved queries.
   *
   * @aliases openMembers, goToMembers, navigateToMembers
   * @prerequisites A project is open
   * @observable-state The browser navigates to the project's members list
   * @returns A `MembersPage` for the project's members list.
   */
  async clickMembersLink(): Promise<MembersPage> {
    await this.showProjectMenu();
    await this.membersLink.click();
    return await new MembersPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Work packages' menu item and returns a WorkPackagesPage.
   *
   * Navigates to the work packages list for the currently selected project.
   * The menu is returned to the project level first, so this works from inside
   * another module too.
   *
   * @aliases openWorkPackages, goToWorkPackages, navigateToWorkPackages, openTasks
   * @prerequisites A project is open
   * @observable-state The browser navigates to the project's work packages list and the menu switches to the work packages submenu
   * @returns A `WorkPackagesPage` for the project's work packages list.
   */
  async clickWorkPackagesLink(): Promise<WorkPackagesPage> {
    await this.showProjectMenu();
    await this.workPackagesLink.click();
    return await new WorkPackagesPage(this.page).waitForLoad();
  }
}
