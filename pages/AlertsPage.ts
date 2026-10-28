import type { Locator, Page } from '@playwright/test';
import type { AlertStatus, AutoRemediate } from '../config/alert-status';

const ALERTS_PATH = '/alerts';
const ALERTS_PAGE_ID = 'alerts-page';
const ALERTS_TABLE_NAME = 'Alerts list';
const SEVERITY_PATTERN = /^(CRITICAL|HIGH|MEDIUM|LOW)$/;

export class AlertsPage {
  readonly root: Locator;
  readonly alertRows: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId(ALERTS_PAGE_ID);
    this.alertRows = this.root
      .getByRole('table', { name: ALERTS_TABLE_NAME })
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: SEVERITY_PATTERN }) });
  }

  /** Opens the alerts list. */
  async goto(): Promise<void> {
    await this.page.goto(ALERTS_PATH);
  }

  /** Returns rows with the given status and Auto Remediate value. */
  alertRow(status: AlertStatus, autoRemediate: AutoRemediate): Locator {
    return this.alertRows
      .filter({ has: this.cell(status) })
      .filter({ has: this.cell(autoRemediate) });
  }

  /** Returns the table cell with exactly this text. */
  private cell(text: string): Locator {
    return this.page.getByRole('cell', { name: text, exact: true });
  }

  /** Opens the alert drawer by clicking its row. */
  async openAlert(row: Locator): Promise<void> {
    await row.click();
  }
}
