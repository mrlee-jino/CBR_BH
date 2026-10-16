# Build, test, and deployment plan

Milestone 1's discovery UI and the schema/auth foundation from milestones 2–3 are implemented and tested locally. Hosted schema application and Auth settings require the operator steps in [Supabase setup](supabase-setup.md). Owner/admin listing screens, photo processing, real public inventory, and booking UI remain a roadmap. Keep each commit runnable. Full-MVP validation includes production builds, real RLS tests, simultaneous booking approval tests, and browser journeys; formatting alone does not demonstrate readiness.

## 1. Scaffold the application and design system

Current implementation includes the landing page, search/filter results, six property-detail routes, shared layout/cards/forms, an accessible request-explanation dialog, original SVG illustrations, loading/error/not-found states, and the preview information page. Authentication, owner dashboards, live maps, uploads, and backend functionality remain for later milestones. Sample pages are deliberately excluded from search indexing.

Working directory: `/workspace/CBR_BH`. Keep this checkout. Use a supported Node.js LTS runtime (Node 24 is a suitable initial target), pin the exact selected runtime and package manager, and commit the generated lockfile. Choose supported compatible stable versions of Next.js App Router, React, TypeScript, Tailwind, Supabase JS/SSR, Leaflet/React Leaflet, Zod, and accessible UI primitives during scaffolding. Avoid an ORM initially; use Supabase's generated SQL types.

Because this repository already contains documentation, scaffold into a temporary directory, inspect generated files, then copy only intentional application files into the checkout without overwriting the README/docs. Record the exact scaffold command and selected versions after execution. Never use an unreviewed command that replaces the checkout.

Create the shared visual system, header/footer, responsive property cards, search/filter controls, gallery, dashboard navigation, status badges, form primitives, and request confirmation dialog. Use clearly labeled local fixtures while building UI; do not display fabricated listings as live inventory. Build the landing page, property list, and property detail layout first.

Suggested structure (planned files, not all created yet):

```text
src/
  app/
    (public)/
      page.tsx
      properties/page.tsx
      properties/[slug]/page.tsx
      terms/page.tsx
      privacy/page.tsx
      help/page.tsx
    (auth)/
      login/page.tsx
      signup/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
    auth/confirm/route.ts
    (renter)/dashboard/
      page.tsx
      favorites/page.tsx
      requests/page.tsx
      requests/[id]/page.tsx
      settings/page.tsx
    become-an-owner/page.tsx
    (owner)/owner/
      page.tsx
      properties/page.tsx
      properties/new/page.tsx
      properties/[id]/edit/page.tsx
      requests/page.tsx
      availability/page.tsx
    (admin)/admin/
      page.tsx
      properties/page.tsx
      properties/[id]/page.tsx
      users/page.tsx
      reports/page.tsx
    layout.tsx
    loading.tsx
    error.tsx
    not-found.tsx
    sitemap.ts
    robots.ts
  components/
    ui/
    layout/
  features/
    auth/
    properties/
    favorites/
    bookings/
    viewings/
    owner/
    admin/
  lib/
    supabase/{client,server,public,database.types}.ts
    auth/guards.ts
    money.ts
    dates.ts
    errors.ts
  proxy.ts                 # Only if required by the selected Next.js version
supabase/
  config.toml
  migrations/
  tests/
  seed.sql
tests/
  integration/
  e2e/
docs/
```

Feature folders own their query functions, Server Actions, validation schemas, and feature components. Share only truly reusable UI and utilities. Keep server-only modules marked accordingly; do not import server clients into browser bundles. Avoid a generalized repository/service abstraction around simple Supabase queries.

**Completion check:** app runs locally, the production build succeeds, type/lint checks pass, and landing/search/detail layouts work at narrow mobile and desktop widths with keyboard navigation. No secrets are required for fixture-based UI development.

## 2. Implement Supabase schema, RLS, and transaction functions

Use the Supabase CLI local stack with Docker if supported by the development machine. Otherwise use a dedicated development Supabase project, never production. Check tool availability before assuming Docker is usable. Add versioned migrations from [the database specification](database.md), private photo storage policies, deterministic development seeds, and generated database TypeScript types.

Create test identities for renter A, renter B, owner A, owner B, and admin. Use explicit test setup/admin credentials only in the isolated test environment; never in frontend code. Build role/account helpers and auth triggers before exposed tables and their policies. Implement default-deny grants, RLS, then controlled mutation RPCs. Match extension schemas and enforce the allocation exclusion constraint.

**Completion checks:**

- Clean local database reset applies every migration and seed, with no manual SQL required except a documented first-admin bootstrap for deployed environments.
- Anonymous clients cannot read drafts, contacts, requests, allocations, private addresses, roles, or audit data.
- A renter cannot read/change another renter's request, favorites, profile, or private contact data.
- Owner A cannot read/mutate owner B's private properties, units, photos, requests, or blocks; cannot edit verification/status fields through raw API calls.
- A role update through the public client cannot make its caller admin. A suspended account cannot mutate records using an existing JWT.
- Concurrent approvals for overlapping dates on the same unit produce exactly one allocation and one approved request; the loser remains pending and gets a conflict. Test through separate database connections and authenticated RPCs.
- Approval of the same request twice is idempotent; a replay does not create two allocations or audit decisions.
- Adjacent date ranges succeed; overlapping finite and indefinite ranges fail; separate bedspaces succeed; manual occupancy and maintenance blocks also prevent approval.
- Invalid dates, expired requests, owner self-booking, price changes, cancelled requests, unpublished listings, and suspended owners are rejected.
- Cancellation before move-in releases the allocation atomically; move-out preserves historical dates. Unauthorized cancellation and date changes fail.
- Private photo access and signed URL generation obey publication/review state and ownership.

These are security and integrity tests that must run against the database, not mocked Supabase responses. pgTAP is suitable for policies/constraints; an integration runner with two clients/connections exercises concurrency and RPC behavior.

## 3. Connect authentication and account workspaces

Implement signup/verification, login/logout, password recovery, SSR session refresh, validated same-origin return URLs, private contact settings, and owner activation. Add server-side route/data guards and database-backed permissions. Admin is provisioned securely outside signup. Configure admin MFA and enforce it for sensitive admin operations.

**Completion check:** a fresh user can verify email, sign in, reload a protected route, sign out, and recover a password. Forged role metadata and direct URL access do not grant owner/admin permissions. Owner activation preserves renter capabilities. Session refresh does not cache private data publicly.

## 4. Build owner inventory and admin publication

Implement property draft CRUD, units, monthly pricing/terms, approximate/public and exact/private location inputs, photo validation/reordering, preview, submit/review/reject/publish/suspend, and the audit timeline. Apply pause/review transitions to material listing edits. Add owner-entered occupancy and maintenance blocks through the allocation functions.

**Completion check:** owner A creates a property with two bedspaces, uploads photos, and submits it. It is invisible publicly until an admin publishes it. Owner B cannot access the draft or its uploads. Rejected input remains editable with the reason visible. Publication shows correct safe public data; pause/suspension removes public content and invalidates caches. Unreviewed replacements never become public.

## 5. Build discovery, maps, favorites, and SEO

Replace fixtures with live approved listings. Add bounded URL filters, pagination, stable sorting, monthly price ranges, requested-date availability, photo galleries, Leaflet client maps, approximate pins, favorites, dynamic metadata, canonical URLs, and sitemap/robots rules. Avoid N+1 database calls; load listing summaries with explicit safe projections.

**Completion check:** unpublished listings cannot appear through search, guessed detail URLs, map queries, metadata, photo signing, or sitemaps. Filters persist in URLs and browser navigation. Date search respects allocations. Public pages contain useful HTML before map JavaScript runs. Mobile search remains usable when map tiles fail. No exact private coordinates appear in public HTML/JSON.

## 6. Build request and confirmation workflows

Implement viewing and monthly booking forms, renter request history, owner inbox/detail, approve/reject/withdraw/cancel actions, contact consent/disclosure, immutable offer display, and understandable conflict messages. Use a request-specific idempotency key and disable duplicate submits for usability while retaining database protection. The inbox is the required MVP notification channel.

**Completion check:** run a browser journey from signup → published listing → favorite → viewing → booking request → owner approval → renter confirmation. Run a competing request simultaneously and verify it cannot be confirmed for overlapping dates. Test offer changes, expired requests, repeated clicks, signed-out sessions, invalid IDs, and cancellation. Confirm the exact address/contact disclosure rules against actual network responses.

An optional later email-notification adapter must never decide booking correctness. If added, store a durable notification/outbox event in the same transaction, deliver asynchronously with retries and deduplication, and show in-app status even if delivery fails. Do not introduce that infrastructure before the core flow works.

## 7. Production hardening and deployment

### Configuration and credentials

Application values planned for implementation:

| Name | Use | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Target project URL | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase browser/server user-client key; use the supported project key type | Public; security relies on RLS |
| `NEXT_PUBLIC_SITE_URL` | Canonical environment origin | Public |
| Map provider settings | Tile URL, attribution, optionally a browser-restricted public token | Only expose tokens designed for browser use |
| Deployment/migration credentials | Supabase CLI and Vercel deployment operations | Operator/CI only; never a `NEXT_PUBLIC_` value |

No service-role application key is required for the core user workflow. If a future background worker needs elevated access, isolate its key and privileges from request handlers and browser bundles. Store server secrets in the provider's secure environment settings; never in Git or chat. Check existing bindings before requesting credentials. Add `.env.example` with placeholders and ignore `.env.local` when scaffolding.

Supabase Auth email verification/recovery requires a production-supported email delivery configuration and correct redirect allowlists. Configure the Auth site URL, explicit production/staging callback URLs, and SMTP or another supported sender with its credentials held in provider settings. Test actual signup/recovery emails before inviting users. A dev inbox is not production email readiness.

### Deployment sequence

1. Create isolated staging and production Supabase projects and a Vercel project connected to this repository. Select deployment regions close to Philippine users where available and measure performance.
2. Configure project keys, canonical origins, Auth redirects/email delivery, Storage limits/policies, map provider terms/origin restrictions, and operator MFA. Restrict preview deployments to staging; never point arbitrary preview branches at production data.
3. Run CI: frozen-lockfile install, lint, type check, unit tests for real domain rules, local database/RLS/integrity tests, production build, then representative browser smoke tests. Suggested tools: Vitest, Playwright, and pgTAP. Pin tools and preserve command exit statuses.
4. Apply reviewed migrations to staging through a controlled migration job, not on every Vercel build. Generate/check types for schema drift. Seed staging with synthetic listings and test users; never copy real contacts into fixtures.
5. Deploy staging and exercise public search, email signup/recovery, owner publication, signed photo access, renter requests, competing approvals, cancellation, direct unauthorized API calls, and mobile map fallback.
6. Provision the first production admin using a documented controlled operation. Apply production migrations once, deploy the validated application, and verify redirects, canonical URLs, permissions, and server logs.
7. Run a small authorized production smoke test with identifiable test records, then archive them. Confirm error monitoring, dependency alerts, backup availability and restore procedure, support contact, request/signup throttling, privacy/terms, and upload abuse handling.
8. Invite a small Cabadbaran owner pilot. Measure verified listings, renter requests, owner response time, conflicts, and unresolved reports before expanding features or geography.

For rollback, retain the last working Vercel deployment and prefer backward-compatible additive migrations. An application rollback does not revert the database. Test destructive migrations and restore procedures separately. Verify the actual Supabase plan's backup/restore features rather than assuming point-in-time recovery is included.

### Final MVP release gate

- No cross-account private data access or client privilege escalation in required tests.
- Concurrent booking integrity demonstrated against PostgreSQL.
- Fresh database setup and production build are repeatable from committed sources.
- Public discovery, owner publication, admin review, and renter confirmation work in staging end to end.
- Mobile usability, keyboard navigation, image validation, rate limits, and errors have been exercised.
- Production configuration, email delivery, map terms, support process, monitoring, and backups are verified.

Do not describe the MVP as production-ready until these gates pass. Database correctness can prevent double-confirmation within PuyoHub; owners still need to record off-platform occupancy promptly for advertised availability to reflect reality.

## 8. Follow-on SaaS sequence

After the marketplace pilot: tenant/lease records → rent schedules and manual receipts → payment provider integration and reconciliation → owner subscription entitlements → operational analytics. Build each around validated owner needs. Preserve the separation between reservation inventory, legal tenancy, rent accounting, and platform subscription billing.
