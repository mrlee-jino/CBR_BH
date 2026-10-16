export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase environment settings are missing.");
  return { url, key };
}

export function siteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value)
    throw new Error("NEXT_PUBLIC_SITE_URL must be configured for authentication redirects.");
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("The site URL must use HTTPS outside local development.");
  }
  return url.origin;
}
