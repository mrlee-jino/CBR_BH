import Image from "next/image";
import Link from "next/link";
import { House, MapPin, ArrowUpRight } from "lucide-react";
import { formatPeso } from "@/lib/money";
import type { Listing } from "./public";
export function ListingCard({ property: p }: { property: Listing }) {
  return (
    <article className="property-card" data-testid="listing-card">
      <Link
        href={`/properties/${p.slug}`}
        className="listing-placeholder"
        aria-label={`View ${p.title}`}
      >
        {p.cover ? (
          <Image
            unoptimized
            src={`/media/photos/${p.cover.id}`}
            alt={p.cover.alt_text}
            fill
            sizes="(max-width:600px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <>
            <House size={54} strokeWidth={1} />
            <span>No property photos yet</span>
          </>
        )}
        <span className="image-badge">Admin reviewed</span>
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{p.property_type.replaceAll("_", " ")}</span>
          <span>Monthly rental</span>
        </div>
        <h3>
          <Link href={`/properties/${p.slug}`}>{p.title}</Link>
        </h3>
        <p className="location">
          <MapPin size={14} aria-hidden="true" />
          {p.barangay}, Cabadbaran City
        </p>
        <div className="card-price">
          <p>
            <span>From </span>
            <strong>{formatPeso(p.monthly_rent)}</strong>
            <span> / month</span>
          </p>
          <ArrowUpRight size={18} aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}
