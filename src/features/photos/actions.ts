"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";
import { photoService, photoServiceConfigured } from "./service";
export type PhotoState = { message?: string; success?: boolean };
function refresh() {
  for (const path of ["/", "/properties", "/owner", "/admin"]) revalidatePath(path);
  revalidatePath("/owner/properties/[id]", "page");
  revalidatePath("/admin/properties/[id]", "page");
  revalidatePath("/properties/[slug]", "page");
}
export async function editPhoto(_: PhotoState, form: FormData): Promise<PhotoState> {
  await requireRole("owner");
  const id = z.uuid().safeParse(form.get("photo_id"));
  const action = z.enum(["remove", "cover"]).safeParse(form.get("action"));
  if (!id.success || !action.success) return { message: "Invalid photo change." };
  const client = await createClient();
  const result = await client.rpc("edit_property_photo", {
    p_photo_id: id.data,
    p_action: action.data,
  });
  if (result.error) return { message: "The photo cannot be changed in this listing status." };
  if (action.data === "remove" && photoServiceConfigured())
    await photoService().storage.from("property-photos").remove([result.data]);
  refresh();
  return {
    success: true,
    message:
      action.data === "remove"
        ? "Photo removed. Unused files are queued for cleanup."
        : "Cover photo selected. Submit the listing for review again if it was published.",
  };
}
export async function reviewPhoto(_: PhotoState, form: FormData): Promise<PhotoState> {
  await requireRole("admin");
  const d = z
    .object({
      id: z.uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().trim().min(3).max(500),
    })
    .safeParse({
      id: form.get("photo_id"),
      decision: form.get("decision"),
      note: form.get("note"),
    });
  if (!d.success)
    return { message: "Choose a decision and enter a review note of 3–500 characters." };
  const client = await createClient();
  const { error } = await client.rpc("review_property_photo", {
    p_photo_id: d.data.id,
    p_decision: d.data.decision,
    p_note: d.data.note,
  });
  if (error)
    return { message: "The photo could not be reviewed. Reload the listing and check its status." };
  refresh();
  return { success: true, message: "Photo review saved." };
}
export async function cleanupPhotos(previous: PhotoState): Promise<PhotoState> {
  void previous;
  await requireRole("admin");
  if (!photoServiceConfigured()) return { message: "Photo cleanup is temporarily unavailable." };
  const client = await createClient();
  const batch = await client.rpc("get_photo_cleanup_batch");
  if (batch.error) return { message: "Could not load unused files." };
  const service = photoService();
  let removed = 0;
  for (const photo of batch.data) {
    const result = await service.storage.from("property-photos").remove([photo.storage_path]);
    if (result.error) continue;
    const deleted = await service
      .from("property_photos")
      .delete()
      .eq("id", photo.id)
      .eq("upload_state", "removed");
    if (!deleted.error) removed++;
  }
  refresh();
  return {
    success: true,
    message: `Cleaned up ${removed} unused photo files. Run again if more remain.`,
  };
}
