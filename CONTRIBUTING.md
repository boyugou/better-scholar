# Contributing

Thanks for helping. The extension has no runtime dependencies and no build step; everything below
runs with Node ≥ 20.

```bash
npm test            # unit tests (names, venues, marks, awards, metrics, package checks)
npm run test:e2e    # loads the extension in Chromium against a local Scholar stand-in (needs Playwright)
npm run data        # rebuild src/data/*.js from data/*.json
npm run check:profile -- page.html   # the extension on a real saved Scholar page (see below)
```

## The one principle: precision over recall

A missing badge is fine; a wrong one is not. The venue matcher has no fuzzy or substring fallback, every
result carries the rule that produced it, and ambiguity means no badge. If a change makes it guess more,
it is the wrong change.

## Reporting a venue or a role

Open an issue from the panel's **Report** link (it pre-fills the venue strings) or use the issue
templates. The venue text exactly as Scholar prints it is what matters; please leave names and profile
links out.

## Fixing the matcher with real strings

1. Add the strings Scholar really printed to a corpus in `test/fixtures/venues.json` (venue strings only).
2. Fix the matcher or add a curated alias in `src/data/aliases.js` (every alias must point at a real
   dataset row — tested).
3. `npm test` will fail on the venue snapshot. **Read the diff** — every changed line is a badge that
   appeared, moved or vanished — and only then run `npm run test:update`.
4. Add a targeted regression test in `test/venues.test.js` for the bug you fixed.

## When Scholar changes its markup

The panel shows a layout warning when most rows have no author line. To see exactly what broke, save a
profile page (Chrome: File → Save Page As → "Webpage, HTML Only") and run

```bash
npm run check:profile -- page.html [--owner "Name"] [--shot out.png]
```

It loads the unmodified extension in Chromium, serves that file offline as a Scholar profile, and
checks that every selector in `src/content/scholar.js` still exists and that the row tints, rank chips
and award marks it drew equal the pure libraries' result for an independent reading of the same HTML.
Nothing is fetched or sent. (Needs Playwright and Chromium, like the end-to-end test.)

## Data

The rank lists are generated from `data/*.json` (see `data/README.md` for provenance and how the CCF
PDF is extracted). Edit those, never `src/data/ccf.js` / `core.js` / `awards.js` by hand — a test fails
when they are stale. `data/awards-2026.json` entries need an official source URL and a quoted snippet
that contains the title (`scripts/awards/merge-raw.mjs` checks this).

### Adding an award source

1. Find the organisation's *own* page (the conference series, society or steering committee; never a
   news item, Wikipedia or an aggregator) that lists winners with the paper's title and authors. A page
   behind a bot check or a CAPTCHA is skipped, not worked around; record it in `docs/ROADMAP.md`.
2. Save the page, then add a reader to `scripts/awards/tot.mjs` and register its mode in the dispatch and
   `PAGES` tables. A PDF is first turned into text with `swift scripts/awards/pdf-text.swift file.pdf > file.txt`
   (macOS PDFKit); the reader takes that text. Readers refuse what they do not recognise: a heading that
   names the year, authors that are all person names, a line that is a title and not an author list.
3. Run `node scripts/awards/tot.mjs <mode> <saved-file> <page-address> > raw.json` and read every entry
   against the page. The command also drops any entry whose conference the page never mentions.
4. Add a synthetic-page test in `test/awards-sources.test.js`, the page's host to
   `test/fixtures/award-source-hosts.json`, then `node scripts/awards/merge-raw.mjs raw.json --write`,
   `npm run data` and `node scripts/awards/coverage.mjs` (its output is the *Entries* row of `data/README.md`).
5. A title the page misprints goes in `data/exclusions.json` under `correct`; update `data/README.md`,
   `README.md`, the changelog and the version, and run `npm test` and `npm run test:e2e`.

## Chrome first

Features, APIs and UI are designed for Chrome; Edge and other Chromium browsers should simply work.
Safari lives in `contrib/safari` as a best-effort wrapper and must never constrain the Chrome code.

## Conventions

- `src/lib/` is pure (no DOM, no `chrome.*`) so it stays unit-testable in Node.
- Everything the extension adds to Scholar's DOM is prefixed `rr-`; the shared namespace is
  `globalThis.RolesRanks`.
- User-visible strings live in `src/_locales/{en,zh_CN}/messages.json`; keep both in sync (tested).
- Plain, descriptive names — no coined words.
