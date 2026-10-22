import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "@/components/ui/navigation-link";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/features/admin/forms";
import { ListControls, ListPagination, AdminNotice } from "@/features/admin/list-controls";
import {
  adminFilters,
  adminDate,
  isUserId,
  listHref,
  searchPattern,
  PAGE_SIZE,
  REPORT_STATES,
} from "@/features/admin/filters";
export const metadata: Metadata = {
  title: "Manage reports",
  robots: { index: false, follow: false },
};
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin", "/admin/reports");
  const params = await searchParams;
  const notice =
    typeof params.notice === "string" && ["resolved", "dismissed"].includes(params.notice)
      ? params.notice
      : undefined;
  const filters = adminFilters(params, REPORT_STATES, "open");
  const client = await createClient();
  let query = client
    .from("reports")
    .select("id,reason,detail,status,reporter_id,property_id,created_at,resolved_by,resolved_at", {
      count: "exact",
    });
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.q)
    query = isUserId(filters.q)
      ? query.eq("id", filters.q)
      : query.ilike("reason", searchPattern(filters.q));
  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(start, start + PAGE_SIZE - 1);
  if (error) throw new Error("Could not load reports. Please try again.");
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (filters.page > lastPage)
    redirect(listHref("/admin/reports", { ...filters, page: lastPage }, notice));
  const profileIds = [
    ...new Set(
      data.flatMap((report) => [
        report.reporter_id,
        ...(report.resolved_by ? [report.resolved_by] : []),
      ]),
    ),
  ];
  const [properties, profiles] = await Promise.all([
    data.length
      ? client
          .from("properties")
          .select("id,title,status")
          .in("id", [...new Set(data.map((report) => report.property_id))])
      : { data: [], error: null },
    profileIds.length
      ? client.from("profiles").select("id,display_name").in("id", profileIds)
      : { data: [], error: null },
  ]);
  if (properties.error || profiles.error) throw new Error("Could not load report context.");
  const name = (id: string) =>
    profiles.data?.find((profile) => profile.id === id)?.display_name ?? "Account unavailable";
  return (
    <DashboardShell title="Manage reports." workspace="admin">
      <p className="page-lead">
        Investigate reported listings, then resolve or dismiss each report. Review the property
        separately if publication or account access needs to change.
      </p>
      <AdminNotice
        notice={notice}
        messages={{ resolved: "Report marked resolved.", dismissed: "Report dismissed." }}
      />
      <ListControls
        path="/admin/reports"
        filters={filters}
        states={REPORT_STATES}
        searchLabel="Search by report reason or exact report ID"
      />
      <ListPagination path="/admin/reports" filters={filters} total={total} />
      <div className="workspace-list">
        {data.map((report) => {
          const property = properties.data?.find((property) => property.id === report.property_id);
          return (
            <article
              className="account-card"
              key={report.id}
              aria-label={`Report: ${report.reason}`}
            >
              <span className="sample-pill">{report.status}</span>
              <h2 className="break-words">{report.reason}</h2>
              <p className="break-words">
                {property ? (
                  <Link className="text-link" href={`/admin/properties/${property.id}`}>
                    {property.title} · {property.status.replaceAll("_", " ")}
                  </Link>
                ) : (
                  "Listing unavailable"
                )}
              </p>
              <p className="preserve-lines break-words">
                {report.detail || "No additional details provided."}
              </p>
              <p className="break-words">
                Reported by{" "}
                <Link className="text-link" href={`/admin/users?q=${report.reporter_id}`}>
                  {name(report.reporter_id)}
                </Link>
              </p>
              <p className="break-all field-help">Report ID: {report.id}</p>
              <p className="field-help">
                Submitted {adminDate(report.created_at)} · Philippine time
              </p>
              {report.resolved_by && report.resolved_at && (
                <p className="field-help">
                  {report.status === "resolved" ? "Resolved" : "Dismissed"} by{" "}
                  {name(report.resolved_by)} · {adminDate(report.resolved_at)} Philippine time
                </p>
              )}
              {report.status === "open" && <ReportForm id={report.id} filters={filters} />}
            </article>
          );
        })}
        {!data.length && <p className="account-card">No reports match these filters.</p>}
      </div>
    </DashboardShell>
  );
}
