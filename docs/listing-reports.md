# Listing reports and publication approval

The existing publication workflow remains: owners submit draft properties for review; assigned, active administrators review property details, rooms, photos and contact information at `/admin/properties/[id]`, then publish or reject the listing. Administrators can suspend a published listing. Public discovery reads only eligible published properties, and edits can require another review. This is a manual platform review, not government business accreditation.

## Activate renter reporting

Apply **`supabase/upgrade-reporting.sql` once in Supabase SQL Editor**, then deploy the latest main branch. This adds the protected report endpoint and keeps the original `submit_report` API under the same controls. Existing reports are retained. Fresh projects can use the regenerated bootstrap instead; never rerun the bootstrap against an existing project.

No new application secrets are needed. Without the upgrade, the form fails safely with “Reporting is not enabled yet” rather than using the older unprotected submission endpoint.

## Workflow

1. From a published property, select **Report this listing**. Guests sign in and return to that form.
2. Choose a reason and optionally provide up to 2,000 characters of details. An active account is required; administrators use their assigned role to review it.
3. The form shows a submission receipt with a report reference. On revisiting, an existing open report is shown instead of another form.
4. Administrators see the submitted report in `/admin/reports`, with the reporter, listing, reason and details. They investigate and resolve/dismiss the report, or separately moderate the listing/account.

Reports are private to the reporter and active administrators. They do not automatically unpublish a listing, cancel bookings, share a phone number, or notify the owner. Attachments, reporter follow-up messages and email notifications are not included.

## Submission protections

The database verifies the caller and published property, validates lengths, serializes submissions per account, rejects a second open report for the same account/property, and limits each account to five reports in a rolling 24 hours, including subsequently closed reports. Older duplicate records are preserved for review. Both the new endpoint and the original API enforce these limits. Browser controls retain entered details on an error and prevent repeated clicks while submitting.

Run database setup/bootstrap checks separately from browser tests because those checks temporarily replace schemas within a rolled-back transaction.
