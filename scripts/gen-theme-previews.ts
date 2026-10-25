/**
 * Generates distinct preview.png images for each Phase 8 theme package.
 * Run once: npx tsx scripts/gen-theme-previews.ts
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 480, H = 300;

type Px = (x: number, y: number, c: [number, number, number]) => void;
type Draw = (px: Px, w: number, h: number) => void;

function lerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function makePng(draw: Draw): Buffer {
  const raw = Buffer.alloc(W * H * 3);
  const px: Px = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2];
  };
  draw(px, W, H);
  const stride = W * 3;
  const scan = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    scan[y * (stride + 1)] = 0;
    raw.copy(scan, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(scan);
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const b of body) crc = crcTable[(crc ^ b) & 0xff]! ^ (crc >>> 8);
    const cb = Buffer.alloc(4); cb.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, cb]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const rect = (px: Px, x0: number, y0: number, x1: number, y1: number, c: [number, number, number]) => {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px(x, y, c);
};

const themes: Record<string, Draw> = {
  // Editorial: cream paper, black rules, serif title block, column of text lines
  'blog-editorial': (px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, lerp([252, 250, 245], [238, 232, 222], y / h));
    rect(px, 36, 40, w - 36, 43, [26, 24, 20]);
    rect(px, 36, 52, 200, 54, [26, 24, 20]);
    rect(px, 36, 70, 340, 110, [26, 24, 20]);            // big title block
    rect(px, 36, 122, 260, 125, [26, 24, 20]);
    for (let i = 0; i < 7; i++) rect(px, 36, 146 + i * 14, i % 3 === 2 ? 220 : w - 60, 149 + i * 14, [120, 114, 104]);
    rect(px, w - 130, 140, w - 36, 220, [222, 214, 200]); // image slot
    rect(px, 36, h - 40, w - 36, h - 37, [26, 24, 20]);
  },
  // Travel: ocean-to-sky gradient, sun, mountain silhouettes, route dots
  'travel-explorer': (px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      px(x, y, lerp([22, 118, 138], [244, 200, 120], Math.max(0, (y / h - 0.25)) * 1.3 > 1 ? 1 : Math.max(0, (y / h - 0.25)) * 1.3));
    }
    for (let y = 52; y < 112; y++) for (let x = 330; x < 410; x++) {
      const dx = x - 370, dy = y - 82;
      if (dx * dx + dy * dy < 28 * 28) px(x, y, [255, 216, 130]);
    }
    for (let x = 0; x < w; x++) {
      const peak = 168 + Math.round(38 * Math.abs(Math.sin(x / 46)));
      for (let y = peak; y < h; y++) px(x, y, [18, 46, 56]);
    }
    for (let x = 0; x < w; x++) {
      const peak = 200 + Math.round(26 * Math.abs(Math.cos(x / 30)));
      for (let y = peak; y < h; y++) px(x, y, [12, 34, 42]);
    }
    [[60, 148], [150, 176], [260, 200], [380, 224]].forEach(([cx, cy], i) => {
      rect(px, cx - 4, cy - 4, cx + 4, cy + 4, [255, 255, 255]);
      if (i < 3) {
        const [nx, ny] = [[150, 176], [260, 200], [380, 224]][i];
        for (let t = 0; t <= 20; t++) {
          px(Math.round(cx + (nx - cx) * t / 20), Math.round(cy + (ny - cy) * t / 20) - 1, [255, 255, 255]);
          px(Math.round(cx + (nx - cx) * t / 20), Math.round(cy + (ny - cy) * t / 20), [255, 255, 255]);
        }
      }
    });
  },
  // Bistro: charcoal backdrop, warm candle glow, plate circles
  'restaurant-bistro': (px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, lerp([38, 30, 26], [22, 17, 15], y / h));
    for (let y = 40; y < 130; y++) for (let x = 150; x < 330; x++) {
      const dx = (x - 240) / 95, dy = (y - 88) / 48;
      if (dx * dx + dy * dy < 1) px(x, y, lerp([120, 84, 40], [48, 34, 26], Math.sqrt(dx * dx + dy * dy)));
    }
    [[90, 200, 34], [200, 216, 44], [320, 198, 30], [400, 226, 24]].forEach(([cx, cy, r]) => {
      for (let y = cy - r; y < cy + r; y++) for (let x = cx - r; x < cx + r; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < r * r) px(x, y, [233, 224, 210]);
      }
      for (let y = cy - 8; y < cy + 8; y++) for (let x = cx - 8; x < cx + 8; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < 64) px(x, y, [150, 96, 58]);
      }
    });
    rect(px, 60, 260, 200, 266, [200, 150, 90]);
  },
  // Hotel: deep navy, gold band, "suite window" grid
  'hotel-luxury': (px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, lerp([16, 24, 40], [8, 12, 22], y / h));
    rect(px, 0, 34, w, 40, [196, 158, 90]);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const x0 = 42 + col * 82, y0 = 76 + row * 66;
        rect(px, x0, y0, x0 + 62, y0 + 46, [30, 40, 58]);
        rect(px, x0 + 4, y0 + 4, x0 + 58, y0 + 42, row === 0 && col % 2 === 0 ? [212, 178, 110] : [22, 30, 46]);
      }
    }
    rect(px, 42, h - 34, 240, h - 30, [196, 158, 90]);
  },
  // Academy: chalkboard green, notebook lines, graduation banner
  'education-academy': (px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, lerp([28, 58, 48], [20, 44, 36], y / h));
    for (let i = 0; i < 8; i++) rect(px, 40, 92 + i * 20, w - 40, 94 + i * 20, [46, 84, 70]);
    rect(px, 40, 40, 300, 44, [226, 218, 196]);
    rect(px, 40, 56, 220, 59, [226, 218, 196]);
    [[70, 200, 44], [180, 208, 40], [290, 198, 44], [396, 210, 36]].forEach(([cx, cy, rw]) => {
      rect(px, cx, cy, cx + rw, cy + 46, [238, 234, 222]);
      rect(px, cx, cy, cx + rw, cy + 5, [180, 120, 60]);
    });
  },
  // SaaS: light UI canvas, gradient hero, app-window cards, chart bars
  'saas-startup': (px, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, lerp([248, 250, 252], [230, 236, 244], y / h));
    for (let y = 44; y < 130; y++) for (let x = 36; x < 300; x++) {
      const t = x / 300;
      px(x, y, [Math.round(70 + 30 * t), Math.round(90 - 20 * t), Math.round(220 + 20 * t)]);
    }
    rect(px, 320, 60, 444, 140, [255, 255, 255]);
    rect(px, 320, 60, 444, 68, [226, 232, 240]);
    [40, 52, 64, 46, 58].forEach((bar, i) => {
      rect(px, 330 + i * 22, 140 - bar, 342 + i * 22, 138, [90, 110, 220]);
    });
    rect(px, 36, 160, 180, 220, [255, 255, 255]);
    rect(px, 200, 160, 444, 220, [255, 255, 255]);
    rect(px, 44, 172, 120, 178, [90, 110, 220]);
    for (let i = 0; i < 3; i++) rect(px, 44, 190 + i * 10, 160 - i * 30, 193 + i * 10, [203, 213, 225]);
  },
};

for (const [id, draw] of Object.entries(themes)) {
  const png = makePng(draw);
  const out = join(process.cwd(), 'theme-packages', id, 'assets', 'preview.png');
  writeFileSync(out, png);
  console.log(`${id}: preview.png ${png.length} bytes`);
}
