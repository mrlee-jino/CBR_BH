import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/supabase/config";
import { photoService, photoServiceConfigured } from "@/features/photos/service";
import { MAX_PHOTO_BYTES, processPhoto } from "@/features/photos/process";
export const runtime = "nodejs";
export const maxDuration = 30;
const message = (text: string, status: number) =>
  NextResponse.json(
    { message: text },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );

export async function POST(request: Request) {
  if (request.headers.get("origin") !== siteOrigin())
    return message("Upload from the PuyoHub website.", 403);
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.email_confirmed_at)
    return message("Sign in with a verified account before uploading.", 401);
  if (!photoServiceConfigured()) return message("Photo uploads are temporarily unavailable.", 503);
  const type = request.headers.get("content-type") ?? "";
  const maxRequest = MAX_PHOTO_BYTES + 65536;
  if (!type.startsWith("multipart/form-data;") || !request.body)
    return message("Choose a photo to upload.", 400);
  if (Number(request.headers.get("content-length")) > maxRequest)
    return message("Choose a photo smaller than 3 MB.", 413);
  let form: FormData;
  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxRequest) {
        await reader.cancel();
        return message("Choose a photo smaller than 3 MB.", 413);
      }
      chunks.push(value);
    }
    form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    return message("The upload could not be read. Please try again.", 400);
  }
  const propertyId = z.uuid().safeParse(form.get("property_id"));
  const alt = z.string().trim().min(1).max(250).safeParse(form.get("alt_text"));
  const file = form.get("photo");
  if (!propertyId.success || !alt.success || !(file instanceof File) || !file.size)
    return message("Choose a photo and describe what it shows.", 400);
  if (file.size > MAX_PHOTO_BYTES) return message("Choose a photo smaller than 3 MB.", 413);
  // Reserve through the caller's JWT: ownership, account status, listing state, and quotas are enforced in SQL before decoding.
  const reservation = await client.rpc("reserve_property_photo", {
    p_property_id: propertyId.data,
    p_alt_text: alt.data,
  });
  if (reservation.error || !reservation.data?.length) {
    const error = reservation.error?.message ?? "";
    if (error.includes("PHOTO_RATE_LIMIT"))
      return message("You’ve reached the hourly photo limit. Try again later.", 429);
    if (error.includes("PHOTO_LIMIT"))
      return message(
        "A property can have up to 12 photos. Remove one before uploading another.",
        409,
      );
    return message(
      "This property cannot accept photos right now. Check its status and your owner access.",
      403,
    );
  }
  const photo = reservation.data[0];
  const service = photoService();
  let stored = false;
  try {
    const processed = await processPhoto(Buffer.from(await file.arrayBuffer()), file.type);
    const upload = await service.storage
      .from("property-photos")
      .upload(photo.storage_path, processed.data, {
        contentType: "image/webp",
        cacheControl: "0",
        upsert: false,
      });
    if (upload.error) throw new Error("STORAGE_UNAVAILABLE");
    stored = true;
    const complete = await service.rpc("complete_property_photo", {
      p_photo_id: photo.id,
      p_actor_id: user.id,
      p_width: processed.width,
      p_height: processed.height,
      p_byte_size: processed.data.length,
    });
    if (complete.error) throw new Error("LISTING_CHANGED");
    for (const path of ["/", "/properties", "/owner", `/owner/properties/${propertyId.data}`])
      revalidatePath(path);
    revalidatePath("/properties/[slug]", "page");
    return message(
      "Photo uploaded for review. Published listings are paused when photos change.",
      201,
    );
  } catch (error) {
    // Failed/abandoned objects stay private. Retain a removed row until cleanup succeeds.
    const failed = await service
      .from("property_photos")
      .update({ upload_state: "removed", is_cover: false })
      .eq("id", photo.id)
      .eq("upload_state", "reserved")
      .select("id")
      .maybeSingle();
    // A lost finalize response may already have committed. Never delete a ready or uncertain object.
    if (stored && failed.data)
      await service.storage.from("property-photos").remove([photo.storage_path]);
    if (error instanceof Error && error.message === "INVALID_PHOTO")
      return message(
        "Use a valid, nonanimated JPEG, PNG, or WebP photo under 3 MB and 16 megapixels.",
        400,
      );
    return message("The upload could not finish. Reload the property and try again.", 409);
  }
}
