import {
  ALERT_STATUS,
  AUTO_REMEDIATE,
  auditPath,
  expectedObservation,
} from '../config/alert-status';
import type { AlertStatus, StatusObservation } from '../config/alert-status';
import { expect, test } from '../fixtures';
import { AlertDrawer } from '../pages/AlertDrawer';
import { AlertsPage } from '../pages/AlertsPage';
import { ScansPage } from '../pages/ScansPage';

const { open, inProgress, remediationInProgress, awaitingUserVerification, resolved } =
  ALERT_STATUS;

const FLOW: AlertStatus[] = [
  open,
  inProgress,
  remediationInProgress,
  awaitingUserVerification,
  resolved,
];

const UNASSIGNED = 'Unassigned';
const ASSIGNEE = 'Security Analyst';
const REMEDIATION_NOTE = 'Public access disabled on the affected asset';
const COMMENT = 'Remediation verified successfully and issue is resolved';

test('Flow A: manual remediation from Open to Resolved', async ({ page }) => {
  const scansPage = new ScansPage(page);
  const alertsPage = new AlertsPage(page);
  const drawer = new AlertDrawer(page);
  const observed: StatusObservation[] = [];

  await test.step('start a new scan', async () => {
    await scansPage.goto();
    await scansPage.startScanAndWaitForCompletion();
  });

  await test.step('open an Open alert with Auto Remediate OFF', async () => {
    await alertsPage.goto();
    await alertsPage.openAlert(alertsPage.alertRow(open, AUTO_REMEDIATE.off).first());
    observed.push(await drawer.observeStatus(open));
  });

  await test.step('change status to In Progress', async () => {
    await drawer.changeStatus(inProgress);
    observed.push(await drawer.observeStatus(inProgress));
  });

  await test.step(`assign to ${ASSIGNEE}`, async () => {
    await drawer.assignTo(ASSIGNEE);
    await drawer.waitForAssignee(ASSIGNEE);
  });

  await test.step('add a remediation note and press Remediate', async () => {
    await drawer.remediate(REMEDIATION_NOTE);
    observed.push(await drawer.observeStatus(remediationInProgress));
  });

  await test.step('wait for remediation to complete', async () => {
    observed.push(await drawer.observeStatus(awaitingUserVerification));
  });

  await test.step('change status to Resolved', async () => {
    await drawer.changeStatus(resolved);
    observed.push(await drawer.observeStatus(resolved));
  });

  await test.step('add the verification comment', async () => {
    await drawer.addComment(COMMENT);
    await drawer.commentByText(COMMENT).waitFor();
  });

  const remediationNote = await test.step('read the saved remediation note', () =>
    drawer.savedRemediationNote());

  const { auditTransitions, auditAssigneeChanges } =
    await test.step('read the audit trail', async () => {
      await drawer.waitForAuditTransition(awaitingUserVerification, resolved);
      return {
        auditTransitions: await drawer.auditTransitions(),
        auditAssigneeChanges: await drawer.auditAssigneeChanges(),
      };
    });

  await test.step('verify statuses, remediation note and audit trail', async () => {
    expect({
      observed,
      remediationNote,
      auditTransitions,
      auditAssigneeChanges,
    }).toEqual({
      observed: FLOW.map(expectedObservation),
      remediationNote: REMEDIATION_NOTE,
      auditTransitions: auditPath(FLOW),
      auditAssigneeChanges: [`${UNASSIGNED}\u2192${ASSIGNEE}`],
    });
  });
});
