"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";
import { calendarDate, manilaToday, requestFailure, requestKind, viewingInstant } from "./rules";

export type RequestState = { message?: string; success?: boolean };
const field = (form: FormData, key: string) => String(form.get(key) ?? "");
function refresh() {
  revalidatePath("/dashboard/requests", "layout");
  revalidatePath("/owner/requests");
}
export async function submitRequest(_: RequestState, form: FormData): Promise<RequestState> {
  const account = await requireAccount("/dashboard/requests");
  if (account.setupRequired || account.profile?.account_status !== "active")
    return { message: "An active, verified account is required." };
  const parsed = z
    .object({
      kind: requestKind,
      target: z.uuid(),
      message: z.string().trim().max(2000),
      consent: z.literal("on"),
    })
    .safeParse(
      Object.fromEntries(["kind", "target", "message", "consent"].map((k) => [k, field(form, k)])),
    );
  if (!parsed.success)
    return {
      message:
        "Check the request details and agree to contact sharing. Messages can contain up to 2,000 characters.",
    };
  const d = parsed.data;
  const client = await createClient();
  let result;
  if (d.kind === "booking") {
    const dates = z
      .object({
        start: calendarDate,
        end: z.union([calendarDate, z.literal("")]),
        version: z.coerce.number().int().positive(),
        key: z.uuid(),
      })
      .safeParse({
        start: field(form, "start"),
        end: field(form, "end"),
        version: field(form, "version"),
        key: field(form, "key"),
      });
    if (
      !dates.success ||
      dates.data.start < manilaToday() ||
      (dates.data.end && dates.data.end <= dates.data.start)
    )
      return {
        message:
          "Choose a move-in date today or later and an optional move-out date after move-in.",
      };
    if (field(form, "terms") !== "on")
      return { message: "Review and accept the displayed rental terms and cancellation policy." };
    result = await client.rpc("submit_booking", {
      p_unit_id: d.target,
      p_start_date: dates.data.start,
      p_end_date: (dates.data.end || null) as unknown as string,
      p_offer_version: dates.data.version,
      p_idempotency_key: dates.data.key,
      p_message: d.message,
      p_consent: true,
    });
  } else {
    const instant = viewingInstant(field(form, "requested_at"));
    if (!instant || new Date(instant) <= new Date())
      return { message: "Choose a future viewing date and time in Philippine time." };
    result = await client.rpc("submit_viewing", {
      p_property_id: d.target,
      p_requested_at: instant,
      p_message: d.message,
      p_consent: true,
    });
  }
  if (result.error) return { message: requestFailure(result.error) };
  refresh();
  redirect(`/dashboard/requests/${result.data}?kind=${d.kind}`);
}
export async function decideRequest(_: RequestState, form: FormData): Promise<RequestState> {
  const account = await requireAccount("/dashboard/requests");
  if (account.profile?.account_status !== "active")
    return { message: "An active account is required." };
  const parsed = z
    .object({
      kind: requestKind,
      id: z.uuid(),
      decision: z.enum([
        "approved",
        "rejected",
        "accepted",
        "declined",
        "withdrawn",
        "cancelled",
        "completed",
      ]),
      reason: z.string().trim().max(1000),
    })
    .safeParse(
      Object.fromEntries(["kind", "id", "decision", "reason"].map((k) => [k, field(form, k)])),
    );
  if (!parsed.success)
    return { message: "Check your decision and use a reason of up to 1,000 characters." };
  const d = parsed.data;
  if (d.decision === "cancelled" && d.reason.length < 3)
    return { message: "Give a cancellation reason of at least three characters." };
  const client = await createClient();
  const result =
    d.kind === "booking" && d.decision === "approved"
      ? await client.rpc("approve_booking", { p_request_id: d.id })
      : await client.rpc(d.kind === "booking" ? "decide_booking" : "decide_viewing", {
          p_request_id: d.id,
          p_decision: d.decision,
          p_reason: d.reason,
        });
  if (result.error) return { message: requestFailure(result.error) };
  refresh();
  return { message: "Request updated.", success: true };
}
