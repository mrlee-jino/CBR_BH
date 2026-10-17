import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { ReviewForm } from "@/features/listings/forms";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/money";
export const metadata = { title: "Review property" };
export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const client = await createClient();
  const [p, d, u, ownerReviews] = await Promise.all([
    client.from("properties").select("*").eq("id", id).maybeSingle(),
    client.from("property_private_details").select("*").eq("property_id", id).maybeSingle(),
    client.from("units").select("*").eq("property_id", id).order("label"),
    client.rpc("get_my_listing_reviews", { p_property_id: id }),
  ]);
  if (p.error || d.error || u.error || ownerReviews.error)
    throw new Error("Could not load listing review.");
  if (!p.data) notFound();
  const property = p.data;
  return (
    <DashboardShell title={property.title}>
      <Link className="text-link" href="/admin">
        ← Review queue
      </Link>
      <section className="account-card">
        <span className="sample-pill">{property.status.replaceAll("_", " ")}</span>
        <h2>Property details</h2>
        <p>
          {property.property_type.replaceAll("_", " ")} · {property.barangay}, {property.city}
        </p>
        <p className="preserve-lines">{property.description}</p>
        <p>Public web address: /properties/{property.slug}</p>
        <h3>Private contact details</h3>
        <p>{d.data?.street_address}</p>
        <p>
          {d.data?.contact_name} · {d.data?.contact_phone}
        </p>
        <p className="field-help">
          Verify the property and contact details independently before approval. No photos are
          collected in this milestone.
        </p>
      </section>
      <section className="account-card">
        <h2>Units ({u.data.length})</h2>
        {u.data.map((unit) => (
          <article className="unit-editor" key={unit.id}>
            <h3>{unit.label}</h3>
            <p>
              {unit.unit_type.replaceAll("_", " ")} · {unit.active ? "Offered" : "Not offered"}
            </p>
            <p>
              {formatPeso(unit.monthly_rent)}/month · deposit {formatPeso(unit.deposit_amount)}
            </p>
            <p className="preserve-lines">{unit.terms || "No additional terms."}</p>
          </article>
        ))}
      </section>
      {["pending_review", "published", "suspended"].includes(property.status) && (
        <section className="account-card">
          <h2>Review decision</h2>
          <ReviewForm key={`${property.status}-${property.version}`} property={property} />
        </section>
      )}
      <section className="account-card">
        <h2>Recent reviews</h2>
        {ownerReviews.data.length ? (
          ownerReviews.data.map((r, i) => (
            <article key={i}>
              <strong>{r.decision}</strong>
              <p className="preserve-lines">{r.reason}</p>
            </article>
          ))
        ) : (
          <p>No review notes yet.</p>
        )}
      </section>
    </DashboardShell>
  );
}
