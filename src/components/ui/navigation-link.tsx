"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

function PendingHint() {
  const { pending } = useLinkStatus();
  return <span className={`navigation-hint${pending ? " is-pending" : ""}`} aria-hidden="true" />;
}
export default function NavigationLink({
  children,
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  return (
    <Link
      {...props}
      className={`navigation-link ${className}`}
      aria-current={
        props["aria-current"] ??
        (typeof props.href === "string" && props.href === pathname ? "page" : undefined)
      }
    >
      {children}
      <PendingHint />
    </Link>
  );
}
