import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/supabase/config";
import { safeNext } from "@/features/auth/redirect";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = siteOrigin();
  const hash = params.get("token_hash");
  const type = params.get("type");
  let failed = true;
  let next = type === "recovery" ? "/reset-password" : safeNext(params.get("next"));
  try {
    const supabase = await createClient();
    if (!params.has("error")) {
      if (hash && (type === "signup" || type === "email" || type === "recovery")) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type });
        failed = Boolean(error);
      } else if (params.get("code")) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.get("code")!);
        failed = Boolean(error);
      }
    }
    if (!failed) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      failed = Boolean(error) || !user;
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("account_status")
          .eq("id", user.id)
          .single();
        if (profileError || profile?.account_status !== "active") {
          await supabase.auth.signOut();
          failed = true;
        } else if (next === "/dashboard") {
          const roles = await supabase.from("account_roles").select("role").eq("user_id", user.id);
          if (roles.data?.some((role) => role.role === "owner")) next = "/owner";
          else if (user.user_metadata.signup_intent === "owner") next = "/become-an-owner";
        }
      }
    }
  } catch {
    failed = true;
  }
  const response = NextResponse.redirect(
    new URL(
      failed
        ? params.has("error")
          ? "/login?message=sign-in-failed"
          : "/login?message=invalid-link"
        : next,
      origin,
    ),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
