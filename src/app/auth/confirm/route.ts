import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/supabase/config";
import { safeNext } from "@/features/auth/redirect";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = siteOrigin();
  const supabase = await createClient();
  const hash = params.get("token_hash");
  const type = params.get("type");
  let failed = true;
  if (hash && (type === "signup" || type === "email" || type === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type });
    failed = Boolean(error);
  } else if (params.get("code")) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.get("code")!);
    failed = Boolean(error);
  }
  let next = type === "recovery" ? "/reset-password" : safeNext(params.get("next"));
  if (!failed && type !== "recovery" && !params.get("next")) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // An editable preference may guide onboarding; it never grants a capability.
    if (user?.user_metadata.signup_intent === "owner") next = "/become-an-owner";
  }
  const response = NextResponse.redirect(
    new URL(failed ? "/login?message=invalid-link" : next, origin),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
