import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { AuthForm } from "@/features/auth/auth-form";
export const metadata: Metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false },
};
export default function AdminLogin() {
  return (
    <AuthShell
      title="Administrator sign in"
      description="Sign in with the email and password of your assigned administrator account."
      footer={
        <p>
          Administrator access is assigned by the platform operator. Public signup cannot create an
          administrator.
        </p>
      }
    >
      <AuthForm mode="login" next="/admin" />
    </AuthShell>
  );
}
