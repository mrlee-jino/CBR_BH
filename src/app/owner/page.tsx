import type { Metadata } from "next";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";

export const metadata: Metadata = { title: "Owner workspace" };
export default async function Owner() {
  await requireRole("owner");
  return (
    <DashboardShell title="Your owner workspace.">
      <div className="account-card">
        <span className="eyebrow">OWNER ACCESS ACTIVE</span>
        <h2>A good foundation for your property.</h2>
        <p className="auth-description">
          Your account has owner permission. Property editing, uploads, and request management
          screens will be built next. No listing has been submitted or published by activating this
          workspace.
        </p>
        <p className="field-help">
          Every real listing will require admin review. Availability will be tracked per room,
          bedspace, or apartment.
        </p>
      </div>
    </DashboardShell>
  );
}
