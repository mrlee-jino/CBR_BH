import type { Metadata } from "next";
import Link from "@/components/ui/navigation-link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccount } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { getRequest, requestContext } from "@/features/requests/data";
import { DecisionForm } from "@/features/requests/forms";
import {
  allowedDecisions,
  appointment,
  requestKind,
  requestStatus,
} from "@/features/requests/rules";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/money";

export const metadata: Metadata = { title: "Request details" };
export default async function RequestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  const kind = requestKind.safeParse((await searchParams).kind);
  if (!z.uuid().safeParse(id).success || !kind.success) notFound();
  const account = await requireAccount(`/dashboard/requests/${id}?kind=${kind.data}`);
  const row = await getRequest(id, kind.data);
  if (!row) notFound();
  const context = (await requestContext([row])).get(`${row.kind}:${id}`);
  // Admin support access to base rows does not grant ordinary participant actions.
  if (!context || (row.renter_id !== account.user.id && context.owner_id !== account.user.id))
    notFound();
  const owner = context.owner_id === account.user.id;
  const status = requestStatus(row);
  const active = account.profile?.account_status === "active";
  const event = row.kind === "booking" ? row.start_date : row.requested_at;
  const decisions = active ? allowedDecisions(row.kind, status, owner, event) : [];
  const client = await createClient();
  // Contact RPCs are authoritative about eligibility and release windows.
  const contact = active
    ? owner
      ? await client.rpc("get_requester_contact", { p_request_id: id, p_kind: row.kind })
      : await client.rpc("get_property_contact", { p_property_id: context.property_id })
    : null;
  // Only display the corresponding shape, without returning raw payloads to a client component.
  const person =
    owner && contact && !contact.error
      ? (contact.data?.[0] as { display_name: string; phone: string | null } | undefined)
      : undefined;
  const property =
    !owner && contact && !contact.error
      ? (contact.data?.[0] as
          | {
              street_address: string;
              contact_name: string;
              contact_phone: string;
              access_instructions: string;
            }
          | undefined)
      : undefined;
  return (
    <DashboardShell
      title={`${row.kind === "booking" ? "Booking" : "Viewing"} request`}
      workspace={owner ? "owner" : "renter"}
    >
      <Link className="back-link" href={owner ? "/owner/requests" : "/dashboard/requests"}>
        ← Back to requests
      </Link>
      <article className="account-card request-detail">
        <span className="sample-pill">{status}</span>
        <h2>
          {context.title}
          {context.unit_label ? ` · ${context.unit_label}` : ""}
        </h2>
        <p className="field-help">Request reference: {row.id}</p>
        <p>Submitted {appointment(row.created_at)} (Philippine time)</p>
        {row.kind === "booking" ? (
          <>
            <p>
              Move-in: <strong>{row.start_date}</strong> · Move-out:{" "}
              <strong>{row.end_date ?? "Indefinite stay"}</strong>
            </p>
            <h3>Agreed offer at submission</h3>
            <p>
              {formatPeso(row.offered_monthly_rent)} / month · Deposit{" "}
              {formatPeso(row.offered_deposit_amount)}
            </p>
            <p className="preserve-lines">
              {row.offered_terms || "No additional rental terms supplied."}
            </p>
            <p>
              Pending requests do not hold inventory. Owner approval reserves the unit for these
              dates. This is not a payment receipt or a signed tenancy agreement. No payment is
              collected here.
            </p>
            <p>
              Confirmed bookings can be cancelled before the move-in date. After move-in, contact
              the owner or support.
            </p>
          </>
        ) : (
          <>
            <p>
              Preferred appointment: <strong>{appointment(row.requested_at)}</strong> (Philippine
              time)
            </p>
            <p>
              A viewing requires owner acceptance and does not reserve a unit. To propose another
              time, withdraw or cancel and submit a new request.
            </p>
          </>
        )}
        {status === "pending" && (
          <p>
            Respond before {appointment(row.expires_at)} (Philippine time)
            {row.kind === "booking" ? " and before the move-in date passes" : ""}.
          </p>
        )}
        {status === "expired" && (
          <p>This request can no longer be approved. Submit a new request after withdrawing it.</p>
        )}
        <h3>Renter’s message</h3>
        <p className="preserve-lines">{row.message || "No message supplied."}</p>
        {row.decided_at && <p>Last decision: {appointment(row.decided_at)} (Philippine time)</p>}
        {row.decision_reason && (
          <p className="preserve-lines">Decision reason: {row.decision_reason}</p>
        )}
        <section className="request-contact">
          <h3>{owner ? "Renter contact" : "Property contact and arrival details"}</h3>
          {person ? (
            <>
              <p>{person.display_name}</p>
              <p>{person.phone || "No phone number saved."}</p>
            </>
          ) : property ? (
            <>
              <p>
                {property.contact_name} · {property.contact_phone}
              </p>
              <p>{property.street_address}</p>
              <p className="preserve-lines">{property.access_instructions}</p>
            </>
          ) : (
            <p>
              {owner
                ? "Contact details are unavailable outside the request’s authorized contact window."
                : "Private address and owner contact details become available after an accepted viewing or approved booking, during the authorized contact window."}
            </p>
          )}
        </section>
        {decisions.length > 0 && <DecisionForm id={id} kind={row.kind} decisions={decisions} />}
        <p className="field-help">
          Check your request inbox for updates. No email notification is sent.
        </p>
      </article>
    </DashboardShell>
  );
}
