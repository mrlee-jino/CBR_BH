"use client";

import { useRef } from "react";
import Link from "@/components/ui/navigation-link";
import { ArrowRight, CalendarDays, Sprout, X } from "lucide-react";

export function PreviewRequest({ propertyName }: { propertyName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="button" type="button" onClick={() => dialogRef.current?.showModal()}>
        How will requests work? <ArrowRight size={17} aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        className="preview-dialog"
        aria-labelledby="request-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="dialog-inner">
          <button
            type="button"
            className="icon-button dialog-close"
            aria-label="Close request preview"
            onClick={() => dialogRef.current?.close()}
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
          <div className="dialog-symbol">
            <Sprout size={30} aria-hidden="true" />
          </div>
          <span className="eyebrow">A LOOK AHEAD</span>
          <h2 id="request-dialog-title">Your next place starts with a conversation.</h2>
          <p>
            {propertyName} is fictional. You haven’t sent a request, shared any information, or
            reserved a unit.
          </p>
          <ol className="request-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Choose a unit and move-in date</strong>
                <p>Review the monthly price, deposit, and terms.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Send a viewing or booking request</strong>
                <p>Sign in and choose which contact details to share.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Wait for the owner’s decision</strong>
                <p>A pending request won’t hold a unit. Confirmation comes after approval.</p>
              </div>
            </li>
          </ol>
          <p className="dialog-note">
            <CalendarDays size={18} aria-hidden="true" />
            Requests will be available after account and booking setup.
          </p>
          <Link className="text-link" href="/preview">
            What’s included in this preview <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </dialog>
    </>
  );
}
