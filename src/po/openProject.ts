import { Locator, Page } from "@playwright/test";

export abstract class BaseComponent {
  constructor(protected page: Page, protected rootLocator?: Locator) {
    
  }

  protected searcher() : Page | Locator {
    if (this.rootLocator) {
      return this.rootLocator;
    } else {
      return this.page;
    }
  } 
}

export abstract class BasePage extends BaseComponent{
  constructor(page: Page) {
    super(page);
  }
}

export class MainMenuComponent extends BaseComponent {
  private readonly workPackages: Locator;

  constructor(page: Page) {
    super(page);
    this.workPackages = page.locator("#main-menu-work-packages");
  }

  async clickOnWorkPackagesItm(): Promise<AllOpenWpPage> {
    await this.workPackages.click();
    return new AllOpenWpPage(this.page);
  }
}

export class OverviewPage extends BasePage {
  public readonly mainMenu: MainMenuComponent;

  constructor(page: Page) {
    super(page);
    this.mainMenu = new MainMenuComponent(page);
  }

}

export class NewTaskPage extends BasePage {
  private readonly subjectTb: Locator;
  private readonly estimatedTimeTb: Locator;
  private readonly saveBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.subjectTb = page.getByLabel('Subject', { exact: true });
    this.estimatedTimeTb = page.getByLabel('Estimated time', { exact: true })
    this.saveBtn = page.getByRole('button', { name: 'Save' });
  }

  async fillSubject(subject: string): Promise<NewTaskPage> {
    await this.subjectTb.fill(subject);
    return this;
  }

  async fillEstimatedTime(estimatedTime: string): Promise<NewTaskPage> {
    // await page.locator('#wp-new-inline-edit--field-assignee').getByRole('combobox').click();
    await this.estimatedTimeTb.fill(estimatedTime);
    return this;
  }

  async clickOnSaveBtn(): Promise<OverviewPage> {
    await this.saveBtn.click();
    return new OverviewPage(this.page);
  }

}


export class FilterComponent extends BaseComponent {

  private readonly filterByTextTb: Locator;

  constructor(page: Page) {
    super(page);
    this.filterByTextTb = page.getByPlaceholder('Subject, description, comments, ...');
  }

  async fillFilterByText(filterText: string): Promise<FilterComponent> {
    const responsePromise = this.page.waitForResponse('**/queries/**');
    await this.filterByTextTb.fill(filterText);
    const response = await responsePromise
    return this;
  }

}

export class Table extends BaseComponent {
  constructor(page: Page, rootLocator: Locator) {
    super(page, rootLocator);
  }

  async containsText(text: string): Promise<boolean> {
    return await this.searcher().locator('text=' + text).first().isVisible();
  }
}

export class ApplicationMenu extends BaseComponent {
  
  private readonly signOutBtn: Locator;
  
  constructor(page: Page, rootLocator: Locator) {
    super(page, rootLocator);
    this.signOutBtn = this.searcher().getByRole('link', { name: 'Sign out' });
  }

  async clickOnSignOutBtn(): Promise<LoginPage> {
    await this.signOutBtn.click();
    return new LoginPage(this.page);
  }
}


export class OpenProjectPage extends BasePage {

  private readonly selectAProjectToggle: Locator;
  private readonly applicationMenuLnk: Locator;
  private readonly applicationMenuRoot: Locator;
  


  constructor(page: Page) {
    super(page);
    this.selectAProjectToggle = page.locator("#projects-menu i");
    this.applicationMenuLnk = page.locator("a[title='OpenProject Admin']").locator(".op-app-menu--item-title");
    this.applicationMenuRoot = page.locator("#user-menu");
  }

  async clickOnSelectAProjectToggle(): Promise<OpenProjectPage> {
    await this.selectAProjectToggle.click();
    return this
  }

  async clickOnProjectName(projectName: string): Promise<OverviewPage> {
    await this.page.locator('.project-search-results').getByRole('link', { name: projectName }).click();
    return new OverviewPage(this.page);
  }

  async clickOnUserMenu(): Promise<ApplicationMenu> {
    await this.applicationMenuLnk.click();
    return new ApplicationMenu(this.page, this.applicationMenuRoot);
  }

  async doSelectProject(projectName: string): Promise<OverviewPage> {
    await this.clickOnSelectAProjectToggle();
    await this.clickOnProjectName(projectName);
    return new OverviewPage(this.page);
  }

}


export class AllOpenWpPage extends OpenProjectPage {
  
  private readonly createNewWpBtn: Locator;
  private readonly taskBtn: Locator;
  private readonly activateFilterBtn: Locator;
  private readonly deactivateFilterBtn: Locator;
  public readonly table: Table;


  constructor(page: Page) {
    super(page);
    this.createNewWpBtn = page.locator('wp-create-button').getByLabel('Create new work package');
    this.taskBtn = page.locator('#types-context-menu').getByLabel('Task' ,{ exact: true });
    this.activateFilterBtn = page.getByRole('button', { name: 'Activate Filter' });
    this.deactivateFilterBtn = page.getByRole('button', { name: 'Deactivate Filter' });
    this.table = new Table(page, page.locator('.work-package-table'));
  }

  async clickOnCreateNewWorkPackageBtn(): Promise<NewTaskPage> {
    await this.createNewWpBtn.click();
    await this.taskBtn.click();
    return new NewTaskPage(this.page);
  }

  async clickOnActivateFilterBtn(): Promise<FilterComponent>  {
    await this.activateFilterBtn.click();
    return new FilterComponent(this.page);
  }

  async clickOnDeactivateFilterBtn(): Promise<AllOpenWpPage> {
    await this.deactivateFilterBtn.click();
    return new AllOpenWpPage(this.page);
  }


}



export class LoginPage extends BasePage {
  /**
   * @param {import('playwright').Page} page 
   */

  private readonly usernameTb: Locator;
  private readonly passwordTb: Locator;
  private readonly signInBtn: Locator;
  private readonly siginInToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.siginInToggle = page.locator("span:has-text('Sign in')");
    this.usernameTb = page.locator('input[name="username"]');
    this.passwordTb = page.locator('input[name="password"]');
    this.signInBtn = page.locator('input:has-text("Sign in")');
  }
  async navigate(): Promise<LoginPage> {
    await this.page.goto('http://localhost:8080');
    return this;
  }

  async clickOnSignInToggle(): Promise<LoginPage> {
    await this.siginInToggle.click();
    return this;
  }
  async fillUsername(username: string): Promise<LoginPage> {
    await this.usernameTb.fill(username);
    return this;
  }
  async fillPassword(password: string): Promise<LoginPage> {
    await this.passwordTb.fill(password);
    return this;
  }
  async clickOnSignInBtn(): Promise<OpenProjectPage> {
    await this.signInBtn.click();
    return new OpenProjectPage(this.page);
  }
}