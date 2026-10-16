# PuyoHub

A rental discovery marketplace and property management platform, starting with monthly boarding houses, bedspaces, rooms, and apartments in Cabadbaran City, Philippines.

## Project status

The responsive discovery preview and Supabase schema/auth foundation are implemented. The app includes signup/email confirmation, login/logout, recovery, private profiles, owner activation, and MFA-gated admin access. Migrations and security tests run against a real local Supabase stack. Applying them to the hosted project requires the operator steps in [Supabase setup](docs/supabase-setup.md).

Six fictional listings and original illustrations still power public discovery. Real listing/booking screens, photo processing, payments, and deployment are not implemented by this milestone.

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

Configure the three public variables in `.env.example` through your runtime or ignored `.env.local`. Auth needs the Supabase URL, publishable key, and canonical site origin. See the setup guide for schema application and email callbacks. Discovery fixtures need no credentials, but account routes do. For a production-mode local run, use `npm run build` followed by `npm start`. If your cloud sandbox cannot write to npm's default cache, prefix installation commands with `npm_config_cache=/tmp/puyohub-npm-cache`.

Routes:

- `/` — landing page, area/type search, rental categories, and product explanation.
- `/properties` — keyword, barangay, rental-type, minimum/maximum monthly price, and sorting filters. Searches persist in URL query parameters.
- `/properties/amihan-garden-house` — an example detail page with unit prices, deposit/utilities terms, amenities, and an accessible request-explanation dialog.
- `/preview` — current capabilities and limitations.
- `/signup`, `/login`, `/resend-confirmation`, `/forgot-password`, `/reset-password`, `/auth/confirm` — email/password authentication.
- `/dashboard`, `/dashboard/settings`, `/dashboard/security` — protected overview, private profile, and authenticator setup.
- `/become-an-owner`, `/owner`, `/admin` — owner activation and role-protected workspace foundations. Admin additionally requires MFA; management screens follow later.

All properties, prices, units, and areas shown as listing locations are fictional examples. Artwork is illustrative, not photography. The area diagram is decorative, not a geographic map. Booking controls explain the planned workflow and never submit a reservation or collect contact details. Preview pages are marked `noindex, nofollow` and `robots.txt` disallows crawling while inventory is fictional.

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

The browser suite covers the discovery preview plus real local signup/verification, session reload, private profile editing, owner activation, logout, password recovery, safe redirects, and admin MFA. Database/API tests cover RLS, field/role escalation, contact privacy, suspension, viewing decisions, expiration, and concurrent booking approvals. Automated checks do not establish complete accessibility or production readiness.

`npm run check` runs formatting, lint, types, database/API tests, a production build, and browser tests after the local stack/test configuration and Chromium are ready. GitHub Actions starts/reset the local stack and runs those checks for pushes to `main` and pull requests. Reports/traces are ignored locally and retained as CI failure artifacts. Refresh committed schema types with `npm run db:types` and the first-install SQL bundle with `npm run db:bundle` after migration changes.

Next: apply the tested migrations to the hosted development project and configure its Auth callbacks/email templates, then build owner property/unit screens and admin review. See [the implementation plan](docs/implementation.md).
