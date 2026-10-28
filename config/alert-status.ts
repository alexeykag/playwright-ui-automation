export const ALERT_STATUS = {
  open: 'Open',
  inProgress: 'In Progress',
  remediationInProgress: 'Remediation In Progress',
  awaitingUserVerification: 'Awaiting User Verification',
  resolved: 'Resolved',
  reopened: 'Reopened',
} as const;

export type AlertStatus = (typeof ALERT_STATUS)[keyof typeof ALERT_STATUS];

export const AUTO_REMEDIATE = { on: 'ON', off: 'OFF' } as const;

export type AutoRemediate = (typeof AUTO_REMEDIATE)[keyof typeof AUTO_REMEDIATE];

const USER_TRANSITIONS: Record<AlertStatus, readonly AlertStatus[]> = {
  [ALERT_STATUS.open]: [ALERT_STATUS.inProgress],
  [ALERT_STATUS.inProgress]: [ALERT_STATUS.resolved],
  [ALERT_STATUS.remediationInProgress]: [],
  [ALERT_STATUS.awaitingUserVerification]: [
    ALERT_STATUS.resolved,
    ALERT_STATUS.reopened,
  ],
  [ALERT_STATUS.resolved]: [ALERT_STATUS.reopened],
  [ALERT_STATUS.reopened]: [ALERT_STATUS.inProgress],
};

const SYSTEM_STATUSES: readonly AlertStatus[] = [
  ALERT_STATUS.remediationInProgress,
  ALERT_STATUS.awaitingUserVerification,
];

/** Options the status select lists at a status: itself (if user-selectable) + targets. */
export function expectedStatusOptions(status: AlertStatus): AlertStatus[] {
  const own = SYSTEM_STATUSES.includes(status) ? [] : [status];
  return [...own, ...USER_TRANSITIONS[status]];
}

export interface StatusObservation {
  status: AlertStatus;
  options: string[];
  remediateEnabled: boolean;
}

/** What the UI must show at a status: allowed options, Remediate only In Progress. */
export function expectedObservation(status: AlertStatus): StatusObservation {
  return {
    status,
    options: expectedStatusOptions(status),
    remediateEnabled: status === ALERT_STATUS.inProgress,
  };
}

const AUDIT_NAME: Record<AlertStatus, string> = {
  [ALERT_STATUS.open]: 'OPEN',
  [ALERT_STATUS.inProgress]: 'IN PROGRESS',
  [ALERT_STATUS.remediationInProgress]: 'REMEDIATION IN PROGRESS',
  [ALERT_STATUS.awaitingUserVerification]: 'REMEDIATED WAITING FOR CUSTOMER',
  [ALERT_STATUS.resolved]: 'RESOLVED',
  [ALERT_STATUS.reopened]: 'REOPEN',
};

/** Audit entry as AlertDrawer.auditTransitions() reports it, e.g. "OPEN\u2192IN PROGRESS". */
export function auditTransition(from: AlertStatus, to: AlertStatus): string {
  return `${AUDIT_NAME[from]}\u2192${AUDIT_NAME[to]}`;
}

/** Audit entries for consecutive statuses of a path, oldest first. */
export function auditPath(path: readonly AlertStatus[]): string[] {
  return path.slice(1).map((status, index) => auditTransition(path[index], status));
}
