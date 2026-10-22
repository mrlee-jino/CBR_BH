import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "@/components/ui/navigation-link";
import { requireAccount } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";

export const metadata: Metadata = { title: "Your account" };
export default async function Dashboard() {
  const account = await requireAccount();
  if (
    !account.setupRequired &&
    account.profile?.account_status === "active" &&
    account.roles.includes("admin")
  )
    redirect("/admin");
  return (
    <DashboardShell title={`Welcome, ${account.profile?.display_name ?? "neighbor"}.`}>
      {account.setupRequired ? (
        <div className="form-message" role="alert">
          Your email account works, but the Cabahay database setup is not available yet. The project
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
            Find a home you like, arrange a viewing, and track your requests here.
          </p>
          <div className="preview-info-grid">
            <section className="info-card">
              <span className="eyebrow">YOUR NEXT HOME</span>
              <h2>Start with a place you like.</h2>
              <p>
                Browse published rentals and compare rooms, monthly prices, and terms. Sign-in is
                only needed when you send a request.
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
              <span className="eyebrow">YOUR REQUESTS</span>
              <h2>Keep your plans in one place.</h2>
              <p>
                Check viewing appointments and booking decisions. Keep your profile name and phone
                number up to date so owners can reach you after you consent.
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
