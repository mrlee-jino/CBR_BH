# Administrator operation and featured listings

## Activate this update

Apply `supabase/upgrade-experience.sql` once in the Supabase SQL Editor after the listing, photo, and request upgrades. The first-install bootstrap includes it for fresh projects. Deploy the application after the upgrade. No new environment secrets are needed. This does not publish any pending listing or activate Sunrise Apartment Rooms.

Signup now asks **Renter** or **Property owner**. Every verified account retains renter capability; property owner signup guides the person through an explicit owner-responsibilities step before the existing `activate_owner` function grants owner capability. The editable signup intent is only a navigation hint, never permission or an admin role. Renters see home search, their requests, profile, and security. Owner tools appear only for accounts with owner capability. A renter can later add owner access from the expandable option under Profile.

## Create your administrator access

1. Register through normal signup using your own email, choose Renter, and confirm the email. Your administrator role is separate from the public signup choice. Use a unique password; never put it in source files or send it in chat.
2. In Supabase SQL Editor, open `supabase/provision-admin.sql`, replace `REPLACE_WITH_YOUR_VERIFIED_EMAIL` with the exact verified email, and run it once. It adds only the admin role to that verified account. Do not add other accounts unless you intend to authorize another administrator.
3. Visit **`/admin/login`** on your website. This separate login address is not linked from public navigation. It uses your regular verified account credentials; there is no shared or hardcoded admin password.
4. After password login, open **`/admin`**. No authenticator setup or code is required. Existing projects must first apply **`supabase/upgrade-admin-password.sql`** once.

A hidden URL is not the security boundary: other people can guess `/admin/login`, but they cannot use administration without the database-assigned admin role, an active account, and a signed-in session. Admin links appear in authenticated account navigation only for administrators. Publication, promotion, contact, and storage RPCs independently enforce their database permissions.

User and report management are available at `/admin/users` and `/admin/reports`. Administrator-role assignment remains a controlled Supabase operator action; public signup cannot assign it.

## Daily operation

- Open `/admin` to review pending listings, published properties, rejected listings, or suspended properties.
- Open a property to review private details, units, photos, and review notes. Review every pending photo before publishing. Publication is independent of promotion.
- To feature a published property, use **Featured placement** in its admin detail page. Enter a priority from **1 to 100**, an expiry date within a year, and a private reason or agreement reference. Higher numbers appear first in the default Featured order; ties retain stable listing creation/ID ordering.
- Set priority **0** and record a reason to remove placement. Expiry is the end of the chosen Philippine calendar date; expired placements stop affecting results without a scheduled job.
- Public cards show **Featured · Promoted**. The search page explains that featured placement may be paid. Price and alphabetical sorting follow the visitor’s choice. Promotion does not bypass search filters, listing approval, active units, or owner suspension. Non-promoted eligible listings remain searchable, with pagination.
- Manage any payment agreement separately. This feature does not bill owners, collect payment, issue invoices, or verify that a payment occurred. Keep financial/private contact details out of public fields and promotion labels.

## Validation status

Run `npm run check` in the isolated local Supabase environment before deploying. The new security tests cover anonymous public search, promotion role authorization, sorting, expiration, hidden listings, and upgrade preservation. Local database and browser tests cover password-only administrator sessions, role revocation, suspended accounts, listing moderation, and user/report management. Hosted activation still requires applying the SQL upgrade and deploying the app.
