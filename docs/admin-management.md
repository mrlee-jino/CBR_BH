# Cabahay Users and Reports

Administrators use `/admin/users` and `/admin/reports`. Both routes and every mutation require an active database-assigned administrator role and an MFA-verified session. Private data uses the current administrator’s Supabase session and existing RLS, with no service key in these pages.

## Apply before using account changes

Run **`supabase/upgrade-admin.sql` once in the hosted Supabase SQL Editor**, then deploy the latest main branch. It preserves existing accounts, records suspension/restoration reasons in audit metadata, rejects self-suspension and missing/null/unchanged targets, and adds the audited account-change entry point used by the new UI. Existing `suspend_account` callers retain the same signature.

The account-change action deliberately uses the new entry point: without this upgrade, it fails safely instead of silently using an older function that discards the supplied reason. Do not rerun the fresh-project bootstrap against an existing database. Fresh projects can use the regenerated bootstrap, which already includes this migration.

## Users

- Search by display name or exact account UUID; filter active/suspended accounts.
- View existing roles and join date; 20 accounts per page, with stable ordering.
- Suspend or restore another account with a 3–1,000 character reason and a confirmation dialog. The reason is retained in `audit_events.metadata.reason` with the acting administrator.
- The acting administrator cannot change their own status. This page does not grant roles, delete accounts, reset passwords, or expose Auth email addresses.
- Suspension blocks account mutations and hides the owner’s public listings through existing database rules. It does not cancel reservations. Restoring access retains each listing’s existing publication status.

## Reports

- Search by report reason or exact report UUID; filter open/resolved/dismissed reports. Open reports are shown by default, with 20 per page.
- Read the reporter, listing, report details and submission time. Open the property review page for investigation, or follow the reporter link to their account. The property review page also links to its owner’s account.
- Resolve an addressed issue or dismiss a report when no action is needed. A confirmation is required. Conditional database updates prevent an already closed report from being resolved again by a stale form.
- Closed reports retain the deciding administrator and decision time; audit events record the decision. Closing a report does not automatically suspend a listing or user. Reopening and administrator decision notes are not implemented.

Published property pages offer a signed-in “Report this listing” form. See [renter reporting setup](listing-reports.md) for its database upgrade and submission protections.

Times are displayed in Philippine time. Report text and account names are rendered as plain text. Search wildcards are escaped and return destinations are constructed from bounded filters.

## Verification

The isolated local browser workflow covers guest/renter access denial, required admin MFA, self-suspension protection (including form tampering), suspension and restoration with retained reasons, 21-user pagination, report resolution/dismissal and history, stale decisions, malicious report text, accessibility and mobile overflow. Database tests check role/MFA enforcement, retained audit reasons and rejected invalid account changes.
