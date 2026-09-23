import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { ProjectSettingsGeneralPage } from './projectSettingsGeneralPage';

/**
 * Represents the "Change the project's identifier" page at
 * /projects/:identifier/identifier.
 *
 * This is the **only** place a project's identifier can be edited in
 * OpenProject 16 — the create form has no identifier field at all, the value
 * being generated server-side from the name on create. The field arrives
 * pre-filled with the current identifier, so this page also doubles as the
 * plainest way to read it.
 *
 * The rules the field enforces (`app/models/project.rb`): 1–100 characters,
 * only `a-z`, `0-9`, `-` and `_`, must not be all digits, must be unique, and
 * must not be one of the reserved words `new`, `menu`, `queries`,
 * `export_list_modal`.
 *
 * Changing an identifier changes every URL of the project, so a test that
 * changes it must use the new value afterwards.
 *
 * @aliases ChangeIdentifierPage, ProjectSlugPage, EditIdentifierPage
 * @url /projects/:projectIdentifier/identifier
 */
export class ProjectIdentifierPage extends BasePage<ProjectIdentifierPage> {
    private readonly identifierInput: Locator;
    private readonly updateButton: Locator;
    private readonly cancelLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // `f.text_field :identifier` in
        // `app/views/projects/identifier/show.html.erb`, id `project_identifier`.
        // Its label is a `styled_label_tag "identifier"`, whose `for` points at
        // an id that does not exist — so the input has **no accessible name**
        // and `getByRole('textbox', { name: 'Identifier' })` matches nothing.
        this.identifierInput = this.page
            .locator('#project_identifier')
            .describe('Project identifier field');
        this.updateButton = this.page
            .getByRole('button', { name: 'Update' })
            .describe('Update identifier button');
        this.cancelLink = this.page
            .getByRole('link', { name: 'Cancel' })
            .describe('Cancel identifier change link');
    }

    async waitForLoad(): Promise<ProjectIdentifierPage> {
        await this.page.waitForURL(/\/identifier$/);
        await this.identifierInput.waitFor();
        return this;
    }

    /**
     * Returns the identifier field, for a test that needs to assert on the
     * control itself (its value, or the validation state after a rejected
     * update).
     *
     * @aliases getIdentifierField, identifierTextBox, getIdentifierInput
     * @prerequisites The change-identifier page is open
     * @observable-state None — returns a locator without interacting
     * @returns The identifier textbox locator.
     */
    getIdentifierInput(): Locator {
        return this.identifierInput;
    }

    /**
     * Returns the identifier currently held in the field. On arrival that is
     * the project's stored identifier — the slug the server generated from the
     * project name when it was created.
     *
     * @aliases getIdentifier, readIdentifier, getSlug, getProjectIdentifier, getIdentifierValue, getValue
     * @prerequisites The change-identifier page is open
     * @observable-state None — read-only query
     * @returns The identifier field's value.
     */
    async getIdentifier(): Promise<string> {
        return await this.identifierInput.inputValue();
    }

    /**
     * Replaces the identifier in the field. Nothing is saved until
     * {@link clickUpdateButton}.
     *
     * @aliases setIdentifier, enterIdentifier, editIdentifier, fillSlug, changeIdentifier
     * @prerequisites The change-identifier page is open
     * @observable-state The field holds the new value; the project is unchanged until Update is clicked
     * @param identifier - The new identifier. Lower case letters, digits, `-` and `_` only.
     */
    async fillIdentifier(identifier: string): Promise<void> {
        await this.identifierInput.fill(identifier);
    }

    /**
     * Saves the identifier and returns the project settings page it redirects
     * to.
     *
     * `Projects::IdentifierController#update` redirects to the project's
     * settings page on success and re-renders this page with 422 on failure,
     * so waiting for that URL fails fast on a rejected value instead of
     * reporting a change that did not happen.
     *
     * @aliases clickUpdate, saveIdentifier, submitIdentifier, confirmIdentifier, clickSave, apply
     * @prerequisites A valid identifier has been entered — call {@link fillIdentifier} first
     * @observable-state The identifier is persisted, every URL of the project changes, and the browser lands on the project settings page
     * @returns A `ProjectSettingsGeneralPage` for the project under its new identifier.
     */
    async clickUpdateButton(): Promise<ProjectSettingsGeneralPage> {
        await this.updateButton.click();
        await this.page.waitForURL(/\/settings\/general/);
        return await new ProjectSettingsGeneralPage(this.page).waitForLoad();
    }

    /**
     * Leaves the page without saving, returning to the project settings page.
     *
     * @aliases clickCancel, discardIdentifierChange, abortIdentifierChange
     * @prerequisites The change-identifier page is open
     * @observable-state The identifier is unchanged and the browser navigates to the project settings page
     * @returns A `ProjectSettingsGeneralPage` for the project.
     */
    async clickCancelLink(): Promise<ProjectSettingsGeneralPage> {
        await this.cancelLink.click();
        return await new ProjectSettingsGeneralPage(this.page).waitForLoad();
    }
}
