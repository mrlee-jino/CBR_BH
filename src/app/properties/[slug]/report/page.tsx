import type { Metadata } from "next";
import Link from "@/components/ui/navigation-link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/features/auth/account";
import { getListing } from "@/features/listings/public";
import { createClient } from "@/lib/supabase/server";
import { ListingReportForm } from "@/features/reports/form";
export const metadata: Metadata = {
  title: "Report a listing",
  robots: { index: false, follow: false },
};
export default async function ReportListing({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const account = await requireAccount(`/properties/${slug}/report`);
  const listing = await getListing(slug);
  if (!listing) notFound();
  const active = !account.setupRequired && account.profile?.account_status === "active";
  const existing = active
    ? await (
        await createClient()
      )
        .from("reports")
        .select("id")
        .eq("reporter_id", account.user.id)
        .eq("property_id", listing.property.id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle()
    : null;
  if (existing?.error) throw new Error("Could not load report status.");
  return (
    <section className="container account-page">
      <Link className="back-link" href={`/properties/${slug}`}>
        ← Back to property
      </Link>
      <div className="account-card request-detail">
        <span className="eyebrow">HELP KEEP CABAHAY ACCURATE</span>
        <h1>Report this listing</h1>
        <h2 className="break-words">{listing.property.title}</h2>
        <p>
          Tell us about suspected scams, misleading details, safety concerns or inappropriate
          content.
        </p>
        <p className="field-help">
          Reports are private to your account and platform administrators. An administrator reviews
          the issue before deciding what to do; sending a report does not automatically remove this
          listing.
        </p>
        {!active ? (
          <p className="form-message" role="alert">
            An active account is required to send a report.
          </p>
        ) : existing?.data ? (
          <div>
            <p className="form-message success" role="status">
              You already have an open report for this listing. An administrator will review it.
            </p>
            <p className="field-help break-all">Report reference: {existing.data.id}</p>
          </div>
        ) : (
          <ListingReportForm slug={slug} />
        )}
      </div>
    </section>
  );
}
