import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, SearchX, SlidersHorizontal } from "lucide-react";
import { PropertyCard } from "@/features/properties/property-card";
import { SearchFilters } from "@/features/properties/search-form";
import { searchProperties, type SearchParams } from "@/features/properties/search";

export const metadata: Metadata = {
  title: "Explore monthly rentals — sample listings",
  robots: { index: false, follow: false },
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { filters, errors, results } = searchProperties(await searchParams);
  const activeFilters = Boolean(
    filters.q || filters.area || filters.type || filters.min || filters.max,
  );
  return (
    <div className="browse-page">
      <section className="browse-intro container">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Explore rentals</span>
        </div>
        <span className="eyebrow">YOUR SPACE IS OUT THERE</span>
        <h1>
          A new place.
          <br className="mobile-only" /> A little more possibility.
        </h1>
        <p>Explore monthly bedspaces, private rooms, and apartments in Cabadbaran.</p>
      </section>
      <div className="container browse-layout">
        <aside aria-label="Rental search filters">
          <SearchFilters
            action="/preview/rentals"
            key={JSON.stringify(filters)}
            filters={filters}
          />
        </aside>
        <section className="browse-results" aria-labelledby="results-heading">
          <div className="results-toolbar">
            <div>
              <h2 id="results-heading">
                {results.length} sample {results.length === 1 ? "rental" : "rentals"}
                {activeFilters ? " match your search" : " to explore"}
              </h2>
              <p>Cabadbaran City, Agusan del Norte</p>
            </div>
            <span className="results-tag">
              <SlidersHorizontal size={14} aria-hidden="true" /> Monthly stays
            </span>
          </div>
          <div className="sample-notice">
            <Info size={18} aria-hidden="true" />
            <p>
              Just a preview. These homes and prices are fictional.{" "}
              <Link href="/preview">Learn more</Link>
            </p>
          </div>
          {errors.length > 0 ? (
            <div className="empty-state" role="alert">
              <SearchX size={36} strokeWidth={1.3} aria-hidden="true" />
              <h3>Let’s adjust that budget.</h3>
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
              <p>Update the budget fields and apply your filters again.</p>
              <Link href="/preview/rentals" className="button button-outline">
                Reset filters
              </Link>
            </div>
          ) : results.length ? (
            <div className="property-grid results-grid">
              {results.map((property) => (
                <PropertyCard key={property.slug} property={property} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <SearchX size={38} strokeWidth={1.3} aria-hidden="true" />
              <h3>A little more room in your search?</h3>
              <p>
                No sample rentals match these filters. Try another barangay, a wider budget, or a
                different kind of space.
              </p>
              <Link href="/preview/rentals" className="button">
                See all sample rentals <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
