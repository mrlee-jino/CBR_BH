import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireAccount } from "@/features/auth/account";
import { getListing } from "@/features/listings/public";
import { RequestForm } from "@/features/requests/forms";
import { manilaToday, requestKind } from "@/features/requests/rules";
import { formatPeso } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Request a viewing or booking",
  robots: { index: false, follow: false },
};
export default async function Request({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string; unit?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const kind = requestKind.safeParse(query.kind);
  if (!kind.success) notFound();
  const next = `/properties/${encodeURIComponent(slug)}/request?${new URLSearchParams({ kind: kind.data, ...(query.unit ? { unit: query.unit } : {}) })}`;
  const account = await requireAccount(next);
  const listing = await getListing(slug);
  if (!listing) notFound();
  const unit = listing.units.find((u) => u.id === query.unit);
  if (kind.data === "booking" && !unit) notFound();
  const ownProperty = account.roles.includes("owner")
    ? await (
        await createClient()
      )
        .from("properties")
        .select("id")
        .eq("id", listing.property.id)
        .eq("owner_id", account.user.id)
        .maybeSingle()
    : null;
  if (ownProperty?.error) throw new Error("Could not check property ownership.");
  return (
    <section className="container account-page">
      <Link className="back-link" href={`/properties/${slug}`}>
        ← Back to property
      </Link>
      <div className="account-card request-detail">
        <span className="eyebrow">{listing.property.title}</span>
        <h1>{kind.data === "booking" ? "Request a monthly booking" : "Arrange a viewing"}</h1>
        {unit && kind.data === "booking" && (
          <>
            <h2>{unit.label}</h2>
            <p>
              <strong>{formatPeso(unit.monthly_rent)} / month</strong> · Deposit{" "}
              {formatPeso(unit.deposit_amount)}
            </p>
            <p className="preserve-lines">{unit.terms || "No additional rental terms supplied."}</p>
            <p>
              Pending requests do not hold inventory. Only owner approval reserves a unit. A
              confirmation is not a payment receipt or a signed tenancy agreement. No payment is
              collected here.
            </p>
          </>
        )}
        {kind.data === "viewing" && (
          <p>
            Propose a time for the owner to accept or decline. A viewing does not reserve a unit.
          </p>
        )}
        <p className="field-help">
          Your saved name and phone number will be shared with the owner.{" "}
          <Link href="/dashboard/settings">Review your profile</Link>. Exact address and owner
          contact details are released after acceptance or approval. Requests expire after seven
          days or sooner when their dates pass.
        </p>
        {ownProperty?.data ? (
          <p className="form-message" role="alert">
            You cannot request your own property.{" "}
            <Link href="/owner/requests">Open your owner request inbox</Link>.
          </p>
        ) : account.setupRequired || account.profile?.account_status !== "active" ? (
          <p className="form-message" role="alert">
            An active account and completed database setup are required to send requests.
          </p>
        ) : (
          <RequestForm
            kind={kind.data}
            target={kind.data === "booking" ? unit!.id : listing.property.id}
            version={unit?.offer_version}
            requestKey={randomUUID()}
            today={manilaToday()}
          />
        )}
      </div>
    </section>
  );
}
