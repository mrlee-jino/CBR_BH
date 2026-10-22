import { currentAccount } from "./account";
import { AccountNav } from "./account-nav";
import { signout } from "./actions";
import { ActionButton } from "@/components/ui/action-button";

export async function DashboardShell({
  title,
  children,
  workspace,
}: {
  title: string;
  children: React.ReactNode;
  workspace?: "renter" | "owner" | "admin";
}) {
  const account = await currentAccount();
  return (
    <section className="container account-page">
      <div className="account-heading">
        <div>
          <span className="eyebrow">YOUR PUYOHUB ACCOUNT</span>
          <h1>{title}</h1>
        </div>
        <form action={signout}>
          <ActionButton
            className="button button-outline"
            pendingLabel="Signing out…"
            confirmation={{
              title: "Sign out of Cabahay?",
              description:
                "You’ll need to sign in again to manage properties and requests. Unsaved changes on this page will be lost.",
              confirmLabel: "Sign out",
            }}
          >
            Sign out
          </ActionButton>
        </form>
      </div>
      <AccountNav roles={account?.roles ?? []} workspace={workspace} />
      {children}
    </section>
  );
}
