# Supabase schema and authentication

## What is implemented

The versioned migrations create the marketplace tables, RLS policies, signup profile/role trigger, private photo bucket, safe public read functions, owner activation, controlled profile edits, moderation/suspension functions, and booking/viewing RPCs. Confirmed allocations use a PostgreSQL exclusion constraint and deferred consistency triggers. Admin access requires password sign-in and an active database-assigned administrator role.

The app provides signup, email verification and resend, login/logout, password recovery, profile settings, owner activation, and TOTP enrollment/challenge. Account/owner/admin routes verify the user server-side. Owner property/room forms, admin review, and public database discovery are implemented; see `docs/listing-workspaces.md` for the incremental hosted upgrade. Booking and viewing UI remain later milestones. Secure photo processing/review is implemented; see `secure-photos.md` for migration 005 and server-only key setup. Direct browser Storage access remains denied.

The code uses the publishable key through the current user's session. A server-only privileged key is used solely for validated photo Storage operations, authorized image delivery, and file cleanup. Test service keys exist only in the ignored local test configuration and are guarded against hosted URLs.

## Apply to the hosted development project

The publishable key cannot execute migrations. This milestone's hosted application therefore requires an operator action in Supabase's **SQL Editor**, or an authenticated Supabase CLI session. Never put a database password or access token in chat or Git.

For a fresh, dedicated project:

1. Review `supabase/migrations/` and the generated `supabase/bootstrap.sql`.
2. Open the intended development project in the Supabase dashboard and its SQL Editor. Paste and run `supabase/bootstrap.sql` **once** as the project operator. It applies all five migrations in one transaction, backfills existing Auth accounts as renters, and records the migration versions for later CLI use. It does not create an admin or fictional property inventory.
3. Confirm that `profiles`, `account_roles`, `properties`, `units`, `booking_requests`, and the other application tables exist with RLS enabled. Existing tables with conflicting names will cause the transaction to fail; do not drop existing data to force it through. Use a dedicated development project or plan a separate migration.
4. Add the public application settings to the app environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`. The site URL is the exact canonical origin (for local development, `http://127.0.0.1:3000`; for deployment, your actual HTTPS origin). Restart/rebuild after changing public settings.
5. In Supabase Auth URL configuration, set **Site URL** to that origin and allow its `/auth/confirm` callback. Keep staging/production redirect allowlists separate; avoid broad production wildcard redirects.
6. Enable email/password signup and email confirmations, use a minimum password length of 8, and leave TOTP enrollment optional for regular accounts. The app accepts 8–128 characters for signup and password updates. Existing hosted projects must also set their Supabase Auth minimum to 8; changing the local configuration does not update hosted settings. Configure production email delivery and appropriate Auth rate limits/CAPTCHA before a public launch. Local email tests do not establish hosted SMTP delivery.
7. Configure confirmation and recovery email templates using the files in `supabase/templates/`. They send a token hash to `/auth/confirm` with the appropriate type and work across devices. The callback also supports the provider's default PKCE code flow, which needs the initiating browser's verifier cookie. Use templates as HTML, not as literal filesystem paths in the hosted dashboard.
8. Verify an actual email signup/recovery flow against the deployed or local app connected to the hosted project. Until these settings are applied, local test success does not establish hosted readiness.

`bootstrap.sql` is for the first application only. Subsequent changes must be new migrations. For an authenticated CLI workflow, link the development project through secure provider/CLI credentials and use the normal migration command rather than rerunning the bootstrap. Match the database major version to your project if using shadow/diff operations; this repository uses PostgreSQL 15 for its local tests, with ordinary SQL supported by later PostgreSQL versions too.

### First admin

Create and verify your own account through the app first. In the intended project's SQL Editor, replace the example email below with the verified operator's email and run:

```sql
insert into public.account_roles(user_id, role)
select id, 'admin'
from auth.users
where email = 'YOUR_VERIFIED_EMAIL'
  and email_confirmed_at is not null
on conflict do nothing;
```

Check that exactly the intended user holds the role. Never make this a public RPC or a signup option. Sign in with the assigned account’s email and password, then open `/admin`. Administrator access does not require an authenticator code. Both routes and privileged RPCs enforce the database role and active account status. Existing projects must apply `supabase/upgrade-admin-password.sql` to update the database checks.

## Local development and testing

Prerequisites: the pinned Node/npm versions, a working Docker daemon with sufficient disk, and the pinned Supabase CLI installed by `npm ci`.

```sh
npm ci
npm run db:start
npm run db:reset
npm run test:setup
npx playwright install --with-deps chromium
npm run check
```

`db:reset` is destructive to **local** test data. Never point tests at hosted data. `test:setup` captures local CLI settings into ignored `.env.test.local` without printing keys. `check` injects those settings for the build and test server, so hosted `.env.local`/runtime bindings are not used by the tests. `test:db` uses real PostgREST/Auth clients and separate concurrent requests, not mocked policy decisions. The SQL Editor bundle is also exercised against a fresh application schema in a rolled-back local transaction.

Use `npm run db:types` after migration changes and `npm run db:bundle` to refresh the first-install SQL bundle. Both generated artifacts are committed. Reference amenities live in the local seed; apply that same seed through an operator when reference amenities are needed on the hosted project. No test users or live listings are included in the seed.

To run the app against local Supabase, use:

```sh
node scripts/with-local-env.mjs npm run dev -- --hostname 127.0.0.1
```

Normal `npm run dev` uses your regular project settings. Keep the site origin and the browser origin consistent. The local email inbox is provided by Mailpit on port 54324; automated tests inspect it without sending real email.

### Cloud runner details

This cloud runner uses Docker's `vfs` driver, which made the official PostgreSQL image's layered unpack exceed available storage. For current-instance validation, the verified official image's filesystem was flattened into a single local layer, preserving its runtime configuration. No TLS or checksum checks were disabled. Standard Docker installations/CI can use the normal image through the CLI; this local image workaround is not a claim of new-machine restoration.

The runner also injects outbound proxy settings into containers that incorrectly proxy loopback checks and internal email-template requests. A local Auth image entrypoint appends the known internal service names to its proxy exclusions, and local health-check wrappers bypass the outbound proxy solely for `127.0.0.1`/`localhost` URLs. Their normal health checks then passed. The Storage container's health wrapper may need reapplication if this runner recreates it; these changes are not needed on standard local Docker/CI. `db:start` supplies internal service exclusions where the runner honors them. Remote traffic remains subject to the configured proxy policy.

This runner's restrictive file umask also required the public email template directories/files served by Kong to be readable (directories 0755, HTML files 0644). The startup script normalizes source-template permissions; an already-copied Kong template directory may require the same correction on this runner. No environment or credential files are made public by that step.

## Security and lifecycle details

- All application tables have RLS. Ordinary clients cannot update protected columns or directly insert approvals, allocations, role assignments, or audit events.
- Public listing/unit/availability RPCs return explicit safe projections. Public base-table access is denied. Public coordinates are rounded to three decimal places on owner input.
- Roles come from `account_roles`, never editable Auth user metadata. Signup/backfill creates only renter roles; owner activation adds only owner.
- Suspensions take effect in the database immediately for mutations and public owner listing visibility. Access tokens may outlive logout until their provider expiry; logout/recovery invalidates refresh sessions through Auth. Do not claim immediate access-token revocation.
- Account existence is not disclosed by recovery/resend success messages. Forms validate inputs server-side and client-side. Authentication callbacks allow only a fixed set of local application paths.
- Pending requests do not hold inventory. Approval locks property → unit → request and writes the allocation and decision in one transaction. Conflicts leave the request pending. Unit edits pause publication and increment the offer version.
- Viewing requests never reserve inventory. Address/contact RPCs disclose only consented participant fields and apply status/expiry windows; base private tables stay protected.
- Audit actions record actor, action, entity, and time. They do not store full contact/request payloads. Detailed moderation reason persistence and support UI can be added with the moderation milestone.
- The image pipeline validates and re-encodes uploads before privileged Storage writes. The private bucket denies direct ordinary-client Storage access; image delivery authorizes each request. See `secure-photos.md`.
- Before public launch, verify provider SMTP, CAPTCHA/rate limits, privacy/terms, monitoring, backups/restore, and a support process. The current changes establish a tested development foundation, not a completed marketplace launch.
