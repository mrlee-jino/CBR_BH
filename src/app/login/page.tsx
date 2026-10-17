import type { Metadata } from "next";
import Link from "@/components/ui/navigation-link";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { safeNext } from "@/features/auth/redirect";

export const metadata: Metadata = { title: "Sign in" };
const messages: Record<string, string> = {
  "confirm-email": "Confirm your email before signing in.",
  "email-confirmed": "Email confirmed. You can now sign in.",
  "password-updated": "Password updated. Sign in with your new password.",
  "invalid-link": "That link is invalid or expired. Request a new confirmation or recovery email.",
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const message = typeof params.message === "string" ? messages[params.message] : undefined;
  return (
    <AuthShell
      title="Welcome back."
      description="Sign in to your PuyoHub account."
      footer={
        <p>
          New here? <Link href="/signup">Create an account</Link>
        </p>
      }
    >
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      <AuthForm mode="login" next={safeNext(params.next)} />
    </AuthShell>
  );
}
