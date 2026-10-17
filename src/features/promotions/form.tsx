"use client";
import { useActionState, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { savePromotion } from "./actions";
export function PromotionForm({
  id,
  priority = 0,
  expires = "",
  reason = "",
}: {
  id: string;
  priority?: number;
  expires?: string;
  reason?: string;
}) {
  const [state, action, pending] = useActionState(savePromotion, {});
  const [rank, setRank] = useState(String(priority));
  const [end, setEnd] = useState(expires);
  const [note, setNote] = useState(reason);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="id" value={id} />
      <div className="field">
        <label htmlFor="promotion-priority">Featured priority (0 removes placement)</label>
        <input
          id="promotion-priority"
          name="priority"
          type="number"
          min="0"
          max="100"
          step="1"
          required
          value={rank}
          onChange={(e) => setRank(e.target.value)}
        />
      </div>
      <p className="field-help">
        Higher numbers appear first in Featured sorting. All eligible published listings remain
        searchable. Price and name sorting follow the renter’s choice.
      </p>
      <div className="field">
        <label htmlFor="promotion-expiry">Featured through (Philippine date)</label>
        <input
          id="promotion-expiry"
          name="expires"
          type="date"
          required={Number(rank) > 0}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="promotion-reason">Placement reason or agreement reference</label>
        <textarea
          id="promotion-reason"
          name="reason"
          minLength={3}
          maxLength={500}
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <p className="field-help">
        This note is private to administrators. The public label is “Featured · Promoted”. Payment
        agreements are managed separately; this form does not charge the owner.
      </p>
      {state.message && (
        <p
          className={`form-message ${state.success ? "success" : ""}`}
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}
      <ActionButton
        className="button"
        pending={pending}
        pendingLabel="Saving placement…"
        confirmation={{
          title: "Update featured placement?",
          description:
            "This changes the listing’s priority in the public Featured order until the selected expiry. It does not change publication approval or collect payment.",
          confirmLabel: "Save placement",
        }}
      >
        Save featured placement
      </ActionButton>
    </form>
  );
}
