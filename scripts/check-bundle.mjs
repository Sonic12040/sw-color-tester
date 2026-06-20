// Bundle-size budget guard. Verifies the color dataset stays code-split out of
// the main client entry (so app-code parse/caching isn't dragged down by the
// ~1.3 MB data chunk). Run after `npm run build:client`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = resolve(root, "dist", "assets");

// Budgets (raw, uncompressed KiB).
const MAX_ENTRY_KIB = 600; // main app entry (React + app code), data excluded
const MIN_DATA_KIB = 500; // the split-out color dataset chunk

const kib = (file) => statSync(resolve(assets, file)).size / 1024;

const html = readFileSync(resolve(root, "dist", "index.html"), "utf8");
const entryMatch = html.match(/assets\/(index-[A-Za-z0-9-]+\.js)/);
if (!entryMatch) {
  console.error("check-bundle: could not find the entry chunk in index.html");
  process.exit(1);
}
const entry = entryMatch[1];
const files = readdirSync(assets);
const dataChunk = files.find((f) => /^color-data-.*\.js$/.test(f));

const entryKib = kib(entry);
const dataKib = dataChunk ? kib(dataChunk) : 0;

const problems = [];
if (!dataChunk) {
  problems.push("color dataset is NOT code-split (no color-data chunk found)");
} else if (dataKib < MIN_DATA_KIB) {
  problems.push(
    `color-data chunk ${dataKib.toFixed(0)} KiB < ${MIN_DATA_KIB} KiB — is the data still split out?`,
  );
}
if (entryKib > MAX_ENTRY_KIB) {
  problems.push(
    `entry ${entry} is ${entryKib.toFixed(0)} KiB > ${MAX_ENTRY_KIB} KiB budget — did the dataset leak into the main bundle?`,
  );
}

console.log(
  `bundle: entry ${entry} ${entryKib.toFixed(0)} KiB · data ${dataChunk ?? "—"} ${dataKib.toFixed(0)} KiB`,
);

if (problems.length) {
  for (const p of problems) console.error(`check-bundle: ${p}`);
  process.exit(1);
}
console.log("check-bundle: OK");
