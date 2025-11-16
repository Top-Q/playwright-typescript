import { expect } from '@playwright/test';
import { test } from './ui/fixtures';
import { WorkPackagesPage, TaskTypeMenu, NewTaskPage, WorkpackageTable, NewPhasePage, WorkPackageRow, workPackageRowContextMenu, WorkPackageDeletionConfirmationDialogComp } from '../internals';

test('seed', { tag: ['@ui', '@task', '@regression'] }, async ({ readyOverviewPage }) => {
})