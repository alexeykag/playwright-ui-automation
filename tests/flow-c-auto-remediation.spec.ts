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

const { open, inProgress, remediationInProgress, awaitingUserVerification, reopened } =
  ALERT_STATUS;

const FLOW: AlertStatus[] = [
  remediationInProgress,
  awaitingUserVerification,
  reopened,
  inProgress,
];

const AUTO_REMEDIATION_NOTE = 'Auto-remediated by policy configuration';

test('Flow C: auto-remediation, then reopen', async ({ page }) => {
  const scansPage = new ScansPage(page);
  const alertsPage = new AlertsPage(page);
  const drawer = new AlertDrawer(page);
  const observed: StatusObservation[] = [];

  await test.step('start a new scan', async () => {
    await scansPage.goto();
    await scansPage.startScanAndWaitForCompletion();
  });

  await test.step('open an Auto Remediate ON alert already being remediated', async () => {
    await alertsPage.goto();
    await alertsPage.openAlert(
      alertsPage.alertRow(remediationInProgress, AUTO_REMEDIATE.on).first(),
    );
    observed.push(await drawer.observeStatus(remediationInProgress));
  });

  await test.step('wait for the system to finish the remediation', async () => {
    observed.push(await drawer.observeStatus(awaitingUserVerification));
  });

  for (const next of [reopened, inProgress]) {
    await test.step(`change status to ${next}`, async () => {
      await drawer.changeStatus(next);
      observed.push(await drawer.observeStatus(next));
    });
  }

  const remediationNote = await test.step('read the saved remediation note', () =>
    drawer.savedRemediationNote());

  const auditTransitions = await test.step('read the audit trail', async () => {
    await drawer.waitForAuditTransition(reopened, inProgress);
    return drawer.auditTransitions();
  });

  await test.step('verify statuses, remediation note and audit trail', async () => {
    expect({ observed, remediationNote, auditTransitions }).toEqual({
      observed: FLOW.map(expectedObservation),
      remediationNote: AUTO_REMEDIATION_NOTE,
      auditTransitions: auditPath([open, ...FLOW]),
    });
  });
});
