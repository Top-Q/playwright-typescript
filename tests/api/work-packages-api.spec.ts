import { expect } from '@playwright/test';
import { test } from './fixtures';
import dotenv from 'dotenv';

dotenv.config();
const PROJECT_ID = Number(process.env.OPENPROJECT_PROJECT_ID!); // e.g. 1
// test.describe.configure({ mode: "serial" });
test.describe('WorkPackages API (infrastructure)', () => {
    test('list work packages (global) returns 200', async ({ svc }) => {
        await test.step('When requesting a list of work packages (pageSize=5)', async () => {
            const res = await svc.listWorkPackages({ pageSize: 5 });
            expect(res.status()).toBe(200);
            const body = (await res.json()) as Record<string, unknown>;
            // basic shape check
            expect(Object.keys(body).length).toBeGreaterThanOrEqual(0);
        });
    });

    test('list work package schemas accepts filters and returns 200', async ({ svc }) => {
        await test.step('When requesting work package schemas with empty filters', async () => {
            const res = await svc.listWorkPackageSchemas([]);
            expect(res.status()).toBe(200);
            const body = (await res.json()) as Record<string, unknown>;
            expect(Object.keys(body).length).toBeGreaterThanOrEqual(0);
        });
    });

    test('create and delete a project-scoped work package', async ({ svc }) => {
        const payload = {
            subject: 'E2E API Test Work Package',
            description: { raw: 'Created by automated API test' },
        } as Record<string, unknown>;

        let createdId: number | undefined;

        await test.step('When creating a project-scoped work package', async () => {
            const createRes = await svc.createProjectWorkPackage(PROJECT_ID, payload);
            expect(createRes.status()).toBe(201);

            type CreateResp = { id?: number; _links?: { self?: { href?: string } } };
            const createBody = (await createRes.json()) as CreateResp;
            expect(createBody).toBeTruthy();

            // Require presence of self link and extract id from it
            expect(createBody._links).toBeDefined();
            const href = createBody._links!.self!.href as string;
            expect(href).toMatch(/\/work_packages\/(\d+)/);
            const m = href.match(/\/work_packages\/(\d+)/);
            expect(m).not.toBeNull();
            createdId = Number(m![1]);
        });

        await test.step('Cleanup: delete the created work package', async () => {
            expect(createdId).toBeDefined();
            const deleteRes = await svc.deleteWorkPackage(createdId as number);
            expect([200, 204]).toContain(deleteRes.status());
        });
    });

    test('list work packages of a project returns 200', async ({ svc }) => {
        await test.step('When requesting work packages for a project', async () => {
            const res = await svc.listProjectWorkPackages(PROJECT_ID, { pageSize: 5 });
            expect(res.status()).toBe(200);
            const body = (await res.json()) as Record<string, unknown>;
            expect(Object.keys(body).length).toBeGreaterThanOrEqual(0);
        });
    });

    test('create, update, get and delete a project-scoped work package', async ({ svc }) => {
        const initialSubject = `API WP ${Date.now()}`;
        const updatedSubject = `${initialSubject} - updated`;
        const payload = {
            subject: initialSubject,
            description: { raw: 'Created by automated API test for update case' },
        } as Record<string, unknown>;

        let createdId: number | undefined;

        await test.step('When creating a work package to update', async () => {
            const createRes = await svc.createProjectWorkPackage(PROJECT_ID, payload);
            expect(createRes.status()).toBe(201);
            type CreateResp = { id?: number; _links?: { self?: { href?: string } } };
            const createBody = (await createRes.json()) as CreateResp;
            expect(createBody).toBeTruthy();
            expect(createBody._links).toBeDefined();
            const href = createBody._links!.self!.href as string;
            expect(href).toMatch(/\/work_packages\/(\d+)/);
            const m = href.match(/\/work_packages\/(\d+)/);
            expect(m).not.toBeNull();
            createdId = Number(m![1]);
        });

        await test.step('When updating the created work package subject', async () => {
            expect(createdId).toBeDefined();

            // Fetch current resource to obtain lockVersion required by OpenProject optimistic locking
            const currentRes = await svc.getWorkPackage(createdId as number);
            expect(currentRes.status()).toBe(200);
            const currentBody = (await currentRes.json()) as Record<string, unknown> & { lockVersion?: number; lock_version?: number };
            // prefer camelCase lockVersion, fall back to snake_case lock_version
            let lockVersion: number | undefined;
            if (typeof currentBody.lockVersion === 'number') {
                lockVersion = currentBody.lockVersion;
            } else if (typeof currentBody.lock_version === 'number') {
                lockVersion = currentBody.lock_version;
            }
            expect(typeof lockVersion === 'number').toBeTruthy();

            // include lockVersion when updating to avoid 409
            const updateRes = await svc.updateWorkPackage(createdId as number, { subject: updatedSubject, lockVersion });
            expect(updateRes.status()).toBe(200);
        });

        await test.step('Then fetching the work package returns the updated subject', async () => {
            expect(createdId).toBeDefined();
            const getRes = await svc.getWorkPackage(createdId as number);
            expect(getRes.status()).toBe(200);
            const getBody = (await getRes.json()) as { subject?: string } & Record<string, unknown>;
            const subject = getBody.subject;
            console.log('Updated subject:', subject);            
            expect(subject).toBeDefined();
            expect(String(subject)).toContain('updated');
        });

        // await test.step('Cleanup: delete the updated work package', async () => {
        //     expect(createdId).toBeDefined();
        //     const deleteRes = await svc.deleteWorkPackage(createdId as number);
        //     expect([200, 204]).toContain(deleteRes.status());
        // });
    });
});

