"use client";
import Link from "@/components/ui/navigation-link";
import { ActionButton } from "@/components/ui/action-button";
export default function AdministrationError({ reset }: { reset: () => void }) {
  return (
    <section className="container account-page">
      <div className="account-card">
        <h1>Administration unavailable.</h1>
        <p>
          We couldn’t load this page. Try again. If the problem continues, contact the platform
          operator.
        </p>
        <ActionButton type="button" className="button" onClick={reset}>
          Try again
        </ActionButton>
        <p>
          <Link className="text-link" href="/admin">
            Return to admin dashboard
          </Link>
        </p>
      </div>
    </section>
  );
}
