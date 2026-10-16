"use client";

import { useActionState } from "react";
import { activateOwner, saveProfile } from "./actions";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <form action={action} className="auth-form">
      <div className="field">
        <label htmlFor="display_name">Display name</label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={name}
          minLength={2}
          maxLength={80}
          autoComplete="name"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone number (optional)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={phone}
          maxLength={30}
        />
        <p className="field-help">
          Private to your account until you explicitly share it through a future request.
        </p>
      </div>
      {state.message && (
        <p
          className={`form-message ${state.success ? "success" : ""}`}
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function OwnerForm() {
  const [state, action, pending] = useActionState(activateOwner, {});
  return (
    <form action={action} className="auth-form">
      <label className="check-label">
        <input type="checkbox" name="consent" required />
        <span>
          I will provide accurate listing details, record off-platform occupancy, and submit
          listings for admin review before publication. I understand that property management
          screens are still being built.
        </span>
      </label>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Activating…" : "Activate owner access"}
      </button>
    </form>
  );
}
