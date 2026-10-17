import { ArrowRight, MapPin, Search, SlidersHorizontal } from "lucide-react";
import Link from "@/components/ui/navigation-link";
import { barangays, unitTypes } from "./data";
import { emptyFilters, type Filters } from "./search";

export function HeroSearch() {
  return (
    <form
      action="/properties"
      className="hero-search"
      role="search"
      aria-label="Find a monthly rental"
    >
      <div className="hero-field">
        <MapPin size={20} aria-hidden="true" />
        <div>
          <label htmlFor="hero-area">Where do you want to live?</label>
          <select name="area" id="hero-area" defaultValue="">
            <option value="">Anywhere in Cabadbaran</option>
            {barangays.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="hero-field type-field">
        <div>
          <label htmlFor="hero-type">Your kind of space</label>
          <select name="type" id="hero-type" defaultValue="">
            <option value="">All rental types</option>
            {unitTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="button search-submit" type="submit">
        <Search size={18} aria-hidden="true" />
        <span>Find my space</span>
        <ArrowRight size={17} className="mobile-only" aria-hidden="true" />
      </button>
    </form>
  );
}

export function SearchFilters({
  filters = emptyFilters,
  action = "/properties",
}: {
  filters?: Filters;
  action?: string;
}) {
  return (
    <details className="filter-panel" open>
      <summary>
        <span>
          <SlidersHorizontal size={18} aria-hidden="true" /> Refine your search
        </span>
        <span className="filter-toggle">Show / hide</span>
      </summary>
      <form action={action} className="filter-form" role="search" aria-label="Filter rentals">
        <div className="field">
          <label htmlFor="q">Name or keyword</label>
          <div className="input-with-icon">
            <Search size={17} aria-hidden="true" />
            <input
              id="q"
              name="q"
              placeholder="Try “garden” or “Wi-Fi”"
              defaultValue={filters.q}
              maxLength={100}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="area">Barangay</label>
          {action === "/preview/rentals" ? (
            <select id="area" name="area" defaultValue={filters.area}>
              <option value="">All barangays</option>
              {barangays.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          ) : (
            <>
              <input
                id="area"
                name="area"
                list="barangay-options"
                placeholder="All barangays"
                maxLength={80}
                defaultValue={filters.area}
              />
              <datalist id="barangay-options">
                {barangays.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </>
          )}
        </div>
        <div className="field">
          <label htmlFor="type">Type of space</label>
          <select id="type" name="type" defaultValue={filters.type}>
            <option value="">All rental types</option>
            {unitTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="budget-fields">
          <legend>Monthly budget (PHP)</legend>
          <div>
            <div className="field">
              <label htmlFor="min">Minimum</label>
              <input
                id="min"
                name="min"
                type="number"
                inputMode="numeric"
                min="0"
                max="9999999"
                step="1"
                placeholder="₱ Any"
                defaultValue={filters.min}
              />
            </div>
            <span aria-hidden="true">–</span>
            <div className="field">
              <label htmlFor="max">Maximum</label>
              <input
                id="max"
                name="max"
                type="number"
                inputMode="numeric"
                min="0"
                max="9999999"
                step="1"
                placeholder="₱ Any"
                defaultValue={filters.max}
              />
            </div>
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="sort">Sort results</label>
          <select id="sort" name="sort" defaultValue={filters.sort}>
            <option value="featured">Featured first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>
        <button className="button" type="submit">
          Apply filters <ArrowRight size={17} aria-hidden="true" />
        </button>
        <Link href={action} className="reset-link">
          Reset filters
        </Link>
        <p className="filter-footnote">
          {action === "/preview/rentals"
            ? "Fictional prices and units. No live availability is shown."
            : "Monthly offers are not a guarantee of availability for your dates."}
        </p>
      </form>
    </details>
  );
}
