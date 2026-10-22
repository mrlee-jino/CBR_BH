"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/features/auth/account";
import { createClient } from "@/lib/supabase/server";
import { calendarDate, manilaToday } from "@/features/requests/rules";

export type AvailabilityState = { message?: string; success?: boolean };

const uuid = z.uuid();
const field = (form: FormData, key: string) => String(form.get(key) ?? "");

function failure(error: { message: string; code?: string }): AvailabilityState {
  if (error.code === "23P01" || error.message.includes("UNIT_UNAVAILABLE"))
    return { message: "Those dates overlap an existing reservation or availability block." };
  if (error.message.includes("INVALID_DATES"))
    return { message: "Choose a start date today or later and an end date after the start date." };
  if (error.message.includes("INVALID_STATE"))
    return {
      message: "This availability record changed or can no longer be updated. Reload the page.",
    };
  if (error.code === "42501" || error.message.includes("FORBIDDEN"))
    return { message: "This room or availability record is unavailable to your account." };
  return { message: "We couldn’t save availability. Check the dates and try again." };
}

function refresh(propertyId: string) {
  revalidatePath(`/owner/properties/${propertyId}`);
  revalidatePath("/owner");
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/properties/[slug]", "page");
}

async function ownedAllocation(allocationId: string, propertyId: string, ownerId: string) {
  const client = await createClient();
  const { data, error } = await client
    .from("unit_allocations")
    .select(
      "id,kind,booking_request_id,start_date,released_at,units!inner(property_id,properties!inner(owner_id))",
    )
    .eq("id", allocationId)
    .eq("units.property_id", propertyId)
    .eq("units.properties.owner_id", ownerId)
    .maybeSingle();
  if (error) return { allocation: null, error: true };
  return { allocation: data, error: false };
}

export async function createAllocation(
  _: AvailabilityState,
  form: FormData,
): Promise<AvailabilityState> {
  const account = await requireRole("owner");
  const parsed = z
    .object({
      propertyId: uuid,
      unitId: uuid,
      kind: z.enum(["manual_occupancy", "blocked"]),
      startDate: calendarDate,
      endDate: z.union([calendarDate, z.literal("")]),
      note: z.string().trim().max(500),
    })
    .safeParse({
      propertyId: field(form, "property_id"),
      unitId: field(form, "unit_id"),
      kind: field(form, "kind"),
      startDate: field(form, "start_date"),
      endDate: field(form, "end_date"),
      note: field(form, "note"),
    });
  if (!parsed.success)
    return { message: "Check the room, dates, and private note (up to 500 characters)." };

  const data = parsed.data;
  const today = manilaToday();
  if (data.startDate < today || (data.endDate && data.endDate <= data.startDate))
    return { message: "Choose a start date today or later and an end date after the start date." };

  const client = await createClient();
  const { data: unit, error: unitError } = await client
    .from("units")
    .select("id,properties!inner(owner_id)")
    .eq("id", data.unitId)
    .eq("property_id", data.propertyId)
    .eq("properties.owner_id", account.user.id)
    .maybeSingle();
  if (unitError) return { message: "Could not verify that room. Reload the page and try again." };
  if (!unit) return { message: "That room is unavailable to your account." };

  const { error } = await client.rpc("create_manual_allocation", {
    p_unit_id: data.unitId,
    p_start_date: data.startDate,
    // The generated RPC type omits SQL parameter nullability; NULL means an open-ended allocation.
    p_end_date: (data.endDate || null) as unknown as string,
    p_kind: data.kind,
    p_note: data.note,
  });
  if (error) return failure(error);

  refresh(data.propertyId);
  return {
    success: true,
    message:
      data.kind === "blocked"
        ? "Maintenance block saved. Overlapping booking approvals will be prevented."
        : "Walk-in occupancy saved. Overlapping booking approvals will be prevented.",
  };
}

export async function endAllocation(
  _: AvailabilityState,
  form: FormData,
): Promise<AvailabilityState> {
  const account = await requireRole("owner");
  const parsed = z
    .object({
      propertyId: uuid,
      allocationId: uuid,
      endDate: calendarDate,
    })
    .safeParse({
      propertyId: field(form, "property_id"),
      allocationId: field(form, "allocation_id"),
      endDate: field(form, "end_date"),
    });
  if (!parsed.success) return { message: "Choose a valid end date." };

  const data = parsed.data;
  const { allocation, error: lookupError } = await ownedAllocation(
    data.allocationId,
    data.propertyId,
    account.user.id,
  );
  if (lookupError)
    return { message: "Could not verify this availability record. Reload and try again." };
  if (
    !allocation ||
    allocation.released_at ||
    allocation.kind === "booking" ||
    allocation.booking_request_id
  )
    return {
      message: "Only an active owner-entered occupancy or maintenance block can be changed here.",
    };
  if (data.endDate < manilaToday() || data.endDate <= allocation.start_date)
    return { message: "Choose an end date today or later and after the start date." };

  const client = await createClient();
  const { error } = await client.rpc("end_allocation", {
    p_allocation_id: data.allocationId,
    p_end_date: data.endDate,
  });
  if (error) return failure(error);

  refresh(data.propertyId);
  return { success: true, message: "Availability end date saved." };
}

export async function releaseFutureBlock(
  _: AvailabilityState,
  form: FormData,
): Promise<AvailabilityState> {
  const account = await requireRole("owner");
  const parsed = z.object({ propertyId: uuid, allocationId: uuid }).safeParse({
    propertyId: field(form, "property_id"),
    allocationId: field(form, "allocation_id"),
  });
  if (!parsed.success) return { message: "Invalid availability record." };

  const data = parsed.data;
  const { allocation, error: lookupError } = await ownedAllocation(
    data.allocationId,
    data.propertyId,
    account.user.id,
  );
  if (lookupError)
    return { message: "Could not verify this availability record. Reload and try again." };
  if (
    !allocation ||
    allocation.released_at ||
    allocation.kind !== "blocked" ||
    allocation.start_date <= manilaToday()
  )
    return { message: "Only a future maintenance block can be cancelled this way." };

  const client = await createClient();
  const { error } = await client.rpc("release_future_block", {
    p_allocation_id: data.allocationId,
  });
  if (error) return failure(error);

  refresh(data.propertyId);
  return { success: true, message: "Future maintenance block cancelled." };
}
