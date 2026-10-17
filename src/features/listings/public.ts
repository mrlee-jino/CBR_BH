import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
// Public pages never read a visitor's session or owner-only base tables.
function publicClient() {
  const { url, key } = supabaseConfig();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
export type PublicPhoto = Database["public"]["Functions"]["get_property_photos"]["Returns"][number];
export type Listing = Database["public"]["Functions"]["get_public_listing"]["Returns"][number] & {
  cover?: PublicPhoto;
};
export async function findListings(
  args: Database["public"]["Functions"]["search_listings"]["Args"],
) {
  const { data, error } = await publicClient().rpc("search_listings", args);
  if (error) throw new Error("Could not load published listings.");
  if (!data.length) return [];
  const covers = await publicClient().rpc("get_listing_covers", {
    p_property_ids: data.map((p) => p.id),
  });
  if (covers.error) throw new Error("Could not load listing photos.");
  const byProperty = new Map(covers.data.map((photo) => [photo.property_id, photo]));
  return data.map((property) => ({ ...property, cover: byProperty.get(property.id) }));
}
export const getListing = cache(async (slug: string) => {
  const client = publicClient();
  const { data, error } = await client.rpc("get_public_listing", { p_slug: slug });
  if (error) throw new Error("Could not load published listing.");
  if (!data.length) return null;
  const units = await client.rpc("get_public_units", { p_slug: slug });
  if (units.error) throw new Error("Could not load published units.");
  const photos = await client.rpc("get_property_photos", { p_property_id: data[0].id });
  if (photos.error) throw new Error("Could not load property photos.");
  return { property: data[0], units: units.data, photos: photos.data };
});
