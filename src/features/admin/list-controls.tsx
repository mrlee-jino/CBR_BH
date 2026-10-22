import Link from "@/components/ui/navigation-link";
import { PAGE_SIZE, listHref, type AdminFilters } from "./filters";
export function ListControls({
  path,
  filters,
  states,
  searchLabel,
}: {
  path: "/admin/users" | "/admin/reports";
  filters: AdminFilters;
  states: string[];
  searchLabel: string;
}) {
  return (
    <form action={path} method="get" className="auth-form account-card">
      <div className="field">
        <label htmlFor="admin-search">{searchLabel}</label>
        <input id="admin-search" name="q" type="search" maxLength={80} defaultValue={filters.q} />
      </div>
      <div className="field">
        <label htmlFor="admin-status">Status</label>
        <select id="admin-status" name="status" defaultValue={filters.status}>
          {states.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status[0].toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <button className="button" type="submit">
        Apply filters
      </button>
      <Link className="text-link" href={path}>
        Clear filters
      </Link>
    </form>
  );
}
export function ListPagination({
  path,
  filters,
  total,
}: {
  path: "/admin/users" | "/admin/reports";
  filters: AdminFilters;
  total: number;
}) {
  return (
    <nav className="account-nav" aria-label="Results pagination">
      <span>
        {total} results · Page {filters.page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
      </span>
      {filters.page > 1 && (
        <Link href={listHref(path, { ...filters, page: filters.page - 1 })}>Previous page</Link>
      )}
      {filters.page * PAGE_SIZE < total && filters.page < 10000 && (
        <Link href={listHref(path, { ...filters, page: filters.page + 1 })}>Next page</Link>
      )}
    </nav>
  );
}
export function AdminNotice({
  notice,
  messages,
}: {
  notice: unknown;
  messages: Record<string, string>;
}) {
  const message =
    typeof notice === "string" && Object.hasOwn(messages, notice) ? messages[notice] : undefined;
  return message ? (
    <p className="form-message success" role="status">
      {message}
    </p>
  ) : null;
}
