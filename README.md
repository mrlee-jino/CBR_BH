# Cabahay

A rental discovery marketplace and property management platform, starting with monthly boarding houses, bedspaces, rooms, and apartments in Cabadbaran City, Philippines.

## Project status

The app includes owner property/room forms, admin review with MFA, and public search/detail pages backed by approved Supabase listings. Signup/email confirmation, login/logout, recovery, private profiles, and owner activation are implemented. Migrations and security tests run against a real local Supabase stack. Hosted activation requires the operator steps in [Supabase setup](docs/supabase-setup.md) and [the listing workspace upgrade](docs/listing-workspaces.md).

Signup now offers **Renter** and **Property owner**, with simpler renter navigation and a separate owner workspace. Guest browsing needs no account. Admin-controlled, expiring featured placement is available after applying `supabase/upgrade-experience.sql`. See [administrator operation and setup](docs/admin-operations.md), including the separate `/admin/login` address and MFA requirements.

Six fictional listings remain in a clearly separate demo at `/preview/rentals`. Public discovery never substitutes demo inventory for real listings. Secure photo processing and moderation, viewing/booking forms, renter request history, owner request decisions, and owner-managed walk-in occupancy and maintenance blocks are implemented. Maps and favorites UI remain future milestones; payments are outside this release. See the [system review](docs/system-review.md).

The first release covers discovery, favorites, viewing requests, monthly booking requests, owner inventory management, and admin moderation. Online payments, subscriptions, rent accounting, and nightly stays are outside this release.

## Implementation blueprint

- [Architecture, pages, and user flows](docs/architecture.md)
- [Database schema, access rules, and booking integrity](docs/database.md)
- [Step-by-step build, test, and deployment plan](docs/implementation.md)
- [Supabase setup, hosted SQL application, and authentication](docs/supabase-setup.md)

Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, Leaflet, and Vercel. Use the existing checkout for development; an additional worktree is unnecessary.

## Run locally

Use Node.js **24.19.0** (`nvm use` if available) and npm **11.9.0**.

```sh
npm ci
npm run dev
```

Configure the three public variables in `.env.example` through your runtime or ignored `.env.local`. Auth needs the Supabase URL, publishable key, and canonical site origin. See the setup guide for schema application and email callbacks. Live discovery and account routes require the Supabase settings; the separate fictional demo needs no credentials. For a production-mode local run, use `npm run build` followed by `npm start`. If your cloud sandbox cannot write to npm's default cache, prefix installation commands with `npm_config_cache=/tmp/puyohub-npm-cache`.

Routes:

- `/` — landing page, area/type search, rental categories, and product explanation.
- `/properties` — keyword, barangay, rental-type, minimum/maximum monthly price, and sorting filters. Searches persist in URL query parameters.
- `/properties/[slug]` — approved property details, monthly unit prices, deposits, and terms. Exact addresses/contact details remain private.
- `/preview/rentals` and `/preview/rentals/[slug]` — fictional demo listings, original concept art, and a request-explanation dialog.
- `/preview` — current capabilities and limitations.
- `/signup`, `/login`, `/resend-confirmation`, `/forgot-password`, `/reset-password`, `/auth/confirm` — email/password authentication.
- `/dashboard`, `/dashboard/settings`, `/dashboard/security` — protected overview, private profile, and authenticator setup.
- `/properties/[slug]/request`, `/dashboard/requests`, `/dashboard/requests/[id]`, `/owner/requests` — verified request forms, renter history, participant details, and owner decisions.
- `/become-an-owner`, `/owner`, `/owner/properties/new`, `/owner/properties/[id]` — owner activation, property drafts, rooms, offers, and review feedback.
- `/admin`, `/admin/properties/[id]` — MFA-protected listing queues and review decisions.

Live listings contain owner-provided details reviewed by admins. Offering a unit does not guarantee availability for particular dates. Owners can upload validated photos for admin review and track walk-in occupancy or maintenance blocks; listings without photos use labeled placeholders. Fictional artwork and decorative area diagrams are confined to the demo; demo and private account pages are excluded from indexing. Public listing pages are indexable. Verified renters can request viewings and monthly bookings; pending requests do not reserve inventory. See [request workspace setup](docs/viewing-booking.md) and [owner listing operations](docs/listing-workspaces.md).

## Validate

```sh
npm run db:start
npm run db:reset
npm run test:setup
npx playwright install --with-deps chromium
npm run check
```

Docker is required. Reset destroys local test data. Tests refuse hosted URLs and never send real email. The wrapper uses ignored `.env.test.local` for the production build/test server, overriding regular hosted settings. To develop against local Supabase, run `node scripts/with-local-env.mjs npm run dev -- --hostname 127.0.0.1`. Cloud Docker/proxy limitations and hosted activation steps are documented in the setup guide.

Playwright starts its own production server on port 3000, so stop any development server on that port first. On Linux machines that need browser system libraries, use `npx playwright install --with-deps chromium`. An existing Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.

The browser suite covers the separate discovery demo plus real local signup/verification, session reload, private profile editing, owner activation, logout, password recovery, safe redirects, admin MFA, and the owner-to-admin-to-public listing workflow. Database/API tests cover RLS, field/role escalation, contact privacy, suspension, viewing decisions, expiration, and concurrent booking approvals. Automated checks do not establish complete accessibility or production readiness.

`npm run check` runs formatting, lint, types, database/API tests, a production build, and browser tests after the local stack/test configuration and Chromium are ready. GitHub Actions starts/reset the local stack and runs those checks for pushes to `main` and pull requests. Reports/traces are ignored locally and retained as CI failure artifacts. Refresh committed schema types with `npm run db:types` and the first-install SQL bundle with `npm run db:bundle` after migration changes.

Next: apply the incremental request upgrade after the listing/photo upgrades, run the full integration suite, and test renter/owner confirmations in staging. See [the request setup](docs/viewing-booking.md) and [implementation plan](docs/implementation.md).

Owner listing creation, rooms, admin review, and live public discovery: see [listing workspace setup and upgrade](docs/listing-workspaces.md). Existing Supabase projects must run `supabase/upgrade-listings.sql` once before deploying this milestone.

Secure photos require the incremental [photo upgrade and server-only key setup](docs/secure-photos.md).

Email/password registration setup: [Cabahay account signup](docs/email-signup.md).

Admin Users and Reports: [setup and controls](docs/admin-management.md). Apply `supabase/upgrade-admin.sql` once before enabling account changes.
