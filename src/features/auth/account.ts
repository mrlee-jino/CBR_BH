import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "./redirect";

export const currentAccount = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [profile, roles] = await Promise.all([
    supabase.from("profiles").select("id, display_name, account_status").eq("id", user.id).single(),
    supabase.from("account_roles").select("role").eq("user_id", user.id),
  ]);
  return {
    user,
    profile: profile.data,
    roles: roles.data?.map((row) => row.role) ?? [],
    setupRequired: Boolean(profile.error || roles.error),
  };
});

export async function requireAccount(next = "/dashboard") {
  const account = await currentAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  if (!account.user.email_confirmed_at) redirect("/login?message=confirm-email");
  return account;
}

export async function requireRole(role: "owner" | "admin") {
  const account = await requireAccount(`/${role}`);
  if (account.setupRequired || account.profile?.account_status !== "active") redirect("/dashboard");
  if (!account.roles.includes(role)) redirect(role === "owner" ? "/become-an-owner" : "/dashboard");
  if (role === "admin") {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || data?.claims.aal !== "aal2") redirect("/dashboard/security");
  }
  return account;
}
