import type { Locator, Page } from '@playwright/test';
import { logger } from '../utils/logger';

const SCANS_PATH = '/scans';
const SCANS_PAGE_ID = 'scans-page';
const SCAN_BANNER_ID = 'scan-status-banner';
const START_SCAN_BUTTON = 'Start new scan';

export class ScansPage {
  readonly startScanButton: Locator;
  readonly scanBanner: Locator;

  constructor(private readonly page: Page) {
    this.startScanButton = page
      .getByTestId(SCANS_PAGE_ID)
      .getByRole('button', { name: START_SCAN_BUTTON });
    this.scanBanner = page.getByTestId(SCAN_BANNER_ID);
  }

  /** Opens the scans page. */
  async goto(): Promise<void> {
    await this.page.goto(SCANS_PATH);
  }

  /** Starts a scan and waits for its banner to appear and disappear. */
  async startScanAndWaitForCompletion(): Promise<void> {
    logger.info('Starting a new scan');
    await this.startScanButton.click();
    await this.scanBanner.waitFor({ state: 'visible' });
    await this.scanBanner.waitFor({ state: 'hidden' });
    logger.info('Scan completed');
  }
}
