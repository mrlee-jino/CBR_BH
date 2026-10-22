"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";
export type PromotionState = { message?: string; success?: boolean };
export async function savePromotion(_: PromotionState, form: FormData): Promise<PromotionState> {
  await requireRole("admin");
  const parsed = z
    .object({
      id: z.uuid(),
      priority: z.coerce.number().int().min(0).max(100),
      expires: z.union([z.iso.date(), z.literal("")]),
      reason: z.string().trim().min(3).max(500),
    })
    .safeParse({
      id: form.get("id"),
      priority: form.get("priority"),
      expires: form.get("expires"),
      reason: form.get("reason"),
    });
  if (!parsed.success)
    return {
      message: "Use a priority from 0 to 100, a valid end date, and a reason of 3–500 characters.",
    };
  const d = parsed.data;
  const expires = d.expires ? new Date(`${d.expires}T23:59:59+08:00`).toISOString() : null;
  if (
    d.priority > 0 &&
    (!expires ||
      new Date(expires) <= new Date() ||
      new Date(expires).getTime() > Date.now() + 366 * 86400000)
  )
    return { message: "Choose an expiry date in the future, within the next year." };
  const client = await createClient();
  const { error } = await client.rpc("set_listing_promotion", {
    p_property_id: d.id,
    p_priority: d.priority,
    p_expires_at: expires as unknown as string,
    p_reason: d.reason,
  });
  if (error)
    return {
      message:
        "Could not update featured placement. Check that the listing is published, the dates are valid, and your administrator account is active.",
    };
  for (const path of ["/", "/properties", "/admin", `/admin/properties/${d.id}`])
    revalidatePath(path);
  return {
    success: true,
    message: d.priority === 0 ? "Featured placement removed." : "Featured placement saved.",
  };
}
