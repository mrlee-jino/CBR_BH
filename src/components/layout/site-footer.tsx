import Link from "@/components/ui/navigation-link";
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
            Cabahay
            <span className="brand-period">.</span>
          </Link>
          <p>
            A place to stay.
            <br />
            The freedom to belong.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/properties">
            Explore rentals <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#for-owners">For property owners</Link>
          <Link href="/preview">About Cabahay</Link>
          <Link href="/dashboard">Your account / sign in</Link>
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
        <span>© {new Date().getFullYear()} Cabahay</span>
        <span>Monthly rentals. Admin-reviewed listings. Bookings coming next.</span>
        <span>A place to stay. The freedom to belong.</span>
      </div>
    </footer>
  );
}
