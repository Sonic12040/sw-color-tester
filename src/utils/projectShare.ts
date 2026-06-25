/**
 * Shareable Project link (E18.2) — encode a whole structured Project into a URL
 * param so a designer can hand off a job (rooms → surfaces → progress), not just
 * a flat color list (`?c=`). The payload is gzip-compressed (so realistic
 * projects fit) and base64url-encoded (URL-safe, no `%` escaping). Above a size
 * threshold `encodeProjectParam` returns `null` so the caller can fall back to
 * "export a file instead" — there is **no server**, the link carries everything.
 *
 * Reuses the file envelope (`serializeProject`) + `normalizeProject`, so a
 * decoded link is validated exactly like an imported file or stored data.
 */

import {
  normalizeProject,
  type PaletteProject,
} from "../domain/paletteData.js";
import { serializeProject } from "./projectFile.js";

/**
 * Practical ceiling for the encoded param. URLs stay reliable well past this, but
 * beyond it we steer users to a file (the AC's explicit fallback). ~16k of
 * base64 ≈ a large multi-room project after compression.
 */
export const MAX_SHARE_PARAM_LENGTH = 16_000;

/** Drain a Web stream of `Uint8Array` chunks into one buffer. */
async function readAll(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Pipe bytes through a (De)CompressionStream and collect the result. Writes via
 * the stream's writer rather than `Blob.stream()` so it works under jsdom (whose
 * Blob has no `.stream()`). Reading starts before the write to avoid backpressure
 * stalling on larger payloads.
 */
async function pipe(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const collected = readAll(transform.readable as ReadableStream<Uint8Array>);
  const writer = transform.writable.getWriter();
  // On bad input both sides error; swallow the write rejection here (it also
  // surfaces on `collected`) so it never becomes an unhandled rejection.
  const pump = (async () => {
    await writer.write(bytes as unknown as BufferSource);
    await writer.close();
  })().catch(() => {});
  const [out] = await Promise.all([collected, pump]);
  return out;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Encode a project to a compressed, URL-safe param. Returns `null` when the
 * result exceeds `MAX_SHARE_PARAM_LENGTH` (caller should offer a file export).
 */
export async function encodeProjectParam(
  project: PaletteProject,
): Promise<string | null> {
  const json = JSON.stringify(serializeProject(project));
  const compressed = await pipe(
    new TextEncoder().encode(json),
    new CompressionStream("gzip"),
  );
  const param = bytesToBase64url(compressed);
  return param.length > MAX_SHARE_PARAM_LENGTH ? null : param;
}

/**
 * Decode a project-link param back into a validated project, or `null` on any
 * malformed / non-project input (never throws).
 */
export async function decodeProjectParam(
  param: string,
): Promise<PaletteProject | null> {
  try {
    const decompressed = await pipe(
      base64urlToBytes(param),
      new DecompressionStream("gzip"),
    );
    const raw = JSON.parse(new TextDecoder().decode(decompressed)) as unknown;
    const file = raw as { kind?: unknown; project?: unknown };
    // Accept the file envelope or a bare project (mirrors parseProjectFile).
    const projectRaw =
      file && typeof file === "object" && "project" in file
        ? file.project
        : raw;
    return normalizeProject(projectRaw);
  } catch {
    return null;
  }
}
