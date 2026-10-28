import { ALERT_STATUS, AUTO_REMEDIATE } from '../config/alert-status';
import type { RemediationAvailability } from '../pages/AlertDrawer';
import { expect, test } from '../fixtures';
import { AlertDrawer } from '../pages/AlertDrawer';
import { AlertsPage } from '../pages/AlertsPage';
import { ScansPage } from '../pages/ScansPage';

const { open, inProgress } = ALERT_STATUS;

const UNAVAILABLE: RemediationAvailability = {
  remediateEnabled: false,
  noteEnabled: false,
  hintVisible: true,
};

const AVAILABLE: RemediationAvailability = {
  remediateEnabled: true,
  noteEnabled: true,
  hintVisible: false,
};

test('Negative: Remediate is unavailable until the alert is In Progress', async ({
  page,
}) => {
  const scansPage = new ScansPage(page);
  const alertsPage = new AlertsPage(page);
  const drawer = new AlertDrawer(page);
  const observed: RemediationAvailability[] = [];

  await test.step('start a new scan', async () => {
    await scansPage.goto();
    await scansPage.startScanAndWaitForCompletion();
  });

  await test.step('open an Open alert with Auto Remediate OFF', async () => {
    await alertsPage.goto();
    await alertsPage.openAlert(alertsPage.alertRow(open, AUTO_REMEDIATE.off).first());
    observed.push(await drawer.observeRemediation(open));
  });

  await test.step('change status to In Progress', async () => {
    await drawer.changeStatus(inProgress);
    observed.push(await drawer.observeRemediation(inProgress));
  });

  await test.step('verify Remediate availability', async () => {
    expect(observed).toEqual([UNAVAILABLE, AVAILABLE]);
  });
});
