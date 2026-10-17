import type { Metadata } from "next";
import { requireAccount } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { RequestInbox } from "@/features/requests/inbox";
export const metadata: Metadata = { title: "My requests" };
export default async function Requests({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const account = await requireAccount("/dashboard/requests");
  const value = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(value) && value > 0 && value <= 10000 ? value : 1;
  return (
    <DashboardShell title="My requests">
      <RequestInbox userId={account.user.id} owner={false} page={page} />
    </DashboardShell>
  );
}
