import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/features/auth/account";
import { OwnerForm } from "@/features/auth/account-forms";
import { DashboardShell } from "@/features/auth/dashboard-shell";

export const metadata: Metadata = { title: "Activate owner access" };
export default async function BecomeOwner() {
  const account = await requireAccount("/become-an-owner");
  return (
    <DashboardShell title="Have a space to share?">
      <div className="account-card">
        <h2>Your owner workspace starts here.</h2>
        <p className="auth-description">
          Owner access adds to your renter account. It does not grant admin privileges or
          automatically verify a property. Listing management screens are a later milestone.
        </p>
        {account.setupRequired || account.profile?.account_status !== "active" ? (
          <p className="form-message">
            Owner activation is unavailable until account setup is complete and the account is
            active.
          </p>
        ) : account.roles.includes("owner") ? (
          <Link className="button" href="/owner">
            Open owner workspace
          </Link>
        ) : (
          <OwnerForm />
        )}
      </div>
    </DashboardShell>
  );
}
