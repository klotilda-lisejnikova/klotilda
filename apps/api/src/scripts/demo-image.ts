import { crc32, deflateSync } from 'node:zlib';
import type { ProductCategory } from '@klotilda/domain';

/** Portrait 3:4, like the photos the site crops to. */
const WIDTH = 750;
const HEIGHT = 1000;
const CHANNELS = 3;

type Rgb = readonly [number, number, number];

/** Background top / bottom and the motif colour of one placeholder. */
export interface DemoPalette {
  top: Rgb;
  bottom: Rgb;
  motif: Rgb;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR_TYPE_RGB = 2;
const BIT_DEPTH = 8;
const FILTER_NONE = 0;

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function encodePng(pixels: Buffer): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header.writeUInt8(BIT_DEPTH, 8);
  header.writeUInt8(COLOR_TYPE_RGB, 9);
  const rowLength = WIDTH * CHANNELS;
  const raw = Buffer.alloc((rowLength + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    raw[y * (rowLength + 1)] = FILTER_NONE;
    pixels.copy(raw, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A few grey levels of grain, so the motif looks like a material without bloating the PNG. */
function grain(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return Math.round((n - Math.floor(n)) * 3) * 6 - 6;
}

/** Whether (u, v) — 0…1 across the picture — belongs to the craft's motif. */
const MOTIFS: Record<ProductCategory, (u: number, v: number, x: number, y: number) => boolean> = {
  // A bowl: the lower half of an ellipse with a rim.
  keramika: (u, v) => {
    const dx = (u - 0.5) / 0.34;
    const dy = (v - 0.55) / 0.26;
    const inBody = dx * dx + dy * dy <= 1 && v >= 0.55;
    const rim = Math.abs(v - 0.55) < 0.012 && Math.abs(u - 0.5) < 0.36;
    return inBody || rim;
  },
  // An embroidery hoop with a cross-stitch grid inside.
  vysivka: (u, v, x, y) => {
    const dx = u - 0.5;
    const dy = (v - 0.5) * (HEIGHT / WIDTH);
    const r = Math.sqrt(dx * dx + dy * dy);
    const hoop = r > 0.36 && r < 0.39;
    const stitch = r < 0.33 && (x % 26 < 4 || y % 26 < 4) && (x + y) % 52 < 30;
    return hoop || stitch;
  },
  // A block print: diagonal cuts inside a frame.
  linoryt: (u, v, x, y) => {
    const inFrame = u > 0.14 && u < 0.86 && v > 0.16 && v < 0.84;
    const border = inFrame && (u < 0.17 || u > 0.83 || v < 0.19 || v > 0.81);
    return border || (inFrame && (x + y) % 44 < 16);
  },
};

/** A 750×1000 PNG placeholder: a soft gradient with the craft's motif on it. */
export function demoImage(category: ProductCategory, palette: DemoPalette): Buffer {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * CHANNELS);
  const isMotif = MOTIFS[category];
  for (let y = 0; y < HEIGHT; y++) {
    const v = y / (HEIGHT - 1);
    for (let x = 0; x < WIDTH; x++) {
      const u = x / (WIDTH - 1);
      const motif = isMotif(u, v, x, y);
      const offset = (y * WIDTH + x) * CHANNELS;
      for (let c = 0; c < CHANNELS; c++) {
        const background = palette.top[c] + (palette.bottom[c] - palette.top[c]) * v;
        const value = motif ? palette.motif[c] + grain(x, y) : background;
        pixels[offset + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }
  }
  return encodePng(pixels);
}
