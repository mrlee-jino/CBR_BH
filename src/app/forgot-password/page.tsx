import type { Metadata } from "next";
import Link from "@/components/ui/navigation-link";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export const metadata: Metadata = { title: "Recover your account" };
export default function ForgotPage() {
  return (
    <AuthShell
      title="Let’s get you back in."
      description="Enter your email and we’ll send recovery instructions if your account is eligible."
      footer={<Link href="/login">Back to sign in</Link>}
    >
      <AuthForm mode="forgot" />
    </AuthShell>
  );
}
