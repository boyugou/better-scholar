# Scholar Lens

A browser extension that makes [Google Scholar](https://scholar.google.com)
profiles easier to read at a glance. It auto-detects the profile's author and
color-codes each paper by their authorship role, and badges venues with their
CCF rank — all from a compact control panel injected into the page sidebar.

Ships for **Safari** and **Chromium** browsers (Chrome, Edge, Brave, …) from a
single shared codebase.

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

## Repository layout

```
src/                     Shared Manifest V3 extension — the single source of truth
  manifest.json
  background.js          Venue resolution (CCF 2026 catalogue + matcher, CORE/SJR)
  content.js             Author detection, role highlighting, injected panel
  popup/                 Toolbar popup (status + legend)
  icons/
platforms/
  chrome/                How to load / package for Chromium browsers
  safari/                How to build the Safari app (generated from src/)
scripts/
  package-chrome.sh      src/ → dist/scholar-lens-chrome-<version>.zip
  build-safari.sh        Generate + build (+ install) the Safari app
  update-scholar-domains.sh  Refresh the Scholar domain list in manifest.json
docs/
  ARCHITECTURE.md        How detection, role logic, and venue matching work
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how author detection,
role classification, and the CCF venue matcher work.

The extension itself is the same standard MV3 code on every browser; only the
Safari native wrapper is platform-specific, and it is generated from `src/`
rather than committed.

## Quick start

**Chrome / Edge / Chromium** — `chrome://extensions` → Developer mode → Load
unpacked → select `src/`. See [`platforms/chrome`](platforms/chrome/README.md).

**Safari (macOS)** — `scripts/build-safari.sh --install`, then enable in
Safari → Settings → Extensions. See [`platforms/safari`](platforms/safari/README.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
