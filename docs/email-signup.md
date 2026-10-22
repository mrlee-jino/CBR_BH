# Cabahay email/password signup

Cabahay offers email/password registration and sign-in. No Google Cloud project or OAuth client credentials are required.

In Supabase Authentication settings, keep email/password sign-in and new user signup enabled. With **Confirm email** disabled, eligible new users receive a session immediately: renters enter their dashboard, while prospective owners enter the owner activation step. Selecting an owner account never grants administrator access. Existing owners and administrators retain their role checks; administrators use email/password sign-in with an active database-assigned admin role.

If Confirm email is enabled later, signup instead displays the confirmation message and uses the existing email confirmation callback. Previously unconfirmed accounts are not automatically confirmed by changing this setting. Password recovery continues to use email.

Keep the Google provider disabled in Supabase and remove incorrect provider credentials there. No new SQL migration is required to remove Google sign-in. The previously supplied profile-name migration can remain applied.

For immediate-signup testing, disable confirmation only on the isolated local Auth service and run:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/with-local-env.mjs npx playwright test --config tests/auth-auto-confirm.config.ts
```

Restore local confirmation before running the normal email-verification suite. Never run test signups against the hosted project.

Assigned administrators land in `/admin` after a normal login or opening `/dashboard`. Authenticator verification is not required. Admin profile and security pages keep the administration navigation; explicit allowed return links are preserved. The admin dashboard displays listing totals and review queues.
