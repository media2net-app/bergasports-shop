#!/usr/bin/env node
/**
 * Reliëf-logo → vlak zwart PNG (transparant) + trim.
 * Gebruik: node scripts/make-logo-transparent.mjs [bron.jpg]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src =
  process.argv[2] ||
  path.join(root, "logo", "PHOTO-2026-05-22-07-08-25.jpg");
const outDir = path.join(root, "public", "brand");
const outPng = path.join(outDir, "bergasports-logo-black.png");

fs.mkdirSync(outDir, { recursive: true });

const THRESHOLD = Number(process.env.LOGO_THRESHOLD || "148");

const { data, info } = await sharp(src)
  .greyscale()
  .blur(0.8)
  .threshold(THRESHOLD)
  .raw()
  .toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < info.width * info.height; i += 1) {
  if (data[i] > 127) {
    out[i * 4 + 3] = 0;
  } else {
    out[i * 4] = 0;
    out[i * 4 + 1] = 0;
    out[i * 4 + 2] = 0;
    out[i * 4 + 3] = 255;
  }
}

let png = await sharp(out, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

png = await sharp(png).trim({ threshold: 12 }).png().toBuffer();
await fs.promises.writeFile(outPng, png);

const meta = await sharp(png).metadata();
console.log(`PNG: ${outPng} (${meta.width}×${meta.height}, threshold ${THRESHOLD})`);
