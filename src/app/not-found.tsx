import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container standalone-state">
      <House size={44} strokeWidth={1.2} aria-hidden="true" />
      <span className="eyebrow">404 · A LITTLE OFF THE PATH</span>
      <h1>This space isn’t here.</h1>
      <p>The page may have moved, or that sample property doesn’t exist.</p>
      <Link href="/properties" className="button">
        <ArrowLeft size={17} aria-hidden="true" />
        Explore sample rentals
      </Link>
    </div>
  );
}
