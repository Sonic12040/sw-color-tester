import { PALETTE_INDEX_V1 } from "../models/palette-v1.js";

const PALETTE_VERSIONS: Record<number, string[]> = {
  1: PALETTE_INDEX_V1,
};

export const CURRENT_PALETTE_VERSION = 1;

const currentIndex = PALETTE_VERSIONS[CURRENT_PALETTE_VERSION]!;
const idToBit = new Map(currentIndex.map((id, i) => [id, i]));

function toBase64URL(buffer: Uint8Array): string {
  const binStr = String.fromCharCode(...buffer);
  return btoa(binStr)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64URL(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binStr = atob(padded);
  const buf = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    buf[i] = binStr.charCodeAt(i);
  }
  return buf;
}

function trimTrailingZeros(buffer: Uint8Array): Uint8Array {
  let end = buffer.length;
  while (end > 0 && buffer[end - 1] === 0) end--;
  return end === buffer.length ? buffer : buffer.slice(0, end);
}

export function encodeBitset(ids: Set<string> | string[]): string {
  if (!ids || (ids instanceof Set ? ids.size === 0 : ids.length === 0)) {
    return "";
  }
  const bytesNeeded = Math.ceil(currentIndex.length / 8);
  const buffer = new Uint8Array(bytesNeeded);

  for (const id of ids) {
    const bit = idToBit.get(id);
    if (bit === undefined) continue;
    buffer[bit >> 3] |= 1 << (bit & 7);
  }

  const trimmed = trimTrailingZeros(buffer);
  return trimmed.length === 0 ? "" : toBase64URL(trimmed);
}

export function decodeBitset(encoded: string, version: number): string[] {
  if (!encoded) return [];
  const paletteIndex = PALETTE_VERSIONS[version];
  if (!paletteIndex) throw new Error(`Unknown palette version: ${version}`);

  const buffer = fromBase64URL(encoded);
  const ids: string[] = [];

  for (let byteIdx = 0; byteIdx < buffer.length; byteIdx++) {
    if (buffer[byteIdx] === 0) continue;
    for (let bit = 0; bit < 8; bit++) {
      if (buffer[byteIdx] & (1 << bit)) {
        const pos = byteIdx * 8 + bit;
        if (pos < paletteIndex.length) {
          ids.push(paletteIndex[pos]!);
        }
      }
    }
  }

  return ids;
}
