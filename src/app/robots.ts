import type { MetadataRoute } from "next";

// Keep fictional listings out of search indexes until real inventory is published.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
