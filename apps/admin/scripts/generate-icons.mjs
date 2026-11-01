/**
 * Draws the app icons into `public/` from the favicon's mark (`public/icon.svg`): the manifest
 * icons Android and desktop browsers install, and the iPhone's home screen icon. Chromium
 * rasterises the SVG, so no image library is needed. Playwright is not a dependency of the
 * repository: run it where Playwright is installed, e.g.
 *
 *     pnpm dlx --package=playwright node apps/admin/scripts/generate-icons.mjs
 *
 * The PNGs are committed; run this again only when the mark or its colours change.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
/** The favicon's tile; keep in step with `public/icon.svg`. */
const TILE_COLOR = '#d4c4a8';

/**
 * `cornerRadius` and `markScale` are fractions of the icon's size. Maskable and Apple icons are
 * full squares that the platform crops; a maskable mark must fit the central safe circle (80 %).
 */
const ICONS = [
  { file: 'icon-192.png', size: 192, cornerRadius: 0.22, markScale: 0.78 },
  { file: 'icon-512.png', size: 512, cornerRadius: 0.22, markScale: 0.78 },
  { file: 'icon-maskable-512.png', size: 512, cornerRadius: 0, markScale: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, cornerRadius: 0, markScale: 0.7 },
];

/** The mark's path in `icon.svg` and its own size, before the favicon's transform. */
async function readMark() {
  const source = await readFile(`${PUBLIC_DIR}icon.svg`, 'utf8');
  const [, d, fill] = source.match(/<path[^>]*\sd="([^"]+)"[^>]*fill="([^"]+)"/) ?? [];
  if (!d) throw new Error('public/icon.svg has no <path> with a fill');
  const numbers = d.match(/[\d.]+/g).map(Number);
  const xs = numbers.filter((_, index) => index % 2 === 0);
  const ys = numbers.filter((_, index) => index % 2 === 1);
  return { d, fill, width: Math.max(...xs), height: Math.max(...ys) };
}

function drawIcon(mark, { size, cornerRadius, markScale }) {
  const scale = (size * markScale) / Math.max(mark.width, mark.height);
  const x = (size - mark.width * scale) / 2;
  const y = (size - mark.height * scale) / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="${size * cornerRadius}" fill="${TILE_COLOR}"/>`,
    `<path transform="translate(${x} ${y}) scale(${scale})" d="${mark.d}" fill="${mark.fill}"/>`,
    '</svg>',
  ].join('');
}

async function main() {
  const mark = await readMark();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const icon of ICONS) {
      await page.setViewportSize({ width: icon.size, height: icon.size });
      await page.setContent(
        `<body style="margin:0;background:transparent">${drawIcon(mark, icon)}</body>`
      );
      await page.screenshot({ path: `${PUBLIC_DIR}${icon.file}`, omitBackground: true });
    }
  } finally {
    await browser.close();
  }
  console.info(`Icons written to ${PUBLIC_DIR}`);
}

await main();
