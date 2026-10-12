# Architecture

This is a Manifest V3 extension built for Chrome. It is a **content script, a popup and a
settings page**: one permission (`storage`), a four-line service worker whose only job is to open the
settings page for the panel's button, and no network access of its own except the optional, user-triggered read of
a paper's own page on Scholar. (It also presses Scholar's own *Show more* button for you, by default — the page's
script makes that request, see [Loading the whole list](#loading-the-whole-list).) The same
`src/` loads unmodified in other Chromium browsers; Safari is best-effort (see
[Platform policy](#platform-policy-chrome-first)).

```
Scholar profile page ──► content/scholar.js   (the only code that knows Scholar's DOM)
                             │ raw rows: authors text, venue text, citations, year
                             ▼
                        lib/analysis.js ──► lib/names.js    owner + roles (first / second / last …)
                             │          ├─► lib/venues.js   CCF / CORE tier  ◄── data/ccf.js, data/core.js, data/aliases.js
                             │          ├─► lib/marks.js    awards / talk levels the author wrote (title, venue text)
                             │          └─► lib/awards.js   award-winning papers (data/awards.js, from official award pages)
                             ▼
                        content/main.js  (state, filters, observers) ──► content/panel.js  (view)
                             │                                         └► decorated rows (tint, chips)
                             └─► lib/metrics.js   role × tier matrix, h-index, clipboard text
popup/    ── asks the content script for the summary and renders the same matrix
options/  ── the settings page: writes `prefs`; open Scholar tabs redraw on chrome.storage.onChanged
```

Everything under `lib/` is **pure** (no DOM, no `chrome.*`). Each file is a UMD-style
script: in the extension it attaches to `globalThis.RolesRanks`, under Node it is
`require`d. That is what lets the unit tests exercise the real code on real Scholar
data, and why there is no build step.

## Components

| Path | Responsibility |
|------|----------------|
| `lib/names.js` | Normalise names, parse an author list, find the profile owner in it, classify the role. |
| `lib/venues.js` | Resolve a Scholar venue string to a CCF tier and a CORE rank (below). |
| `lib/marks.js` | Find the award and talk-level words an author wrote in a title or venue string (precision first). Also merges them with the list's awards. |
| `lib/awards.js` | The bundled list of award-winning papers: match a row by identical full title and the award's first author. |
| `lib/analysis.js` | One row → `{ status, role, venue, marks, … }`; folds in a paper's detail page when available. |
| `lib/metrics.js` | h-index / i10, the role × tier summary, matrix filtering, clipboard text. |
| `content/scholar.js` | Read rows, place the panel (sidebar when wide, above the list when narrow), press *Show more* until the list is complete (`loadAll`). |
| `content/detail.js` | Read a paper's own page for its full author list (user-triggered, throttled, stops at a CAPTCHA). |
| `lib/prefs.js` | What to show (`prefs`) and per-device view state (`ui`): shapes, defaults, normalising, migration from the pre-2.2 combined record, and the rules (which ranking the table uses, which marks are visible). |
| `content/chips.js` | The rank and award / talk chips; shared by the Scholar page and the settings page's preview. |
| `content/panel.js` | The panel: renders a model, reports intent via callbacks, owns no state. What it shows at all is decided by `prefs`. |
| `content/main.js` | Wires it together: prefs, filters, decoration, observers, messages to the popup. |
| `content/store.js` | `chrome.storage` wrappers + migration; degrades to memory if the extension context disappears. |
| `options/*` | The settings page: switches saved at once, with a live preview built from `content/chips.js`. |
| `background.js` | Opens the settings page when the panel asks (a content script cannot). Nothing else. |
| `data/*.js` | **Generated** from `data/*.json` by `scripts/build-data.mjs`; `aliases.js` is curated by hand. |

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
- user-added spellings ("name variants", stored per profile) are extra owner names. Chinese
  family-name-first order (`Zhang Wei` for `W Zhang`) is never guessed blindly — it would
  create false matches — but the page's own rows can show it: `names.suggestVariants` (pure)
  reads the other order of a two- or three-part header name **automatically** only when the name
  as printed finds the owner in under 10% of at least 8 rows and the other order in at least 4×
  as many and a quarter of all rows (real case: `Tang Jie`, 0 → 76 of 100 rows). Other
  rearrangements with initials (`SY Philip` for `Philip S. Yu`, `J Tang`) are only **offered**,
  from complete author lists that otherwise lack the owner, in at least two papers, as a
  one-click suggestion; the automatic spelling is not stored (it is derived again on every load),
  a suggestion that is accepted becomes an ordinary variant.

Roles (`roleFor`): co-first (shared-first mark) → first (position 0) → last (final
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
export (`scripts/core/build-core.mjs`). `scripts/build-data.mjs` turns both into
`src/data/*.js`; a test fails if they are stale.

Tiers are those of the current lists. They are *not* the tier at publication time, which the
UI says in the panel note and in every chip tooltip.

## Loading the whole list

Scholar shows a profile's first 100 papers and loads the rest when its *Show more* button is pressed. The role × rank summary
is only as good as the papers it has seen, so `scholar.loadAll()` presses that button until it is disabled — started by
`main.js` shortly after the page loads when the `autoLoad` preference is on (the default), or by the panel's *Load all*
when it is off. The request is Scholar's own script's, made to Scholar exactly as a click of yours would make it; the extension
adds no network access and no permission. It is polite and fails soft: one press at a time, waiting for the rows to arrive,
about a second apart, and an automatic run presses only while its tab is the one being looked at (profiles opened in many tabs at
once do not press together); a press that brings no rows within nine seconds ends the automatic run at once (a manual one gets a
second try) and the panel says so; *Cancel* ends it and it does not start again by itself; switching the setting off ends a run it
started, and switching it on starts one on the open profile. `loadAll` returns why it stopped (`done`, `cancelled`, `stalled`).

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

## Storage and privacy

- `chrome.storage.sync`: `prefs` (what to show — written **only** by the settings page) and per-profile
  name variants.
- `chrome.storage.local`: `ui` (panel collapsed, which ranking the table uses — written **only** by the
  Scholar page) and the cache of resolved paper pages (author list + venue), 90 days.
- Two records with one writer each, so a stale Scholar tab can never overwrite what the settings page saved.
  The pre-2.2 combined `settings` record is split into these once and removed.
- No other persistence, no remote code, no third-party requests. *Resolve* fetches
  `scholar.google.*` itself, same-origin, about once a second, only after a click, and stops
  at the first CAPTCHA or HTTP 429/503.

## Testing

| Suite | What it proves |
|-------|----------------|
| `test/names.test.js` | role logic, name matching edge cases, and owner detection rates on real profiles |
| `test/venues.test.js` | the matcher: regression cases, alias integrity, reviewed snapshot over real venue strings |
| `test/metrics.test.js` | h-index, the matrix, filtering, clipboard text |
| `test/extension.test.js` | manifest, load order, locales, bundle freshness |
| `scripts/check-saved-profile.mjs` | not part of `npm test`: the same real extension on a *real saved* Scholar profile page (offline) — selector contract plus tints / chips / marks against the libraries. Run it when Scholar's markup may have changed. |
| `test/e2e/run.mjs` | the real extension in Chromium against a local Scholar stand-in: placement, matrix = library result, filters, the whole list loading by itself, *Load all*, *Resolve*, clipboard, persistence, popup, i18n |

The stand-in mimics Scholar's DOM, but only the real page can confirm that it still does. On
2026-10-11 the built content script was run once on a live profile (injected into a normal browser
tab): all 100 visible rows got the same role and CCF / CORE tiers as the library computes from the
same strings, *Load all* (real "Show more") and *Resolve* (three real paper pages) behaved, and the
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
