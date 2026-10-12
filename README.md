# Scholar Author Roles & Venue Ranks

**See who led each paper — and how its venue ranks.** A Chrome extension that
reads a [Google Scholar](https://scholar.google.com) profile and shows, for every
paper, the author's role (first / second / last…) and the venue's **CCF** and
**CORE** rank — then adds them up: *"first-author CCF-A papers: 4"*.

[![test](https://github.com/boyugou/scholar-author-roles-and-venue-ranks/actions/workflows/test.yml/badge.svg)](https://github.com/boyugou/scholar-author-roles-and-venue-ranks/actions/workflows/test.yml)

[简体中文](README.zh-CN.md)

<p align="center"><img src="docs/screenshot.png" width="900" alt="A Google Scholar profile with role colours, CCF / CORE rank chips, award chips and the role × rank summary panel"></p>
<p align="center"><sub>A fictional profile (real venue names, invented papers): rows tinted by author role, CCF / CORE chips on the venue line, the role × rank summary on the right.</sub></p>

- **Role × rank summary** — a small matrix in the page: first / co-first / second /
  last × CCF A / B / C / unranked (switch to CORE A\* / A / B / C). Click a cell to
  list exactly those papers. *Copy summary* and *Copy as table* put it on the
  clipboard for a CV or an application form.
- **Role colours on every paper** — each row is tinted by the author's position
  (blue first, purple co-first, amber second, green last) with a small tag; matching
  venue chips (`CCF A`, `CORE A*`) sit on the venue line. Hover a chip to see which
  venue it matched, by which rule, and the list edition.
- **Accurate, explainable venue matching** — built against real Scholar data, not
  guesses. Conferences and journals are matched separately; truncated names
  (`…on Computer Vision and Pattern …`), `ISCA 2014 42 (3)`, `[arXiv…]` annotations,
  `Findings`/workshop/demo tracks are all handled. When a venue is not recognised the
  panel lists it instead of guessing.
- **Awards and talk levels, as the authors wrote them** — if a paper's title or venue text says
  *Oral*, *Spotlight*, *Highlight* or *Best / Outstanding / Distinguished Paper*, it gets a small chip
  (awards in gold with a ★) and the panel counts them; click a count to list just those papers. Only
  what the author wrote is read — nothing is looked up, and the tooltip says "not checked".
- **Hidden senior-author roles** — Scholar cuts long author lists with `…`, which
  hides the last author on large papers (on one well-known PI's profile, 30 of the
  first 100 papers). **Resolve** reads those papers' own pages (about one a second,
  only when you click) and fills the roles in.
- **Metrics** for the highlighted papers (papers, citations, h-index, i10), year
  range, "only highlighted", optional name marking, **Load all** to expand the list.
- **Private by design** — no accounts, no analytics, no third-party requests. The
  rankings are bundled in the extension. Settings sync through your Chrome account.
  See [`PRIVACY.md`](PRIVACY.md).
- **Easy to correct** — a venue that has no rank? *Report* in the panel opens a pre-filled issue with the
  venue text (and *Copy list* copies it); see [`CONTRIBUTING.md`](CONTRIBUTING.md).

It works on **profile pages** (`scholar.google.com/citations?user=…`) on every
Scholar domain. English and 简体中文 UI.

## Install

**Chrome** (also Edge and other Chromium browsers):

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this repository's `src/` folder.
3. Open a Google Scholar author profile.

No build step, no dependencies. To make a zip (for sharing, or a store upload):

```bash
scripts/package-chrome.sh      # → dist/scholar-author-roles-and-venue-ranks-chrome-<version>.zip
```

## What it can and cannot know

- **Ranks are today's, not the rank at publication time.** A 2009 paper in a venue
  that is CCF-A now shows `CCF A`. CCF also states that its list is *not a basis for
  academic evaluation*, and counts only full papers at conferences — the extension excludes
  Findings, workshops, demos, posters and similar tracks, but cannot tell a short
  paper from a full one in Scholar's text.
- **Roles come from Scholar's author text.** Initials are matched flexibly
  (`GE Hinton` = `Geoffrey Hinton`; `Jane` ≠ `John`), but two different people can
  collide on `W Wang`. Co-first marks (†, ∗ …) are honoured when present — Scholar
  rarely preserves them. If a profile's name is spelled differently from its papers,
  use **Add a spelling** in the panel.
- **Awards and talk levels are only what authors wrote.** Scholar's text rarely carries them (none in
  400 rows on four real profiles), so expect few chips; look-alikes such as *Oral Oncology* or
  *Spotlight on …* are never marked, and a paper the author did not annotate simply has none.
- **Venue strings are messy.** What Scholar prints is owner-editable and often
  truncated. Anything unrecognised is listed ("papers at venues without a rank") so you
  can see what is missing; there is no fuzzy guessing.
- **Resolve** talks to Google Scholar (the paper's own page, same-origin, throttled,
  cached). Google may show a CAPTCHA after heavy use; it stops at the first sign of
  one and tells you.
- Search-result pages are not supported: they carry neither the profile owner nor
  complete venue names.

## Data

| Dataset | Edition | Source |
|---|---|---|
| CCF recommended venues | 2026 (7th edition), 386 conferences + 295 journals | [ccf.org.cn](https://www.ccf.org.cn/Academic_Evaluation/By_category/) PDF, extracted reproducibly — see [`data/README.md`](data/README.md) |
| CORE conference ranks | ICORE 2026, 800 ranked conferences | [portal.core.edu.au](https://portal.core.edu.au/conf-ranks/) export |
| Paper awards | 434 main-conference awards (ACL family, ICLR, NeurIPS, ICML, CVPR 2025, ECCV 2024; not exhaustive) | [ACL Anthology](https://aclanthology.org) metadata (CC BY 4.0) and each conference's own awards pages — every entry cites its page; see [`data/README.md`](data/README.md) |

The rank lists are included for reference and are the property of their owners — see
[`NOTICE`](NOTICE). Regenerate with `npm run data`.

## Development

Contributions welcome — [`CONTRIBUTING.md`](CONTRIBUTING.md) explains how to fix a venue with real strings.

```bash
npm test            # unit tests: names, venues (real-profile corpora), metrics, package checks
npm run test:e2e    # loads the extension into Chromium against a local Scholar stand-in
npm run data        # rebuild src/data/*.js from data/*.json
```

The e2e test needs Playwright and a Chromium build (branded Chrome ≥137 ignores
`--load-extension`); see the header of [`test/e2e/run.mjs`](test/e2e/run.mjs).
Architecture and the matching rules: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Platform policy

Chrome is the main line. Features, extension APIs and UI/UX are designed for Chrome;
compatibility with other browsers never constrains them.

| Browser | Status |
|---------|--------|
| **Chrome** | **Primary** — developed and checked here first. |
| Edge, Brave, other Chromium | Expected to work (same MV3 package); not regularly tested. |
| Safari (macOS) | **Best-effort / experimental.** Lives in [`contrib/safari`](contrib/safari/README.md); may lag behind or break, with no support commitment. |

## Repository layout

```
src/                     the extension — load this folder in Chrome
  manifest.json          MV3, permission: storage only; content script on /citations* pages
  lib/                   pure logic: names, venues (matcher), metrics, analysis
  content/               Scholar adapter, panel UI, detail-page reader, styles
  data/                  bundled rankings (generated) and curated venue aliases
  popup/                 toolbar popup (the same summary for the active tab)
  _locales/              English, 简体中文
data/                    ranking datasets + provenance (source of src/data/*.js)
scripts/                 data builders (CCF PDF, ICORE), packaging, icon renderer
test/                    unit tests, real-profile fixtures, end-to-end test
contrib/safari/          best-effort Safari wrapper
docs/                    architecture
```

## License

Licensed under the [Apache License 2.0](LICENSE). Ranking data is excluded — see [`NOTICE`](NOTICE).
