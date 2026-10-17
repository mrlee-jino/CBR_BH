import { z } from "zod";

export type RequestKind = "booking" | "viewing";
export const requestKind = z.enum(["booking", "viewing"]);
export const calendarDate = z.iso.date();
export function manilaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
}
export function viewingInstant(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
    !calendarDate.safeParse(value.slice(0, 10)).success
  )
    return null;
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  if (hour > 23 || minute > 59) return null;
  return new Date(`${value}:00+08:00`).toISOString();
}
export function appointment(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function requestStatus(
  row: { status: string; expires_at: string; start_date?: string },
  now = new Date(),
) {
  return row.status === "pending" &&
    (new Date(row.expires_at) <= now || (row.start_date && row.start_date < manilaToday(now)))
    ? "expired"
    : row.status;
}
export function allowedDecisions(
  kind: RequestKind,
  status: string,
  owner: boolean,
  event: string,
  now = new Date(),
) {
  if (status === "pending")
    return owner
      ? kind === "booking"
        ? ["approved", "rejected"]
        : ["accepted", "declined"]
      : ["withdrawn"];
  if (kind === "booking" && status === "approved" && event > manilaToday(now)) return ["cancelled"];
  if (kind === "viewing" && status === "accepted")
    return new Date(event) > now ? ["cancelled"] : owner ? ["completed"] : [];
  // Expired requests remain pending in storage until the next mutation; renters can withdraw them.
  if (status === "expired") return owner ? (kind === "booking" ? ["rejected"] : []) : ["withdrawn"];
  return [];
}
export function requestFailure(error: { message: string; code?: string }) {
  const messages: Record<string, string> = {
    OFFER_CHANGED:
      "The price or terms changed. Reload the listing and review the latest offer before submitting a new request.",
    UNIT_UNAVAILABLE:
      "Those dates overlap a reservation or availability block. Choose another unit or dates.",
    REQUEST_EXPIRED: "This request expired. Ask the renter to submit a new request.",
    INVALID_STATE:
      "The request status changed or this action is no longer allowed. Reload to see its latest status.",
    FORBIDDEN: "This request or listing is unavailable to your account.",
    INVALID_DATES: "Choose a move-in date today or later and a move-out date after move-in.",
    INVALID_REQUEST: "Choose a future viewing time and agree to contact sharing.",
  };
  for (const [code, message] of Object.entries(messages))
    if (error.message.includes(code)) return message;
  if (error.code === "23505")
    return "You already have a pending request for this unit. Check My requests.";
  return "We couldn’t save this request. Check your account and details, then try again.";
}
