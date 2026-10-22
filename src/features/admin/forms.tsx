"use client";
import { useActionState, useId, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { changeUserStatus, closeReport } from "./actions";
import type { AdminFilters } from "./filters";
function Context({ filters }: { filters: AdminFilters }) {
  return (
    <>
      {Object.entries(filters).map(([key, value]) => (
        <input key={key} type="hidden" name={`filter_${key}`} value={value} />
      ))}
    </>
  );
}
export function UserStatusForm({
  id,
  suspended,
  filters,
}: {
  id: string;
  suspended: boolean;
  filters: AdminFilters;
}) {
  const [state, action, pending] = useActionState(changeUserStatus, {});
  const [reason, setReason] = useState("");
  const fieldId = useId();
  const verb = suspended ? "Restore account" : "Suspend account";
  return (
    <form action={action} className="auth-form">
      <Context filters={filters} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
      <div className="field">
        <label htmlFor={fieldId}>Reason (required)</label>
        <textarea
          id={fieldId}
          name="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          minLength={3}
          maxLength={1000}
          rows={2}
        />
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <ActionButton
        className="button button-outline"
        pending={pending}
        pendingLabel="Updating account…"
        confirmation={{
          title: `${verb}?`,
          description: suspended
            ? "The user will regain account access. Their listings will follow their existing publication status."
            : "This blocks account actions and hides the owner’s listings from public discovery. Existing reservations are not cancelled.",
          confirmLabel: verb,
        }}
      >
        {verb}
      </ActionButton>
    </form>
  );
}
export function ReportForm({ id, filters }: { id: string; filters: AdminFilters }) {
  const [state, action, pending] = useActionState(closeReport, {});
  const fieldId = useId();
  return (
    <form action={action} className="auth-form">
      <Context filters={filters} />
      <input type="hidden" name="id" value={id} />
      <div className="field">
        <label htmlFor={fieldId}>Report decision</label>
        <select id={fieldId} name="decision" required defaultValue="">
          <option value="" disabled>
            Choose a decision
          </option>
          <option value="resolved">Resolved — issue addressed</option>
          <option value="dismissed">Dismissed — no action needed</option>
        </select>
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <ActionButton
        className="button button-outline"
        pending={pending}
        pendingLabel="Closing report…"
        confirmation={{
          title: "Close this report?",
          description:
            "Your decision will be recorded. Closing a report does not suspend a listing or an account; use the relevant review controls if needed. Closed reports cannot be reopened here.",
          confirmLabel: "Close report",
        }}
      >
        Close report
      </ActionButton>
    </form>
  );
}
