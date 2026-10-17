"use client";

import { useId, useRef, type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type Confirmation = { title: string; description: string; confirmLabel?: string };
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingLabel?: string;
  confirmation?: Confirmation;
};

export function ActionButton({
  children,
  pending = false,
  pendingLabel,
  confirmation,
  disabled,
  onClick,
  type = "submit",
  ...props
}: Props) {
  const status = useFormStatus();
  const busy = pending || status.pending;
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  const id = useId();
  function close() {
    dialog.current?.close();
    button.current?.focus();
  }
  return (
    <>
      <button
        {...props}
        ref={button}
        type={type}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        onClick={(event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          if (confirmation && !confirmed.current) {
            event.preventDefault();
            if (type === "submit" && button.current?.form && !button.current.form.reportValidity())
              return;
            dialog.current?.showModal();
            cancel.current?.focus();
            return;
          }
          onClick?.(event);
        }}
      >
        {busy && <span className="ui-spinner" aria-hidden="true" />}
        {busy && pendingLabel ? pendingLabel : children}
      </button>
      {confirmation && (
        <dialog
          ref={dialog}
          className="confirmation-dialog"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <h2 id={`${id}-title`}>{confirmation.title}</h2>
          <p id={`${id}-description`}>{confirmation.description}</p>
          <div className="confirmation-actions">
            <button ref={cancel} type="button" className="button button-outline" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                close();
                // Click the original submitter so its name/value and React form action survive.
                confirmed.current = true;
                try {
                  button.current?.click();
                } finally {
                  confirmed.current = false;
                }
              }}
            >
              {confirmation.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
