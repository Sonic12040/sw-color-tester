/**
 * Versioned Bitset Codec — encodes/decodes a Set of color IDs as a
 * fixed-size bitfield mapped through an immutable palette index.
 *
 * URL shape: ?v=1&f=<base64url>&h=<base64url>
 *
 * Each palette version is a frozen, ordered array of all active color IDs at
 * that point in time.  Bit position i maps to paletteIndex[i].
 *
 * When the dataset changes (new colors added / removed), create palette-v2.js
 * and register it here.  Old links (?v=1) still decode correctly against v1;
 * the next syncToURL() re-encodes against the current version.
 */

import { PALETTE_INDEX_V1 } from "../models/palette-v1.js";

// ── Version registry ────────────────────────────────────────────────
/** @type {Record<number, string[]>} */
const PALETTE_VERSIONS = {
  1: PALETTE_INDEX_V1,
};

/** The version used when *writing* new URLs. */
export const CURRENT_PALETTE_VERSION = 1;

// ── Pre-built reverse lookup for encoding (id → bit position) ───────
/** @type {Map<string, number>} */
const currentIndex = PALETTE_VERSIONS[CURRENT_PALETTE_VERSION];
const idToBit = new Map(currentIndex.map((id, i) => [id, i]));

// ── Base64-URL helpers (RFC 4648 §5) ────────────────────────────────

/** Encode Uint8Array → URL-safe Base64 (no padding). */
function toBase64URL(buffer) {
  const binStr = String.fromCharCode(...buffer);
  return btoa(binStr)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decode URL-safe Base64 string → Uint8Array. */
function fromBase64URL(str) {
  // Re-add padding
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binStr = atob(padded);
  const buf = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    buf[i] = binStr.charCodeAt(i);
  }
  return buf;
}

// ── Trailing-zero trimming ──────────────────────────────────────────
// When the selection is sparse the tail of the bitfield is all zeros.
// Trimming them before Base64 encoding shortens the URL significantly
// for typical (small) selections, while full selections stay ~288 chars.

/** Remove trailing 0x00 bytes from a Uint8Array. */
function trimTrailingZeros(buffer) {
  let end = buffer.length;
  while (end > 0 && buffer[end - 1] === 0) end--;
  return end === buffer.length ? buffer : buffer.slice(0, end);
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Encode a Set<string> of color IDs into a compact Base64-URL bitset.
 * IDs not present in the current palette index are silently skipped.
 *
 * @param {Set<string>|string[]} ids
 * @returns {string} Base64-URL encoded bitfield (empty string if nothing set)
 */
export function encodeBitset(ids) {
  if (!ids || (ids instanceof Set ? ids.size === 0 : ids.length === 0)) {
    return "";
  }

  const bytesNeeded = Math.ceil(currentIndex.length / 8);
  const buffer = new Uint8Array(bytesNeeded);

  for (const id of ids) {
    const bit = idToBit.get(id);
    if (bit === undefined) continue; // unknown ID — skip
    buffer[bit >> 3] |= 1 << (bit & 7);
  }

  const trimmed = trimTrailingZeros(buffer);
  return trimmed.length === 0 ? "" : toBase64URL(trimmed);
}

/**
 * Decode a Base64-URL bitset back to an array of color ID strings.
 *
 * @param {string} encoded - The Base64-URL bitfield
 * @param {number}  version - Palette version (determines which index to use)
 * @returns {string[]} Array of color IDs
 */
export function decodeBitset(encoded, version) {
  if (!encoded) return [];

  const paletteIndex = PALETTE_VERSIONS[version];
  if (!paletteIndex) {
    throw new Error(`Unknown palette version: ${version}`);
  }

  const buffer = fromBase64URL(encoded);
  const ids = [];

  for (let byteIdx = 0; byteIdx < buffer.length; byteIdx++) {
    if (buffer[byteIdx] === 0) continue; // fast skip empty bytes
    for (let bit = 0; bit < 8; bit++) {
      if (buffer[byteIdx] & (1 << bit)) {
        const pos = byteIdx * 8 + bit;
        if (pos < paletteIndex.length) {
          ids.push(paletteIndex[pos]);
        }
      }
    }
  }

  return ids;
}
