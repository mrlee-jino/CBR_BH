import Link from "@/components/ui/navigation-link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { PropertyForm, UnitForm, SubmitForm } from "@/features/listings/forms";
import { createClient } from "@/lib/supabase/server";
import { UploadPhoto } from "@/features/photos/forms";
import { ManagedPhotos } from "@/features/photos/gallery";
import { photoServiceConfigured } from "@/features/photos/service";
import {
  AvailabilityForm,
  EndAllocationForm,
  ReleaseFutureBlockForm,
} from "@/features/availability/forms";
import { manilaToday } from "@/features/requests/rules";
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
  const [details, units, allocations, reviews, photos] = await Promise.all([
    client.from("property_private_details").select("*").eq("property_id", id).maybeSingle(),
    client.from("units").select("*").eq("property_id", id).order("label"),
    client
      .from("unit_allocations")
      .select(
        "id,unit_id,kind,start_date,end_date,released_at,note,booking_request_id,units!inner(property_id,label)",
      )
      .eq("units.property_id", id)
      .is("released_at", null)
      .order("start_date")
      .limit(100),
    client.rpc("get_my_listing_reviews", { p_property_id: id }),
    client
      .from("property_photos")
      .select("id,alt_text,width,height,is_cover,status,review_note")
      .eq("property_id", id)
      .eq("upload_state", "ready")
      .order("is_cover", { ascending: false })
      .order("created_at")
      .limit(12),
  ]);
  if (details.error || units.error || allocations.error || reviews.error || photos.error)
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
        <h2>Property photos</h2>
        <p>
          New photos stay private until reviewed. Uploading, removing, or changing a published
          property’s cover pauses it for another review.
        </p>
        <ManagedPhotos photos={photos.data} editable={editable} />
        {editable &&
          (photoServiceConfigured() ? (
            <UploadPhoto propertyId={id} />
          ) : (
            <p className="form-message">Photo uploads are temporarily unavailable.</p>
          ))}
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
      <section className="account-card" id="availability">
        <h2>Room availability</h2>
        <p>
          Record walk-in occupancy or block dates for maintenance. These records use Philippine
          calendar dates and prevent overlapping booking approvals. Booking requests remain visible
          here but are managed in the request workspace.
        </p>
        {units.data.length ? (
          <AvailabilityForm propertyId={id} units={units.data} today={manilaToday()} />
        ) : (
          <p>Add a room or bedspace before managing availability.</p>
        )}
        <h3>Reservations and occupancy</h3>
        {allocations.data.length ? (
          <div className="workspace-list">
            {allocations.data.map((a) => (
              <article className="account-card" key={a.id}>
                <span className="sample-pill">
                  {a.kind === "booking" ? "Confirmed booking" : a.kind.replaceAll("_", " ")}
                </span>
                <h3>{a.units.label}</h3>
                <p>
                  {a.start_date} to {a.end_date ?? "no end date"}
                  {a.end_date ? " (end date exclusive)" : ""}
                </p>
                {a.note && <p className="preserve-lines">Private note: {a.note}</p>}
                {a.booking_request_id ? (
                  <Link
                    className="text-link"
                    href={`/dashboard/requests/${a.booking_request_id}?kind=booking`}
                  >
                    View booking request →
                  </Link>
                ) : (
                  <>
                    <EndAllocationForm
                      propertyId={id}
                      allocationId={a.id}
                      startDate={a.start_date}
                      today={manilaToday()}
                    />
                    {a.kind === "blocked" && a.start_date > manilaToday() && (
                      <ReleaseFutureBlockForm propertyId={id} allocationId={a.id} />
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p>No active reservations or occupancy blocks recorded.</p>
        )}
        <p className="field-help">
          Booking confirmations can be cancelled before move-in from the request detail page.
          Owner-entered occupancy and maintenance notes are private.
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
