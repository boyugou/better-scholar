# Contributing

Thanks for helping. The extension has no runtime dependencies and no build step; everything below
runs with Node ≥ 20. The end-to-end test, the saved-page check and the accessibility audit also need
Playwright and a Chromium build (Playwright's own; branded Chrome 137 and later ignores `--load-extension`).

```bash
npm test                              # the unit tests (names, venues, marks, awards, metrics, formats, query, prefs, agent, i18n, package checks)
npm run test:e2e                      # the end-to-end checks: the real extension in Chromium against a local Scholar stand-in
npm run build:demo                    # dist/demo/: the settings page as a static folder for the website (see docs/ARCHITECTURE.md, The web demo)
npm run test:demo                     # the web demo's checks: that folder in a plain Chromium page, no extension
npm run test:update                   # rewrite the venue snapshot, after reviewing its diff (see below)
npm run data                          # rebuild src/data/{ccf,core,awards}.js from data/*.json
npm run check:profile -- page.html    # the extension on a real saved Scholar page (see below)
node scripts/axe-audit.mjs            # axe-core over the panel, the settings page and the popup (see below)
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

## Adding a setting

The settings are one table, `SETTINGS` in `src/lib/prefs.js`. Defaults, validation (`normalize`), patches
(`apply`: the presets, the configuration editor, *Import file*) and the guide for AI agents (`lib/agent.js`) are
all derived from it, so a setting is added in one place:

1. **A row in `SETTINGS`**: `bool(path, default, doc)`, `choice(path, values, default, doc)`, `color(path, doc)`
   or `language(path, none, doc)`. The path is where the value lives in the stored record (`panel.years` is
   `{ panel: { years } }`); the doc is the line the agent guide shows. Put it next to its group: the groups
   `roles`, `ranks`, `marks`, `hide`, `panel` and `copy` (`ROLES`, `PANEL_PARTS`, `COPY_BUTTONS` …) are read from
   the table, so a new `panel.<part>` or `copy.<format>` row joins its group by itself.
2. **Its effect**: read `prefs.<path>` where it acts (`content/main.js`, `content/panel.js`, the popup). A new
   panel part needs its section hidden in `panel.update()`; a new copy format needs its text in
   `lib/formats.js`, its case in `exportText()` (`content/main.js`) and its label in `COPY_LABEL`
   (`content/dom.js`).
3. **Its control on the settings page** (`src/options/options.js`), carrying `data-pref="<path>"`:
   `option()` for a switch, `segmented()` for a choice, `languageSelect()` for a language. The end-to-end check
   "every setting has its control on the settings page" (in `test/e2e/run.mjs`) fails when a setting has no
   control or a control names no setting.
4. **Its words in every language**: the label and the hint go into all 30 `src/_locales/*/messages.json`.
   `test/i18n.test.js` fails when a folder lacks a key of the English one, and `test/extension.test.js` when the
   code asks for a string English lacks or English holds a string nothing uses.
5. **The preview**, when it changes what a page draws: `renderPreview()` and `panelModel()` in `options.js` run the
   real panel and chips.
6. **An end-to-end check** of what it does, and a decision on the presets (`PRESETS`: a preset changes only what
   it names; `test/prefs.test.js` keeps every preset a valid patch).

A setting that sends anything over the network must be off by default, no preset may switch it on, and
`PRIVACY.md` must say what it sends and where.

## When Scholar changes its markup

The panel shows a layout warning when most rows have no author line. To see exactly what broke, save a
profile page (Chrome: File → Save Page As → "Webpage, HTML Only") and run

```bash
npm run check:profile -- page.html [--owner "Name"] [--shot out.png]
```

It loads the unmodified extension in Chromium, serves that file offline as a Scholar profile, and
checks that every selector in `src/content/scholar.js` still exists and that the row tints, rank chips
and award marks it drew equal the pure libraries' result for an independent reading of the same HTML.
Nothing is fetched or sent.

To check the live site instead, paste `scripts/check-scholar-markup.js` into the DevTools console of a real
profile page and of a paper's own page ("View article"): it counts every Scholar class and id the extension
reads or hides (rows, author and venue lines, the *Show more* button, the sidebar blocks, the paper page's
field table) and names the ones that are gone. A test keeps that list equal to what the source uses.

## Data

The rank lists are generated from `data/*.json` (see `data/README.md` for provenance and how the CCF
PDF is extracted). Edit those, never `src/data/ccf.js` / `core.js` / `awards.js` by hand — a test fails
when they are stale. `data/awards-2026.json` entries need an official source URL and a quoted snippet
that contains the title (`scripts/awards/merge-raw.mjs` checks this).

Rank data is checked against its official sources every Monday (`.github/workflows/data-fresh.yml`, which runs
`node scripts/check-data-fresh.mjs`). The run fails with exit 1 when the CCF catalogue or the ICORE export changed,
is gone, or a newer edition is offered — then regenerate the data as `data/README.md` describes — and with exit 2
when a source could not be reached or refused the check (no verdict: look again later, or by hand).

### Accessibility audit

`node scripts/axe-audit.mjs` runs axe-core 4.10's default rules (fetched once from cdnjs into the git-ignored
`.cache/`, never a dependency) over the panel on the local Scholar stand-in — light, with the system in dark mode,
filtered with the unranked-venue list open, every part on, the narrow-window layout, and in Arabic, Japanese, Thai
and German — the settings page (light and dark) and the toolbar popup (no profile tab). It exits 1 on any violation.
It is not part of CI: run it after a change to the markup or the colours of the panel, the settings page or the
popup. A unit test (`test/extension.test.js`) keeps the faint text colours at a contrast of 4.5:1 or more.

### The website

The project site (30 languages) lives on the orphan branch `site` (source) and `gh-pages` (the built pages; GitHub Pages serves them). Work on it in
a worktree: `git worktree add ../scholar-roles-and-ranks-site site`. There: `npm run verify` builds and checks, `npm run deploy` builds, checks and
pushes `gh-pages` (no CI involved). Its build reads this repository (`EXT_DIR`, by default `../google-scholar-highlighter`): the hero picture is
`store/chrome/images/screenshot-1.jpg` (`npm run store:images`), and the *Try it* section is the settings page itself, built into the site by
`node scripts/build-demo.mjs --out <site>/_site/demo` (see [The web demo](docs/ARCHITECTURE.md#the-web-demo)). Its privacy page is a copy of
`PRIVACY.md` (`npm run sync-privacy` there after changing it here).

### Adding an award source

1. Find the organisation's *own* page (the conference series, society or steering committee; never a
   news item, Wikipedia or an aggregator) that lists winners with the paper's title and authors. A page
   behind a bot check or a CAPTCHA is skipped, not worked around; record it in `docs/ROADMAP.md`.
2. Save the page (`node scripts/page-cache.mjs <https-url>` keeps a copy in the git-ignored `.cache/pages/` and prints its path; a page already saved is not fetched again), then add a reader to `scripts/awards/tot.mjs` and register its mode in the dispatch and
   `PAGES` tables. A PDF is first turned into text with `swift scripts/awards/pdf-text.swift file.pdf > file.txt`
   (macOS PDFKit); the reader takes that text. Readers refuse what they do not recognise: a heading that
   names the year, authors that are all person names, a line that is a title and not an author list.
3. Run `node scripts/awards/tot.mjs <mode> <saved-file> <page-address> > raw.json` and read every entry
   against the page. The command also drops any entry whose conference the page never mentions.
4. Add a synthetic-page test in `test/awards-sources.test.js`, the page's host to
   `test/fixtures/award-source-hosts.json`, then `node scripts/awards/merge-raw.mjs raw.json --write`,
   `npm run data` and `node scripts/awards/coverage.mjs` (its output is the *Entries* row of `data/README.md`).
5. A title the page misprints goes in `data/exclusions.json` under `correct`; update `data/README.md`,
   `README.md` and `README.zh-CN.md` (the award count), the changelog and the version, and run `npm test` and
   `npm run test:e2e`.

## Chrome first

Features, APIs and UI are designed for Chrome; Edge and other Chromium browsers should simply work.
Safari lives in `contrib/safari` as a best-effort wrapper and must never constrain the Chrome code.

## Conventions

- `src/lib/` is pure (no DOM, no `chrome.*`) so it stays unit-testable in Node.
- Everything the extension adds to Scholar's DOM is prefixed `rr-` (ids, classes, `data-rr-*`); the shared
  namespace is `globalThis.RolesRanks`.
- User-visible strings live in `src/_locales/<language>/messages.json`, one folder for each of the 30 languages
  listed in `src/lib/i18n.js`. Every folder has exactly the English keys with the same placeholders (English
  may add `…One` singular forms); `test/i18n.test.js` checks it. `README.md` and `README.zh-CN.md` say the same
  thing in the same structure.
- Plain, descriptive names — no coined words.
