# Chrome / Edge / Chromium

The extension in [`../../src`](../../src) is a standard Manifest V3 extension and
runs in any Chromium browser without modification.

## Load it unpacked (development)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the repository's `src/` folder.
4. Open any [Google Scholar](https://scholar.google.com) author profile.

## Package for the Chrome Web Store

```bash
scripts/package-chrome.sh
```

This writes `dist/scholar-lens-chrome-<version>.zip` with `manifest.json` at the
archive root, ready to upload to the Web Store developer dashboard.
