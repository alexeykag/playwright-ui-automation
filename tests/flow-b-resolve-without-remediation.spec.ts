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

const { open, inProgress, resolved, reopened } = ALERT_STATUS;

const FLOW: AlertStatus[] = [open, inProgress, resolved, reopened, inProgress];

test('Flow B: resolve without remediation, then reopen', async ({ page }) => {
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

  for (const next of FLOW.slice(1)) {
    await test.step(`change status to ${next}`, async () => {
      await drawer.changeStatus(next);
      observed.push(await drawer.observeStatus(next));
    });
  }

  const auditTransitions = await test.step('read the audit trail', async () => {
    await drawer.waitForAuditTransition(reopened, inProgress);
    return drawer.auditTransitions();
  });

  await test.step('verify statuses and audit trail', async () => {
    expect({ observed, auditTransitions }).toEqual({
      observed: FLOW.map(expectedObservation),
      auditTransitions: auditPath(FLOW),
    });
  });
});
