import type { Metadata } from "next";
import Link from "@/components/ui/navigation-link";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };
export default async function ResetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <AuthShell
      title="A fresh start."
      description="Choose a new password for your account."
      footer={<Link href="/login">Back to sign in</Link>}
    >
      {user?.email_confirmed_at ? (
        <AuthForm mode="reset" />
      ) : (
        <p className="form-message">
          Open a valid recovery link from your email first.{" "}
          <Link href="/forgot-password">Request a new link.</Link>
        </p>
      )}
    </AuthShell>
  );
}
