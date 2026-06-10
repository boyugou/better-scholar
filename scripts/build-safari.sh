#!/usr/bin/env bash
#
# Build the Safari (macOS) app that wraps the shared extension in src/.
#
# Safari ships web extensions inside a native app. This script generates that
# wrapper from src/ with Apple's `safari-web-extension-converter`, builds it
# with xcodebuild, and (optionally) installs it to /Applications. The generated
# Xcode project lives under platforms/safari/.generated (git-ignored) and is
# recreated from src/ on every run, so it never drifts from the source.
#
# Requirements: macOS with Xcode + command-line tools.
# Usage:
#   scripts/build-safari.sh           # generate + build
#   scripts/build-safari.sh --install # also copy the .app to /Applications
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
GEN="$ROOT/platforms/safari/.generated"
APP_NAME="Scholar Lens"
BUNDLE_ID="com.boyugou.Scholar-Lens"   # maintainer default; change for your own signing

INSTALL=0
[ "${1:-}" = "--install" ] && INSTALL=1

echo "==> Generating Safari wrapper from src/ …"
rm -rf "$GEN"
mkdir -p "$GEN"
xcrun safari-web-extension-converter "$SRC" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" \
  --project-location "$GEN" \
  --macos-only --copy-resources --no-open --no-prompt --force

PROJ="$GEN/$APP_NAME/$APP_NAME.xcodeproj"

echo "==> Building (Debug, ad-hoc signed) …"
xcodebuild -project "$PROJ" -scheme "$APP_NAME" -configuration Debug \
  CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=YES CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM="" 2>&1 | tail -3

APP="$(find "$HOME/Library/Developer/Xcode/DerivedData" -path "*Build/Products/Debug/$APP_NAME.app" -maxdepth 6 2>/dev/null | head -1)"
echo "==> Built: $APP"

if [ "$INSTALL" = "1" ] && [ -n "$APP" ]; then
  rm -rf "/Applications/$APP_NAME.app"
  cp -Rf "$APP" /Applications/
  echo "==> Installed to /Applications/$APP_NAME.app"
  echo "    Enable it in Safari → Settings → Extensions."
  echo "    (Unsigned local builds also need Safari → Develop → Allow Unsigned Extensions.)"
fi
