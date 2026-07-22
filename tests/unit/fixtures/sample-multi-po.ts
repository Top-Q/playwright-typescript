/* eslint-disable @typescript-eslint/no-unused-vars, require-await */
/**
 * Fixture for the POM catalog extractor unit tests.
 *
 * Deliberately exercises every extraction branch in one file:
 * two exported classes, an abstract base, an async action method, a sync
 * method returning a component, a Locator getter, a private method, and a
 * method carrying the full custom tag set. Not real page objects — the shapes
 * are what matter.
 */

import type { Locator, Page } from '@playwright/test';

/**
 * Abstract base used by the sample page.
 *
 * @aliases SampleBase
 */
export abstract class SampleBasePage<T = unknown> {
  constructor(protected readonly page: Page) {}

  abstract waitForLoad(): Promise<T>;
}

/**
 * A sample items page.
 *
 * @aliases SampleItemsPage, ItemsScreen
 * @url /projects/:projectId/items
 */
export class ItemsPage extends SampleBasePage<ItemsPage> {
  private readonly rowRoot: Locator;

  constructor(page: Page) {
    super(page);
    this.rowRoot = page.locator('.row');
  }

  async waitForLoad(): Promise<ItemsPage> {
    return this;
  }

  /** Exposes the row container. */
  get firstRow(): Locator {
    return this.rowRoot.first();
  }

  /**
   * Creates a new item with the given name.
   *
   * @aliases addItem, newItem
   * @prerequisites The user is on the items page
   * @observable-state A new row appears in the items table
   * @param name - The item name.
   */
  async createItem(name: string): Promise<ItemsPage> {
    await this.rowRoot.fill(name);
    return this;
  }

  /** Returns the filter panel without navigating. */
  filterPanel(): FilterPanelComp {
    return new FilterPanelComp(this.page);
  }

  /** Not part of the public surface. */
  private buildQuery(): string {
    return 'q';
  }
}

/**
 * A sample filter component.
 *
 * @aliases FilterComp
 */
export class FilterPanelComp {
  constructor(private readonly page: Page) {}

  /**
   * Applies the filter.
   *
   * @deprecated Use ItemsPage.createItem filtering instead.
   */
  async apply(): Promise<void> {
    // no-op
  }
}
