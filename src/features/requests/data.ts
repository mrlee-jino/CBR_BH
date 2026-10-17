import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/supabase/database.types";
import type { RequestKind } from "./rules";

export type RequestRow =
  | (Tables<"booking_requests"> & { kind: "booking" })
  | (Tables<"viewing_requests"> & { kind: "viewing" });
export async function requestContext(rows: RequestRow[]) {
  const client = await createClient();
  if (!rows.length)
    return new Map<
      string,
      Database["public"]["Functions"]["get_request_context"]["Returns"][number]
    >();
  const { data, error } = await client.rpc("get_request_context", {
    p_booking_ids: rows.filter((r) => r.kind === "booking").map((r) => r.id),
    p_viewing_ids: rows.filter((r) => r.kind === "viewing").map((r) => r.id),
  });
  if (error)
    throw new Error("Could not load request listing details. Check the request workspace upgrade.");
  return new Map(data.map((r) => [`${r.kind}:${r.request_id}`, r]));
}
export async function getRequest(id: string, kind: RequestKind) {
  const client = await createClient();
  if (kind === "booking") {
    const { data, error } = await client
      .from("booking_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load booking request.");
    return data ? { ...data, kind } : null;
  }
  const { data, error } = await client
    .from("viewing_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load viewing request.");
  return data ? { ...data, kind } : null;
}
