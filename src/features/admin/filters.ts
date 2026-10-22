export const PAGE_SIZE = 20;
export const USER_STATES = ["all", "active", "suspended"];
export const REPORT_STATES = ["all", "open", "resolved", "dismissed"];
export type AdminFilters = { q: string; status: string; page: number };
export function adminFilters(
  values: Record<string, unknown>,
  states: string[],
  fallback: string,
): AdminFilters {
  const status =
    typeof values.status === "string" && states.includes(values.status) ? values.status : fallback;
  const q = typeof values.q === "string" ? values.q.trim().slice(0, 80) : "";
  const page =
    typeof values.page === "string" && /^\d{1,5}$/.test(values.page)
      ? Math.max(1, Math.min(10000, Number(values.page)))
      : 1;
  return { q, status, page };
}
export function listHref(
  path: "/admin/users" | "/admin/reports",
  filters: AdminFilters,
  notice?: string,
) {
  const params = new URLSearchParams({ status: filters.status, page: String(filters.page) });
  if (filters.q) params.set("q", filters.q);
  if (notice) params.set("notice", notice);
  return `${path}?${params}`;
}
export const isUserId = (q: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
export const searchPattern = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;
export function adminDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
