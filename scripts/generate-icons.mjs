#!/usr/bin/env node
// Generate the full icon set from one source SVG (harness §19.1).
// Gotchas handled: RGBA payload for the .ico (sharp has no ICO encoder, so we
// hand-wrap), opaque flatten for apple/maskable (alpha renders black on iOS/Android).
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NAVY = "#1f3a8a";
const square = readFileSync(join(ROOT, "assets/icon-square.svg"));
const rounded = readFileSync(join(ROOT, "assets/icon-rounded.svg"));

mkdirSync(join(ROOT, "public"), { recursive: true });

/** Wrap a PNG buffer in a minimal single-image ICO container (Vista+ PNG-in-ICO). */
function buildIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // size of image data
  entry.writeUInt32LE(6 + 16, 12); // offset to image data
  return Buffer.concat([header, entry, png]);
}

async function main() {
  // SVG tab favicon (rounded) — copied verbatim.
  writeFileSync(join(ROOT, "app/icon.svg"), rounded);

  // apple-touch icon: 180×180, OPAQUE.
  await sharp(square).resize(180, 180).flatten({ background: NAVY }).png().toFile(join(ROOT, "app/apple-icon.png"));

  // Maskable PWA icons: full-bleed, OPAQUE.
  await sharp(square).resize(192, 192).flatten({ background: NAVY }).png().toFile(join(ROOT, "public/icon-192.png"));
  await sharp(square).resize(512, 512).flatten({ background: NAVY }).png().toFile(join(ROOT, "public/icon-512.png"));

  // favicon.ico: 48×48 RGBA PNG (NOT flattened) hand-wrapped in an ICO container.
  const icoPng = await sharp(square).resize(48, 48).ensureAlpha().png().toBuffer();
  writeFileSync(join(ROOT, "app/favicon.ico"), buildIco(icoPng, 48));

  console.log("icons: generated app/icon.svg, app/apple-icon.png, app/favicon.ico, public/icon-192.png, public/icon-512.png");
}

main().catch((e) => {
  console.error("icon generation failed:", e);
  process.exit(1);
});
