import Image from "next/image";
import type { Database } from "@/lib/supabase/database.types";
import { OwnerPhotoActions, PhotoReview } from "./forms";
export type ManagedPhoto = Pick<
  Database["public"]["Tables"]["property_photos"]["Row"],
  "id" | "alt_text" | "width" | "height" | "is_cover" | "status" | "review_note"
>;
export function ManagedPhotos({
  photos,
  editable = false,
  review = false,
}: {
  photos: ManagedPhoto[];
  editable?: boolean;
  review?: boolean;
}) {
  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <article className="photo-card" key={photo.id}>
          <Image
            unoptimized
            src={`/media/photos/${photo.id}`}
            alt={photo.alt_text}
            width={photo.width ?? 1600}
            height={photo.height ?? 1200}
            className="photo-thumbnail"
          />
          <div className="photo-card-body">
            <p>{photo.alt_text}</p>
            <p className="field-help">
              {photo.is_cover ? "Cover photo · " : ""}
              {photo.status}
            </p>
            {photo.review_note && <p className="preserve-lines">{photo.review_note}</p>}
            {editable && (
              <OwnerPhotoActions
                id={photo.id}
                cover={photo.is_cover}
                rejected={photo.status === "rejected"}
              />
            )}{" "}
            {review && <PhotoReview id={photo.id} />}
          </div>
        </article>
      ))}
    </div>
  );
}
export function PublicPhotoGallery({
  photos,
}: {
  photos: Database["public"]["Functions"]["get_property_photos"]["Returns"];
}) {
  return (
    <div className="public-photo-grid">
      {photos.map((photo, index) => (
        <Image
          key={photo.id}
          unoptimized
          src={`/media/photos/${photo.id}`}
          alt={photo.alt_text}
          width={photo.width}
          height={photo.height}
          className="public-property-photo"
          preload={index === 0}
        />
      ))}
    </div>
  );
}
