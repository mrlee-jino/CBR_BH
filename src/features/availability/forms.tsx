"use client";

import { useActionState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import {
  createAllocation,
  endAllocation,
  releaseFutureBlock,
  type AvailabilityState,
} from "./actions";

type UnitOption = { id: string; label: string; active: boolean };

function Feedback({ state }: { state: AvailabilityState }) {
  return state.message ? (
    <p
      className={`form-message ${state.success ? "success" : ""}`}
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </p>
  ) : null;
}

export function AvailabilityForm({
  propertyId,
  units,
  today,
}: {
  propertyId: string;
  units: UnitOption[];
  today: string;
}) {
  const [state, action, pending] = useActionState(createAllocation, {});
  return (
    <form action={action} className="auth-form listing-form">
      <input type="hidden" name="property_id" value={propertyId} />
      <div className="field">
        <label htmlFor="availability-unit">Room or bedspace</label>
        <select id="availability-unit" name="unit_id" required defaultValue="">
          <option value="" disabled>
            Choose a room
          </option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.label}
              {unit.active ? "" : " (not currently offered)"}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="availability-kind">Availability record</label>
        <select id="availability-kind" name="kind" required defaultValue="manual_occupancy">
          <option value="manual_occupancy">Walk-in or other occupancy</option>
          <option value="blocked">Maintenance or unavailable</option>
        </select>
      </div>
      <div className="listing-columns">
        <div className="field">
          <label htmlFor="availability-start">Start date (Philippine date)</label>
          <input id="availability-start" name="start_date" type="date" min={today} required />
        </div>
        <div className="field">
          <label htmlFor="availability-end">End date (optional)</label>
          <input id="availability-end" name="end_date" type="date" min={today} />
        </div>
      </div>
      <p className="field-help">
        The end date is exclusive. Leave it blank for ongoing occupancy or a block with no planned
        end. A record prevents overlapping booking approvals.
      </p>
      <div className="field">
        <label htmlFor="availability-note">Private note (optional)</label>
        <textarea id="availability-note" name="note" maxLength={500} rows={3} />
        <p className="field-help">Only you and authorized administrators can see this note.</p>
      </div>
      <Feedback state={state} />
      <ActionButton className="button" pending={pending} pendingLabel="Saving availability…">
        Save availability
      </ActionButton>
    </form>
  );
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function EndAllocationForm({
  propertyId,
  allocationId,
  startDate,
  today,
}: {
  propertyId: string;
  allocationId: string;
  startDate: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(endAllocation, {});
  const minDate = startDate >= today ? nextDate(startDate) : today;
  return (
    <form action={action} className="request-form">
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="allocation_id" value={allocationId} />
      <div className="field">
        <label htmlFor={`allocation-end-${allocationId}`}>Set end date (exclusive)</label>
        <input
          id={`allocation-end-${allocationId}`}
          name="end_date"
          type="date"
          min={minDate}
          required
        />
      </div>
      <Feedback state={state} />
      <ActionButton className="button button-outline" pending={pending}>
        Save end date
      </ActionButton>
    </form>
  );
}

export function ReleaseFutureBlockForm({
  propertyId,
  allocationId,
}: {
  propertyId: string;
  allocationId: string;
}) {
  const [state, action, pending] = useActionState(releaseFutureBlock, {});
  return (
    <form action={action} className="request-form">
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="allocation_id" value={allocationId} />
      <Feedback state={state} />
      <ActionButton
        className="button button-outline"
        pending={pending}
        confirmation={{
          title: "Cancel this future maintenance block?",
          description:
            "The room will no longer be blocked for these dates and may become available for booking requests.",
          confirmLabel: "Cancel block",
        }}
      >
        Cancel future block
      </ActionButton>
    </form>
  );
}
