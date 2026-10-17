import { requireRole } from "@/features/auth/account";
import { DashboardShell } from "@/features/auth/dashboard-shell";
import { PropertyForm } from "@/features/listings/forms";
export const metadata = { title: "Add a property" };
export default async function NewProperty() {
  await requireRole("owner");
  return (
    <DashboardShell title="A new home on PuyoHub.">
      <div className="account-card">
        <h2>Start with the property.</h2>
        <p>
          Your listing stays private until it passes admin review. Add rooms after saving these
          details.
        </p>
        <PropertyForm />
      </div>
    </DashboardShell>
  );
}
