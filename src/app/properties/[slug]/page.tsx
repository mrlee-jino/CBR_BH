import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { House } from "lucide-react";
import { getListing } from "@/features/listings/public";
import { formatPeso } from "@/lib/money";
import { PublicPhotoGallery } from "@/features/photos/gallery";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const result = await getListing((await params).slug);
  return {
    robots: { index: true, follow: true },
    title: result
      ? `${result.property.title} — monthly rental in Cabadbaran`
      : "Property not found",
    description: result?.property.description.slice(0, 160),
  };
}
export default async function Property({ params }: { params: Promise<{ slug: string }> }) {
  const result = await getListing((await params).slug);
  if (!result) notFound();
  const { property: p, units } = result;
  return (
    <div className="container detail-page">
      <Link href="/properties" className="back-link">
        ← Explore rentals
      </Link>
      <div className="detail-title">
        <div>
          <span className="eyebrow">ADMIN-REVIEWED PROPERTY</span>
          <h1>{p.title}</h1>
          <p>
            {p.barangay}, {p.city}, Agusan del Norte
          </p>
        </div>
      </div>
      {result.photos.length ? (
        <PublicPhotoGallery photos={result.photos} />
      ) : (
        <div className="listing-placeholder detail-placeholder">
          <House size={78} strokeWidth={1} aria-hidden="true" />
          <p>No property photos yet</p>
        </div>
      )}
      <div className="detail-layout">
        <div>
          <section className="detail-section">
            <h2>About this property</h2>
            <p className="preserve-lines">{p.description}</p>
            <p className="field-help">
              The exact address and owner contact details are private. Admin review is not a
              guarantee of availability.
            </p>
          </section>
          <section className="detail-section">
            <h2>Rooms and bedspaces</h2>
            <div className="workspace-list">
              {units.map((u) => (
                <article className="account-card" key={u.id}>
                  <h3>{u.label}</h3>
                  <p>{u.unit_type.replaceAll("_", " ")}</p>
                  <p>
                    <strong>{formatPeso(u.monthly_rent)}</strong> / month · deposit{" "}
                    {formatPeso(u.deposit_amount)}
                  </p>
                  <p className="preserve-lines">
                    {u.terms || "Ask about rental terms before agreeing to a tenancy."}
                  </p>
                  <Link
                    className="button button-outline"
                    href={`/properties/${p.slug}/request?kind=booking&unit=${u.id}`}
                  >
                    Request this unit
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="account-card listing-sidebar">
          <span className="eyebrow">MONTHLY RENT STARTS AT</span>
          <h2>{formatPeso(p.monthly_rent)}</h2>
          <p>Per month. Deposits and terms vary by unit.</p>
          <p>
            Arrange a viewing or choose a room to request a monthly booking. Requests need owner
            confirmation and do not collect payment.
          </p>
          <Link href={`/properties/${p.slug}/request?kind=viewing`} className="button">
            Request a viewing
          </Link>
        </aside>
      </div>
    </div>
  );
}
