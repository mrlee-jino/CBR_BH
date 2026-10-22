import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/ui/page-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cabahay — Find your space in Cabadbaran", template: "%s | Cabahay" },
  description:
    "A place to stay. The freedom to belong. Find monthly bedspaces, private rooms, and apartments in Cabadbaran City.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
