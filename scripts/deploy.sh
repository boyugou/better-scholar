#!/usr/bin/env bash
# Build the site and publish it to the gh-pages branch (GitHub Pages: Settings → Pages → Deploy from a branch → gh-pages / root).
# No CI needed: run this on your machine. The branch holds only the built site.
# The build reads the extension's repository (EXT_DIR, default ../google-scholar-highlighter): the hero picture, the demo of the real settings page
# and the export samples come from it, so run this where that checkout exists and is at the commit the site should show. build.mjs and
# verify.mjs (below) stop the deploy when it is missing, when the demo is incomplete or when a real person's name is anywhere in the build.
#   scripts/deploy.sh            build, verify, commit and push gh-pages
#   scripts/deploy.sh --dry-run  build and verify only
set -euo pipefail
cd "$(dirname "$0")/.."
node build.mjs
node scripts/verify.mjs
[ "${1:-}" = "--dry-run" ] && exit 0

REMOTE="${REMOTE:-origin}"
TMP="$(mktemp -d)"
trap 'git worktree remove --force "$TMP" 2>/dev/null || true; rm -rf "$TMP"' EXIT
if git ls-remote --exit-code --heads "$REMOTE" gh-pages >/dev/null 2>&1; then
  git fetch -q "$REMOTE" gh-pages
  git worktree add -q --detach "$TMP" "$REMOTE/gh-pages"
else
  git worktree add -q --detach "$TMP"
  (cd "$TMP" && git checkout -q --orphan gh-pages && git rm -rfq . 2>/dev/null || true)
fi
# replace the branch's content with the fresh build
(cd "$TMP" && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +)
cp -R _site/. "$TMP"/
cd "$TMP"
git add -A
if git diff --cached --quiet; then echo "gh-pages is already up to date"; exit 0; fi
git commit -q -m "Site: $(git -C "$OLDPWD" log -1 --format=%h) $(date +%Y-%m-%d)"
git push -q "$REMOTE" HEAD:gh-pages
echo "published to $REMOTE/gh-pages"
