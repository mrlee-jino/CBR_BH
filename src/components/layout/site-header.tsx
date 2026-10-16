"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, House, Menu, X } from "lucide-react";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/properties", label: "Find a home" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#for-owners", label: "For property owners" },
  ];
  return (
    <>
      <div className="preview-banner">
        <div className="container preview-content">
          <span>
            <span className="status-dot" /> A little preview of what’s coming.
          </span>
          <Link href="/preview">
            Sample listings only <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-content">
          <Link href="/" className="brand" aria-label="PuyoHub home">
            <span className="brand-icon">
              <House size={23} strokeWidth={1.8} aria-hidden="true" />
            </span>
            Puyo<span className="brand-light">Hub</span>
            <span className="brand-period">.</span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link className="button button-small header-cta" href="/properties">
            Explore rentals <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="icon-button mobile-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            className="mobile-nav container"
            aria-label="Mobile navigation"
          >
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            ))}
            <Link href="/preview" onClick={() => setOpen(false)}>
              About this preview
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
