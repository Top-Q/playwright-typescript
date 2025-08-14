import { Locator, Page } from '@playwright/test';

/**
 * # Base Component Class
 * This class serves as a base for all components in the OpenProject application.
 * A component is a reusable part of the UI that can be interacted with.
 * The main difference between a coponent and a page is that a component has a root element
 * that is part of a page, while a page is a full screen that can be navigated to.
 */ 
export class BaseComponent {

    constructor(protected page: Page, protected rootComponent: Locator) {
    }

}