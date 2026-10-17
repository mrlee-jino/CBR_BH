import Link from "@/components/ui/navigation-link";
import { House, Sprout } from "lucide-react";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <section className="container auth-layout">
      <div className="auth-story">
        <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
        <h1>
          A little closer
          <br />
          to feeling <em>at home.</em>
        </h1>
        <p>
          One account for your rental journey. Discover spaces, then grow into owner tools when
          you’re ready.
        </p>
        <div className="auth-story-art" aria-hidden="true">
          <House size={108} strokeWidth={0.8} />
          <Sprout size={55} strokeWidth={1.1} />
        </div>
        <p className="field-help">
          Real accounts. Sample properties. No payments or reservations in this preview.
        </p>
        <Link className="text-link" href="/properties">
          Keep exploring sample rentals →
        </Link>
      </div>
      <div className="auth-card">
        <span className="eyebrow">WELCOME TO PUYOHUB</span>
        <h2>{title}</h2>
        <p className="auth-description">{description}</p>
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
    </section>
  );
}
