import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { UserStatusForm } from "@/features/admin/forms";
import { ListControls, ListPagination, AdminNotice } from "@/features/admin/list-controls";
import {
  adminFilters,
  adminDate,
  isUserId,
  listHref,
  searchPattern,
  PAGE_SIZE,
  USER_STATES,
} from "@/features/admin/filters";
export const metadata: Metadata = {
  title: "Manage users",
  robots: { index: false, follow: false },
};
export default async function Users({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const account = await requireRole("admin", "/admin/users");
  const params = await searchParams;
  const notice =
    typeof params.notice === "string" && ["suspended", "restored"].includes(params.notice)
      ? params.notice
      : undefined;
  const filters = adminFilters(params, USER_STATES, "all");
  const client = await createClient();
  let query = client
    .from("profiles")
    .select("id,display_name,account_status,created_at", { count: "exact" });
  if (filters.status !== "all") query = query.eq("account_status", filters.status);
  if (filters.q)
    query = isUserId(filters.q)
      ? query.eq("id", filters.q)
      : query.ilike("display_name", searchPattern(filters.q));
  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(start, start + PAGE_SIZE - 1);
  if (error) throw new Error("Could not load users. Please try again.");
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (filters.page > lastPage)
    redirect(listHref("/admin/users", { ...filters, page: lastPage }, notice));
  const roles = data.length
    ? await client
        .from("account_roles")
        .select("user_id,role")
        .in(
          "user_id",
          data.map((user) => user.id),
        )
    : { data: [], error: null };
  if (roles.error) throw new Error("Could not load account roles.");
  return (
    <DashboardShell title="Manage users." workspace="admin">
      <p className="page-lead">
        Review account roles and suspend or restore account access. Roles are shown for reference
        and cannot be changed here.
      </p>
      <AdminNotice
        notice={notice}
        messages={{
          suspended:
            "Account suspended. Public owner listings are hidden and account actions are blocked.",
          restored: "Account access restored.",
        }}
      />
      <ListControls
        path="/admin/users"
        filters={filters}
        states={USER_STATES}
        searchLabel="Search by display name or exact user ID"
      />
      <ListPagination path="/admin/users" filters={filters} total={total} />
      <div className="workspace-list">
        {data.map((user) => (
          <article
            className="account-card"
            key={user.id}
            aria-label={`Account: ${user.display_name}`}
          >
            <h2 className="break-words">{user.display_name}</h2>
            <p>
              <span className="sample-pill">{user.account_status}</span> · Roles:{" "}
              {roles.data
                ?.filter((role) => role.user_id === user.id)
                .map((role) => role.role)
                .join(", ") || "None assigned"}
            </p>
            <p className="break-all field-help">User ID: {user.id}</p>
            <p className="field-help">Joined {adminDate(user.created_at)} · Philippine time</p>
            {user.id === account.user.id ? (
              <p className="field-help">This is your account. You cannot change your own status.</p>
            ) : (
              <details>
                <summary>
                  {user.account_status === "suspended"
                    ? "Restore account access"
                    : "Suspend account access"}
                </summary>
                <UserStatusForm
                  id={user.id}
                  suspended={user.account_status === "suspended"}
                  filters={filters}
                />
              </details>
            )}
          </article>
        ))}
        {!data.length && <p className="account-card">No users match these filters.</p>}
      </div>
    </DashboardShell>
  );
}
