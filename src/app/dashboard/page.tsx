import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";

export const metadata: Metadata = { title: "Your account" };
export default async function Dashboard() {
  const account = await requireAccount();
  return (
    <DashboardShell title={`Welcome, ${account.profile?.display_name ?? "neighbor"}.`}>
      {account.setupRequired ? (
        <div className="form-message" role="alert">
          Your email account works, but the PuyoHub database setup is not available yet. The project
          operator needs to apply the versioned migrations. No property data has been loaded.
        </div>
      ) : account.profile?.account_status === "suspended" ? (
        <div className="form-message" role="alert">
          Your account is suspended. Account changes and owner operations are unavailable. Contact
          platform support.
        </div>
      ) : (
        <>
          <p className="page-lead">
            Your email is verified. Your account can grow with you as a renter and a property owner.
          </p>
          <div className="preview-info-grid">
            <section className="info-card">
              <span className="eyebrow">YOUR WORKSPACES</span>
              <h2>One account, your next chapter.</h2>
              <p>
                Current roles: {account.roles.join(", ")}. Public search shows admin-reviewed
                property listings.
              </p>
              <Link className="text-link" href="/properties">
                Explore rentals →
              </Link>
              {account.roles.includes("owner") && (
                <p>
                  <Link className="text-link" href="/owner">
                    Open owner workspace →
                  </Link>
                </p>
              )}
              {account.roles.includes("admin") && (
                <p>
                  <Link className="text-link" href="/admin">
                    Open admin workspace →
                  </Link>
                </p>
              )}
            </section>
            <section className="info-card">
              <span className="eyebrow">KEEP YOUR ACCOUNT READY</span>
              <h2>A few everyday essentials.</h2>
              <p>
                Manage your private profile, set up an authenticator, or activate owner access.
                Track your viewing and booking requests in your request inbox.
              </p>
              <Link className="text-link" href="/dashboard/settings">
                Edit your profile →
              </Link>
              <p>
                <Link className="text-link" href="/dashboard/requests">
                  My requests →
                </Link>
              </p>
            </section>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
