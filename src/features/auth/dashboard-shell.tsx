import Link from "next/link";
import { signout } from "./actions";

export function DashboardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="container account-page">
      <div className="account-heading">
        <div>
          <span className="eyebrow">YOUR PUYOHUB ACCOUNT</span>
          <h1>{title}</h1>
        </div>
        <form action={signout}>
          <button className="button button-outline">Sign out</button>
        </form>
      </div>
      <nav className="account-nav" aria-label="Account navigation">
        <Link href="/dashboard">Overview</Link>
        <Link href="/dashboard/settings">Profile</Link>
        <Link href="/dashboard/security">Security</Link>
        <Link href="/become-an-owner">Owner access</Link>
        <Link href="/owner">My properties</Link>
      </nav>
      {children}
    </section>
  );
}
