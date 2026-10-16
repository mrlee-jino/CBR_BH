import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  House,
  Info,
  MapPin,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { AmenityIcon } from "@/features/properties/amenity-icon";
import { getProperty, properties, typeLabel } from "@/features/properties/data";
import { PropertyCard } from "@/features/properties/property-card";
import { PreviewRequest } from "@/features/properties/preview-request";
import { formatPeso } from "@/lib/money";

export function generateStaticParams() {
  return properties.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const property = getProperty((await params).slug);
  return {
    title: property ? `${property.name} — sample monthly rental` : "Property not found",
    description: property
      ? `Fictional sample ${typeLabel(property.type).toLowerCase()} in ${property.barangay}, Cabadbaran. Sample price ${formatPeso(property.price)} per month. No live availability or reservations.`
      : undefined,
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const property = getProperty((await params).slug);
  if (!property) notFound();
  const related = properties.filter((item) => item.slug !== property.slug).slice(0, 3);
  return (
    <div className="detail-page container">
      <Link href="/properties" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Explore all sample rentals
      </Link>
      <div className="detail-title">
        <div>
          <div className="detail-labels">
            <span className="eyebrow">{typeLabel(property.type).toUpperCase()}</span>
            <span className="sample-pill">Sample listing</span>
          </div>
          <h1>{property.name}</h1>
          <p className="location">
            <MapPin size={17} aria-hidden="true" />
            {property.barangay}, Cabadbaran City, Agusan del Norte
          </p>
        </div>
        <span className="detail-tagline">
          <Sprout size={18} aria-hidden="true" />
          {property.highlight}
        </span>
      </div>
      <div className={`detail-gallery ${property.palette}`}>
        <div className="gallery-main">
          <Image
            src={property.image}
            alt={`Concept illustration of ${property.name}; this is not an actual property photograph`}
            fill
            sizes="(max-width: 700px) 100vw, 70vw"
            priority
          />
        </div>
        <div className="gallery-side">
          <Image
            src="/images/detail-vignette.svg"
            alt="Illustrated reading nook with a chair and plants; sample decor only"
            fill
            sizes="(max-width: 700px) 0px, 30vw"
          />
        </div>
        <span className="gallery-caption">
          Original concept illustrations · not property photos
        </span>
      </div>
      <div className="detail-layout">
        <div className="detail-content">
          <section className="detail-section">
            <span className="eyebrow">PICTURE YOUR EVERYDAY</span>
            <h2>A little about this space.</h2>
            <p>{property.description}</p>
            <div className="sample-notice">
              <Info size={19} aria-hidden="true" />
              <p>
                This is a fictional property for exploring PuyoHub. No owner, verification, or live
                availability is represented.
              </p>
            </div>
          </section>
          <section className="detail-section">
            <h2>The everyday essentials.</h2>
            <ul className="amenity-grid">
              {property.amenities.map((amenity) => (
                <li key={amenity}>
                  <span>
                    <AmenityIcon name={amenity} />
                  </span>
                  {amenity}
                </li>
              ))}
            </ul>
          </section>
          <section className="detail-section" id="unit-options">
            <div className="section-heading">
              <h2>Find your kind of room.</h2>
              <span className="sample-pill">Sample unit options</span>
            </div>
            <p className="muted">
              These examples show individual rentable units. They aren’t available to reserve.
            </p>
            <div className="unit-list">
              {property.units.map((unit) => (
                <div className="unit-row" key={unit.label}>
                  <span className="unit-icon">
                    <House size={22} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{unit.label}</h3>
                    <p>{unit.note}</p>
                  </div>
                  <div className="unit-price">
                    <strong>{formatPeso(unit.price)}</strong>
                    <span>/ month · sample</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>Clear terms, before you decide.</h2>
            <dl className="terms-list">
              <div>
                <dt>Rental period</dt>
                <dd>Monthly. Actual minimum stay will be set by the owner.</dd>
              </div>
              <div>
                <dt>Sample deposit</dt>
                <dd>{formatPeso(property.deposit)} — shown as an example only.</dd>
              </div>
              <div>
                <dt>Utilities</dt>
                <dd>{property.utilities}</dd>
              </div>
              <div>
                <dt>Booking and payments</dt>
                <dd>
                  No reservations or payments are accepted in this preview. Future booking
                  confirmation will require owner approval.
                </dd>
              </div>
            </dl>
          </section>
          <section className="detail-section">
            <span className="eyebrow">GET A FEEL FOR THE AREA</span>
            <h2>Around {property.barangay}.</h2>
            <p>
              Sample area: {property.barangay}, Cabadbaran City. The diagram below is decorative and
              does not mark a real property or provide directions.
            </p>
            <div className="area-map">
              <Image
                src="/images/area-map.svg"
                alt="Decorative neighborhood diagram with a sample pin, not a geographic map or actual address"
                fill
                sizes="(max-width: 800px) 100vw, 65vw"
              />
              <span className="map-label">
                <MapPin size={17} aria-hidden="true" />
                Sample area illustration
              </span>
            </div>
            <p className="location-note">
              <ShieldCheck size={18} aria-hidden="true" />
              For real listings, the public map will show an approximate location. Exact address
              sharing will follow accepted viewing or booking requests.
            </p>
          </section>
        </div>
        <aside className="detail-sidebar" aria-label="Sample pricing and requests">
          <div className="request-card">
            <span className="eyebrow">MAKE ROOM FOR WHAT’S NEXT</span>
            <p className="request-price">
              <strong>{formatPeso(property.price)}</strong>
              <span> / month</span>
            </p>
            <p className="muted">Starting sample price · PHP</p>
            <div className="request-summary">
              <p>
                <House size={18} aria-hidden="true" />
                {typeLabel(property.type)}
              </p>
              <p>
                <CalendarDays size={18} aria-hidden="true" />
                Monthly rental concept
              </p>
            </div>
            <PreviewRequest propertyName={property.name} />
            <p className="request-disclaimer">
              Preview only. No request will be submitted and no unit will be held.
            </p>
            <div className="request-footnote">
              <Info size={16} aria-hidden="true" />
              <span>Real listings and booking requests are coming in a later milestone.</span>
            </div>
          </div>
        </aside>
      </div>
      <section className="section related-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEEP EXPLORING</span>
            <h2>Another space, another possibility.</h2>
          </div>
          <Link href="/properties" className="text-link">
            All sample rentals <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="property-grid">
          {related.map((item) => (
            <PropertyCard key={item.slug} property={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
