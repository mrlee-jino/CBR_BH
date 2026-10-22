"use client";
import { useActionState, useState } from "react";
import Link from "@/components/ui/navigation-link";
import { ActionButton } from "@/components/ui/action-button";
import { submitListingReport } from "./actions";
import { REPORT_REASONS } from "./reasons";
export function ListingReportForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(submitListingReport, {});
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  if (state.success)
    return (
      <div>
        <p className="form-message success" role="status">
          {state.message}
        </p>
        <p className="field-help break-all">Report reference: {state.reference}</p>
        <Link className="text-link" href={`/properties/${slug}`}>
          Return to property →
        </Link>
      </div>
    );
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="slug" value={slug} />
      <div className="field">
        <label htmlFor="report-reason">Report reason</label>
        <select
          id="report-reason"
          name="reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="" disabled>
            Choose a reason
          </option>
          {REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="report-detail">Additional details (optional)</label>
        <textarea
          id="report-detail"
          name="detail"
          maxLength={2000}
          rows={5}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          aria-describedby="report-detail-help"
        />
        <p id="report-detail-help" className="field-help">
          Describe what happened and what the administrator should check. Up to 2,000 characters.
        </p>
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <ActionButton className="button" pending={pending} pendingLabel="Sending report…">
        Send report
      </ActionButton>
    </form>
  );
}
