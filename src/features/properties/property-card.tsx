import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { formatPeso } from "@/lib/money";
import { AmenityIcon } from "./amenity-icon";
import { type Property, typeLabel } from "./data";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="property-card" data-testid="property-card">
      <Link
        href={`/preview/rentals/${property.slug}`}
        className={`card-image ${property.palette}`}
        aria-label={`View ${property.name}, sample listing`}
      >
        <Image
          src={property.image}
          alt={`Concept illustration of ${property.name}; not an actual property photograph`}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
        />
        <span className="image-badge">Sample listing</span>
        <span className="card-image-arrow">
          <ArrowUpRight size={19} aria-hidden="true" />
        </span>
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{typeLabel(property.type)}</span>
          <span>Monthly rental</span>
        </div>
        <h3>
          <Link href={`/preview/rentals/${property.slug}`}>{property.name}</Link>
        </h3>
        <p className="location">
          <MapPin size={14} aria-hidden="true" />
          {property.barangay}, Cabadbaran City
        </p>
        <ul className="card-amenities" aria-label="Sample amenities">
          {property.amenities.slice(0, 2).map((name) => (
            <li key={name}>
              <AmenityIcon name={name} />
              {name}
            </li>
          ))}
        </ul>
        <div className="card-price">
          <p>
            <strong>{formatPeso(property.price)}</strong>
            <span> / month</span>
          </p>
          <span className="price-caption">Sample price</span>
        </div>
      </div>
    </article>
  );
}
