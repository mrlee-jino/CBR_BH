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
      description="Use your assigned administrator account. An authenticator code is required before you can access administration."
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
