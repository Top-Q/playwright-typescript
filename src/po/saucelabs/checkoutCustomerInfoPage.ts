import { Locator, Page } from '@playwright/test';
import { CheckoutOverviewPage } from '../../../internals';

export class CheckoutCustomerInfoPage {
    private readonly firstNameInput: Locator;
    private readonly lastNameInput: Locator;
    private readonly postalCodeInput: Locator;
    private readonly continueButton: Locator;

    constructor(public readonly page: Page) {
        this.firstNameInput = this.page.locator('[data-test="firstName"]').describe('First name input');
        this.lastNameInput = this.page.locator('[data-test="lastName"]').describe('Last name input');
        this.postalCodeInput = this.page.locator('[data-test="postalCode"]').describe('Postal code input');
        this.continueButton = this.page.locator('[data-test="continue"]').describe('Continue button');
    }

    async fillFirstName(firstName: string): Promise<void> {
        await this.firstNameInput.fill(firstName);
    }

    async fillLastName(lastName: string): Promise<void> {
        await this.lastNameInput.fill(lastName);
    }

    async fillPostalCode(postalCode: string): Promise<void> {
        await this.postalCodeInput.fill(postalCode);
    }

    async clickContinue(): Promise<CheckoutOverviewPage> {
        await this.continueButton.click();
        return new CheckoutOverviewPage(this.page);
    }
}
