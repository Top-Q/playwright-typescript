import { Locator, Page } from '@playwright/test';
import { BaseComponent, BoardsPage } from '../../../../internals';
import { CostReportsPage } from '../timeandcosts/costReportsPage';
import { MeetingsPage } from '../meeting/meetingsPage';
import { MembersPage } from '../members/membersPage';
import { WorkPackagesPage } from '../workpackage/workPackagesPage';

/**
 * Represents the main menu component in OpenProject on the left of the page.
 * Allows navigation to different sections like Boards, Time and Costs, Meetings, and Members.
 */
export class MainMenuComp extends BaseComponent<MainMenuComp> {
  readonly boardsLink: Locator;

  readonly timeAndCostsLink: Locator;

  readonly meetingsLink: Locator;

  readonly membersLink: Locator;

  readonly workPackagesLink: Locator;

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
  }

  async waitForLoad(): Promise<MainMenuComp> {
    await this.boardsLink.waitFor();
    return this;
  }

  /**
   * Click on the 'Boards' menu item and returns a BoardsPage.
   * It will also change the menu to the boards menu.
   *
   * @returns
   */
  async clickBoardsLink(): Promise<BoardsPage> {
    await this.boardsLink.click();
    return await new BoardsPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Time and costs' menu item and returns a CostReportsPage.
   * @returns CostReportsPage
   */
  async clickTimeAndCostsLink(): Promise<CostReportsPage> {
    await this.timeAndCostsLink.click();
    return await new CostReportsPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Meetings' menu item and returns a MeetingsPage.
   * @returns MeetingsPage
   */
  async clickMeetingsLink(): Promise<MeetingsPage> {
    await this.meetingsLink.click();
    return await new MeetingsPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Members' menu item and returns a MembersPage.
   * @returns MembersPage
   */
  async clickMembersLink(): Promise<MembersPage> {
    await this.membersLink.click();
    return await new MembersPage(this.page).waitForLoad();
  }

  /**
   * Click on the 'Work packages' menu item and returns a WorkPackagesPage.
   *
   * Navigates to the work packages list for the currently selected project.
   *
   * @returns WorkPackagesPage
   */
  async clickWorkPackagesLink(): Promise<WorkPackagesPage> {
    await this.workPackagesLink.click();
    return await new WorkPackagesPage(this.page).waitForLoad();
  }
}
