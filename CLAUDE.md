# Byline

Chrome (Manifest V3) extension for Google Scholar profiles: authorship roles × CCF / CORE
venue tiers, as row colours, venue chips and a role × tier summary. See `README.md` and
`docs/ARCHITECTURE.md`.

## Platform policy — Chrome first

Chrome is the primary and only fully supported target. Make feature, API and UI/UX decisions
for Chrome. **Never trade Chrome functionality or UX for Safari (or any other browser's)
compatibility** — no polyfills, shims or reduced behaviour for another engine. Other Chromium
browsers should simply work.

Safari lives in `contrib/safari/` as a best-effort wrapper generated from `src/`. If a
Chrome-first change breaks it, that is acceptable: note it, don't contort the Chrome code.

## Principles

- **Precision over recall in venue matching.** A missing badge is fine; a wrong one is not. No
  substring/fuzzy fallbacks. Every result carries the rule that produced it.
- **Develop against real data.** The matcher and name logic are tuned on real Scholar strings
  (`test/fixtures`). When changing them, run `npm test`, *review* any snapshot diff in
  `test/venues.test.js`, and only then `npm run test:update`. Add new real strings to the corpora.
- Tiers are the current lists, not the tier at publication — keep saying so in the UI.
- No network access beyond the user-triggered read of a paper's page on Scholar itself. No
  analytics, no remote code, no new permissions without a very good reason.
- Keep `lib/` pure (no DOM, no `chrome.*`) so it stays unit-testable in Node.

## Layout and commands

- `src/` is the extension. No build step, no dependencies. Load it via `chrome://extensions` →
  Developer mode → Load unpacked → `src/`.
- `npm test` — unit tests (`node --test`, no dependencies).
- `npm run test:e2e` — loads the extension in Chromium (Playwright's bundled build; branded Chrome
  ≥137 ignores `--load-extension`) against `test/e2e/fixture-server.js`.
- `npm run data` — regenerate `src/data/{ccf,core}.js` from `data/*.json` (a test fails if stale).
  `data/ccf-2026.json` comes from the CCF PDF via `scripts/ccf/` (see `data/README.md`);
  `data/core-2026.json` from the ICORE export via `scripts/core/build-core.mjs`.
- `src/data/aliases.js` is hand-curated: names Scholar prints that differ from the official titles.
  Every alias must point at a real dataset row (tested).
- `scripts/package-chrome.sh` → `dist/byline-chrome-<version>.zip` (`dist/` is git-ignored).
- `scripts/update-scholar-domains.sh` regenerates the Scholar domain list in `src/manifest.json` —
  don't edit that list by hand.
- User-visible strings live in `src/_locales/{en,zh_CN}/messages.json`; keep both in sync (tested).
