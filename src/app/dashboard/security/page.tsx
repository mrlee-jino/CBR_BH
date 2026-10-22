import type { Metadata } from "next";
import Link from "@/components/ui/navigation-link";
import { requireAccount } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { SecurityForm } from "@/features/auth/security-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account security" };
export default async function Security() {
  const account = await requireAccount("/dashboard/security");
  const admin = account.roles.includes("admin");
  if (admin)
    return (
      <DashboardShell title="Administrator security." workspace="admin">
        <section className="account-card">
          <h2>Email and password sign-in</h2>
          <p>
            Use your email and password to sign in. Administrator access requires an assigned admin
            role and an active account.
          </p>
          <p>Authenticator verification is not required for administration.</p>
          <Link className="button button-outline" href="/forgot-password">
            Reset your password
          </Link>
          <p>
            <Link className="text-link" href="/admin">
              Continue to administration →
            </Link>
          </p>
        </section>
      </DashboardShell>
    );
  const supabase = await createClient();
  const [{ data: factors }, { data: assurance }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.getClaims(),
  ]);
  return (
    <DashboardShell
      title={admin ? "Administrator security." : "A little extra protection."}
      workspace={admin ? "admin" : undefined}
    >
      <div className="account-card">
        <h2>Authenticator app</h2>
        <p className="auth-description">
          You can optionally set up a TOTP authenticator app for your account.
        </p>
        <SecurityForm
          factorId={factors?.totp.find((factor) => factor.status === "verified")?.id}
          verified={assurance?.claims.aal === "aal2"}
        />
        <p className="field-help">
          Keep access to your authenticator. Recovery for a lost device currently requires the
          project operator; self-service recovery codes are not implemented.
        </p>
      </div>
    </DashboardShell>
  );
}
