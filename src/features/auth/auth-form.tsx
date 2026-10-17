"use client";
import { ActionButton } from "@/components/ui/action-button";

import Link from "@/components/ui/navigation-link";
import { useActionState, useState } from "react";
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
  const [accountType, setAccountType] = useState("");
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
        <fieldset className="account-type-choices">
          <legend>I’m joining as a…</legend>
          <label>
            <input
              type="radio"
              name="account_type"
              value="renter"
              required
              checked={accountType === "renter"}
              onChange={() => setAccountType("renter")}
            />
            <span>
              <strong>Renter</strong>
              <small>Find a home and manage viewing and booking requests.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="account_type"
              value="owner"
              required
              checked={accountType === "owner"}
              onChange={() => setAccountType("owner")}
            />
            <span>
              <strong>Property owner</strong>
              <small>List properties and manage rental requests.</small>
            </span>
          </label>
          {accountType === "owner" && (
            <p className="field-help">
              After verifying your email, complete the owner responsibilities step to open your
              property workspace.
            </p>
          )}
        </fieldset>
      )}
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
            minLength={mode === "login" ? 1 : 8}
            maxLength={128}
            aria-describedby={mode !== "login" ? "password-help" : undefined}
            required
          />
          {mode !== "login" && (
            <p className="field-help" id="password-help">
              Use 8–128 characters. A long, unique passphrase works well.
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
            minLength={8}
            maxLength={128}
            required
          />
        </div>
      )}
      {mode === "signup" && (
        <label className="check-label">
          <input type="checkbox" name="terms" required />
          <span>
            I agree to the account notice and consent to storing my account details. Browsing
            listings is free and does not require an account.{" "}
            <Link href="/preview">Read the account notice.</Link>
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
      <ActionButton type="submit" className="button" pending={pending}>
        {pending ? "Please wait…" : buttons[mode]}
        <ArrowRight size={17} aria-hidden="true" />
      </ActionButton>
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
