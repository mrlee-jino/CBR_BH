"use client";

import { useActionState, useState } from "react";
import { submitRequest, decideRequest, type RequestState } from "./actions";
import type { RequestKind } from "./rules";

function Feedback({ state }: { state: RequestState }) {
  return state.message ? (
    <p
      className={`form-message ${state.success ? "success" : ""}`}
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </p>
  ) : null;
}
export function RequestForm({
  kind,
  target,
  version,
  requestKey,
  today,
}: {
  kind: RequestKind;
  target: string;
  version?: number;
  requestKey: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(submitRequest, {});
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  return (
    <form action={action} className="request-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="key" value={requestKey} />
      <input type="hidden" name="version" value={version ?? ""} />
      {kind === "booking" ? (
        <>
          <div className="field">
            <label htmlFor="request-start">Move-in date</label>
            <input
              id="request-start"
              type="date"
              name="start"
              min={today}
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="request-end">Move-out date (optional)</label>
            <input
              id="request-end"
              type="date"
              name="end"
              min={start || today}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <p className="field-help">
              Leave blank for an indefinite stay. The move-out date is not included in your
              reservation.
            </p>
          </div>
          <label className="request-consent">
            <input
              type="checkbox"
              name="terms"
              required
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span>
              I accept the displayed monthly price, deposit, and rental terms. I can cancel a
              confirmed reservation before the move-in date; after move-in, I must contact the owner
              or support.
            </span>
          </label>
        </>
      ) : (
        <div className="field">
          <label htmlFor="request-time">Preferred viewing date and time (Philippine time)</label>
          <input
            id="request-time"
            type="datetime-local"
            name="requested_at"
            min={`${today}T00:00`}
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <p className="field-help">
            All appointments use Asia/Manila (UTC+8), regardless of your device time zone.
          </p>
        </div>
      )}
      <div className="field">
        <label htmlFor="request-message">Message to owner (optional)</label>
        <textarea
          id="request-message"
          name="message"
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <label className="request-consent">
        <input
          type="checkbox"
          name="consent"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree to share my profile name and saved phone number with this property’s owner for
          this request.
        </span>
      </label>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending
          ? "Sending request…"
          : kind === "booking"
            ? "Send booking request"
            : "Send viewing request"}
      </button>
    </form>
  );
}
const labels: Record<string, string> = {
  approved: "Approve booking",
  rejected: "Reject booking",
  accepted: "Accept viewing",
  declined: "Decline viewing",
  withdrawn: "Withdraw request",
  cancelled: "Cancel confirmation",
  completed: "Mark viewing completed",
};
export function DecisionForm({
  id,
  kind,
  decisions,
}: {
  id: string;
  kind: RequestKind;
  decisions: string[];
}) {
  const [state, action, pending] = useActionState(decideRequest, {});
  const [reason, setReason] = useState("");
  return (
    <form action={action} className="request-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <div className="field">
        <label htmlFor="decision-reason">Decision reason (required for cancellation)</label>
        <textarea
          id="decision-reason"
          name="reason"
          maxLength={1000}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <p className="field-help">
        Your decision and reason will be visible to the other participant. Approval confirms the
        displayed dates and terms.
      </p>
      <Feedback state={state} />
      <div className="request-actions">
        {decisions.map((d) => (
          <button
            className="button button-outline"
            name="decision"
            value={d}
            key={d}
            disabled={pending}
          >
            {pending ? "Saving…" : labels[d]}
          </button>
        ))}
      </div>
    </form>
  );
}
