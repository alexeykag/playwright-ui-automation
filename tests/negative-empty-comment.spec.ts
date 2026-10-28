import { ALERT_STATUS, AUTO_REMEDIATE } from '../config/alert-status';
import { expect, test } from '../fixtures';
import { AlertDrawer } from '../pages/AlertDrawer';
import { AlertsPage } from '../pages/AlertsPage';
import { ScansPage } from '../pages/ScansPage';

const { open } = ALERT_STATUS;

const BLANK_MESSAGES = ['', '   '];
const CONTROL_COMMENT = 'Control comment after blank attempts';

test('Negative: empty or blank comment cannot be posted', async ({ page }) => {
  const scansPage = new ScansPage(page);
  const alertsPage = new AlertsPage(page);
  const drawer = new AlertDrawer(page);

  await test.step('start a new scan', async () => {
    await scansPage.goto();
    await scansPage.startScanAndWaitForCompletion();
  });

  await test.step('open an Open alert with Auto Remediate OFF', async () => {
    await alertsPage.goto();
    await alertsPage.openAlert(alertsPage.alertRow(open, AUTO_REMEDIATE.off).first());
    await drawer.waitForStatus(open);
  });

  const commentsBefore = await test.step('record the comment count', () =>
    drawer.commentsCount());

  for (const message of BLANK_MESSAGES) {
    await test.step(`Post comment is disabled and ignored for "${message}"`, async () => {
      await drawer.fillComment(message);
      await drawer.postCommentDisabled.waitFor();
      await drawer.forcePostComment();
    });
  }

  await test.step('post a control comment so earlier requests have settled', async () => {
    await drawer.addComment(CONTROL_COMMENT);
    await drawer.commentByText(CONTROL_COMMENT).waitFor();
  });

  const commentsAfter = await test.step('read the comment count', () =>
    drawer.commentsCount());

  await test.step('verify only the control comment was added', async () => {
    expect(commentsAfter).toBe(commentsBefore + 1);
  });
});
