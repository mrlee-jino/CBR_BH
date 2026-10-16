# PuyoHub

A rental discovery marketplace and property management platform, starting with monthly boarding houses, bedspaces, rooms, and apartments in Cabadbaran City, Philippines.

## Project status

The first UI milestone is implemented: a responsive Next.js application with a light purple theme, a landing page, URL-based rental search/filtering, and property-detail pages. Six fictional listings and original illustrations demonstrate the experience. No Supabase database, authentication, real inventory, reservations, payments, or deployed services are connected yet.

The first release covers discovery, favorites, viewing requests, monthly booking requests, owner inventory management, and admin moderation. Online payments, subscriptions, rent accounting, and nightly stays are outside this release.

## Implementation blueprint

- [Architecture, pages, and user flows](docs/architecture.md)
- [Database schema, access rules, and booking integrity](docs/database.md)
- [Step-by-step build, test, and deployment plan](docs/implementation.md)

Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, Leaflet, and Vercel. Use the existing checkout for development; an additional worktree is unnecessary.

## Run locally

Use Node.js **24.19.0** (`nvm use` if available) and npm **11.9.0**.

```sh
npm ci
npm run dev
```

No environment variables or credentials are required for this milestone. See `.env.example`. For a production-mode local run, use `npm run build` followed by `npm start`. If your cloud sandbox cannot write to npm's default cache, prefix installation commands with `npm_config_cache=/tmp/puyohub-npm-cache`.

Routes:

- `/` — landing page, area/type search, rental categories, and product explanation.
- `/properties` — keyword, barangay, rental-type, minimum/maximum monthly price, and sorting filters. Searches persist in URL query parameters.
- `/properties/amihan-garden-house` — an example detail page with unit prices, deposit/utilities terms, amenities, and an accessible request-explanation dialog.
- `/preview` — current capabilities and limitations.

All properties, prices, units, and areas shown as listing locations are fictional examples. Artwork is illustrative, not photography. The area diagram is decorative, not a geographic map. Booking controls explain the planned workflow and never submit a reservation or collect contact details. Preview pages are marked `noindex, nofollow` and `robots.txt` disallows crawling while inventory is fictional.

## Validate

```sh
npm run lint
npm run format:check
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright starts its own production server on port 3000, so stop any development server on that port first. On Linux machines that need browser system libraries, use `npx playwright install --with-deps chromium`. An existing Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.

The browser suite covers filtering, sort order, browser history, invalid/empty results, real 404 responses, keyboard navigation/dialog focus, image loading, viewport overflow from 320–1440px, and automated accessibility checks in desktop and mobile Chromium. Automated checks do not establish complete accessibility or production security readiness.

`npm run check` runs formatting, lint, type checking, a production build, and browser tests after Chromium is installed. GitHub Actions performs those checks for pushes to `main` and pull requests. Reports/traces are ignored locally and retained as CI failure artifacts.

Next: milestone 2, the Supabase schema, RLS policies, and atomic booking transactions. The database design remains a specification; no security policies or booking constraints have been applied or tested yet. See [the implementation plan](docs/implementation.md).
