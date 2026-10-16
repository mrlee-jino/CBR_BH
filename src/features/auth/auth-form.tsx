"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { forgotPassword, login, resetPassword, signup, resendConfirmation } from "./actions";

type Mode = "signup" | "login" | "forgot" | "reset" | "resend";
const actions = {
  signup,
  login,
  forgot: forgotPassword,
  reset: resetPassword,
  resend: resendConfirmation,
};
export function AuthForm({ mode, next = "/dashboard" }: { mode: Mode; next?: string }) {
  const [state, action, pending] = useActionState(actions[mode], {});
  const buttons = {
    signup: "Create account",
    login: "Sign in",
    forgot: "Send recovery link",
    reset: "Update password",
    resend: "Resend confirmation email",
  };
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <div className="field">
          <label htmlFor="display_name">Your name</label>
          <input
            id="display_name"
            name="display_name"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
      )}
      {mode !== "reset" && (
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
      )}
      {(mode === "login" || mode === "signup" || mode === "reset") && (
        <div className="field">
          <label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "login" ? 1 : 12}
            maxLength={128}
            aria-describedby={mode !== "login" ? "password-help" : undefined}
            required
          />
          {mode !== "login" && (
            <p className="field-help" id="password-help">
              Use 12–128 characters. A long, unique passphrase works well.
            </p>
          )}
        </div>
      )}
      {mode === "reset" && (
        <div className="field">
          <label htmlFor="confirm_password">Confirm new password</label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </div>
      )}
      {mode === "signup" && (
        <label className="check-label">
          <input type="checkbox" name="terms" required />
          <span>
            I understand that property discovery currently uses sample listings and that account
            details are stored in Supabase. <Link href="/preview">Read the account notice.</Link>
          </span>
        </label>
      )}
      {state.message && (
        <p
          className={`form-message ${state.success ? "success" : ""}`}
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Please wait…" : buttons[mode]}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      {mode === "login" && (
        <Link href="/forgot-password" className="text-link">
          Forgot your password?
        </Link>
      )}
      {(mode === "login" || mode === "signup") && (
        <Link href="/resend-confirmation" className="text-link">
          Need another confirmation email?
        </Link>
      )}
    </form>
  );
}
