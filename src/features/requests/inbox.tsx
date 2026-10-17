import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/money";
import { appointment, requestStatus } from "./rules";
import { requestContext, type RequestRow } from "./data";

export async function RequestInbox({
  userId,
  owner,
  page,
}: {
  userId: string;
  owner: boolean;
  page: number;
}) {
  const client = await createClient();
  const offset = (page - 1) * 20;
  // Inner joins constrain the owner's queue explicitly, in addition to RLS.
  const bookings = owner
    ? client
        .from("booking_requests")
        .select("*, units!inner(properties!inner(owner_id))")
        .eq("units.properties.owner_id", userId)
    : client.from("booking_requests").select("*").eq("renter_id", userId);
  const viewings = owner
    ? client
        .from("viewing_requests")
        .select("*, properties!inner(owner_id)")
        .eq("properties.owner_id", userId)
    : client.from("viewing_requests").select("*").eq("renter_id", userId);
  const [b, v] = await Promise.all([
    bookings
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 19),
    viewings
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 19),
  ]);
  if (b.error || v.error) throw new Error("Could not load your requests. Please try again.");
  const rows: RequestRow[] = [
    ...b.data.map((r) => ({ ...r, kind: "booking" as const })),
    ...v.data.map((r) => ({ ...r, kind: "viewing" as const })),
  ];
  const context = await requestContext(rows);
  const base = owner ? "/owner/requests" : "/dashboard/requests";
  return (
    <>
      <p className="page-lead">
        {owner
          ? "Review requests for your properties. Approve only after checking the dates and agreed terms."
          : "Track viewing appointments and monthly booking requests. Pending requests do not reserve a unit."}{" "}
        Status updates appear here; no email notification is sent.
      </p>
      <div className="preview-info-grid">
        {(["booking", "viewing"] as const).map((kind) => (
          <section key={kind} aria-label={`${kind === "booking" ? "Booking" : "Viewing"} requests`}>
            <h2>{kind === "booking" ? "Booking requests" : "Viewing requests"}</h2>
            <div className="workspace-list">
              {rows
                .filter((r) => r.kind === kind)
                .map((r) => {
                  const c = context.get(`${kind}:${r.id}`);
                  return (
                    <article className="account-card" key={r.id}>
                      <span className="sample-pill">{requestStatus(r)}</span>
                      <h3>
                        <Link href={`/dashboard/requests/${r.id}?kind=${kind}`}>
                          {c?.title ?? "Rental request"}
                          {c?.unit_label ? ` · ${c.unit_label}` : ""}
                        </Link>
                      </h3>
                      <p>
                        {r.kind === "booking"
                          ? `${r.start_date} → ${r.end_date ?? "Indefinite stay"}`
                          : `${appointment(r.requested_at)} (Philippine time)`}
                      </p>
                      {r.kind === "booking" && <p>{formatPeso(r.offered_monthly_rent)} / month</p>}
                      <Link className="text-link" href={`/dashboard/requests/${r.id}?kind=${kind}`}>
                        View request →
                      </Link>
                    </article>
                  );
                })}
            </div>
            {!rows.some((r) => r.kind === kind) && <p>No {kind} requests on this page.</p>}
          </section>
        ))}
      </div>
      {!owner && (
        <p>
          <Link className="text-link" href="/properties">
            Explore rentals →
          </Link>
        </p>
      )}
      <nav className="request-actions" aria-label="Request pages">
        {page > 1 && (
          <Link className="button button-outline" href={`${base}?page=${page - 1}`}>
            Previous page
          </Link>
        )}
        <span>Page {page} · Up to 20 requests of each type</span>
        {(b.data.length === 20 || v.data.length === 20) && (
          <Link className="button button-outline" href={`${base}?page=${page + 1}`}>
            Next page
          </Link>
        )}
      </nav>
    </>
  );
}
