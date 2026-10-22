# Cabahay Google sign-in

Google sign-in uses Supabase Auth and a PKCE code exchange through `/auth/confirm`.
No application Google secret is needed. Existing email sign-in remains available.

Apply `supabase/upgrade-auth.sql` in the Supabase SQL Editor before launch. It uses Google’s display name for new profiles and retains renter-only initial permissions; it does not change existing accounts.

## Activate on the hosted project

1. In Google Cloud Console, configure the OAuth consent screen with the Cabahay name, your support email, privacy policy and authorized domain. While the consent screen is in testing, add test users; publish it before opening registration publicly.
2. Create an OAuth client of type **Web application**. Add this exact **Authorized redirect URI**:
   `https://labskhbfdohisjidhhry.supabase.co/auth/v1/callback`.
3. In Supabase → Authentication → Sign In / Providers → Google, enable Google and enter that client ID and client secret. Save. Keep the secret only in Supabase; never place it in chat, Git, or a `NEXT_PUBLIC_` variable.
4. Set Vercel `NEXT_PUBLIC_SITE_URL` and Supabase Authentication → URL Configuration → Site URL to your current production origin. The last documented active origin is `https://boardinghousesapartmentsofcbr.vercel.app`; verify it is still yours/current before saving. Add `https://boardinghousesapartmentsofcbr.vercel.app/auth/confirm` to the Supabase redirect allowlist (replace the domain if yours changed). Redeploy the latest main branch after changing Vercel settings.
5. For local Google testing, additionally allow `http://127.0.0.1:3000/auth/confirm` in Supabase. The Google redirect URI remains the Supabase callback above, not the app callback.

## Verify before public signup

- On login, choose **Continue with Google**, select your Google account, and check that you return to your account dashboard. An existing activated owner should land in the owner workspace.
- On signup, select Renter or Property owner and accept the account notice before using Google. Name/email/password fields are only required for email signup. Owner selection directs onboarding; it never grants owner or admin permissions by itself.
- Cancel Google consent, then retry. Check an existing email account as well as a new Google account; Supabase controls identity linking. If an account already exists, authenticate through its established method rather than adding manual linking.
- With Confirm email disabled, new email signups immediately enter their dashboard or owner onboarding. With it enabled, the confirmation message and email flow remain supported. Existing unconfirmed accounts are not automatically migrated by this change.
- Confirm suspended accounts cannot sign in and administrators still require authenticator MFA.
- Test password recovery for email accounts. Google users can continue using Google; Google signup does not create an application password.

The app checks provider availability before redirecting, so an unconfigured Google provider shows an inline message instead of a provider error page. OAuth cancellation and failed/expired callbacks return a friendly login message. Return destinations are restricted to the existing allowlist, and callbacks are not cached.

Actual Google consent/account selection needs a configured provider and a human-controlled Google account; local automated checks do not prove hosted Google credentials are active.

## Local automated checks

The normal auth browser suite runs with local email confirmation enabled and Google disabled, testing email verification, safe callback errors, consent and provider-unavailable handling. To test immediate email signup, disable Confirm email **only on the isolated local test stack**, then run:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/with-local-env.mjs npx playwright test --config tests/auth-auto-confirm.config.ts
```

Restore the local confirmation setting before running the normal suite. These tests must never target the hosted project.

To verify Google initiation without a real Google account, separately enable Google on isolated local Auth using dummy credentials and run:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/with-local-env.mjs npx playwright test --config tests/google-enabled.config.ts
```

This suite intercepts the local authorize request before contacting Google, checks the PKCE challenge and verifier cookie, and validates renter/owner return paths. Disable the dummy provider again before the normal suite. It does not test Google consent or a completed Google login.

## Verification on 22 October 2026

Production build, TypeScript, ESLint, formatting, 26 database/security tests, six request-rule tests and five image tests passed. All 18 account/Google-unavailable browser checks passed, along with four immediate-signup checks and four Google PKCE initiation checks across desktop/mobile.

The broader 50-case browser run passed 47 cases initially. Two failures were assertions for the intentionally changed owner-help text; all six interaction checks passed after updating that expectation. One desktop booking workflow check still fails at the competing renter’s booking form before its second booking POST is made. The mobile booking workflow passes. This remaining booking check needs investigation before public launch; these results do not establish a fully passing release suite.

Hosted Google consent and completed Google login remain unverified until the provider credentials and production redirect settings are configured.
