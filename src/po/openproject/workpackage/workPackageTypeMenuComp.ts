import { Page } from '@playwright/test';
import { BaseComponent } from '../baseComponent';
import { NewWorkPackagePage } from './newWorkPackagePage';

/**
 * # Work Package Type Menu Component
 *
 * This component represents the dropdown menu that appears after clicking the
 * "Create new work package" toolbar button on the work packages list page.
 *
 * The menu lists the available work package types (e.g. Task, Milestone, Phase,
 * Summary task) as `menuitem` entries. Selecting a type navigates the user to
 * the split-view create form (`NewWorkPackagePage`).
 *
 * The menu items live in an Angular overlay outside the regular DOM tree, so we
 * scope the root to the `menu` role directly on the page.
 */
export class WorkPackageTypeMenuComp extends BaseComponent<WorkPackageTypeMenuComp> {
  constructor(protected readonly page: Page) {
    super(page, page.getByRole('menu').describe('Work package type menu'));
  }

  async waitForLoad(): Promise<WorkPackageTypeMenuComp> {
    await this.rootComponent.first().waitFor();
    return this;
  }

  /**
   * ## Description
   * Selects a work package type from the dropdown menu by its visible label.
   * The label is matched case-insensitively against the menu items
   * (e.g. "task" matches the "Task" menu item).
   *
   * ## Aliases
   * ```ts
   * selectType(typeName: string);
   * clickType(typeName: string);
   * ```
   *
   * @param typeName - The work package type label (e.g. 'Task', 'Phase', 'Milestone').
   * @returns A `NewWorkPackagePage` instance for the create form.
   */
  async selectType(typeName: string): Promise<NewWorkPackagePage> {
    const normalised = typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase();
    const item = this.page
      .getByRole('menuitem', { name: normalised, exact: true })
      .describe(`Work package type menu item "${normalised}"`);
    await item.click();
    return await new NewWorkPackagePage(this.page).waitForLoad();
  }
}
