"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/supabase/config";
import { requireAccount } from "./account";
import { safeNext } from "./redirect";

export type AuthState = { message?: string; success?: boolean };
const emailSchema = z.email().max(254);
const passwordSchema = z.string().min(12).max(128);
const emailValue = (form: FormData) =>
  String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
const unavailable = { message: "We couldn’t reach account services. Please try again shortly." };

export async function signup(previous: AuthState, form: FormData): Promise<AuthState> {
  void previous;
  const data = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      display_name: z.string().trim().min(2).max(80),
      account_type: z.enum(["renter", "owner"]),
      terms: z.literal("on"),
    })
    .safeParse({
      email: emailValue(form),
      password: form.get("password"),
      display_name: form.get("display_name"),
      account_type: form.get("account_type"),
      terms: form.get("terms"),
    });
  if (!data.success)
    return {
      message:
        "Choose Renter or Property owner, enter your name, a valid email and a password of 12–128 characters, and accept the account notice.",
    };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: data.data.email,
      password: data.data.password,
      options: {
        // Navigation preference only. Owner access is granted solely by activate_owner.
        data: { display_name: data.data.display_name, signup_intent: data.data.account_type },
        emailRedirectTo: `${siteOrigin()}/auth/confirm`,
      },
    });
    if (error)
      return {
        message:
          error.status === 429
            ? "Too many attempts. Please wait before trying again."
            : "We couldn’t create the account. Please check your details and try again.",
      };
    return {
      success: true,
      message:
        "If this address is eligible, a confirmation email is on its way. Open the link to verify your account, then sign in. Check your spam folder too.",
    };
  } catch {
    return unavailable;
  }
}

export async function login(previous: AuthState, form: FormData): Promise<AuthState> {
  void previous;
  const email = emailSchema.safeParse(emailValue(form));
  const password = z.string().min(1).max(128).safeParse(form.get("password"));
  if (!email.success || !password.success)
    return { message: "Enter a valid email and your password." };
  let destination = safeNext(form.get("next"));
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    });
    if (error)
      return {
        message:
          error.code === "email_not_confirmed"
            ? "Confirm your email using the link in your inbox before signing in."
            : "Unable to sign in. Check your email and password, or try password recovery.",
      };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unavailable;
    const { data } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .single();
    if (data?.account_status === "suspended") {
      await supabase.auth.signOut();
      return { message: "Your account is suspended. Contact platform support for help." };
    }
    if (destination === "/dashboard") {
      const roles = await supabase.from("account_roles").select("role").eq("user_id", user.id);
      if (roles.data?.some((r) => r.role === "owner")) destination = "/owner";
      else if (user.user_metadata.signup_intent === "owner") destination = "/become-an-owner";
    }
  } catch {
    return unavailable;
  }
  revalidatePath("/dashboard", "layout");
  redirect(destination);
}

export async function forgotPassword(previous: AuthState, form: FormData): Promise<AuthState> {
  void previous;
  const email = emailSchema.safeParse(emailValue(form));
  if (!email.success) return { message: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${siteOrigin()}/auth/confirm?next=/reset-password`,
    });
    if (error?.status === 429)
      return { message: "Too many attempts. Please wait before requesting another link." };
    if (error && (!error.status || error.status >= 500)) return unavailable;
    return {
      success: true,
      message:
        "If this account can receive recovery emails, you’ll get a password-reset link shortly. Check your inbox and spam folder.",
    };
  } catch {
    return unavailable;
  }
}

export async function resendConfirmation(previous: AuthState, form: FormData): Promise<AuthState> {
  void previous;
  const email = emailSchema.safeParse(emailValue(form));
  if (!email.success) return { message: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.data,
      options: { emailRedirectTo: `${siteOrigin()}/auth/confirm` },
    });
    if (error?.status === 429)
      return { message: "Please wait before requesting another confirmation email." };
    if (error && (!error.status || error.status >= 500)) return unavailable;
    return {
      success: true,
      message:
        "If this address has an eligible unconfirmed account, a new confirmation email is on its way.",
    };
  } catch {
    return unavailable;
  }
}

export async function resetPassword(previous: AuthState, form: FormData): Promise<AuthState> {
  void previous;
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success || password.data !== form.get("confirm_password"))
    return { message: "Use 12–128 characters and make sure both passwords match." };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email_confirmed_at)
      return { message: "Your reset session has expired. Request a new recovery link." };
    const { error } = await supabase.auth.updateUser({ password: password.data });
    if (error)
      return {
        message:
          "Couldn’t change your password. Use a different password or request a new recovery link.",
      };
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    return unavailable;
  }
  redirect("/login?message=password-updated");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/dashboard", "layout");
  redirect("/login");
}

export async function saveProfile(previous: AuthState, form: FormData): Promise<AuthState> {
  void previous;
  const account = await requireAccount();
  if (account.setupRequired || account.profile?.account_status !== "active")
    return { message: "Account setup is unavailable. Please contact support." };
  const name = z.string().trim().min(2).max(80).safeParse(form.get("display_name"));
  const phone = String(form.get("phone") ?? "").trim();
  if (!name.success || (phone && !/^\+?[\d ()-]{7,30}$/.test(phone)))
    return { message: "Enter a name of 2–80 characters and a valid optional phone number." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_profile", {
    p_display_name: name.data,
    p_phone: phone || undefined,
  });
  if (error) return { message: "Couldn’t save your profile. Please try again." };
  revalidatePath("/dashboard", "layout");
  return { success: true, message: "Your profile has been saved." };
}

export async function activateOwner(previous: AuthState, form: FormData): Promise<AuthState> {
  void previous;
  await requireAccount("/become-an-owner");
  if (form.get("consent") !== "on")
    return { message: "Please acknowledge the owner responsibilities first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_owner");
  if (error)
    return {
      message:
        "Couldn’t activate owner access. Please check that your email is verified and database setup is complete.",
    };
  revalidatePath("/dashboard", "layout");
  redirect("/owner");
}
