import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export const metadata: Metadata = { title: "Create an account" };
export default function SignupPage() {
  return (
    <AuthShell
      title="Make yourself at home."
      description="Create your account, then confirm your email to get started."
      footer={
        <p>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      }
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
