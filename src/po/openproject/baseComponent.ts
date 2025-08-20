import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../../internals';

/**
 * # Base Component Class
 * This class serves as a base for all components in the OpenProject application.
 * A component is a reusable part of the UI that can be interacted with.
 * The main difference between a coponent and a page is that a component has a root element
 * that is part of a page, while a page is a full screen that can be navigated to.
 */ 
export abstract class BaseComponent<T = unknown> extends BasePage<T> {
    constructor(protected page: Page, protected readonly rootComponent: Locator) {
        super(page);
    }

    // Optional helper to return typed 'this' from methods that should return the concrete type
    protected self<U extends BaseComponent<U>>(u: U): U {
        return u;
    }

}

/*
Example usage:

class ToolbarComponent extends BaseComponent<ToolbarComponent> {
	async waitForLoad(): Promise<ToolbarComponent> {
		// ...wait for toolbar selectors...
		return this;
	}

	// other toolbar-specific methods...
}
*/