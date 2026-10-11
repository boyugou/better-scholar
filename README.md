# Scholar Lens

A **Chrome extension** that makes [Google Scholar](https://scholar.google.com)
profiles easier to read at a glance. It auto-detects the profile's author and
color-codes each paper by their authorship role, and badges venues with their
CCF rank — all from a compact control panel injected into the page sidebar.

**Chrome is the primary platform.** It is a standard Manifest V3 extension, so it
also runs in other Chromium browsers (Edge, Brave, …). Safari is
[best-effort only](contrib/safari/README.md). See [Platform policy](#platform-policy).

## Features

- **Automatic author detection** — open any Scholar profile and the author's
  papers are highlighted immediately; no setup, no manual entry.
- **Role color-coding** — each paper row is tinted by the author's position:
  first (blue), co-first (purple), second (amber), last/senior (green), with a
  matching legend in the panel. Two-author papers count the author as *last*
  (the senior position); truncated author lists are handled correctly.
- **CCF venue badges** — conferences and journals are badged A / B / C from the
  **official CCF 2026 (7th edition)** catalogue (386 conferences + 295 journals).
  Matching supports abbreviations and full names, strips noise like
  "Proceedings of the 45th …" / "第N届", and **excludes secondary tracks**
  (Findings, co-located Workshops, Demos) so an "ACL Findings" paper is not
  badged as ACL — while venues whose official name *is* a workshop (IWQoS,
  HotNets, …) are kept.
- **CORE / SJR badges** — optional conference-tier and journal-quartile badges.
- **Live metrics** — highlighted-vs-total Papers, Citations, h-index, i10-index
  over the current profile, with role / year filters and a show-only-highlighted
  toggle.
- **Works on search results** too, not just profiles.
- **Every Scholar domain** — `scholar.google.com` and all 186 country mirrors
  (`scholar.google.com.sg`, `scholar.google.co.uk`, …).

All controls live in the in-page **Author Highlighter** panel and persist across
visits. The toolbar popup is an at-a-glance status + color legend.

## Install

**Chrome** (also Edge — use `edge://extensions` — and other Chromium browsers):

1. Open `chrome://extensions` and enable **Developer mode** (top-right).
2. Click **Load unpacked** and select this repository's `src/` folder.
3. Open any [Google Scholar](https://scholar.google.com) author profile.

There is no build step and no dependencies: `src/` is loaded as-is.

To package for the Chrome Web Store:

```bash
scripts/package-chrome.sh
```

This writes `dist/scholar-lens-chrome-<version>.zip` with `manifest.json` at the
archive root, ready to upload to the Web Store developer dashboard.

## Platform policy

Chrome is the main line. Features, extension APIs and UI/UX are designed for
Chrome; compatibility with other browsers never constrains them.

| Browser | Status |
|---------|--------|
| **Chrome** | **Primary** — developed and checked here first. |
| Edge, Brave, other Chromium | Expected to work (same MV3 package); not regularly tested. |
| Safari (macOS) | **Best-effort / experimental.** Lives in [`contrib/safari`](contrib/safari/README.md); may lag behind or break as Chrome-first features land, with no support commitment. |

## Repository layout

```
src/                     Manifest V3 extension — the single source of truth
  manifest.json
  background.js          Venue resolution (CCF 2026 catalogue + matcher, CORE/SJR)
  content.js             Author detection, role highlighting, injected panel
  popup/                 Toolbar popup (status + legend)
  icons/
scripts/
  package-chrome.sh      src/ → dist/scholar-lens-chrome-<version>.zip
  update-scholar-domains.sh  Refresh the Scholar domain list in manifest.json
contrib/
  safari/                Best-effort Safari wrapper (generated from src/)
docs/
  ARCHITECTURE.md        How detection, role logic, and venue matching work
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how author detection,
role classification, and the CCF venue matcher work.

## License

Licensed under the [Apache License 2.0](LICENSE).
