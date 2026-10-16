import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export const metadata: Metadata = { title: "Confirm your email" };
export default function ResendPage() {
  return (
    <AuthShell
      title="One more step toward home."
      description="Request another confirmation email for your unverified account."
      footer={<Link href="/login">Back to sign in</Link>}
    >
      <AuthForm mode="resend" />
    </AuthShell>
  );
}
