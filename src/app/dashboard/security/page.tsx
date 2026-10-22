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
          Use a TOTP authenticator app to protect sensitive actions. An assigned admin must verify a
          code for each new session before entering the admin workspace.
        </p>
        <SecurityForm
          factorId={factors?.totp.find((factor) => factor.status === "verified")?.id}
          verified={assurance?.claims.aal === "aal2"}
        />
        {admin && assurance?.claims.aal === "aal2" && (
          <p>
            <Link className="button button-outline" href="/admin">
              Continue to administration
            </Link>
          </p>
        )}
        <p className="field-help">
          Keep access to your authenticator. Recovery for a lost device currently requires the
          project operator; self-service recovery codes are not implemented.
        </p>
      </div>
    </DashboardShell>
  );
}
