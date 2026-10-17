import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { photoService, photoServiceConfigured } from "@/features/photos/service";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'none'",
};
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !photoServiceConfigured())
    return new Response(null, { status: 404, headers });
  // The user's JWT (or anonymous role) must authorize this exact ready photo first.
  const client = await createClient();
  const access = await client.rpc("get_photo_access", { p_photo_id: id });
  if (access.error || !access.data) return new Response(null, { status: 404, headers });
  const object = await photoService().storage.from("property-photos").download(access.data);
  if (object.error || !object.data) return new Response(null, { status: 404, headers });
  return new Response(object.data.stream(), {
    headers: { ...headers, "Content-Type": "image/webp", "Content-Disposition": "inline" },
  });
}
