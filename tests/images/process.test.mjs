import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { processPhoto, MAX_PHOTO_BYTES } from "../../src/features/photos/process.ts";
test("decodes, autorotates, re-encodes, and strips metadata rather than preserving uploaded bytes", async () => {
  const input = await sharp({
    create: { width: 80, height: 40, channels: 3, background: "#a78bca" },
  })
    .withMetadata({ orientation: 6 })
    .withExif({ IFD0: { Artist: "Private camera owner", ImageDescription: "Private location" } })
    .jpeg()
    .toBuffer();
  assert.ok((await sharp(input).metadata()).exif);
  const output = await processPhoto(input, "image/jpeg");
  const metadata = await sharp(output.data).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(output.width, 40);
  assert.equal(output.height, 80);
  for (const key of ["exif", "xmp", "iptc", "icc", "orientation"])
    assert.equal(metadata[key], undefined, key);
  assert.notDeepEqual(output.data, input);
});
test("limits dimensions while keeping aspect ratio", async () => {
  const input = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#cdb4db" },
  })
    .png()
    .toBuffer();
  const output = await processPhoto(input, "image/png");
  assert.equal(output.width, 1600);
  assert.equal(output.height, 800);
});
test("rejects SVG, HTML, malformed raster bytes, MIME mismatches, and oversized files", async () => {
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } })
    .png()
    .toBuffer();
  for (const [bytes, mime] of [
    [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/png"],
    [Buffer.from("<script>alert(1)</script>"), "image/jpeg"],
    [Buffer.from([255, 216, 255, 0]), "image/jpeg"],
    [png, "image/jpeg"],
    [Buffer.alloc(MAX_PHOTO_BYTES + 1), "image/png"],
  ])
    await assert.rejects(processPhoto(bytes, mime), /INVALID_PHOTO/);
});
test("rejects image dimensions above the decoding budget", async () => {
  const huge = await sharp({
    create: { width: 4100, height: 4100, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(processPhoto(huge, "image/png"), /INVALID_PHOTO/);
});

test("rejects animated WebP instead of silently publishing an unreviewed frame", async () => {
  const animated = await sharp(
    Buffer.from([...Array(4).fill([255, 0, 0]).flat(), ...Array(4).fill([0, 0, 255]).flat()]),
    { raw: { width: 2, height: 4, pageHeight: 2, channels: 3 } },
  )
    .webp({ loop: 0, delay: [100, 100] })
    .toBuffer();
  assert.equal((await sharp(animated, { animated: true }).metadata()).pages, 2);
  await assert.rejects(processPhoto(animated, "image/webp"), /INVALID_PHOTO/);
});
