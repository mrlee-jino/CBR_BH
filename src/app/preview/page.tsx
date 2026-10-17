import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Compass, Sprout } from "lucide-react";

export const metadata: Metadata = {
  title: "About PuyoHub",
  robots: { index: false, follow: false },
};

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
            Browse admin-reviewed properties, search monthly offers, create an owner listing, and
            submit it for review.
          </p>
          <p>
            Public search shows approved owner listings. A separate demo contains fictional
            properties and concept artwork. Listings do not guarantee vacancies; booking requests
            and payments are not available yet.
          </p>
          <Link href="/preview/rentals" className="text-link">
            Explore the sample rentals <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
        <section className="info-card">
          <Sprout size={29} strokeWidth={1.4} aria-hidden="true" />
          <h2>What comes next</h2>
          <p>
            Photo processing, viewing requests, and booking interfaces come next. Owners can already
            manage rooms, monthly prices, and rental terms.
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
              Owner tools include individual room and bedspace inventory, monthly prices, and review
              feedback. Listings go through admin review before publication.
            </p>
            <p>
              Verified account holders can activate owner access and submit their first property
              now.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
