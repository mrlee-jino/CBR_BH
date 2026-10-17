import sharp from "sharp";

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 16_000_000;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
sharp.concurrency(1);
sharp.cache({ memory: 32, files: 0, items: 16 });

export async function processPhoto(input: Buffer, mime: string) {
  if (!input.length || input.length > MAX_PHOTO_BYTES || !PHOTO_MIME_TYPES.includes(mime))
    throw new Error("INVALID_PHOTO");
  // Reject non-raster content before handing it to any decoder.
  const signature = input.subarray(0, 12);
  const jpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const png = signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    signature.toString("ascii", 0, 4) === "RIFF" && signature.toString("ascii", 8, 12) === "WEBP";
  if (!(jpeg || png || webp)) throw new Error("INVALID_PHOTO");
  try {
    const image = sharp(input, {
      limitInputPixels: MAX_PHOTO_PIXELS,
      failOn: "error",
      sequentialRead: true,
    });
    const metadata = await image.metadata();
    const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[mime];
    if (
      metadata.format !== expected ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1 ||
      metadata.width * metadata.height > MAX_PHOTO_PIXELS
    )
      throw new Error("INVALID_PHOTO");
    // Autorotate before removing EXIF. Sharp discards metadata unless explicitly preserved.
    const { data, info } = await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .timeout({ seconds: 8 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > MAX_PHOTO_BYTES) throw new Error("INVALID_PHOTO");
    return { data, width: info.width, height: info.height };
  } catch {
    throw new Error("INVALID_PHOTO");
  }
}
