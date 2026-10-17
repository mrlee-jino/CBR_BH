"use client";
import { useActionState, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { editPhoto, reviewPhoto, cleanupPhotos, type PhotoState } from "./actions";
function Feedback({ state }: { state: PhotoState }) {
  return state.message ? (
    <p
      className={`form-message ${state.success ? "success" : ""}`}
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </p>
  ) : null;
}
export function UploadPhoto({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<PhotoState>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("photo");
    if (!(file instanceof File) || file.size > 3 * 1024 * 1024) {
      setState({ message: "Choose a photo smaller than 3 MB." });
      return;
    }
    setPending(true);
    setState({});
    try {
      const response = await fetch("/api/photos", { method: "POST", body: form });
      const result = await response.json();
      setState({ message: result.message, success: response.ok });
      if (response.ok) {
        formRef.current?.reset();
        router.refresh();
      }
    } catch {
      setState({ message: "The upload could not finish. Please try again." });
    } finally {
      setPending(false);
    }
  }
  return (
    <form ref={formRef} onSubmit={submit} className="auth-form">
      <input type="hidden" name="property_id" value={propertyId} />
      <div className="field">
        <label htmlFor="property-photo">Choose a property photo</label>
        <input
          id="property-photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <label htmlFor="photo-description">Photo description</label>
        <input
          id="photo-description"
          name="alt_text"
          maxLength={250}
          required
          placeholder="For example: bright private room with a study desk"
          disabled={pending}
        />
      </div>
      <p className="field-help">
        JPEG, PNG, or WebP, up to 3 MB and 16 megapixels. Up to 12 photos per property. Show the
        actual property and avoid including people or private documents. Photos are resized,
        stripped of embedded metadata, and reviewed before publication.
      </p>
      <Feedback state={state} />
      <button className="button button-outline" disabled={pending}>
        {pending ? "Processing photo…" : "Upload photo"}
      </button>
    </form>
  );
}
export function OwnerPhotoActions({
  id,
  cover,
  rejected,
}: {
  id: string;
  cover: boolean;
  rejected: boolean;
}) {
  const [state, action, pending] = useActionState(editPhoto, {});
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="photo_id" value={id} />
      <div className="photo-controls">
        {!cover && !rejected && (
          <button
            className="button button-outline button-small"
            name="action"
            value="cover"
            disabled={pending}
          >
            Use as cover
          </button>
        )}
        <button
          className="button button-outline button-small"
          name="action"
          value="remove"
          disabled={pending}
        >
          Remove photo
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
export function PhotoReview({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewPhoto, {});
  const [note, setNote] = useState("");
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="photo_id" value={id} />
      <div className="field">
        <label htmlFor={`photo-decision-${id}`}>Photo decision</label>
        <select id={`photo-decision-${id}`} name="decision">
          <option value="approved">Approve photo</option>
          <option value="rejected">Reject photo</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`photo-note-${id}`}>Photo review note</label>
        <input
          id={`photo-note-${id}`}
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          minLength={3}
          maxLength={500}
          required
        />
      </div>
      <Feedback state={state} />
      <button className="button button-outline" disabled={pending}>
        {pending ? "Saving…" : "Save photo review"}
      </button>
    </form>
  );
}
export function PhotoCleanup() {
  const [state, action, pending] = useActionState(cleanupPhotos, {});
  return (
    <form action={action} className="auth-form">
      <p>Delete files left by removed or abandoned uploads. Each pass handles up to 25 files.</p>
      <Feedback state={state} />
      <button className="button button-outline" disabled={pending}>
        {pending ? "Cleaning up…" : "Clean up unused photos"}
      </button>
    </form>
  );
}
