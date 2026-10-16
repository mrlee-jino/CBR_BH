import type { Metadata } from "next";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";

export const metadata: Metadata = { title: "Admin workspace" };
export default async function Admin() {
  await requireRole("admin");
  return (
    <DashboardShell title="Platform administration.">
      <div className="account-card">
        <span className="eyebrow">ADMIN ROLE · MFA VERIFIED</span>
        <h2>Access is verified.</h2>
        <p className="auth-description">
          This workspace requires a database-assigned admin role and an authenticator-verified
          session. Listing moderation and user-management screens will follow. Privileged database
          operations independently enforce these permissions.
        </p>
      </div>
    </DashboardShell>
  );
}
