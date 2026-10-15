# Architecture

This is a Manifest V3 extension built for Chrome: **two content scripts, a toolbar popup and a settings page**,
one permission (`storage`), and a small service worker whose only jobs are to open the settings page for the
panel's button and to hand over the strings of the chosen interface language. It has no network access of its own
except the user-triggered read of a paper's own page on Scholar (*Read full lists*) and, only if switched on, a
title lookup at Semantic Scholar's public API. (It also presses Scholar's own *Show more* button for you, by
default — the page's script makes that request, see [Loading the whole list](#loading-the-whole-list).) The same
`src/` loads unmodified in other Chromium browsers; Safari is best-effort (see
[Platform policy](#platform-policy-chrome-first)).

```
Scholar profile page ──► content/scholar.js   (the only code that knows Scholar's profile DOM)
                             │ raw rows: title, authors text, venue text, citations, year
                             ▼
                        lib/analysis.js ──► lib/names.js    owner + roles (first / co-first / second / last …)
                             │          ├─► lib/venues.js   CCF / CORE tier  ◄── data/ccf.js, data/core.js, data/aliases.js
                             │          ├─► lib/marks.js    awards / talk levels the author wrote (title, venue text)
                             │          ├─► lib/awards.js   award-winning papers (data/awards.js, from official award pages)
                             │          └─► lib/query.js    the search box's language (analysis.queryMatcher)
                             ▼
                        content/main.js  (state, filters, observers; settings: lib/prefs.js)
                             │  ├─► content/panel.js     the view: table, copy row, search, totals, years, venues, status
                             │  ├─► decorated rows       role tint, rank / award chips, the marked name
                             │  ├─► lib/metrics.js       role × tier summary, h-index / i10, year bars, top venues
                             │  ├─► lib/formats.js       the text of the copy buttons and of `export`
                             │  └─► content/bridge.js    the calls of lib/agent.js: page events + the popup's messages
                             │
popup/    ── calls the profile tab (rr:call summary / export) and renders the same table and copy buttons
options/  ── the settings page: writes `prefs`; open Scholar tabs redraw on chrome.storage.onChanged
```

Everything under `lib/` is **pure** (no DOM, no `chrome.*`). Each file is a UMD-style script: in the extension it
attaches to `globalThis.RolesRanks`, under Node it is `require`d. That is what lets the unit tests exercise the real
code on real Scholar data, and why there is no build step.

## Components

| Path | Responsibility |
|------|----------------|
| `lib/names.js` | Normalise names, parse an author list, find the profile owner in it, classify the role, suggest spellings of the owner's name (`suggestVariants`). |
| `lib/venues.js` | Resolve a Scholar venue string to a CCF tier and a CORE rank (below). |
| `lib/marks.js` | Find the award and talk-level words an author wrote in a title or venue string (precision first); merge them with the award list's; the panel's award / talk rows and counts (`rows`, `summarize`, `summarizeKinds`). |
| `lib/awards.js` | The bundled list of award-winning papers: match a row by identical full title and the award's first author. |
| `lib/duplicates.js` | Entries that are one paper listed twice (same title apart from capitals / accents / punctuation, same first-author surname): which one stays and the citations it shows. Used when *Merge duplicates* is on. |
| `lib/analysis.js` | One row → `{ status, role, venue, marks, … }`, folding in a paper's detail page when there is one; `isHighlighted`; `needsDetail`; `queryMatcher(q, marksOf)`, which compiles a search query (`lib/query.js`) once into a test of a row — the words are looked for in the title, the author line, the venue line, the venue's abbreviation and name in each list, the year, the role and the marks that the settings leave on. |
| `lib/query.js` | The search language. `OPERATORS` — `cites`, `year` (compared with `>` `>=` `<` `<=` `=`), `ccf`, `core`, `role`, `has` — each with its value pattern, an example, the suggestions and a line of documentation; `POPULAR` (what the panel offers on an empty box); `parse(q)` → `{ terms, errors }` (an operator with a value it does not take becomes a term that matches nothing, named in `errors`); `matches(parsed, fields)`. The panel's suggestions, the agent guide and the matcher all read `OPERATORS`. |
| `lib/metrics.js` | h-index / i10 and the citation totals (highlighted and all), the role × tier summary (`summarize`, by role only with `source` null), matrix selection, the year bars (`yearBars`, at most `YEAR_BARS` = 50 years), top venues, unmatched venues. |
| `lib/formats.js` | The text of the copy buttons, the popup and the `export` call: `summaryText`, `summaryTsv`, `papersTsv`, `papersCsv`, `bibtex`, `markdown`, `apa`, `json` (see [Exports](#exports)). Titles and names are treated as untrusted text. |
| `lib/prefs.js` | The settings, as one table: `SETTINGS`, a row per setting `{ path, kind, def, doc }` (kind: `bool`, `choice`, `color`, `language`). Derived from it: `defaults()`, `normalize(raw)` (a complete, well-typed record; unknown keys dropped, wrong values back to the default), `apply(current, patch)` → `{ prefs, applied, unchanged, ignored }` (imports, presets, the editor), `flatten()`, the groups `ROLES`, `RANKS`, `MARK_GROUPS`, `PANEL_PARTS`, `HIDE_PARTS`, `COPY_BUTTONS`. Also `PRESETS` (`all`, `last`, `first`, `minimal`), `normalizeUi` and the rules: which ranking the table uses (`sources`, `source`), which copy buttons are on (`copyButtons`), which marks are visible (`groupOn`, `visibleMarks`). |
| `lib/agent.js` | The calls of the page events and the popup: `METHODS` (`ping`, `summary`, `papers`, `export`, `filter`, `clearFilters`, each with its parameters and result), `validate(method, params)`, `EVENTS` (`better-scholar:request`, `better-scholar:response`, the marker `data-rr-ready`), `FORMATS` (= `COPY_BUTTONS`), and `guide({ current, version })`: the Markdown guide for AI agents, written from `SETTINGS`, `PRESETS`, `METHODS` and `OPERATORS`. |
| `lib/i18n.js` | The 30 interface languages, Scholar's `hl=` value for each, and Chrome's message format (`format`). |
| `content/dom.js` | `h()` (elements and text nodes, never `innerHTML`), `t` / `tn` (`chrome.i18n`, or the chosen language's strings from the service worker), `useLanguage()`, the role colours as CSS custom properties `--rr-c-<role>` on `<html>` (`applyColors`), the row style (`applyRowStyle`), `copyText`, `downloadFile`, `issueUrl`, and the copy buttons' labels (`COPY_LABEL`). |
| `content/chips.js` | The rank and award / talk chips; shared by the Scholar page and the settings page's preview. |
| `content/store.js` | `chrome.storage` wrappers for every key (see [Storage](#storage-and-privacy)) and `onPrefsChanged`; degrades to memory if the extension context disappears. |
| `content/scholar.js` | Read rows, place the panel (sidebar when wide, above the list when narrow), press *Show more* until the list is complete (`loadAll`). |
| `content/semantic.js` | Optional (setting `semanticScholar`, off by default): one title lookup at Semantic Scholar's public API for a cut-off author list, used before Scholar's own page by `detail.js`; an answer counts only when its title, first author and year agree. |
| `content/detail.js` | Read a paper's own page for its full author list (user-triggered, throttled, stops at a CAPTCHA). |
| `content/panel.js` | The panel: renders a model, reports intent via callbacks, owns no state (below). |
| `content/bridge.js` | Carries the calls of `lib/agent.js` on two transports — the extension's own messages (`{ type: "rr:call", method, params }`, the popup) and page events — after `validate`; answers `{ id, ok: true, result }` or `{ id, ok: false, error }`; sets `data-rr-ready="true"` on `<html>`. What a call does is in `main.js`. |
| `content/main.js` | Wires it together: settings, filters, decoration, duplicate merging, observers, the keys (`/`, `Escape`), the calls (`methods`, handed to `bridge.install`). Also applies the language (`B.dom.useLanguage()` before anything is drawn; a changed language or Scholar language reloads the page) and the role colours. |
| `content/lang-redirect.js` | The setting *Open Scholar in*: a second, tiny content script (run at document start on `scholar.google.*/*`, checks the path itself: `/scholar` and `/citations` only — search, profiles, author search, paper details — never downloads or redirects) that reopens a page with the chosen `hl=`, once per tab and language. It reads one setting and nothing else. |
| `options/*` | The settings page (below). |
| `popup/*` | The toolbar popup: asks the active tab for `summary`, draws the table, the awards and talks line and the copy buttons that are on; a button asks for `export` and copies the text (CSV: a file). |
| `background.js` | Opens the settings page when the panel asks (a content script cannot), and hands a page the strings of the chosen language from the extension's own `_locales`. Nothing else. |
| `data/*.js` | **Generated** from `data/*.json` by `scripts/build-data.mjs` (`ccf.js`, `core.js`, `awards.js`); `aliases.js` is curated by hand. |

## Script order

The main content script runs at `document_idle` on `https://scholar.google.<domain>/citations*`, in this order
(`manifest.json`; a test checks the dependencies):

```
lib/i18n.js → lib/names.js → lib/venues.js → lib/metrics.js → lib/marks.js → lib/awards.js → lib/duplicates.js →
lib/prefs.js → lib/query.js → lib/formats.js → lib/analysis.js → lib/agent.js →
data/aliases.js → data/ccf.js → data/core.js → data/awards.js →
content/dom.js → content/chips.js → content/store.js → content/scholar.js → content/semantic.js → content/detail.js →
content/panel.js → content/bridge.js → content/main.js
```

`prefs` needs `i18n`; `awards` needs `names`; `duplicates` needs `names` and `awards`; `analysis` needs `names`,
`marks` and `query`; `agent` needs `prefs`, `i18n` and `query`; the `content/` files need `dom`; `main.js` comes last
and calls `bridge.install`. The second content script — `lib/i18n.js`, `content/lang-redirect.js` — runs at
`document_start` on every page of the same domains. The popup loads `lib/i18n.js`, `lib/marks.js`,
`content/dom.js`, `popup/popup.js`; the settings page loads `lib/i18n.js`, `lib/prefs.js`, `lib/query.js`,
`lib/agent.js`, `lib/marks.js`, `lib/metrics.js`, `content/dom.js`, `content/chips.js`, `content/panel.js`,
`content/store.js`, `options/options.js`.

## Author detection and roles

The profile owner is the text of `#gsc_prf_in`. `cleanOwnerHeader` strips honorifics,
suffixes and parentheticals (`Prof. John Smith, PhD`, `Wei Zhang (张伟)`).

Matching an author token to the owner (`names.js`):

- accents are folded and letters NFD cannot decompose are transliterated (`ł ø đ ß …`);
  names with no Latin letters at all (CJK, …) are compared by their own letters;
- Scholar collapses a multi-part given name into one all-caps token (`GE Hinton`,
  `WLH Smith`). Such **initials clusters** are expanded into letters before comparing, so
  the profile name `Geoffrey Hinton` matches `GE Hinton`. This was the largest single
  source of silent misses: 57 of 100 rows on a real profile;
- full given names must agree (`Jane` ≠ `John`); a single letter matches any name starting
  with it; an all-caps *name* is not treated as initials;
- family-name particles (`van der`, `von`, …) belong to the surname; `de/di/da/le/la` do
  not, because they are common given names;
- user-added spellings ("name variants", stored per profile, at most eight) are extra owner names. Chinese
  family-name-first order (`Zhang Wei` for `W Zhang`) is never guessed blindly — it would
  create false matches — but the page's own rows can show it: `names.suggestVariants` (pure)
  reads the other order of a two- or three-part header name **automatically** only when the name
  as printed finds the owner in under 10% of at least 8 rows, and the other order finds it in at least
  max(5, 4×) as many more rows and in a quarter of all rows (real case: `Tang Jie`, 0 → 76 of 100 rows). Other
  rearrangements with initials (`SY Philip` for `Philip S. Yu`, `J Tang`) and an all-caps inventor (`JA DOUDNA`: `isShoutedInitials`, only when the same initials written as usual find the owner elsewhere on the profile; an all-caps name is never read as initials by the matcher) are only **offered**,
  from complete author lists that otherwise lack the owner, in at least two papers, as a
  one-click suggestion; the automatic spelling is not stored (it is derived again on every load),
  a suggestion that is accepted becomes an ordinary variant.

Roles (`roleFor`): co-first (the owner is inside the leading group of authors that share a mark with the first author — `A*, B*, C`, at least two; a lone mark or
one further down, a corresponding or co-senior author, says nothing; the envelope ✉ is never equal contribution) → first (position 0) → last (final
position, only if the list is *not* truncated) → second (position 1) → middle. In a
two-author paper the second author is the senior (last) author. Middle authors are not
highlighted.

A row's `status` is `found`, `hidden` (list truncated with `…` and the owner not in the
visible part — typically a senior author on a large paper) or `absent` (complete list, no
match — a name-spelling problem). `hidden` rows can be resolved from the paper's own page,
which lists every author in full.

## Venue matching

Goal: **precision first**. A missing badge is acceptable; a wrong one is not. The first
version of this matcher used loose substring matching and, on real profiles, mis-tiered
roughly one badge in five (CVPR as C, every unlisted "IEEE …" journal as A, "machine
learning" anywhere as ICML…). The rewrite has no fuzzy fallback at all.

`prepare(raw)` reduces what Scholar prints to the venue words: it drops `[arXiv…]`
annotations, the `…` truncation marker (remembered), trailing year / pages / volume (issue),
`Volume N`, leading ordinals and years, and records whether a volume number was present.

`typeHint` decides which index to consult: conference words (proceedings, conference,
symposium, `Advances in`) → conferences; journal words (journal, transactions, letters,
review, `Communications of`) → journals; neither → journals first, then conferences. A
volume number alone proves nothing (`ISCA 2014 42 (3)` is a conference).

Then, per ranking (CCF, CORE), the first rule that yields **one** venue wins; ambiguity
means no badge:

1. **Name** — canonical token key equality. Canonicalisation drops punctuation, stop
   words, ordinals, years and event words (`Proceedings of the`, `International`,
   `Conference`, …). Three variants are tried, strictest first: all words, without
   organisation words (IEEE/ACM/USENIX…), and without all-caps acronyms of real venues
   (`2020 CHI Conference on …`). Weakened variants need ≥ 2 words. Curated **aliases**
   (`src/data/aliases.js`) are indexed as extra names. Journals also match on the same
   words in a different order (`Audio, Speech, and Language Processing, IEEE Transactions on`).
2. **Acronym** — only strong signals: `(ICML)`, `(NSDI 11)`, `(USENIX Security 21)`,
   `(S&P'05)`, an unclosed `(OSDI …`, a leading `ISCA 2014`, a one-word venue (`Ndss`), or an
   acronym buried in a sentence when little else is said. Organisation words are never
   acronyms; a buried acronym is not used for journals or when much text surrounds it. The
   parts of a hyphenated parenthesis (`(EMNLP-IJCNLP)`) may name a conference, never a journal
   (`(WF-IoT)` is not the IoT Journal); joint-sponsor chains (`Eurographics/ACM SIGGRAPH`) carry
   no acronym of their own.
3. **Prefix** (only for truncated names) — a unique entry that begins with what is visible.
   Organisation words must agree; a trailing connective must agree (`Information processing
   in …` is IPSN, not IPMU); too little visible text stays silent. *Unique* means one venue: several
   different venues that merely share a rating are still ambiguous (the badge would be right, its
   tooltip would name the wrong venue). `Joint` is an identity word: a string that says it only
   reads as a venue that does (`… Annual Joint Conference of the IEEE Computer and …` is INFOCOM,
   not CIT).
4. **Subtitle** — a known name followed by extra words (`…: Human Language Technologies`).

Ties between entries with the same canonical key are broken by the event word in the
string (`symposium` → SoCC rather than the JCC conference). **Secondary tracks** —
Findings, workshops, demos, posters, tutorials, extended abstracts, short/industry papers,
shared tasks — get no badge unless the venue's own official name contains the word
(IWQoS, HotNets). Results are memoised per string and carry the rule and entry that matched,
which the chip tooltip shows.

The behaviour is pinned by `test/venues.test.js`: targeted regression cases for every bug found
in the audit, and a reviewed **snapshot** of the result for every venue string in the
real-profile corpora (`test/fixtures`). A change that moves any badge fails the test until the
diff is reviewed and `npm run test:update` is run.

## Data

`data/ccf-2026.json` is extracted **reproducibly** from CCF's official PDF
(`scripts/ccf/`, see [`data/README.md`](../data/README.md)); its totals match the published
catalogue (386 + 295; A 95 / B 245 / C 341). `data/core-2026.json` comes from the ICORE
export (`scripts/core/build-core.mjs`; 800 ranked conferences). `scripts/build-data.mjs` turns both, and
`data/awards-2026.json` (7,830 entries), into `src/data/*.js`; a test fails if they are stale.
`.github/workflows/data-fresh.yml` runs `scripts/check-data-fresh.mjs` every Monday: it fails when the
official CCF file or ICORE export no longer matches the checksum the data was built from, is gone, or a newer
edition is offered (exit 1), and when a source cannot be reached or refuses the check (exit 2, no verdict).

Tiers are those of the current lists. They are *not* the tier at publication time, which the
UI says in the panel note and in every chip tooltip.

## Loading the whole list

Scholar shows the first papers of a profile and loads more each time its *Show more* button is pressed. The role × rank summary
is only as good as the papers it has seen, so `scholar.loadAll()` presses that button until it is disabled — started by
`main.js` shortly after the page loads when the `autoLoad` setting is on (the default), or by the panel's *Load all*
when it is off. The request is Scholar's own script's, made to Scholar exactly as a click of yours would make it; the extension
adds no network access and no permission. It is polite and fails soft: one press at a time, waiting for the rows to arrive,
about a second apart, and an automatic run presses only while its tab is the one being looked at, holding a short-lived lock in
Scholar's `localStorage` (`rr-load-lock`) so that profiles opened in many tabs at once do not press together; a press that brings
no rows within nine seconds ends the automatic run at once (a manual one gets a second try) and the panel says so; *Cancel* ends it
and it does not start again by itself; switching the setting off ends a run it started, and switching it on starts one on the open
profile. `loadAll` returns why it stopped (`done`, `cancelled`, `stalled`).

## The panel

`panel.js` is a pure view over a model. `main.js` rebuilds the model after every change
(settings, filters, new rows from *Show more*, resolved papers) and re-renders; rows are
decorated by toggling classes (`rr-r-<role>`, `rr-hide`) and appending one chip
container — no `innerHTML`, and the author line's text is never altered (name marking
rebuilds it from the original text and restores it on undo). Venue resolution is
synchronous and cached, so decorating cannot re-trigger the row observer. The panel moves
between the right sidebar (wide window) and the space above the list (narrow window, where
Scholar drops the sidebar *below* the list) as the window is resized. Styles are scoped under
`#rr-panel` and out-rank the reset that stops Scholar's global button/input styles bleeding in.

What it shows is decided by the settings, never by the panel itself (it holds only per-visit view state: folded or not, the
ranking tab). The parts are the `panel.*` rows of `SETTINGS` (`PANEL_PARTS`): `show` (the whole panel), `summary` (the role ×
rank table and its data note), `marks` (awards and talks counts), `filters` (search box, quick buttons, *Only highlighted*, the
year range), `metrics` (citation totals, with the h-index and i10 buttons), `years` (papers per year), `venues` (top venues; the
only part off by default), `status` (loaded papers, *Load all*, *Read full lists*, repeats, unranked venues) and `names` (name
spellings). The copy row is not a part: it holds one button per `copy.*` switch that is on (`prefs.copyButtons`), whether or not
the table is shown, and is hidden when none is. `panel.update()` hides a section whose switch is off and lets a column with nothing
in it give its width to the other (`rr-onecol`); the layout-changed warning is never hidden. A part added later needs: a row
in `SETTINGS` (`panel.<part>`), its words in every `src/_locales/*/messages.json`, a switch on the settings page (`data-pref`),
a preview effect (the preview runs the same panel) and an end-to-end check.
The controls are components of the panel's own, not the system's: the year range is `dropdown()` (button, fixed-position list,
arrow keys, Escape, click outside), the one checkbox is styled as a switch (`role="switch"`), the search box is a combobox whose
suggestion list is placed with fixed coordinates.

### Search

The search box (`/` focuses it when the panel and its filters are shown) feeds `state.filters.query`; `main.js` compiles it
once per query and per set of visible marks (`analysis.queryMatcher`). Typing an operator's colon lists that operator's
suggestions (`OPERATORS[].suggest`), `↓` or the `/` hint lists `POPULAR`; `Enter` / `Tab` take a suggestion chosen with the
arrows, otherwise `Enter` / `Shift+Enter` step through the matching rows (`rr-row-focused`). A query with errors marks the box
`aria-invalid` and names them in its tooltip. Four quick buttons toggle `ccf:a` (`core:a*` when CCF is off), `cites:>100`,
`role:first` and `has:award`.

### Filters and what they scope

`state` in `main.js` holds the filters: `selection` (a matrix cell, role or tier), `markGroup` (an awards / talk row), `venueKey`
(a venue of the top-venues list) and `filters` (`onlyHighlighted`, `yearStart`, `yearEnd`, `query`, `minCitations` — set only by
the `filter` call — and `impact`). `applyFilters()` toggles `rr-hide` on rows; `filtering()` says whether any is on, which shows
the panel's filter bar ("Showing 25 of 100 papers · Last, CCF A · 2020–2024" and *Clear*); `Escape` on the page clears them all
when nothing else has taken the key. The numbers under the filters follow them (`scoped()`: highlighted papers, citations,
h-index, i10, the venue list — the venue list is not narrowed by its own choice), while the role × rank table and the year bars
stay whole: they are where a filter is chosen.

The impact filter is the h-index and i10 buttons: it shows the highlighted papers behind the number — at least *h* citations,
*h* being the h-index of the highlighted papers the other filters let through (`impactMin()`), or at least 10. The totals do not
count it (`skipImpact`), so the number that was pressed stays put.

A filter whose control has gone is dropped: a venue that left the list or a tier column that disappeared, in `refresh()` after
`decorate()` (a row's `highlighted` is only known once it has been decorated); a selection, an awards row, the search, the year
range or the impact filter whose part of the panel was switched off, when the settings change (`onPrefsChanged`). The `filter`
call is refused while the panel is off, for the same reason.

What the table and the status block show depends on the profile, not only on the settings. `listComplete()` in `main.js` says the whole list is here: the page offered nothing more at the start,
or our loader ran to its end (`done`), or rows arrived that the loader did not ask for and Scholar's button is still off after the moment it needs to come back (a list finished by hand, or a cancelled request answered) — not straight after a cancel or a stall, because the button is disabled while a request is in flight. `noRanks()` is true when a list is switched on, the list is complete
and no paper has a rank in any list that is on: the table is then by role only (`summarize(list, null)`, heading *Papers by role*, no tier columns, no switch between the lists; the lists that are on stay in
`sources`, for the note `noRanksNote`; the toolbar popup empties its own `sources`), and a selection on a tier is dropped in `refresh()` (its control is gone). The unranked-venues list keeps its *Report* link:
a computer-science profile whose venues the lists miss is exactly where a report helps. The status block (`renderCoverage`) leaves out the "N papers loaded" line when it would stand alone — complete,
not loading, nothing else to say — and the totals are shown (not with the layout warning, which hides them); the section hides itself when nothing else is left.

The year chart is `metrics.yearBars()`: one bar a year for the highlighted papers, at most the last 50 (`YEAR_BARS`; two real veterans' profiles span 44 and 45 years, and above 24 bars the gap between bars shrinks to 1 px) counted back from the newest year that can be real (next year at
the latest: a typo such as 2099 draws nothing), starting at the first year that has a paper; Scholar sometimes dates a paper 1803, which would stretch the chart over two centuries and leave
every bar a pixel wide. The papers before the first bar are counted (`byYearOlder`) and said in the first axis label's tooltip and in the chart's accessible name (`yearsOlder`).

Layout: in the wide layout (window narrow, panel above the list) `update()` moves the year bars into the first column; the arrangement is redone when
the window crosses the breakpoint. When Scholar's layout has changed (`layoutBroken`) only the warning (top slot) and the loading status are shown.

## The toolbar popup

The popup sends `{ type: "rr:call", method: "summary" }` to the active tab (`chrome.tabs.sendMessage`; no `tabs`
permission is needed for that). The answer carries the three summaries (CCF, CORE, by role only), the awards and talks
counts, `parts` (`panel.summary`, `panel.marks`) and `copyButtons`, so the popup obeys the same switches as the panel. A
copy button asks for `export` and copies the text; CSV is saved as a file. A tab that is not a profile gets no answer, and the
popup offers to open Google Scholar.

## The settings page

`options.js` builds the page from the same table: every control carries `data-pref="<path>"` (the API key's field is
`data-pref="s2key"`, not a setting), and an end-to-end check fails when a `SETTINGS` row has no control or a control names no
setting. A change is saved at once (`store.savePrefs`); open Scholar tabs redraw on `chrome.storage.onChanged`. The cards, in
order: *Language* (interface language, *Open Scholar in*), *Highlight my papers* (roles, *Mark my name*), *Colours* (five
themes, a colour per role with a contrast badge against Scholar's white page — a warning below 3:1 — and the row style),
*Venue ranks*, *Awards and talks* (and the talk rows), *Copy & export* (a switch per format), *Duplicate entries*, *Scholar's
own blocks*, *Summary panel* (the panel and its parts, *Compact*), *Semantic Scholar* (the switch and the optional API key),
*Paper list* (`autoLoad`), *AI agents* (*Copy guide for agents*: `agent.guide({ current, version })` to the clipboard),
*Configuration & presets* and *Saved data* (view and clear the saved paper details, reset, copy diagnostics). Groups of
switches have *Enable all* / *Disable all*. A search box and a row of links to the cards sit above them.

*Configuration & presets*: a preset (`PRESETS`: *All features*, *Last author focus*, *First author focus*, *Minimalist*), the
JSON editor and *Import file* all go through `prefs.apply()`, and the page reports what was applied and what was ignored, with
the reason. *Copy config (JSON)* and *Export file* (`better-scholar-config.json`) give the whole record. There is no other
format and no import from the clipboard.

The preview is the real `content/panel.js`, handed a model built from invented papers (`panelModel()` in `options.js`
follows `main.js`'s `model()`), above sample rows built from `content/chips.js`. It is always Scholar's light page, whatever
the system theme.

## The web demo

The settings page also runs in an ordinary web page: the project site embeds it as its *Try it* section, and a visitor can open it on its own.
`npm run build:demo` (`scripts/build-demo.mjs`) writes `dist/demo/`, a static copy of the real page. The builder reads the page `options_ui` names in
the manifest and copies exactly what that page names (scripts, stylesheets, pictures, what a stylesheet's `url()` names), each at the same path
under `src/`, plus the icons and every language's `messages.json`; it takes the page's own `<script>` tags out and puts one tag in their place,
for `scripts/demo/shim.js`, whose `data-` attributes carry the scripts, in the page's order, and the version. `--out <dir>` writes somewhere else (the
site's build asks for its own `_site/demo` that way). Serve the folder over http (`python3 -m http.server -d dist/demo`): from `file://` the browser
refuses to read the strings.

The shim is the only addition, a `window.chrome` with just what the page and its libraries touch: `chrome.storage.sync` and `local` (`get` with
Chrome's key, list, defaults and everything forms; `set`; `remove`; copies in and out, `onChanged` with a real `changes` object for the page that wrote and
for the demo open in another tab), `chrome.i18n` (`getMessage` answers at once, from the strings of English and of the interface language, which the shim
fetches before it adds the page's scripts; `getUILanguage`) and `chrome.runtime` (`id`, `getManifest`, `getURL`, `openOptionsPage`, `onMessage`, and
`sendMessage` for `rr:messages`, answered as `background.js` answers it). The settings are kept in `localStorage` under the prefix `rr-demo:` (in memory
when `localStorage` is not there). `?lang=` (a site code such as `zh-CN`, or a folder such as `zh_CN`) is what `getUILanguage()` returns, otherwise the
browser's language, and `lib/i18n.js` `resolve()` picks the folder, as in the extension. A page that starts asking for more of `chrome.*` fails with a
TypeError in the shim: add what it needs there. The demo asks for its own files only (`test/e2e/demo.mjs` checks that), and adds one quiet line
(`scripts/demo/demo.css`) saying that its changes stay in this browser; inside a frame, as on the website, which says it in the visitor's language, the
line is not shown.

It is not the extension: there is no Scholar page to redraw (the preview is all there is), the language settings only save a value, and the Semantic Scholar
key field keeps whatever a visitor types in their own `localStorage`.

## Calls: page events and the popup

`lib/agent.js` lists the calls; `content/main.js` implements them (`methods`); `content/bridge.js` carries them.

- **Page events.** A script on the profile page dispatches `better-scholar:request` on `document` with
  `detail: { id, method, params }`; the answer is a `better-scholar:response` event with `{ id, ok: true, result }` or
  `{ id, ok: false, error }`. An `id` that is a string or a number comes back unchanged; anything else comes back as `null`.
  There is no origin check: any script in the page can call. `bridge.install` sets `data-rr-ready="true"` on `<html>`.
- **Messages.** The popup sends `{ type: "rr:call", method, params }`; `chrome.runtime.onMessage` reaches this extension's own
  pages only.
- **The calls.** `ping`, `summary`, `papers` (`filtered`), `export` (`format`, `source`), `filter` (`query`, `onlyHighlighted`,
  `yearStart`, `yearEnd`, `minCitations`, `impact`) and `clearFilters`. `validate()` checks the method and every parameter
  (type, choice, integer range, strings up to 500 characters) before anything runs. They read what the panel shows and set the
  page's filters; none reads or writes the settings or storage, and none makes a network request.

## Exports

`lib/formats.js` turns the paper records (`paperRecords()` in `main.js`: the rows the page shows, with the author list and
venue that *Read full lists* saved) or the summary into text. *Copy summary* and *Copy as table* count every loaded paper
(`summaryText`, `summaryTsv`); the others take the papers shown. *Copy papers* is tab-separated (`papersTsv`), *Export CSV* is
RFC 4180 with a UTF-8 byte-order mark and CRLF line ends (`papersCsv`); in both, a cell that begins with `=`, `+`, `-` or `@` and
is not a plain number gets a leading apostrophe. BibTeX keys are surname + year + the first title word of three or more letters
that is not a stop word (`he2016deep`, `nodate` without a year), made unique with `b`, `c`, …; the author list ends `and others`
where Scholar cut it, and every character TeX reads is escaped. Markdown escapes what Markdown reads; APA keeps surname
particles (`van der Maaten, L.`). JSON is `{ owner, source, total, papers }`.

## Storage and privacy

| Area | Key | What | Written by |
|---|---|---|---|
| `chrome.storage.sync` | `prefs` | The settings record (`SETTINGS`) | the settings page only |
| `chrome.storage.sync` | `variants` | `{ profileId: [spellings] }`, at most 8 per profile, 40 profiles | the Scholar page |
| `chrome.storage.local` | `ui` | `{ collapsed, source }` | the Scholar page only |
| `chrome.storage.local` | `resolved` | `{ paperId: { authors, venue, ts, via? } }` from *Read full lists*; 90 days, at most 3,000 | the Scholar page; cleared from the settings page |
| `chrome.storage.local` | `s2key` | The optional Semantic Scholar API key (never synced) | the settings page |
| Scholar's `localStorage` | `rr-load-lock` | `{ id, t }` while an automatic load presses *Show more* | `content/scholar.js` |
| Scholar's `sessionStorage` | `rr-hl` | The language code and time of the last redirect, the guard against a loop | `content/lang-redirect.js` |

- `prefs` and `ui` have one writer each, so a stale Scholar tab can never overwrite what the settings page saved.
- There is no migration (2.39.0 removed it). A stored `prefs` record is read setting by setting through `normalize()`: a value
  whose path and kind match a row of `SETTINGS` is kept, anything else falls back to the default, and the combined `settings`
  record of versions before 2.2 is not read.
- No other persistence, no remote code, no third-party requests except the opt-in Semantic Scholar lookup. *Read full lists*
  fetches `scholar.google.*` itself, same-origin, about once a second, only after a click, and stops at the first CAPTCHA or
  HTTP 429/503. [`PRIVACY.md`](../PRIVACY.md) has the user-facing account.

## Testing

`npm test` runs the unit tests (`node --test test/*.test.js`, 429 tests); `npm run test:e2e` runs the end-to-end checks (78); `npm run test:demo` the web demo's (14).

| Suite | What it proves |
|-------|----------------|
| `test/names.test.js` | role logic, name matching edge cases, and owner detection rates on real profiles |
| `test/venues.test.js` | the matcher: regression cases, alias integrity, reviewed snapshot over real venue strings |
| `test/real-profile.test.js` | a real profile's rows: roles, venues and the role × rank table the live page showed |
| `test/marks.test.js`, `test/awards.test.js` | award and talk words the authors wrote; matching the bundled award list |
| `test/awards-sources.test.js`, `test/awards-merge.test.js` | the award page readers on synthetic pages; the merge gate that refuses rows it cannot verify |
| `test/metrics.test.js`, `test/duplicates.test.js` | h-index, the matrix, filtering, year bars, top venues; duplicate entries |
| `test/formats.test.js` | every copy / export format, including formula, TeX and Markdown injection |
| `test/query.test.js` | the search language: parsing, every operator, hostile queries |
| `test/prefs.test.js` | the settings table: defaults, `normalize`, `apply`, presets, the derived rules |
| `test/agent.test.js` | `validate`, the table of calls, that `main.js` implements exactly those calls, the guide |
| `test/i18n.test.js` | every listed language has its folder with exactly the English keys and placeholders |
| `test/extension.test.js` | manifest, load order, locales, bundle freshness, no remote code, text contrast |
| `test/demo-build.test.js` | the web demo's builder: the files it copies and the order of the page's scripts, and what it refuses (an inline script, a remote file, a folder that holds the repository) |
| `test/loader.test.js`, `test/robustness.test.js`, `test/markup-check.test.js` | the *Show more* loader; hostile input; the list of Scholar selectors that `scripts/check-scholar-markup.js` checks |
| `test/e2e/run.mjs` (78 checks) | the real extension in Chromium against a local Scholar stand-in: placement, matrix = library result, filters, search, the h-index and i10 buttons, the whole list loading by itself, *Load all*, *Read full lists*, Semantic Scholar, clipboard and downloads, persistence, popup, settings page (every setting has its control), presets and the configuration editor, the agent guide, the page events, i18n |
| `test/e2e/demo.mjs` (14 checks) | the web demo (`scripts/build-demo.mjs`) in a plain Chromium page, no extension: the build's contents, the cards and the real panel, in a same-origin frame as on the website, a switch changes the preview and survives a reload, a second tab follows, presets, the configuration editor, the clipboard, a download and a dialog, `?lang=` (hyphen and underscore forms, right to left), no `localStorage`, no console error and no request to another origin |
| `scripts/check-saved-profile.mjs` | not part of `npm test`: the same real extension on a *real saved* Scholar profile page (offline) — selector contract plus tints / chips / marks against the libraries. Run it when Scholar's markup may have changed. |
| `scripts/axe-audit.mjs` | not part of CI: axe-core 4.10's default rules over the panel (light, dark system, filtered, every part on, narrow window, four languages), the settings page (light, dark) and the popup without a profile; exit 1 on any violation |

The stand-in mimics Scholar's DOM, but only the real page can confirm that it still does. On
2026-10-11 the built content script was run once on a live profile (injected into a normal browser
tab): all 100 visible rows got the same role and CCF / CORE tiers as the library computes from the
same strings, *Load all* (real "Show more") and *Read full lists* (three real paper pages) behaved, and the
panel sat where designed. That check found that Scholar prints a no-break space before the "…" that
truncates a venue; the matcher already treated it as a space, and tests and the stand-in now include
it. This is a manual check, not part of CI: Scholar serves CAPTCHAs to automated browsers, so do not
script it.

## Platform policy: Chrome first

Chrome is the main line, and product decisions are made for it:

- **Use Chrome's platform freely.** Any Chrome / Chromium MV3 API is fair game when it makes
  the product better — side panel, action badge, commands, `chrome.i18n`, optional host
  permissions, cross-device `chrome.storage.sync`, promise / `async` style, CSS `all: revert`,
  and so on.
- **No lowest-common-denominator code.** No polyfills, feature-detection shims or reduced UI/UX
  to keep another browser working.
- **Other Chromium browsers** (Edge, Brave, …) run the same package; no special handling.
- **Safari is best-effort.** `contrib/safari/build.sh` generates a native wrapper from `src/` with
  `safari-web-extension-converter` at build time, so the wrapper is never committed and cannot
  drift from the source. It is not tested on each release, may lag behind or break when
  Chrome-first features land, and carries no support commitment. Fixes for it are welcome as long
  as they don't change Chrome behavior.
