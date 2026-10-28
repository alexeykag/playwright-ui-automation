# Automation approach

## Structure

Playwright Test with TypeScript (strict). Layers:

- `pages/`: page objects expose locators and actions only, no assertions. `AlertDrawer` holds the whole alert workflow; `SingleSelect` in `utils/` wraps the app's custom dropdowns.
- `fixtures/`: a worker-scoped fixture provides `storageState`, reusing the saved session or logging in through the UI; an auto fixture resets the environment after every test, so cleanup also runs when a test fails.
- `config/alert-status.ts`: the life-cycle table as data (allowed options per status, audit names). Flows compare the UI with it, so the rules live in one place.
- `utils/`: `SingleSelect` dropdown, timestamped logger (info/warn/error), `requireEnv` (fails loudly on missing config), saved-session checks, API reset with actionable errors.
- `tests/`: Flow A, B and C plus two negative tests, one `expect` each.

Each flow collects what the UI shows at every status (options, Remediate state), the remediation note and audit entries while it runs, then compares everything once at the end. A failure shows one diff for the whole flow.

## Asynchronous status changes

No sleeps and no fixed timeouts.

- Scan: the "scan in progress" banner must become visible, then hidden.
- Remediation (random 10-50s, manual and automatic): `waitFor` on the status text in the open drawer, which updates through the app's live updates. The test timeout (120s) is the only ceiling.
- Audit trail: wait for the last expected entry, then read all entries.
- Comments: after Post comment, wait until the input is cleared, which happens only after the API accepted the comment.
- Dropdown reads happen only after the status has been confirmed, so they cannot race with a pending change.

## Locator strategy

The app has few `data-testid`s, so locators are role- and label-based (`getByRole` with accessible names, `getByLabel`), scoped to the page or drawer container. Where names overlap, exact matching is used ("Open" vs "Reopened", "Remediate" vs "Remediation note"). Alert rows are found by their cells (status and Auto Remediate value), not by position or alert id, which the UI does not show. I explored the live UI with `playwright-cli` before choosing locators.

## Reuse

Page objects, the shared `observeStatus` workflow step, the transition table, the reset and auth fixtures, and the logger are shared by all three flows; adding a flow means composing existing pieces.

## Trade-offs and what I would add

- Reset Data runs through the API in teardown for speed and reliability; the assignment's UI button is not exercised. With more time: one dedicated UI test for the Reset dialog.
- Flow C cannot observe the "Open" status: the system leaves it as soon as the scan completes. The Open -> Remediation In Progress transition is verified from the audit entry written by the Scan Engine.
- Three locators use a parent hop (`locator('..')`) because the drawer has no stable container per field; asking for `data-testid`s would remove that.
- Tests run on one worker because they share a database. Isolated environments per worker would allow parallel runs.
- The worker reuses the saved session in `.auth/` while the API accepts its token, to stay under the login limit (10 per 15 minutes); a 429 on login fails fast with the retry delay.
- Not done: negative tests for wrong login and invalid transitions, policies/filters flows, CI pipeline, richer reporting (Allure or similar).
