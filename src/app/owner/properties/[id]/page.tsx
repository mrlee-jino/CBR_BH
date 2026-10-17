import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { PropertyForm, UnitForm, SubmitForm } from "@/features/listings/forms";
import { createClient } from "@/lib/supabase/server";
export const metadata = { title: "Manage property" };
export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const account = await requireRole("owner");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const client = await createClient();
  const { data: p, error } = await client
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("owner_id", account.user.id)
    .maybeSingle();
  if (error) throw new Error("Could not load property.");
  if (!p) notFound();
  const [details, units, allocations, reviews] = await Promise.all([
    client.from("property_private_details").select("*").eq("property_id", id).maybeSingle(),
    client.from("units").select("*").eq("property_id", id).order("label"),
    client
      .from("unit_allocations")
      .select("id,unit_id,kind,start_date,end_date,released_at,units!inner(property_id,label)")
      .eq("units.property_id", id)
      .is("released_at", null)
      .order("start_date")
      .limit(100),
    client.rpc("get_my_listing_reviews", { p_property_id: id }),
  ]);
  if (details.error || units.error || allocations.error || reviews.error)
    throw new Error("Could not load property details.");
  const editable = ["draft", "paused", "rejected", "published"].includes(p.status);
  return (
    <DashboardShell title={p.title}>
      <Link href="/owner" className="text-link">
        ← All your properties
      </Link>
      <p className="form-message">
        Status: {p.status.replaceAll("_", " ")}.{" "}
        {p.status === "published"
          ? "Editing property or room details pauses publication and requires another review."
          : p.status === "pending_review"
            ? "Your listing is with an admin for review."
            : "Only published listings appear in public search."}
      </p>
      {reviews.data.length > 0 && (
        <section className="account-card">
          <h2>Review feedback</h2>
          {reviews.data.map((r, i) => (
            <div key={i}>
              <strong>{r.decision}</strong>
              <p className="preserve-lines">{r.reason}</p>
            </div>
          ))}
        </section>
      )}
      <section className="account-card">
        <h2>Property details</h2>
        {editable ? (
          <PropertyForm property={p} details={details.data} />
        ) : (
          <>
            <p>{p.description}</p>
            <p>Editing is unavailable in this status.</p>
          </>
        )}
      </section>
      <section className="account-card">
        <h2>Rooms and bedspaces</h2>
        <p>
          Each unit represents one separately rentable space. Offering a unit does not guarantee
          availability for particular dates.
        </p>
        <div className="workspace-list">
          {units.data.map((u) => (
            <details className="unit-editor" key={u.id}>
              <summary>
                {u.label} · ₱{u.monthly_rent.toLocaleString()}/month ·{" "}
                {u.active ? "Offered" : "Not offered"}
              </summary>
              {editable ? (
                <UnitForm propertyId={id} unit={u} />
              ) : (
                <p className="preserve-lines">{u.terms || "No additional terms."}</p>
              )}
            </details>
          ))}
        </div>
        {editable && (
          <details className="unit-editor">
            <summary>Add a room or bedspace</summary>
            <UnitForm propertyId={id} />
          </details>
        )}
      </section>
      <section className="account-card">
        <h2>Reservations and occupancy</h2>
        {allocations.data.length ? (
          allocations.data.map((a) => (
            <p key={a.id}>
              {a.units.label}: {a.start_date} to {a.end_date ?? "open-ended"} ·{" "}
              {a.kind.replaceAll("_", " ")}
            </p>
          ))
        ) : (
          <p>No reservations or occupancy blocks recorded.</p>
        )}
        <p className="field-help">
          Reservation and block management forms will follow with the booking workflow.
        </p>
      </section>
      {["draft", "paused", "rejected"].includes(p.status) && (
        <section className="account-card">
          <h2>Ready for review?</h2>
          <SubmitForm propertyId={id} />
        </section>
      )}
    </DashboardShell>
  );
}
