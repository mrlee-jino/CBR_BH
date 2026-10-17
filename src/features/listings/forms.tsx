"use client";

import { useActionState, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import {
  saveProperty,
  saveUnit,
  submitProperty,
  reviewListing,
  type ListingState,
} from "./actions";
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
function Feedback({ state }: { state: ListingState }) {
  return state.message ? (
    <p
      className={`form-message ${state.success ? "success" : ""}`}
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </p>
  ) : null;
}
function Input({
  name,
  label,
  value = "",
  max = 120,
  min = 1,
  type = "text",
}: {
  name: string;
  label: string;
  value?: string;
  max?: number;
  min?: number;
  type?: string;
}) {
  const [current, setCurrent] = useState(value);
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        minLength={min}
        maxLength={max}
        required
      />
    </div>
  );
}
export function PropertyForm({
  property,
  details,
}: {
  property?: Row<"properties">;
  details?: Row<"property_private_details"> | null;
}) {
  const [state, action, pending] = useActionState(saveProperty, {});
  const [description, setDescription] = useState(property?.description ?? "");
  const [propertyType, setPropertyType] = useState(property?.property_type ?? "boarding_house");
  return (
    <form action={action} className="auth-form listing-form">
      <input type="hidden" name="id" value={property?.id ?? ""} />
      <Input name="title" label="Property name" value={property?.title} min={3} />
      <Input name="slug" label="Web address name" value={property?.slug} min={3} max={100} />
      <p className="field-help">
        Use lowercase letters, numbers, and hyphens, for example: maria-boarding-house.
      </p>
      <div className="field">
        <label htmlFor="property_type">Property type</label>
        <select
          id="property_type"
          name="property_type"
          value={propertyType}
          onChange={(event) => setPropertyType(event.target.value)}
        >
          <option value="boarding_house">Boarding house</option>
          <option value="apartment_building">Apartment building</option>
          <option value="house">House</option>
        </select>
      </div>
      <Input name="barangay" label="Barangay" value={property?.barangay} max={80} />
      <p className="field-help">
        Cabadbaran City, Agusan del Norte. Enter the official barangay name.
      </p>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          minLength={30}
          maxLength={5000}
          rows={6}
          required
        />
      </div>
      <fieldset className="listing-private">
        <legend>Private contact details</legend>
        <p className="field-help">
          Only you and authorized admins can see these here. Future approved requests will control
          sharing with renters.
        </p>
        <Input
          name="street_address"
          label="Street address"
          value={details?.street_address}
          min={3}
          max={500}
        />
        <Input name="contact_name" label="Contact name" value={details?.contact_name} max={80} />
        <Input
          name="contact_phone"
          label="Contact phone"
          value={details?.contact_phone}
          min={7}
          max={30}
          type="tel"
        />
      </fieldset>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Saving…" : property ? "Save property" : "Create property"}
      </button>
    </form>
  );
}
export function UnitForm({ propertyId, unit }: { propertyId: string; unit?: Row<"units"> }) {
  const initial = {
    label: unit?.label ?? "",
    unit_type: unit?.unit_type ?? "bedspace",
    monthly_rent: String(unit?.monthly_rent ?? ""),
    deposit_amount: String(unit?.deposit_amount ?? 0),
    terms: unit?.terms ?? "",
    active: unit?.active ?? true,
  };
  const [draft, setDraft] = useState(initial);
  const [state, action, pending] = useActionState(
    async (previous: ListingState, form: FormData) => {
      const result = await saveUnit(previous, form);
      if (result.success && !unit) setDraft(initial);
      return result;
    },
    {},
  );
  const prefix = unit?.id ?? "new";
  return (
    <form action={action} className="auth-form listing-form">
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="id" value={unit?.id ?? ""} />
      <div className="field">
        <label htmlFor={`${prefix}-label`}>Room or bed label</label>
        <input
          id={`${prefix}-label`}
          name="label"
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          maxLength={80}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-type`}>Rental type</label>
        <select
          id={`${prefix}-type`}
          name="unit_type"
          value={draft.unit_type}
          onChange={(event) => setDraft({ ...draft, unit_type: event.target.value })}
        >
          <option value="bedspace">Bedspace (one bed)</option>
          <option value="private_room">Private room</option>
          <option value="entire_apartment">Entire apartment</option>
        </select>
      </div>
      <div className="listing-columns">
        {[
          ["monthly_rent", "Monthly rent (PHP)", draft.monthly_rent],
          ["deposit_amount", "Deposit (PHP)", draft.deposit_amount],
        ].map(([name, label, value]) => (
          <div className="field" key={name}>
            <label htmlFor={`${prefix}-${name}`}>{label}</label>
            <input
              id={`${prefix}-${name}`}
              name={String(name)}
              type="number"
              min={name === "monthly_rent" ? "0.01" : "0"}
              max="999999999.99"
              step="0.01"
              value={value}
              onChange={(event) => setDraft({ ...draft, [name]: event.target.value })}
              required
            />
          </div>
        ))}
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-terms`}>Rental terms and utilities</label>
        <textarea
          id={`${prefix}-terms`}
          name="terms"
          rows={3}
          maxLength={3000}
          value={draft.terms}
          onChange={(event) => setDraft({ ...draft, terms: event.target.value })}
        />
      </div>
      <label className="checkbox-field">
        <input
          name="active"
          type="checkbox"
          checked={draft.active}
          onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
        />
        Offer this unit to renters
      </label>
      <p className="field-help">
        This controls whether the unit is advertised. Existing reservations remain in effect. Create
        one unit for each separately rentable bed or room.
      </p>
      <Feedback state={state} />
      <button className="button button-outline" disabled={pending}>
        {pending ? "Saving…" : unit ? "Save room" : "Add room or bedspace"}
      </button>
    </form>
  );
}
export function SubmitForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState(submitProperty, {});
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="property_id" value={propertyId} />
      <p>Check your details and active units before submitting. Editing is locked during review.</p>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
export function ReviewForm({ property }: { property: Row<"properties"> }) {
  const [state, action, pending] = useActionState(reviewListing, {});
  const [reason, setReason] = useState("");
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="property_id" value={property.id} />
      <input type="hidden" name="version" value={property.version} />
      <div className="field">
        <label htmlFor="decision">Decision</label>
        <select id="decision" name="decision">
          {property.status === "pending_review" && (
            <>
              <option value="published">Approve and publish</option>
              <option value="rejected">Return for changes</option>
            </>
          )}
          <option value="suspended">Suspend listing</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="reason">Review notes</label>
        <textarea
          id="reason"
          name="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={1000}
          rows={4}
          required
        />
      </div>
      <p className="field-help">
        Review notes are recorded in the audit trail and shared with the property owner. Approval
        confirms your review of the property; it does not guarantee a vacancy.
      </p>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}
