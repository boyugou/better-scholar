#!/usr/bin/env bash
#
# Package the extension in src/ into a Chrome Web Store zip.
# The same src/ folder also loads directly as an unpacked extension in Chrome
# (chrome://extensions → Developer mode → Load unpacked → select src/).
#
# Usage: scripts/package-chrome.sh
# Output: dist/scholar-lens-chrome-<version>.zip
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
DIST="$ROOT/dist"
VERSION="$(grep -o '"version"[^,]*' "$SRC/manifest.json" | head -1 | grep -o '[0-9][0-9.]*')"
OUT="$DIST/scholar-lens-chrome-${VERSION}.zip"

mkdir -p "$DIST"
rm -f "$OUT"

# Zip the contents of src/ at the archive root (manifest.json must be top-level).
( cd "$SRC" && zip -r -q "$OUT" . -x '.*' )

echo "Built $OUT"
unzip -l "$OUT" | tail -n +2 | head -20
