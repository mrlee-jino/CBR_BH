import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Compass, Sprout } from "lucide-react";

export const metadata: Metadata = { title: "About this preview" };

export default function PreviewPage() {
  return (
    <div className="container preview-page">
      <span className="eyebrow">A SMALL START. A PLACE TO GROW.</span>
      <h1>
        Meet the first little
        <br />
        piece of PuyoHub.
      </h1>
      <p className="page-lead">
        We’re building a rental marketplace for everyday life in Cabadbaran City, beginning with
        monthly bedspaces, private rooms, and apartments.
      </p>
      <div className="preview-info-grid">
        <section className="info-card">
          <Compass size={29} strokeWidth={1.4} aria-hidden="true" />
          <h2>What you can try today</h2>
          <p>
            Browse six fictional properties, filter by barangay and monthly budget, explore unit
            types, and read sample rental terms.
          </p>
          <p>
            Every listing, price, and unit is sample data. All artwork is illustrative. There are no
            real owners, verified listings, live vacancies, accounts, saved favorites, bookings,
            payments, or contact collection in this milestone.
          </p>
          <Link href="/properties" className="text-link">
            Explore the sample rentals <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
        <section className="info-card">
          <Sprout size={29} strokeWidth={1.4} aria-hidden="true" />
          <h2>What comes next</h2>
          <p>
            Secure accounts and a Supabase database, followed by owner listings, admin review,
            viewing requests, and booking confirmations that prevent overlapping reservations.
          </p>
          <p>
            A pending request won’t reserve a unit. Only an owner-approved booking will hold it.
            Payments and rent collection are outside the first release.
          </p>
        </section>
        <section id="owners" className="info-card owners-info">
          <Building2 size={29} strokeWidth={1.4} aria-hidden="true" />
          <div>
            <h2>A simpler day for property owners.</h2>
            <p>
              Planned owner tools include individual room and bedspace inventory, monthly prices,
              photos, occupancy blocks, and a request inbox. Listings will go through admin review
              before publication.
            </p>
            <p>
              Owner registration and listing submissions aren’t open yet. This page does not collect
              your contact information or add you to a waitlist.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
