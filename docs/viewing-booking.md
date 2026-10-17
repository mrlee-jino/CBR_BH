# Viewing and booking requests

Authenticated, verified renters can request a viewing from a published listing or request an individual unit with monthly terms. `/dashboard/requests` lists the renter’s requests; `/owner/requests` lists requests for the owner’s properties. Both link to the participant-only detail route `/dashboard/requests/[id]?kind=booking|viewing`.

## Hosted upgrade

After the core, listing, and secure-photo migrations are applied, run `supabase/upgrade-requests.sql` once in the Supabase SQL Editor. It adds a read-only participant context function and records migration `20261017145319`. Existing booking/viewing tables and transactional decision functions remain authoritative. Deploy the app after applying the upgrade. This milestone needs no new environment variables and does not create or publish Sunrise Apartment Rooms.

The context projection provides property/unit names even after a listing is paused. It explicitly checks the current renter or authorized property owner; it never grants base-table access to renters or returns private addresses or contacts. The generated TypeScript function declaration is included; regenerate with `npm run db:types` against the migrated local stack before release.

## Behavior

- Booking forms show the monthly rent, deposit, and terms, with required acceptance and contact-sharing consent. They submit the displayed offer version and a per-form UUID for retry safety. A stale offer requires reloading and reviewing the new offer. A pending request holds no inventory; owner approval uses the existing transaction and overlap constraint.
- Move-in/out values are calendar dates in Asia/Manila. Move-out is exclusive; blank means indefinite occupancy. Future viewing times explicitly use Philippine time regardless of browser location.
- Pending requests expire after seven days, sooner for a viewing appointment or a booking whose move-in date has passed. Expiration is displayed from the timestamps without implying a background task updated the stored status. Renters can withdraw expired pending requests before resubmitting the same unit.
- Owners approve/reject bookings and accept/decline viewings. Renters withdraw pending requests. Participants cancel future confirmations with a reason. Booking cancellation closes at Manila midnight on the move-in date. After a viewing appointment begins, only its owner can mark it completed.
- Submitted prices and terms remain visible as immutable booking snapshots. A booking confirmation is neither a payment receipt nor a signed tenancy agreement; no payment is collected.
- Contact data comes only from the existing authorized contact RPCs. Owners receive the renter’s saved name/phone during eligible request windows. Renters receive address/owner contact after viewing acceptance or booking approval during the database’s release window. Cancelling the sole qualifying request removes that access.
- Status updates are in-app. No email or SMS notification is promised. The inbox paginates each request type at 20 rows per page, with stable creation-time/ID ordering.

## Validation

`npm run test:requests` checks time-zone boundaries, expiry, cancellation eligibility, owner-only viewing completion, and conflict messages without a database. Database security coverage adds participant-context privacy and paused-listing history. The browser journey covers login return paths, indefinite booking, competing approvals, cancellation reasons, contact release/revocation, viewing acceptance, unauthorized request IDs, accessibility, and narrow viewports. Run the full `npm run check` with the isolated local Supabase stack before deployment.

The current Windows session has no Docker or `.env.test.local`; database/API and full browser integration checks must run in the documented Docker environment or CI. Never point those suites at hosted data.
