# Playwright UI Automation

Playwright + TypeScript UI tests for the Cyera home assignment app (Mock DSPM Portal). The app itself is not part of this repository. Tests drive the web app only; the API is used in fixtures to check the saved session and to reset data in teardown. Design notes: [AUTOMATION_APPROACH.md](AUTOMATION_APPROACH.md).

## Prerequisites

- Docker Desktop (to run the app)
- Node.js 20.12+ and npm

## Setup and run

Start the app with the assignment launcher (`start.command` on macOS, `start.bat` on Windows) and note the printed URL. Then, in this repository:

```bash
npm install
npx playwright install chromium
npm test                         # runs headless
```

The admin credentials from the assignment are read from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Put them in a `.env.test` file in the repository root (git-ignored, one `KEY=value` per line) or export them in the shell.

The tests expect the app to be running and use `http://localhost:3000` as the base URL. If the launcher printed a different URL (port 3000 was taken), set it in `BASE_URL`, either in `.env.test` or per run: `BASE_URL=http://localhost:3001 npm test`.

| Command | Purpose |
| --- | --- |
| `npx playwright test flow-b` | Run one flow |
| `npm run test:report` | Open the HTML report (`playwright-report/`) |
| `npx tsc -p .` | Type-check |

Reports: HTML in `playwright-report/`, JSON in `test-results/results.json`, trace and screenshot kept for failures in `test-results/`. Logs go to the console with timestamps and levels.

Notes:

- Tests run on one worker: all flows share one database and reset it afterwards.
- Login is rate-limited to 10 attempts per 15 minutes. The saved session in `.auth/` is reused while the API accepts its token, so a login happens only when it is missing or rejected. If login still gets 429, the run fails with the retry delay; delete `.auth/` only after the window passes.
- Auto and manual remediation take a random 10-50s, so a flow takes 30-60s.

## Project structure

```
playwright.config.ts   config, base URL, reporters
config/                status/transition rules, test data
pages/                 LoginPage, ScansPage, AlertsPage, AlertDrawer
fixtures/              auth (worker storageState), reset-data teardown
utils/                 SingleSelect dropdown, logger, env, API reset, saved-session reuse
tests/                 flow-a, flow-b, flow-c, negative-* specs
```

## Transition coverage

| Transition | Type | Covered by |
| --- | --- | --- |
| Open -> In Progress | User | Flow A, Flow B |
| Open -> Remediation In Progress | System | Flow C |
| In Progress -> Resolved | User | Flow B |
| In Progress -> Remediation In Progress | System (user-triggered) | Flow A |
| Remediation In Progress -> Awaiting User Verification | System | Flow A, Flow C |
| Awaiting User Verification -> Resolved | User | Flow A |
| Awaiting User Verification -> Reopened | User | Flow C |
| Resolved -> Reopened | User | Flow B |
| Reopened -> In Progress | User | Flow B, Flow C |

At every status a flow visits, the test records the options the status select offers and whether Remediate is enabled, and compares them with the life-cycle table. It also compares the audit trail with the transitions performed.

## Negative tests

| Spec | Verifies |
| --- | --- |
| `negative-remediate-outside-in-progress` | Remediate, its note and a hint: unavailable at Open, available at In Progress |
| `negative-empty-comment` | Empty and blank comments cannot be posted; only a following control comment is added |
