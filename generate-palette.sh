#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────
# generate-palette.sh — Generate a new versioned palette index from
# constants.js and wire it into bitset-codec.js + service-worker.js
#
# Usage:
#   ./generate-palette.sh <version>
#
# Example:
#   ./generate-palette.sh 2
#
# What it does:
#   1. Extracts active color IDs (not archived, not ignored) from
#      constants.js, sorted numerically ascending.
#   2. Writes models/palette-v<N>.js with the immutable index array.
#   3. Adds the import + version registration to utils/bitset-codec.js
#      and bumps CURRENT_PALETTE_VERSION.
#   4. Adds the new file to service-worker.js STATIC_ASSETS.
# ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

VERSION="${1:-}"
if [[ -z "$VERSION" || ! "$VERSION" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 <version>"
  echo "  version: positive integer (e.g. 2)"
  exit 1
fi

PALETTE_FILE="$PROJECT_ROOT/models/palette-v${VERSION}.js"
CODEC_FILE="$PROJECT_ROOT/utils/bitset-codec.js"
SW_FILE="$PROJECT_ROOT/service-worker.js"
CONSTANTS_FILE="$PROJECT_ROOT/constants.js"

# ── Guard: don't overwrite an existing palette ───────────────────────
if [[ -f "$PALETTE_FILE" ]]; then
  echo "Error: $PALETTE_FILE already exists. Refusing to overwrite."
  exit 1
fi

# ── Step 1: Extract active color IDs via Node.js ────────────────────
echo "Extracting active IDs from constants.js..."

IDS_JSON=$(node --input-type=module -e "
import { colorData } from '${CONSTANTS_FILE}';
const active = colorData
  .filter(c => !c.archived && !c.ignore)
  .map(c => c.id)
  .sort((a, b) => Number(a) - Number(b));
process.stdout.write(JSON.stringify(active));
")

COUNT=$(node -e "console.log(JSON.parse(process.argv[1]).length)" "$IDS_JSON")
echo "  Found $COUNT active colors."

# ── Step 2: Generate the palette file ────────────────────────────────
echo "Writing $PALETTE_FILE..."

EXPORT_NAME="PALETTE_INDEX_V${VERSION}"

node -e "
const ids = JSON.parse(process.argv[1]);
const version = process.argv[2];
const exportName = 'PALETTE_INDEX_V' + version;

const lines = [];
lines.push('/**');
lines.push(' * Immutable palette index v' + version + ' \u2014 maps bit-position to color ID.');
lines.push(' * Generated from constants.js active colors (not archived, not ignored),');
lines.push(' * sorted by numeric ID ascending.');
lines.push(' *');
lines.push(' * NEVER reorder, remove, or insert entries. When the dataset changes,');
lines.push(' * create palette-v' + (Number(version) + 1) + '.js with the updated list and bump CURRENT_PALETTE_VERSION.');
lines.push(' *');
lines.push(' * @readonly');
lines.push(' * @type {string[]}');
lines.push(' */');
lines.push('// prettier-ignore');
lines.push('export const ' + exportName + ' = [');

const COLS = 10;
for (let i = 0; i < ids.length; i += COLS) {
  const chunk = ids.slice(i, i + COLS);
  const row = chunk.map(id => JSON.stringify(id)).join(', ');
  const isLast = i + COLS >= ids.length;
  lines.push('  ' + row + (isLast ? '' : ','));
}
lines.push('];');
lines.push('');

process.stdout.write(lines.join('\n'));
" "$IDS_JSON" "$VERSION" > "$PALETTE_FILE"

echo "  Wrote $EXPORT_NAME ($COUNT entries)."

# ── Step 3: Update bitset-codec.js ──────────────────────────────────
echo "Updating $CODEC_FILE..."

# 3a. Add import line after the last palette import
LAST_IMPORT=$(grep -n 'import.*palette-v' "$CODEC_FILE" | tail -1 | cut -d: -f1)
NEW_IMPORT="import { ${EXPORT_NAME} } from \"../models/palette-v${VERSION}.js\";"

# Check if this import already exists
if grep -qF "$EXPORT_NAME" "$CODEC_FILE"; then
  echo "  Import for $EXPORT_NAME already exists, skipping."
else
  sed -i '' "${LAST_IMPORT}a\\
${NEW_IMPORT}
" "$CODEC_FILE"
  echo "  Added import for $EXPORT_NAME."
fi

# 3b. Add version entry to PALETTE_VERSIONS
PREV_VERSION=$((VERSION - 1))
PREV_ENTRY="${PREV_VERSION}: PALETTE_INDEX_V${PREV_VERSION},"
NEW_ENTRY="  ${VERSION}: ${EXPORT_NAME},"

if grep -qF "${VERSION}: ${EXPORT_NAME}" "$CODEC_FILE"; then
  echo "  Version ${VERSION} already registered, skipping."
else
  sed -i '' "s|${PREV_ENTRY}|${PREV_ENTRY}\\
${NEW_ENTRY}|" "$CODEC_FILE"
  echo "  Registered version ${VERSION} in PALETTE_VERSIONS."
fi

# 3c. Bump CURRENT_PALETTE_VERSION
sed -i '' "s|export const CURRENT_PALETTE_VERSION = ${PREV_VERSION};|export const CURRENT_PALETTE_VERSION = ${VERSION};|" "$CODEC_FILE"
echo "  Bumped CURRENT_PALETTE_VERSION to ${VERSION}."

# ── Step 4: Update service-worker.js STATIC_ASSETS ──────────────────
echo "Updating $SW_FILE..."

PREV_PALETTE_ENTRY="palette-v${PREV_VERSION}.js"
NEW_SW_LINE="  \`\${BASE_PATH}/models/palette-v${VERSION}.js\`,"

if grep -qF "palette-v${VERSION}.js" "$SW_FILE"; then
  echo "  palette-v${VERSION}.js already in STATIC_ASSETS, skipping."
else
  sed -i '' "/${PREV_PALETTE_ENTRY}/a\\
${NEW_SW_LINE}
" "$SW_FILE"
  echo "  Added palette-v${VERSION}.js to STATIC_ASSETS."
fi

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo "Done! Generated palette v${VERSION} with ${COUNT} colors."
echo ""
echo "Next steps:"
echo "  1. Review the generated file:  models/palette-v${VERSION}.js"
echo "  2. Review codec changes:       utils/bitset-codec.js"
echo "  3. Review service worker:      service-worker.js"
echo "  4. Bump APP_VERSION in:        version.js"
echo "  5. Test the app in the browser"
