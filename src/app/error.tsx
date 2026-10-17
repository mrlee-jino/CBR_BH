"use client";

import Link from "@/components/ui/navigation-link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container standalone-state">
      <span className="eyebrow">LET’S TRY THAT AGAIN</span>
      <h1>A small bump in the road.</h1>
      <p>We couldn’t load this page. Please try again or return to the rental list.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <Link href="/properties" className="text-link">
        Explore rentals
      </Link>
    </div>
  );
}
