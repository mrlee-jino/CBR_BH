"use client";
import { usePathname } from "next/navigation";
import Link from "@/components/ui/navigation-link";

export function AccountNav({
  roles,
  workspace,
}: {
  roles: string[];
  workspace?: "renter" | "owner" | "admin";
}) {
  const path = usePathname();
  const owner = roles.includes("owner");
  const admin = roles.includes("admin");
  const ownerView = workspace === "owner" || (!workspace && path.startsWith("/owner"));
  const adminView = workspace === "admin" || (!workspace && path.startsWith("/admin"));
  return (
    <nav className="account-nav" aria-label="Account navigation">
      {adminView ? (
        <Link href="/admin" aria-current={path === "/admin" ? "page" : undefined}>
          Admin dashboard
        </Link>
      ) : ownerView ? (
        <>
          <Link href="/owner">My properties</Link>
          <Link href="/owner/requests">Property requests</Link>
        </>
      ) : (
        <>
          <Link href="/dashboard">Overview</Link>
          <Link href="/properties">Find a home</Link>
          <Link href="/dashboard/requests">My requests</Link>
        </>
      )}
      <Link
        href="/dashboard/settings"
        aria-current={path === "/dashboard/settings" ? "page" : undefined}
      >
        {adminView ? "Admin profile" : "Profile"}
      </Link>
      <Link
        href="/dashboard/security"
        aria-current={path === "/dashboard/security" ? "page" : undefined}
      >
        Security
      </Link>
      {owner && !ownerView && <Link href="/owner">Owner workspace</Link>}
      {ownerView && <Link href="/dashboard">Renter workspace</Link>}
      {admin && !adminView && <Link href="/admin">Administration</Link>}
      {adminView && <Link href="/properties">Browse rentals</Link>}
    </nav>
  );
}
