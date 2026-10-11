# Scholar Lens

Chrome (Manifest V3) extension for Google Scholar: authorship-role highlighting,
CCF / CORE / SJR venue badges, and a sidebar metrics panel. See `README.md` and
`docs/ARCHITECTURE.md`.

## Platform policy — Chrome first

Chrome is the primary and only fully supported target. Make feature, API and
UI/UX decisions for Chrome. **Never trade Chrome functionality or UX for Safari
(or any other browser's) compatibility** — no polyfills, shims or reduced
behaviour for another engine. Other Chromium browsers should simply work.

Safari lives in `contrib/safari/` as a best-effort wrapper generated from `src/`.
If a Chrome-first change breaks it, that is acceptable: note it, don't contort
the Chrome code.

## Layout and commands

- `src/` is the extension. No build step, no dependencies. Load it via
  `chrome://extensions` → Developer mode → Load unpacked → `src/`.
- `scripts/package-chrome.sh` → `dist/scholar-lens-chrome-<version>.zip`
  (`dist/` is git-ignored).
- `scripts/update-scholar-domains.sh` regenerates the Scholar domain lists in
  `src/manifest.json` — don't edit those lists by hand.
- There is no automated test suite yet.
