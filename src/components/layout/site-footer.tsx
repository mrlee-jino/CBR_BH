import Link from "next/link";
import { ArrowUpRight, House } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div>
          <Link href="/" className="brand">
            <span className="brand-icon">
              <House size={23} aria-hidden="true" />
            </span>
            Puyo<span className="brand-light">Hub</span>
            <span className="brand-period">.</span>
          </Link>
          <p>
            Find your space.
            <br />
            Feel a little more at home.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/properties">
            Explore sample rentals <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#for-owners">For property owners</Link>
          <Link href="/preview">About this preview</Link>
        </nav>
        <div className="footer-location">
          <span className="eyebrow">STARTING CLOSE TO HOME</span>
          <p>
            Cabadbaran City
            <br />
            Agusan del Norte, Philippines
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} PuyoHub</span>
        <span>Concept illustrations. Fictional properties. No real reservations.</span>
        <span>Made for the everyday move.</span>
      </div>
    </footer>
  );
}
