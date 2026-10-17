"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";

export type ListingState = { message?: string; success?: boolean };
const uuid = z.uuid();
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const money = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,2})?$/)
  .transform(Number);
const field = (form: FormData, key: string) => String(form.get(key) ?? "");
const failure = (error: { message: string; code?: string }): ListingState => {
  if (error.code === "23505")
    return { message: "That web address or room label is already used. Choose another." };
  if (error.message.includes("PHOTOS_NEED_REVIEW"))
    return { message: "Review every pending photo before publishing this listing." };
  if (error.message.includes("STALE_REVIEW"))
    return { message: "This property changed. Reload and review the latest version." };
  if (error.message.includes("INCOMPLETE_PROPERTY"))
    return { message: "Add at least one active room or bedspace before submitting." };
  if (error.message.includes("INVALID_STATE"))
    return { message: "The listing status changed. Reload the page before continuing." };
  if (error.code === "23P01")
    return { message: "Those dates overlap an existing reservation or block." };
  return {
    message: "We couldn’t save this change. Check your access and details, then try again.",
  };
};
function refresh(id: string) {
  for (const path of [
    "/",
    "/properties",
    "/owner",
    `/owner/properties/${id}`,
    "/admin",
    `/admin/properties/${id}`,
  ])
    revalidatePath(path);
  revalidatePath("/properties/[slug]", "page");
}
export async function saveProperty(_: ListingState, form: FormData): Promise<ListingState> {
  const account = await requireRole("owner");
  const data = z
    .object({
      id: z.union([uuid, z.literal("")]),
      title: text(3, 120),
      slug: text(3, 100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      property_type: z.enum(["boarding_house", "apartment_building", "house"]),
      barangay: text(1, 80),
      description: text(30, 5000),
      street_address: text(3, 500),
      contact_name: text(1, 80),
      contact_phone: text(7, 30),
    })
    .safeParse(
      Object.fromEntries(
        [
          "id",
          "title",
          "slug",
          "property_type",
          "barangay",
          "description",
          "street_address",
          "contact_name",
          "contact_phone",
        ].map((k) => [k, field(form, k)]),
      ),
    );
  if (!data.success)
    return {
      message:
        "Complete all fields. Use at least 30 characters for the description and a web address with lowercase letters, numbers, and hyphens.",
    };
  const d = data.data;
  const client = await createClient();
  // Preserve map coordinates when this form edits only text/contact fields.
  const existing = d.id
    ? await client
        .from("properties")
        .select("public_latitude,public_longitude")
        .eq("id", d.id)
        .eq("owner_id", account.user.id)
        .maybeSingle()
    : null;
  if (d.id && (existing?.error || !existing?.data))
    return { message: "This property is unavailable to your account." };
  const coordinates = existing?.data;
  const { data: id, error } = await client.rpc("save_property_draft", {
    ...(coordinates?.public_latitude != null && coordinates?.public_longitude != null
      ? {
          p_public_latitude: coordinates.public_latitude,
          p_public_longitude: coordinates.public_longitude,
        }
      : {}),
    // The generated RPC type omits SQL parameter nullability; NULL means create a new draft.
    p_property_id: d.id || (null as unknown as string),
    p_title: d.title,
    p_slug: d.slug,
    p_property_type: d.property_type,
    p_barangay: d.barangay,
    p_description: d.description,
    p_street_address: d.street_address,
    p_contact_name: d.contact_name,
    p_contact_phone: d.contact_phone,
  });
  if (error) return failure(error);
  refresh(id);
  if (!d.id) redirect(`/owner/properties/${id}`);
  return {
    success: true,
    message: "Property saved. Changes to a published property pause it until another admin review.",
  };
}
export async function saveUnit(_: ListingState, form: FormData): Promise<ListingState> {
  await requireRole("owner");
  const data = z
    .object({
      property_id: uuid,
      id: z.union([uuid, z.literal("")]),
      label: text(1, 80),
      unit_type: z.enum(["bedspace", "private_room", "entire_apartment"]),
      monthly_rent: money.refine((n) => n > 0),
      deposit_amount: money,
      terms: text(0, 3000),
      active: z.boolean(),
    })
    .safeParse({
      ...Object.fromEntries(
        ["property_id", "id", "label", "unit_type", "monthly_rent", "deposit_amount", "terms"].map(
          (k) => [k, field(form, k)],
        ),
      ),
      active: form.get("active") === "on",
    });
  if (!data.success)
    return {
      message:
        "Enter a room label, type, positive monthly rent, and nonnegative deposit using at most two decimal places.",
    };
  const d = data.data;
  const client = await createClient();
  const { error } = await client.rpc("save_unit", {
    p_property_id: d.property_id,
    p_unit_id: d.id || (null as unknown as string),
    p_label: d.label,
    p_unit_type: d.unit_type,
    p_monthly_rent: d.monthly_rent,
    p_deposit_amount: d.deposit_amount,
    p_terms: d.terms,
    p_active: d.active,
  });
  if (error) return failure(error);
  refresh(d.property_id);
  return {
    success: true,
    message:
      "Room saved. Published listings are paused when room details change; submit again when ready.",
  };
}
export async function submitProperty(_: ListingState, form: FormData): Promise<ListingState> {
  await requireRole("owner");
  const id = uuid.safeParse(form.get("property_id"));
  if (!id.success) return { message: "Invalid property." };
  const client = await createClient();
  const { error } = await client.rpc("submit_property", { p_property_id: id.data });
  if (error) return failure(error);
  refresh(id.data);
  return {
    success: true,
    message: "Submitted for review. Editing is locked while an admin reviews your listing.",
  };
}
export async function reviewListing(_: ListingState, form: FormData): Promise<ListingState> {
  await requireRole("admin");
  const d = z
    .object({
      id: uuid,
      version: z.coerce.number().int().positive(),
      decision: z.enum(["published", "rejected", "suspended"]),
      reason: text(3, 1000),
    })
    .safeParse({
      id: form.get("property_id"),
      version: form.get("version"),
      decision: form.get("decision"),
      reason: form.get("reason"),
    });
  if (!d.success)
    return { message: "Choose a decision and explain the review in 3–1,000 characters." };
  const client = await createClient();
  const { error } = await client.rpc("review_listing", {
    p_property_id: d.data.id,
    p_expected_version: d.data.version,
    p_decision: d.data.decision,
    p_reason: d.data.reason,
  });
  if (error) return failure(error);
  refresh(d.data.id);
  return { success: true, message: `Review saved: ${d.data.decision}.` };
}
