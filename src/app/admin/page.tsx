import Link from "next/link";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { PhotoCleanup } from "@/features/photos/forms";
export const metadata = { title: "Listing review" };
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin");
  const { status: requested } = await searchParams;
  const status = ["pending_review", "published", "suspended", "rejected"].includes(requested ?? "")
    ? requested!
    : "pending_review";
  const client = await createClient();
  const { data, error } = await client
    .from("properties")
    .select("id,title,status,barangay,updated_at")
    .eq("status", status)
    .order("updated_at")
    .limit(100);
  if (error) throw new Error("Could not load review queue.");
  return (
    <DashboardShell title="Platform administration.">
      <span className="eyebrow">ADMIN ROLE · MFA VERIFIED</span>
      <nav className="account-nav" aria-label="Listing status">
        {["pending_review", "published", "suspended", "rejected"].map((s) => (
          <Link
            key={s}
            href={`/admin?status=${s}`}
            aria-current={s === status ? "page" : undefined}
          >
            {s.replaceAll("_", " ")}
          </Link>
        ))}
      </nav>
      <h2>
        {status === "pending_review"
          ? "Ready for your review"
          : status.replaceAll("_", " ") + " listings"}
      </h2>
      <p>
        Review property details and active units before publishing. Review notes are shared with the
        owner.
      </p>
      <div className="workspace-list">
        {data.length ? (
          data.map((p) => (
            <article className="account-card" key={p.id}>
              <h3>
                <Link href={`/admin/properties/${p.id}`}>{p.title}</Link>
              </h3>
              <p>
                {p.barangay} · {p.status.replaceAll("_", " ")}
              </p>
              <Link className="text-link" href={`/admin/properties/${p.id}`}>
                Review property →
              </Link>
            </article>
          ))
        ) : (
          <p className="account-card">No listings in this queue.</p>
        )}
      </div>
      {data.length === 100 && (
        <p>Showing the oldest 100 listings. Process these to see the rest of the queue.</p>
      )}
      <section className="account-card">
        <h2>Photo storage cleanup</h2>
        <PhotoCleanup />
      </section>
    </DashboardShell>
  );
}
