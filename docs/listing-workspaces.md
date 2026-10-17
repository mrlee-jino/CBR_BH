# Owner listings and admin review

Owners can create a private property draft, add individual rentable rooms/bedspaces/apartments, edit monthly rent/deposit/terms, enable or disable an offer, and submit for review. Pending review locks editing. An MFA-verified admin reviews the property, private address/contact, and units, then publishes, returns for changes, or suspends it. Notes are saved in the audit trail and shared only with the property's owner/admins. An optimistic version check rejects reviews from stale tabs.

Editing an advertised property or unit pauses publication and invalidates prior verification. Owners must resubmit. Existing reservations are preserved. The owner workspace displays unreleased allocations; booking, block editing, and viewing forms remain future work. No vacancy is claimed just because a unit is offered.

Public `/properties` search and `/properties/[slug]` pages use explicit anonymous RPC projections. They expose no owner identifiers, exact street address, or contact information. Search filters individual eligible units before calculating the displayed minimum rent; a cheap bedspace cannot make an expensive private room pass the budget filter. Results are paginated, 24 per page, with bounded offsets. Homepage features the latest three reviewed listings. Suspended owners and nonpublished properties disappear immediately. No fictional fallback is used on errors or empty results.

Fictional fixtures remain only under `/preview/rentals` and are excluded from indexing. Photo uploads remain closed; live cards use a clearly labeled placeholder rather than fictional property photos.

## Hosted upgrade for existing installations

If migrations 001–003 have already been applied, open Supabase SQL Editor and run `supabase/upgrade-listings.sql` **once**. This applies only migration `20261017000400_listing_workspaces` and records its version. Do not rerun `bootstrap.sql` on an existing installation. The upgrade adds functions and grants; it does not replace existing tables or create listings/accounts. Fresh installations still use `bootstrap.sql` once, now including all four migrations.

Apply the upgrade before deploying this UI. Then deploy the latest main branch on Vercel with the three public environment settings from `docs/supabase-setup.md`. Until the upgrade is applied, live discovery reports that listings are temporarily unavailable and owner review pages cannot load review history.

## Manual acceptance flow

1. Sign in with a verified account, activate owner access, and open My properties.
2. Add a property with private contact details, save it, and add at least one active rentable unit.
3. Confirm the draft does not appear in public search. Submit for review; confirm editing is locked.
4. Sign in as a database-assigned admin and complete authenticator verification. Open the review queue, inspect details, enter review notes, and approve.
5. In a signed-out browser, search by name/type/budget, open the property, and confirm that address and phone are absent.
6. Return as owner and confirm review feedback is visible. Change a property or room, then confirm it is paused and disappears publicly until another review.
7. Test returning for changes, resubmission, unauthorized access, and suspension as well.

## Validation

New database coverage verifies both fresh and incremental SQL application and checks filtered unit prices, public field projections, owner-only review feedback, stale reviews, and suspension. A desktop/mobile browser workflow creates a property and room, submits it, authenticates an admin with MFA, publishes it, checks public privacy/accessibility, then edits it and verifies removal from public search. It also verifies form contents survive validation errors and fractional rent retains its centavos. Existing database and auth tests remain in place; fictional discovery tests now target the explicitly separate demo routes.
