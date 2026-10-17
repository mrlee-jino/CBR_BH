# System review — 17 October 2026

This review follows the repository’s code, migrations, documentation, and tests. It does not verify hosted Supabase/Vercel state, Sunrise imports, or previous CI results.

## Current structure

PuyoHub is a Next.js modular monolith for monthly rentals in Cabadbaran. Public discovery uses narrow published-listing RPCs; fictional inventory is separate under `/preview/rentals`. Cookie-aware server clients handle authenticated operations with Supabase RLS and transactional functions enforcing permissions and state transitions.

Account flows include verified email/password access, recovery, private profile editing, owner activation, and MFA checks for admin access. Owners manage property drafts, individual reservable units, prices, terms, and publication submissions. Admins review listings and photos. Image processing validates raster content, strips metadata, and stores private images with controlled delivery. The existing database uses exclusion constraints and locked transactional approval to prevent overlapping confirmed unit allocations.

The viewing/booking milestone connects these foundations to renter forms, renter history, owner decisions, and controlled participant contact release. It adds only a narrow listing-label projection to the schema. Ordinary request operations use the signed-in user’s credentials, rather than a privileged server key.

## Remaining work and release checks

Hosted activation is separate from implementation. Verify applied migrations, server-only photo key configuration, actual owner/admin publication, and the real Sunrise draft before describing the listing as live. Private import files must remain outside Git.

Run the complete local Supabase/browser suite and schema-type regeneration before merging or deployment. The Windows development session lacks Docker and local test settings. Available app/static and pure request/image checks do not establish database or end-to-end correctness.

The product blueprint still includes favorites UI, maps, availability management, and operational hardening. Request notification delivery is intentionally in-app. Payments, tenant ledgers, signed leases, and nightly bookings remain outside this milestone. Before opening a public pilot, exercise staging workflows and verify the existing release gates for throttling, support/privacy information, monitoring, backups, and restoration.
