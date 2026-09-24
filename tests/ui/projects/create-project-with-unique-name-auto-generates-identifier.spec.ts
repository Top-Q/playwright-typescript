import { test } from '../fixtures';
import {
    GlobalHeaderComp,
    NewProjectPage,
    OverviewPage,
    ProjectIdentifierPage,
    ProjectSettingsGeneralPage,
    ProjectsPage,
} from '../../../internals';
import { expect } from '@playwright/test';

test(
    'Create Project with unique Name auto-generates Identifier',
    { tag: ['@ui', '@projects', '@regression', '@TC-PRJ-001-01'] },
    async ({ readyOverviewPage }) => {
        // The project is created and deleted by this test under a name unique to
        // this run, so nothing here depends on data another test or an earlier run
        // left behind.
        const uniqueSuffix = Date.now();
        const projectName = `Auto Project ${uniqueSuffix}`;
        // What OpenProject is expected to generate from that name: lower case, with
        // the spaces folded to hyphens.
        const expectedIdentifier = `auto-project-${uniqueSuffix}`;

        let projectsPage: ProjectsPage;
        let newProjectPage: NewProjectPage;
        let createdProjectOverviewPage: OverviewPage;
        let projectSettingsPage: ProjectSettingsGeneralPage;
        let identifierPage: ProjectIdentifierPage;

        // Read from the application inside the steps, asserted on in the Then step.
        let createButtonEnabled = false;
        let identifierFieldValue = '';

        await test.step('Given Logged in as Admin', () => {
            // Satisfied by the readyOverviewPage fixture, which signs in as admin and
            // opens the Demo project before the test body runs. Arriving is the
            // assertion: the fixture hands back an OverviewPage already through
            // waitForLoad(), so a failed sign-in surfaces as a timeout there.
        });

        await test.step("When Navigate to 'New Project'", async () => {
            // Project creation is a global action, so it is reached from the header
            // rather than from the project sidebar. GlobalHeaderComp is constructed
            // from the page on purpose - OverviewPage deliberately does not hand it
            // out, which is what keeps the module's imports acyclic (see its class
            // doc, which ships this usage).
            projectsPage = await new GlobalHeaderComp(
                readyOverviewPage.page,
            ).clickProjectsModuleLink();
            // The list's "+ Project" action always yields a top-level project; the
            // header quick-add would pre-fill "Subproject of" with the Demo project
            // and silently create a subproject instead.
            newProjectPage = await projectsPage.clickNewProjectButton();
            // No assertion: clickNewProjectButton() returns through waitForLoad(),
            // which already guards on the /projects/new URL and the Name field.
        });

        await test.step('And Enter a unique Name', async () => {
            await newProjectPage.fillName(projectName);
            // Captured here, asserted in the Then step, because the Create button is
            // gone once the form has been submitted.
            createButtonEnabled = await newProjectPage.isCreateButtonEnabled();
        });

        await test.step('And Observe the Identifier field', async () => {
            // OpenProject 16 has no Identifier field on the create form: the slug is
            // generated server-side on save (acts_as_url in app/models/project.rb).
            // The earliest an Identifier *field* exists is the "Change the project's
            // identifier" page, which arrives pre-filled with the stored value - so
            // the project is created first and the generated identifier is read
            // there.
            createdProjectOverviewPage = await newProjectPage.clickCreateButton();
            const identifierFromUrl = createdProjectOverviewPage.getProjectIdentifier();
            projectSettingsPage = await new ProjectSettingsGeneralPage(
                readyOverviewPage.page,
            ).openForProject(identifierFromUrl);
            identifierPage = await projectSettingsPage.clickChangeIdentifierLink();
            identifierFieldValue = await identifierPage.getIdentifier();
        });

        await test.step('Then Identifier is auto-filled as a valid slug derived from the Name; Create button becomes enabled.', () => {
            // The test never typed an identifier, so this value is the one the
            // application derived from the Name. Nothing waited on it: the identifier
            // page's waitForLoad() waits for the URL and for the input to exist, not
            // for what it holds.
            expect(identifierFieldValue).toBe(expectedIdentifier);
            // The Create button is enabled once the Name has been entered. It cannot
            // be observed to "become" enabled in this version - it is rendered with
            // disabled: false from the outset and an invalid submit is rejected
            // server-side - so this asserts the state the scenario requires at this
            // point, not a transition. It still goes red if the control is disabled
            // or renamed.
            expect(createButtonEnabled).toBe(true);
        });

        await test.step('Cleanup: delete the project created by this test', async () => {
            projectSettingsPage = await identifierPage.clickCancelLink();
            projectsPage = await projectSettingsPage.deleteProject();
            // Filtering first is what makes the absence meaningful: the row count is
            // read from the rendered page, so on an unfiltered, paginated list a
            // surviving project could read as absent.
            projectsPage = await projectsPage.filterByName(projectName);
            expect(await projectsPage.getNumberOfRows()).toBe(0);
        });
    },
);
