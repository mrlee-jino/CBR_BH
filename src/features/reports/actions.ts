"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";
import { getListing } from "@/features/listings/public";
import { REPORT_REASONS } from "./reasons";
export type ReportState = { message?: string; success?: boolean; reference?: string };
export async function submitListingReport(_: ReportState, form: FormData): Promise<ReportState> {
  const slug = z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .safeParse(form.get("slug"));
  const account = await requireAccount(
    slug.success ? `/properties/${slug.data}/report` : "/dashboard",
  );
  if (account.setupRequired || account.profile?.account_status !== "active")
    return { message: "An active account is required to send a report." };
  const details = z
    .object({ reason: z.enum(REPORT_REASONS), detail: z.string().trim().max(2000) })
    .safeParse({ reason: form.get("reason"), detail: form.get("detail") ?? "" });
  if (!slug.success || !details.success)
    return {
      message: "Choose a report reason and keep additional details within 2,000 characters.",
    };
  let reference: string;
  try {
    const listing = await getListing(slug.data);
    if (!listing)
      return { message: "This listing is no longer published. Refresh the property page." };
    const client = await createClient();
    const result = await client.rpc("submit_listing_report", {
      p_property_id: listing.property.id,
      p_reason: details.data.reason,
      p_detail: details.data.detail,
    });
    if (result.error) {
      const message = result.error.message;
      if (message.includes("REPORT_ALREADY_OPEN"))
        return {
          message:
            "You already have an open report for this listing. Please wait for admin review.",
        };
      if (message.includes("REPORT_RATE_LIMIT"))
        return { message: "You can send up to five reports in 24 hours. Please try again later." };
      if (result.error.code === "PGRST202")
        return { message: "Reporting is not enabled yet. Please try again later." };
      return {
        message:
          "Your report could not be sent. Check that the listing is still published and your account is active.",
      };
    }
    reference = result.data;
  } catch {
    return { message: "We couldn’t reach reporting services. Please try again shortly." };
  }
  revalidatePath("/admin/reports");
  return {
    success: true,
    reference,
    message:
      "Your report has been submitted for admin review. Thank you for helping keep Cabahay accurate.",
  };
}
