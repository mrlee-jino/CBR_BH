import type { Metadata } from "next";
import { requireAccount } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { ProfileForm } from "@/features/auth/account-forms";
import { createClient } from "@/lib/supabase/server";
import Link from "@/components/ui/navigation-link";

export const metadata: Metadata = { title: "Profile settings" };
export default async function Settings() {
  const account = await requireAccount("/dashboard/settings");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_contacts")
    .select("phone")
    .eq("user_id", account.user.id)
    .maybeSingle();
  return (
    <DashboardShell title="Your everyday details.">
      <div className="account-card">
        <h2>Private profile</h2>
        <p className="auth-description">
          Your phone number stays private until you consent to share it with an owner when sending a
          request.
        </p>
        {account.setupRequired || account.profile?.account_status !== "active" ? (
          <p className="form-message">
            Profile editing is unavailable until account setup is complete and the account is
            active.
          </p>
        ) : (
          <ProfileForm name={account.profile.display_name} phone={data?.phone ?? ""} />
        )}
      </div>
      {!account.roles.includes("owner") && (
        <details className="account-card">
          <summary>Have a property to rent out?</summary>
          <p>You can add property owner access without creating another account.</p>
          <Link className="text-link" href="/become-an-owner">
            Set up property owner access →
          </Link>
        </details>
      )}
    </DashboardShell>
  );
}
