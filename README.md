# PuyoHub

A rental discovery marketplace and property management platform, starting with monthly boarding houses, bedspaces, rooms, and apartments in Cabadbaran City, Philippines.

## Project status

Design phase. This repository currently contains the implementation blueprint; it does not yet contain a runnable application, database migrations, or deployed services.

The first release covers discovery, favorites, viewing requests, monthly booking requests, owner inventory management, and admin moderation. Online payments, subscriptions, rent accounting, and nightly stays are outside this release.

## Implementation blueprint

- [Architecture, pages, and user flows](docs/architecture.md)
- [Database schema, access rules, and booking integrity](docs/database.md)
- [Step-by-step build, test, and deployment plan](docs/implementation.md)

Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, Leaflet, and Vercel. Use the existing checkout for development; an additional worktree is unnecessary.

Begin with milestone 1 in the implementation plan. Each milestone has concrete completion checks; do not treat this design as implemented or security-tested.
