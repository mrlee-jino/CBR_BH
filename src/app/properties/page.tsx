import Link from "@/components/ui/navigation-link";
import { SearchFilters } from "@/features/properties/search-form";
import { parseFilters, type SearchParams } from "@/features/properties/search";
import { findListings } from "@/features/listings/public";
import { ListingCard } from "@/features/listings/card";
export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: true, follow: true },
  title: "Monthly rentals in Cabadbaran",
  description:
    "Find admin-reviewed boarding houses, bedspaces, and apartments for monthly rent in Cabadbaran City.",
};
export default async function Properties({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { filters, errors } = parseFilters(params);
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const page = /^\d{1,3}$/.test(rawPage) ? Math.max(1, Math.min(Number(rawPage), 417)) : 1;
  const type =
    (
      {
        bedspace: "bedspace",
        "private-room": "private_room",
        apartment: "entire_apartment",
      } as Record<string, string>
    )[filters.type] ?? "";
  const result = errors.length
    ? { listings: [], unavailable: false }
    : await findListings({
        p_query: filters.q,
        p_barangay: filters.area,
        p_unit_type: type,
        ...(filters.min ? { p_min: Number(filters.min) } : {}),
        ...(filters.max ? { p_max: Number(filters.max) } : {}),
        p_sort: filters.sort,
        p_offset: (page - 1) * 24,
        p_limit: 25,
      })
        .then((listings) => ({ listings, unavailable: false }))
        .catch(() => ({ listings: [], unavailable: true }));
  const { listings, unavailable } = result;
  const pageLink = (n: number) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) query.set(k, v);
    });
    query.set("page", String(n));
    return `/properties?${query}`;
  };
  return (
    <div className="browse-page">
      <section className="browse-intro container">
        <span className="eyebrow">YOUR SPACE IS OUT THERE</span>
        <h1>Find your next home.</h1>
        <p>
          Monthly bedspaces, private rooms, and apartments in Cabadbaran City. Browse and search
          without signing in.
        </p>
      </section>
      <div className="container browse-layout">
        <aside aria-label="Rental search filters">
          <SearchFilters key={JSON.stringify(filters)} filters={filters} />
        </aside>
        <section className="browse-results" aria-label="Rental results">
          <div className="results-toolbar">
            <div>
              <h2>Places to call home</h2>
              <p>
                Admin-reviewed listings · prices in Philippine pesos. Featured placements may be
                paid; change the sort order to compare by price or name.
              </p>
            </div>
          </div>
          {errors.length ? (
            <div className="empty-state" role="alert">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          ) : unavailable ? (
            <div className="empty-state" role="alert">
              <h2>Listings are temporarily unavailable.</h2>
              <p>Please try again shortly.</p>
            </div>
          ) : listings.length ? (
            <div className="property-grid results-grid">
              {listings.slice(0, 24).map((p) => (
                <ListingCard key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No rentals found yet.</h2>
              <p>Try another search or check back as owners publish their properties.</p>
              <Link href="/become-an-owner" className="button">
                List your property
              </Link>
              <Link href="/preview/rentals" className="text-link">
                Explore the fictional demo
              </Link>
            </div>
          )}
          <nav className="listing-toolbar" aria-label="Results pages">
            {page > 1 && (
              <Link href={pageLink(page - 1)} className="text-link">
                ← Previous page
              </Link>
            )}
            {listings.length > 24 && page < 417 && (
              <Link href={pageLink(page + 1)} className="text-link">
                Next page →
              </Link>
            )}
          </nav>
          <p className="field-help">
            An advertised unit is not a confirmed vacancy. Date checks and booking requests will be
            added next.
          </p>
        </section>
      </div>
    </div>
  );
}
