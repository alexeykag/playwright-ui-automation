import type { Locator, Page } from '@playwright/test';
import type { AlertStatus, StatusObservation } from '../config/alert-status';
import { auditTransition } from '../config/alert-status';
import { SingleSelect } from '../utils/SingleSelect';
import { logger } from '../utils/logger';

const DRAWER_ID = 'alert-details-drawer';
const STATUS_LABEL = 'Status';
const NO_STATUS_CHANGES_TEXT = 'No status changes available';
const STATUS_SELECT_NAME = 'Change alert status';
const ASSIGNEE_SELECT_NAME = 'Assign alert';
const REMEDIATION_TOGGLE_NAME = /^Remediation/;
const REMEDIATION_NOTE_NAME = 'Remediation note';
const REMEDIATE_BUTTON_NAME = 'Remediate';
const REMEDIATION_NOTES_LABEL = 'Remediation Notes';
const REMEDIATION_NOTES_PREFIX = /^\s*Remediation Notes\s*/i;
const REMEDIATION_HINT_TEXT =
  'Remediation is only available when status is In Progress.';
const COMMENT_INPUT_NAME = 'Comment message';
const PLACEHOLDER_SHOWN = ':placeholder-shown';
const POST_COMMENT_BUTTON_NAME = 'Post comment';
const COMMENTS_TITLE = /^Comments \(\d+\)$/;
const COMMENTS_COUNT = /\((\d+)\)/;
const AUDIT_LOG_NAME = 'Alert audit log';
const AUDIT_ARROW = '\u2192';
const AUDIT_ARROW_PATTERN = /\s*\u2192\s*/;
const ARIA_EXPANDED = 'aria-expanded';
const PARENT = '..';
const WHITESPACE = /\s+/g;

const AUDIT_FIELD = { status: 'Status', assignee: 'Assignee' } as const;

type AuditField = (typeof AUDIT_FIELD)[keyof typeof AUDIT_FIELD];

export interface RemediationAvailability {
  remediateEnabled: boolean;
  noteEnabled: boolean;
  hintVisible: boolean;
}

export class AlertDrawer {
  readonly root: Locator;
  readonly statusField: Locator;
  readonly noStatusChanges: Locator;
  readonly status: SingleSelect;
  readonly assignee: SingleSelect;
  readonly remediationToggle: Locator;
  readonly remediationNote: Locator;
  readonly remediationNoteEnabled: Locator;
  readonly remediateButton: Locator;
  readonly commentInput: Locator;
  readonly commentInputEmpty: Locator;
  readonly postCommentButton: Locator;
  readonly postCommentDisabled: Locator;
  readonly remediationNotesField: Locator;
  readonly remediationHint: Locator;
  readonly commentsTitle: Locator;
  readonly auditLog: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId(DRAWER_ID);
    this.statusField = this.root
      .getByText(STATUS_LABEL, { exact: true })
      .locator(PARENT);
    this.noStatusChanges = this.root.getByText(NO_STATUS_CHANGES_TEXT);
    this.status = new SingleSelect(
      page,
      this.root.getByRole('button', { name: STATUS_SELECT_NAME }),
    );
    this.assignee = new SingleSelect(
      page,
      this.root.getByRole('button', { name: ASSIGNEE_SELECT_NAME }),
    );
    this.remediationToggle = this.root.getByRole('button', {
      name: REMEDIATION_TOGGLE_NAME,
    });
    this.remediationNote = this.root.getByRole('textbox', {
      name: REMEDIATION_NOTE_NAME,
    });
    this.remediateButton = this.root.getByRole('button', {
      name: REMEDIATE_BUTTON_NAME,
      exact: true,
    });
    this.commentInput = this.root.getByRole('textbox', { name: COMMENT_INPUT_NAME });
    this.commentInputEmpty = this.commentInput.and(
      this.root.locator(PLACEHOLDER_SHOWN),
    );
    this.remediationNoteEnabled = this.root.getByRole('textbox', {
      name: REMEDIATION_NOTE_NAME,
      disabled: false,
    });
    this.postCommentButton = this.root.getByRole('button', {
      name: POST_COMMENT_BUTTON_NAME,
    });
    this.postCommentDisabled = this.root.getByRole('button', {
      name: POST_COMMENT_BUTTON_NAME,
      disabled: true,
    });
    this.remediationNotesField = this.root
      .getByText(REMEDIATION_NOTES_LABEL, { exact: true })
      .locator(PARENT);
    this.remediationHint = this.root.getByText(REMEDIATION_HINT_TEXT);
    this.commentsTitle = this.root.getByText(COMMENTS_TITLE);
    this.auditLog = this.root.getByRole('log', { name: AUDIT_LOG_NAME });
  }

  /** Expands the Remediation section if it is collapsed. */
  private async expandRemediation(): Promise<void> {
    if ((await this.remediationToggle.getAttribute(ARIA_EXPANDED)) !== 'true') {
      await this.remediationToggle.click();
    }
  }

  /** Selects a new status in the status dropdown. */
  async changeStatus(status: AlertStatus): Promise<void> {
    logger.info('Changing alert status', { status });
    await this.status.select(status);
  }

  /** Waits until the drawer shows the given status. */
  async waitForStatus(status: AlertStatus): Promise<void> {
    await this.statusField.getByText(status, { exact: true }).waitFor();
  }

  /**
   * Waits until the Remediation section shows its final state for the status:
   * the hint (Remediate unavailable) or an enabled note (Remediate available).
   * Both render in the same commit as the button state, so reads after it are stable.
   */
  private async waitForRemediationSettled(): Promise<void> {
    await this.expandRemediation();
    await this.remediateButton.waitFor();
    await this.remediationHint.or(this.remediationNoteEnabled).first().waitFor();
  }

  /** Returns the status options offered, or an empty list if none. */
  private async statusOptions(): Promise<string[]> {
    await this.status.trigger.or(this.noStatusChanges).first().waitFor();
    if ((await this.status.trigger.count()) === 0) return [];
    return this.status.optionNames();
  }

  /** Waits for the status, then records the options offered and the Remediate state. */
  async observeStatus(status: AlertStatus): Promise<StatusObservation> {
    await this.waitForStatus(status);
    await this.waitForRemediationSettled();
    return {
      status,
      options: await this.statusOptions(),
      remediateEnabled: await this.remediateButton.isEnabled(),
    };
  }

  /** Waits for the status, then records whether Remediate and its note are usable. */
  async observeRemediation(status: AlertStatus): Promise<RemediationAvailability> {
    await this.waitForStatus(status);
    await this.waitForRemediationSettled();
    return {
      remediateEnabled: await this.remediateButton.isEnabled(),
      noteEnabled: await this.remediationNote.isEnabled(),
      hintVisible: await this.remediationHint.isVisible(),
    };
  }

  /** Selects an assignee in the assignee dropdown. */
  async assignTo(assignee: string): Promise<void> {
    logger.info('Assigning alert', { assignee });
    await this.assignee.select(assignee);
  }

  /** Waits until the given assignee is shown. */
  async waitForAssignee(assignee: string): Promise<void> {
    await this.assignee.trigger.getByText(assignee, { exact: true }).waitFor();
  }

  /** Enters a remediation note and clicks Remediate. */
  async remediate(note: string): Promise<void> {
    await this.expandRemediation();
    logger.info('Remediating alert', { note });
    await this.remediationNote.fill(note);
    await this.remediateButton.click();
  }

  /** Returns the saved remediation note text. */
  async savedRemediationNote(): Promise<string> {
    await this.expandRemediation();
    const text = await this.remediationNotesField.innerText();
    return text.replace(REMEDIATION_NOTES_PREFIX, '').trim();
  }

  /** Types a comment without posting it. */
  async fillComment(message: string): Promise<void> {
    logger.info('Typing comment', { message });
    await this.commentInput.fill(message);
  }

  /** Types a comment, clicks Post comment and waits until the input is cleared. */
  async addComment(message: string): Promise<void> {
    await this.fillComment(message);
    await this.postCommentButton.click();
    await this.commentInputEmpty.waitFor();
  }

  /** Clicks Post comment even when it is disabled, bypassing actionability checks. */
  async forcePostComment(): Promise<void> {
    logger.info('Force-clicking Post comment');
    await this.postCommentButton.click({ force: true });
  }

  /** Returns N from the "Comments (N)" heading. */
  async commentsCount(): Promise<number> {
    const title = await this.commentsTitle.innerText();
    const count = title.match(COMMENTS_COUNT)?.[1];
    if (count === undefined) throw new Error(`No comment count in "${title}"`);
    return Number(count);
  }

  /** Returns the comment with exactly this text. */
  commentByText(message: string): Locator {
    return this.root.getByText(message, { exact: true });
  }

  /** Waits for an audit entry of the given status transition. */
  async waitForAuditTransition(from: AlertStatus, to: AlertStatus): Promise<void> {
    await this.auditLog.getByText(this.transitionPattern(from, to)).waitFor();
  }

  /** Status transitions from the audit log, oldest first, e.g. "OPEN\u2192IN PROGRESS". */
  async auditTransitions(): Promise<string[]> {
    return this.auditChanges(AUDIT_FIELD.status);
  }

  /** Assignee changes from the audit log, oldest first, e.g. "Unassigned\u2192Admin". */
  async auditAssigneeChanges(): Promise<string[]> {
    return this.auditChanges(AUDIT_FIELD.assignee);
  }

  /** Returns Status or Assignee changes from the audit log, oldest first. */
  private async auditChanges(field: AuditField): Promise<string[]> {
    const entries = await this.auditLog
      .getByText(`${field}:`, { exact: true })
      .locator(PARENT)
      .allInnerTexts();
    return entries
      .map((text) =>
        text.replace(`${field}:`, '').replace(AUDIT_ARROW_PATTERN, AUDIT_ARROW),
      )
      .map((text) => text.replace(WHITESPACE, ' ').trim())
      .reverse();
  }

  /** Builds a regex matching the audit text of a status transition. */
  private transitionPattern(from: AlertStatus, to: AlertStatus): RegExp {
    const [fromName, toName] = auditTransition(from, to).split(AUDIT_ARROW);
    return new RegExp(`${fromName}\\s*\\u2192\\s*${toName}`);
  }
}
