import { deflateRawSync, inflateRawSync } from 'node:zlib';

/**
 * Minimal, dependency-free ZIP reader/writer for theme packages.
 *
 * Security posture: the reader parses the central directory, enforces count /
 * size / ratio limits, rejects directory entries and unsafe names, and never
 * writes to the filesystem — callers receive an in-memory file map. The
 * writer produces a conventional store/deflate archive with a single root
 * (no extra wrapper directory) so the installer can validate it directly.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export type ZipReadResult =
  | { ok: true; entries: ZipEntry[] }
  | { ok: false; error: string };

const EOCD_SIG = 0x06054b50;
const CDR_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;
const MAX_ENTRIES = 512;
const MAX_TOTAL_UNCOMPRESSED = 8 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 1000;
const RATIO_GUARD_COMPRESSED_FLOOR = 1024; // only guard small compressed payloads

function findEocd(buf: Buffer): number {
  const searchStart = Math.max(0, buf.length - 66_000);
  for (let i = buf.length - 22; i >= searchStart; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

export function readZip(bytes: Uint8Array): ZipReadResult {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buf.length < 22) return { ok: false, error: 'Not a ZIP archive (too small).' };

  const eocd = findEocd(buf);
  if (eocd === -1) return { ok: false, error: 'Not a ZIP archive (no end-of-central-directory record).' };

  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (entryCount > MAX_ENTRIES) {
    return { ok: false, error: `ZIP has too many entries (${entryCount} > ${MAX_ENTRIES}).` };
  }

  const entries: ZipEntry[] = [];
  let offset = cdOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CDR_SIG) {
      return { ok: false, error: `Corrupt ZIP: central directory entry ${index} is invalid.` };
    }
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const uncompressedSize = buf.readUInt32LE(offset + 24);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (name.length === 0 || name.length > 200) {
      return { ok: false, error: `Corrupt ZIP: entry ${index} has an invalid name.` };
    }
    if (name.includes('\\') || name.includes('\0') || name.startsWith('/') || name.includes('..')) {
      return { ok: false, error: `ZIP entry "${name}" is rejected (path traversal guard).` };
    }
    if (name.endsWith('/')) continue; // directory marker — skip
    if (method !== 0 && method !== 8) {
      return { ok: false, error: `ZIP entry "${name}" uses unsupported compression method ${method}.` };
    }
    if (uncompressedSize > MAX_TOTAL_UNCOMPRESSED) {
      return { ok: false, error: `ZIP entry "${name}" exceeds the size limit.` };
    }
    // Bomb guard: extreme expansion from a tiny payload is the classic ZIP-bomb
    // signature; legitimately compressible files (repeated text) are fine.
    if (
      compressedSize > 0 &&
      compressedSize < RATIO_GUARD_COMPRESSED_FLOOR &&
      uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO
    ) {
      return { ok: false, error: `ZIP entry "${name}" exceeds the compression-ratio limit (bomb guard).` };
    }

    // Local file header: re-read name/extra lengths (they may differ from CDR).
    if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== LFH_SIG) {
      return { ok: false, error: `Corrupt ZIP: local header for "${name}" is invalid.` };
    }
    const localNameLength = buf.readUInt16LE(localOffset + 26);
    const localExtraLength = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buf.length) {
      return { ok: false, error: `Corrupt ZIP: data for "${name}" is truncated.` };
    }
    const raw = buf.subarray(dataStart, dataEnd);
    let data: Buffer;
    try {
      data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    } catch {
      return { ok: false, error: `ZIP entry "${name}" could not be decompressed.` };
    }
    if (data.length !== uncompressedSize) {
      return { ok: false, error: `ZIP entry "${name}" declares ${uncompressedSize} bytes but decompressed to ${data.length}.` };
    }

    entries.push({ name, data: new Uint8Array(data) });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  const total = entries.reduce((sum, e) => sum + e.data.byteLength, 0);
  if (total > MAX_TOTAL_UNCOMPRESSED) {
    return { ok: false, error: `ZIP extracts to ${total} bytes, exceeding the ${MAX_TOTAL_UNCOMPRESSED}-byte limit.` };
  }
  return { ok: true, entries };
}

/* --------------------------------- writer ---------------------------------- */

let crcTable: Uint32Array | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) crc = crcTable[(crc ^ buf[i]) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const DOS_TIME = 0;
const DOS_DATE = (44 << 9) | (1 << 5) | 1; // a fixed date is fine for packages

/** Build a ZIP with a single common root (names exactly as given). */
export function makeZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const raw = Buffer.from(file.data.buffer, file.data.byteOffset, file.data.byteLength);
    const deflated = deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const method = useDeflate ? 8 : 0;
    const stored = useDeflate ? deflated : raw;

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(LFH_SIG, 0);
    lfh.writeUInt16LE(20, 4); // version needed
    lfh.writeUInt16LE(0, 6); // flags
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(DOS_TIME, 10);
    lfh.writeUInt16LE(DOS_DATE, 12);
    lfh.writeUInt32LE(crc32(raw), 14);
    lfh.writeUInt32LE(stored.length, 18);
    lfh.writeUInt32LE(raw.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);
    chunks.push(lfh, nameBuf, stored);

    const cdr = Buffer.alloc(46);
    cdr.writeUInt32LE(CDR_SIG, 0);
    cdr.writeUInt16LE(20, 4); // version made by
    cdr.writeUInt16LE(20, 6); // version needed
    cdr.writeUInt16LE(0, 8);
    cdr.writeUInt16LE(method, 10);
    cdr.writeUInt16LE(DOS_TIME, 12);
    cdr.writeUInt16LE(DOS_DATE, 14);
    cdr.writeUInt32LE(crc32(raw), 16);
    cdr.writeUInt32LE(stored.length, 20);
    cdr.writeUInt32LE(raw.length, 24);
    cdr.writeUInt16LE(nameBuf.length, 28);
    cdr.writeUInt16LE(0, 30); // extra
    cdr.writeUInt16LE(0, 32); // comment
    cdr.writeUInt16LE(0, 34); // disk
    cdr.writeUInt16LE(0, 36); // internal attrs
    cdr.writeUInt32LE(0, 38); // external attrs
    cdr.writeUInt32LE(offset, 42);
    central.push(cdr, nameBuf);

    offset += lfh.length + nameBuf.length + stored.length;
  }

  const centralBuf = central.map((c) => c);
  const centralLength = centralBuf.reduce((sum, b) => sum + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralLength, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return new Uint8Array(Buffer.concat([...chunks, ...centralBuf, eocd]));
}
