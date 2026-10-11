#!/usr/bin/env bash
#
# Package the extension in src/ into a zip for the Chrome Web Store / Edge Add-ons,
# or for sharing as a GitHub release asset (unzip → chrome://extensions → Load unpacked).
# The same src/ folder also loads directly as an unpacked extension.
#
# Usage: scripts/package-chrome.sh
# Output: dist/byline-chrome-<version>.zip
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
DIST="$ROOT/dist"
VERSION="$(grep -o '"version"[^,]*' "$SRC/manifest.json" | head -1 | grep -o '[0-9][0-9.]*')"
OUT="$DIST/byline-chrome-${VERSION}.zip"

# the bundled ranking data must match data/*.json
node "$ROOT/scripts/build-data.mjs" --check

mkdir -p "$DIST"
rm -f "$OUT"

# Zip the contents of src/ at the archive root (manifest.json must be top-level).
( cd "$SRC" && zip -r -q "$OUT" . -x '.*' '*/.*' )

echo "Built $OUT"
unzip -l "$OUT" | tail -n +2 | head -40
