import type { Metadata } from "next";
import Link from "@/components/ui/navigation-link";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Owner workspace" };
export default async function Owner() {
  const account = await requireRole("owner");
  const client = await createClient();
  const { data, error } = await client
    .from("properties")
    .select("id,title,barangay,status,updated_at")
    .eq("owner_id", account.user.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not load owner properties.");
  return (
    <DashboardShell title="Your owner workspace.">
      <span className="eyebrow">OWNER ACCESS ACTIVE</span>
      <div className="listing-toolbar">
        <p>
          Manage your properties, rooms, and monthly offers.{" "}
          <Link className="text-link" href="/owner/requests">
            Review viewing and booking requests →
          </Link>
        </p>
        <Link className="button" href="/owner/properties/new">
          Add a property
        </Link>
      </div>
      <div className="workspace-list">
        {data.length ? (
          data.map((p) => (
            <article className="account-card" key={p.id}>
              <span className="sample-pill">{p.status.replaceAll("_", " ")}</span>
              <h2>
                <Link href={`/owner/properties/${p.id}`}>{p.title}</Link>
              </h2>
              <p>{p.barangay}, Cabadbaran</p>
              <Link className="text-link" href={`/owner/properties/${p.id}`}>
                Manage property →
              </Link>
              {" · "}
              <Link className="text-link" href={`/owner/properties/${p.id}#availability`}>
                Manage availability →
              </Link>
            </article>
          ))
        ) : (
          <div className="account-card">
            <h2>Your first property starts here.</h2>
            <p>
              Add its details, create each rentable room or bedspace, then submit it for admin
              review.
            </p>
          </div>
        )}
      </div>
      {data.length === 100 && <p>Showing your 100 most recently updated properties.</p>}
    </DashboardShell>
  );
}
