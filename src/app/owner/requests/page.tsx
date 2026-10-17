import type { Metadata } from "next";
import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { RequestInbox } from "@/features/requests/inbox";
export const metadata: Metadata = { title: "Owner requests" };
export default async function Requests({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const account = await requireRole("owner");
  const value = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(value) && value > 0 && value <= 10000 ? value : 1;
  return (
    <DashboardShell title="Requests for your properties">
      <RequestInbox userId={account.user.id} owner page={page} />
    </DashboardShell>
  );
}
