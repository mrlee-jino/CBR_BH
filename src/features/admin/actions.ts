"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";
import { adminFilters, listHref, USER_STATES, REPORT_STATES } from "./filters";
export type AdminState = { message?: string };
export async function changeUserStatus(_: AdminState, form: FormData): Promise<AdminState> {
  const account = await requireRole("admin");
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(["active", "suspended"]),
      reason: z.string().trim().min(3).max(1000),
    })
    .safeParse(Object.fromEntries(["id", "status", "reason"].map((key) => [key, form.get(key)])));
  if (!parsed.success)
    return { message: "Choose a valid account and provide a reason of 3–1,000 characters." };
  if (parsed.data.id === account.user.id)
    return { message: "You cannot change your own account status." };
  try {
    const client = await createClient();
    const result = await client.rpc("admin_set_account_status", {
      p_user_id: parsed.data.id,
      p_suspended: parsed.data.status === "suspended",
      p_reason: parsed.data.reason,
    });
    if (result.error?.code === "PGRST202")
      return { message: "Account changes are not enabled yet. Contact the platform operator." };
    if (result.error)
      return {
        message:
          "Account status could not be changed. Refresh the list and check your permissions.",
      };
  } catch {
    return { message: "Account services are unavailable. Please try again." };
  }
  for (const path of ["/admin", "/owner", "/dashboard"]) revalidatePath(path, "layout");
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/properties/[slug]", "page");
  const filters = adminFilters(
    Object.fromEntries(["q", "status", "page"].map((key) => [key, form.get(`filter_${key}`)])),
    USER_STATES,
    "all",
  );
  redirect(
    listHref(
      "/admin/users",
      filters,
      parsed.data.status === "suspended" ? "suspended" : "restored",
    ),
  );
}
export async function closeReport(_: AdminState, form: FormData): Promise<AdminState> {
  await requireRole("admin");
  const parsed = z
    .object({ id: z.uuid(), decision: z.enum(["resolved", "dismissed"]) })
    .safeParse({ id: form.get("id"), decision: form.get("decision") });
  if (!parsed.success) return { message: "Choose a valid report and resolution." };
  try {
    const client = await createClient();
    const { error } = await client.rpc("resolve_report", {
      p_report_id: parsed.data.id,
      p_status: parsed.data.decision,
    });
    if (error)
      return {
        message:
          "This report could not be closed. It may already have been handled; refresh the list.",
      };
  } catch {
    return { message: "Report services are unavailable. Please try again." };
  }
  revalidatePath("/admin", "layout");
  const filters = adminFilters(
    Object.fromEntries(["q", "status", "page"].map((key) => [key, form.get(`filter_${key}`)])),
    REPORT_STATES,
    "open",
  );
  redirect(listHref("/admin/reports", filters, parsed.data.decision));
}
