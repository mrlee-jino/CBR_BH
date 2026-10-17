# Release verification — 18 October 2026

## Confirmed

- Hosted property, photo, booking-request, viewing-request, and promotion tables are accessible to the configured server client.
- Hosted request-context and featured-label functions are available.
- Anonymous listing search succeeds and currently returns no published inventory.
- Sunrise Apartment Rooms exists in `pending_review`, with no uploaded or approved photos. No publication or approval was performed during this audit.
- GitHub run `39048973195` for commit `b21a87e` passed schema-type generation, SQL bundle consistency, 25 database tests, five image tests, six request-rule tests, and the production build. It passed 41 of 46 browser tests.

## Corrections in this change

- The request browser fixture now includes the reviewer and timestamps required by the existing published-property constraint. The production constraint is unchanged.
- The email-confirmation browser assertion checks the authenticated dashboard rather than removed marketing copy.
- Mobile information-card text has stronger contrast. About-page copy now reflects implemented viewing and booking requests.

## Remaining release gates

1. Run the corrected full suite in GitHub's isolated Supabase environment; do not run synthetic publication/booking fixtures against hosted data.
2. Confirm the active Vercel Production domain. The configured origin `https://cabadbaranboardinghouses.vercel.app` returned `DEPLOYMENT_NOT_FOUND` during the audit. Verify the actual domain before changing application or Supabase authentication callback settings.
3. Verify the hosted Supabase Auth password minimum is 8. Local `config.toml` does not change the hosted Auth configuration.
4. On the active deployment, sign in as the assigned administrator and verify MFA. Test owner/renter account journeys with authorized test accounts, and verify the deployed commit.
5. Upload actual Sunrise property photos, review the full listing and photos through the MFA-protected admin workspace, then approve publication. Do not substitute generated/demo artwork for property photos.

No real booking, property publication, photo approval, or promotion was created as part of the read-only hosted audit. Application validation remains separate from the operator's production publication decision.
