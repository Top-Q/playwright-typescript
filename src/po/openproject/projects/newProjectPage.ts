import { Locator, Page } from '@playwright/test';
import { BasePage } from '../basePage';
import { OverviewPage } from '../general/overviewPage';
import { ProjectsPage } from './projectsPage';

/**
 * Represents the "New project" form at /projects/new.
 *
 * The form is deliberately small in OpenProject 16: a required **Name**, an
 * optional **Subproject of** autocompleter, an optional **Use template**
 * autocompleter, and the Create / Cancel controls. Project attributes marked
 * required by an administrator would add further fields.
 *
 * Two things about this page regularly surprise callers:
 *
 * - **There is no Identifier field here.** The identifier (the project's URL
 *   slug) is generated server-side on create by `acts_as_url`
 *   (`app/models/project.rb`), and is only editable *afterwards*, on the
 *   "Change the project's identifier" page — see {@link ProjectIdentifierPage}.
 *   To read the identifier a create just generated, use
 *   {@link OverviewPage.getProjectIdentifier}, which takes it from the URL the
 *   create redirects to. There is no "Advanced settings" disclosure on this
 *   page.
 * - **Create is never disabled.** It is rendered with `disabled: false`
 *   (`app/forms/projects/submit_or_cancel.rb`) even with the Name empty; an
 *   empty submit is rejected server-side and re-renders the form inline, with
 *   no flash banner. {@link isCreateButtonEnabled} therefore reports `true`
 *   throughout on this instance.
 *
 * Reached either from the projects list ({@link ProjectsPage.clickNewProjectButton},
 * always a *top-level* project) or from the header quick-add menu
 * (`GlobalHeaderComp.clickNewProjectMenuItem`, which pre-fills "Subproject of"
 * with the current project when one is open).
 *
 * @aliases CreateProjectPage, ProjectFormPage, NewProjectFormPage, AddProjectPage
 * @url /projects/new
 */
export class NewProjectPage extends BasePage<NewProjectPage> {
    private readonly nameInput: Locator;
    private readonly createButton: Locator;
    private readonly cancelLink: Locator;

    constructor(public readonly page: Page) {
        super(page);
        // `Projects::Settings::NameForm` renders a Primer text field labelled
        // "Name" with id `project_name` / name `project[name]`. The label shows
        // a required asterisk, but it is a separate node, so the accessible
        // name is the bare "Name" (unlike the login fields, whose asterisk is
        // part of the name).
        //
        // `exact` is not optional here. Accessible-name matching is a
        // case-insensitive *substring* by default, so a bare `{ name: 'Name' }`
        // also matches the projects list's "Project name filter" box — which,
        // arriving from that list, is still in the DOM for a moment. Without
        // `exact` this page reports itself loaded against the previous page,
        // and the name typed into it is lost on the pending navigation.
        this.nameInput = this.page
            .getByRole('textbox', { name: 'Name', exact: true })
            .describe('Project name field');
        // `Projects::SubmitOrCancel` — `<button name="submit" type="submit">`,
        // no id.
        this.createButton = this.page
            .getByRole('button', { name: 'Create' })
            .describe('Create project button');
        this.cancelLink = this.page
            .getByRole('link', { name: 'Cancel' })
            .describe('Cancel project creation link');
    }

    async waitForLoad(): Promise<NewProjectPage> {
        // The URL is checked first because the settings page also carries a
        // textbox named exactly "Name": on its own, the field cannot tell this
        // form from a page the browser has not left yet.
        await this.page.waitForURL((url) => url.pathname === '/projects/new');
        await this.nameInput.waitFor();
        return this;
    }

    /**
     * Returns the Name field, for a test that needs to assert on it directly
     * (its value, or `aria-invalid` after a rejected submit).
     *
     * @aliases getNameField, nameTextBox, getProjectNameInput
     * @prerequisites The New project form is open
     * @observable-state None — returns a locator without interacting
     * @returns The Name textbox locator.
     */
    getNameInput(): Locator {
        return this.nameInput;
    }

    /**
     * Returns the Create button, for a test that needs to assert on the control
     * itself rather than click it.
     *
     * @aliases getCreateButton, getSubmitButton, createButton
     * @prerequisites The New project form is open
     * @observable-state None — returns a locator without interacting
     * @returns The Create button locator.
     */
    getCreateButton(): Locator {
        return this.createButton;
    }

    /**
     * Types a project name into the Name field, replacing anything already
     * there. Nothing is persisted until {@link clickCreateButton}.
     *
     * @aliases enterName, setName, fillProjectName, setProjectName, fillTitle, enterProjectName
     * @prerequisites The New project form is open
     * @observable-state The Name field holds the given text; no project exists yet
     * @param name - The project name to enter.
     */
    async fillName(name: string): Promise<void> {
        await this.nameInput.fill(name);
    }

    /**
     * Reports whether the Create button is enabled.
     *
     * On OpenProject 16 this is `true` from the outset — the button is
     * rendered with `disabled: false` regardless of the form's contents, and an
     * invalid submission is rejected by the server rather than by the control.
     * Asserting that it "becomes enabled" after typing a name therefore proves
     * nothing; assert on the created project instead.
     *
     * @aliases isCreateEnabled, isSaveEnabled, isSubmitEnabled, canSubmit, isEnabled, isCreateButtonDisabled
     * @prerequisites The New project form is open
     * @observable-state None — read-only query
     * @returns True if the Create button is enabled.
     */
    async isCreateButtonEnabled(): Promise<boolean> {
        return await this.createButton.isEnabled();
    }

    /**
     * Submits the form and returns the new project's overview page.
     *
     * A successful create redirects to `/projects/<generated-identifier>`, so
     * this waits for that URL rather than for a load state: a rejected submit
     * (an empty or duplicate-identifier name) re-renders the form inside
     * `turbo-frame#projects-new-component` with the URL unchanged and no flash
     * banner, and this call then fails fast instead of handing back an
     * overview page for a project that was never created.
     *
     * The project it creates is top-level unless the form was opened with a
     * parent (see the class notes). Whatever it creates must be cleaned up by
     * the test that created it — see
     * {@link ProjectSettingsGeneralPage.deleteProject}.
     *
     * @aliases clickCreate, submitForm, createProject, saveProject, clickSave, submitNewProject
     * @prerequisites A name has been entered — call {@link fillName} first
     * @observable-state The project is created with a server-generated identifier and the browser lands on its overview page
     * @returns An `OverviewPage` for the newly created project.
     */
    async clickCreateButton(): Promise<OverviewPage> {
        await this.createButton.click();
        // `/projects/new` itself matches `/projects/<slug>` in shape, so the
        // literal "new" segment is excluded to keep a rejected submit from
        // looking like a successful one.
        await this.page.waitForURL(/\/projects\/(?!new$)[a-z0-9_-]+$/);
        return await new OverviewPage(this.page).waitForLoad();
    }

    /**
     * Abandons the form via Cancel, returning to the global projects list.
     *
     * @aliases clickCancel, abortCreate, discardNewProject
     * @prerequisites The New project form is open
     * @observable-state No project is created and the browser navigates to /projects
     * @returns The global `ProjectsPage`.
     */
    async clickCancelLink(): Promise<ProjectsPage> {
        await this.cancelLink.click();
        return await new ProjectsPage(this.page).waitForLoad();
    }
}
