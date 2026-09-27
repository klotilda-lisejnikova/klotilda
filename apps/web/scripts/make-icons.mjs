/**
 * Regenerates the Klotilda lichen mark + favicon set from the artist's drawing.
 *
 *   node scripts/make-icons.mjs [source.svg]
 *
 * Source (default `scripts/lichen-source.svg`) is an Illustrator export: a single
 * many-thousand-point <polygon> silhouette of a lichen sprig, no fill, on a
 * 1600x1700 canvas. This script:
 *
 *   1. parses the polygon, simplifies it (Ramer-Douglas-Peucker, eps 1.5) down
 *      to ~800 points and crops to a tight viewBox,
 *   2. writes the path into `src/components/ui/LichenMark.tsx` (between the
 *      `/* MARK:START *\/` .. `/* MARK:END *\/` markers),
 *   3. writes `public/icon.svg`   (32px sand tile + mark),
 *      `public/apple-icon.png`    (180px),
 *      `public/favicon.ico`       (16 / 32 / 48, PNG-in-ICO).
 *
 * `sharp` (a Next.js dependency) does the rasterising; the ICO container is
 * assembled by hand (trivial format).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SRC = resolve(process.argv[2] ?? resolve(HERE, "lichen-source.svg"));

const SAND = "#d4c4a8";
const BROWN = "#38322a";

// ---- 1. parse + simplify --------------------------------------------------
const svg = readFileSync(SRC, "utf8");
const rawPts = svg.match(/<polygon[^>]*points="([^"]+)"/)[1];
const nums = rawPts
  .trim()
  .split(/[\s,]+/)
  .map(Number)
  .filter((n) => !Number.isNaN(n));
let pts = [];
for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);

const dedupe = (arr) => {
  const out = [];
  for (const p of arr) {
    const l = out[out.length - 1];
    if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p);
  }
  return out;
};

function rdp(points, eps) {
  if (points.length < 3) return points;
  let dmax = 0;
  let idx = 0;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const norm = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d = Math.abs((px - ax) * dy - (py - ay) * dx) / norm;
    if (d > dmax) {
      dmax = d;
      idx = i;
    }
  }
  if (dmax > eps) {
    return rdp(points.slice(0, idx + 1), eps)
      .slice(0, -1)
      .concat(rdp(points.slice(idx), eps));
  }
  return [points[0], points[points.length - 1]];
}

const simplified = dedupe(
  rdp(dedupe(pts), 1.5).map(([x, y]) => [
    Math.round(x * 10) / 10,
    Math.round(y * 10) / 10,
  ]),
);

const xs = simplified.map((p) => p[0]);
const ys = simplified.map((p) => p[1]);
const minX = Math.min(...xs);
const minY = Math.min(...ys);
const W = +(Math.max(...xs) - minX).toFixed(1);
const H = +(Math.max(...ys) - minY).toFixed(1);
const D =
  "M" +
  simplified
    .map(([x, y]) => `${+(x - minX).toFixed(1)} ${+(y - minY).toFixed(1)}`)
    .join("L") +
  "Z";
const viewBox = `0 0 ${W} ${H}`;
console.log(
  `mark: ${simplified.length} pts, viewBox "${viewBox}", d ${D.length} chars`,
);

// ---- 2. patch LichenMark.tsx -------------------------------------------------
const markFile = resolve(ROOT, "src/components/ui/LichenMark.tsx");
let mark = readFileSync(markFile, "utf8");
mark = mark.replace(
  /\/\* MARK:START \*\/[\s\S]*?\/\* MARK:END \*\//,
  `/* MARK:START */\nconst VIEW_BOX = "${viewBox}";\nconst D =\n  "${D}";\n/* MARK:END */`,
);
writeFileSync(markFile, mark);
console.log("patched src/components/ui/LichenMark.tsx");

// ---- 3. icon assets -------------------------------------------------------
// `bold` fattens the silhouette (stroke in the mark's own units) so the thin
// twigs survive being shrunk to favicon sizes; 0 for large renders.
function tileSvg(size, frac, r, bold = 0) {
  const scale = (size * frac) / Math.max(W, H);
  const tx = (size - W * scale) / 2;
  const ty = (size - H * scale) / 2;
  const stroke = bold
    ? ` stroke="${BROWN}" stroke-width="${bold}" stroke-linejoin="round"`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${SAND}"/>
  <path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})" d="${D}" fill="${BROWN}"${stroke}/>
</svg>
`;
}

writeFileSync(resolve(ROOT, "public/icon.svg"), tileSvg(32, 0.8, 5));
console.log("wrote public/icon.svg");

const raster = (size, frac, r, bold = 0) =>
  sharp(Buffer.from(tileSvg(512, frac, r, bold)), { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer();

writeFileSync(
  resolve(ROOT, "public/apple-icon.png"),
  await raster(180, 0.74, 0),
);
console.log("wrote public/apple-icon.png");

// 16 / 32 / 48 — smaller icons get more padding and a heavier stroke.
const icoFrames = [
  { size: 16, frac: 0.92, r: 3, bold: 9 },
  { size: 32, frac: 0.84, r: 5, bold: 4 },
  { size: 48, frac: 0.82, r: 8, bold: 2 },
];
const frames = [];
for (const f of icoFrames)
  frames.push(await raster(f.size, f.frac, f.r, f.bold));
const icoSizes = icoFrames.map((f) => f.size);

function buildIco(images) {
  const n = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);
  const dir = Buffer.alloc(16 * n);
  let offset = 6 + 16 * n;
  images.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...images.map((x) => x.buf)]);
}

const ico = buildIco(icoSizes.map((size, i) => ({ size, buf: frames[i] })));
writeFileSync(resolve(ROOT, "public/favicon.ico"), ico);
console.log(`wrote public/favicon.ico (${ico.length} bytes)`);
