# Architecture

Scholar Lens is a Manifest V3 extension. The same `src/` runs on Chromium
browsers directly and inside a generated Safari app wrapper. All logic uses the
`chrome.*` APIs, which both engines support.

## Components

| File | World | Responsibility |
|------|-------|----------------|
| `src/content.js` | content script (`scholar.google.com/*`) | Detect the profile author, classify each paper's authorship role, highlight rows, inject the control panel, request venue badges, compute metrics. |
| `src/background.js` | service worker | Resolve a venue string to its CCF / CORE / SJR ratings; cache results in `chrome.storage.local` for 30 days. |
| `src/popup/` | toolbar popup | At-a-glance status for the current tab plus the role-color legend. |

The popup is intentionally thin: every live control lives in the in-page panel,
where the context is. Settings persist in `chrome.storage.sync`.

## Author detection and roles

On a profile page the author is read from the page header (`#gsc_prf_in`) — no
manual setup. Each publication row's author list is parsed, matched against the
detected author (initial-aware: `John Smith` = `J Smith` = `J. Smith`, while
`Jane Smith` ≠ `John Smith`), and assigned one role:

- **first** — position 0.
- **co-first** — marked with a shared-first symbol (`† ‡ § * # ✉ …`).
- **second** — position 1.
- **last** — final position, only when the author list is *not* truncated.
- middle (3rd+) — deliberately **not** highlighted, to keep the page calm.

`roleFor` checks co-first → first → last → second in that order, so in a
two-author paper the author at position 1 is the **last** (senior) author, not
merely "second". Truncated lists (`A, B, …`) never falsely claim the last slot.

Each role maps to a fixed color (first = blue, co-first = purple, second =
amber, last = green); the row is tinted across all columns with a thin accent
bar, and the panel's checkboxes carry matching legend dots.

## Venue matching (CCF / CORE / SJR)

`background.js` bundles the **official CCF 2026 (7th edition)** catalogue —
386 conferences + 295 journals — as `[abbr, full, tier, type]` rows, indexed
once at load into:

- `byAbbr`: normalized abbreviation → tier. An abbreviation that appears with
  **different** tiers across fields (e.g. `FSE` is A for software engineering
  and B for the crypto venue) is marked ambiguous and resolved only by full name.
- `byName`: normalized full name → `{ tier, full }`.

`resolveCCF` tries, in order: exact full-name, parenthesized acronym, leading
acronym token — all O(1) Map lookups — then a single O(N) scan only on a miss,
after which the result is cached. `normalizeVenue` strips years, ordinals
(including Chinese `第N届`), and boilerplate like "Proceedings of the
45th International Conference on …".

**Secondary tracks are excluded.** `isSecondaryTrack` drops a badge when the
venue string is a Findings / co-located Workshop / Demo / Companion / Doctoral /
Tutorial / Poster track of a main conference — so "ACL Findings" and
"EMNLP System Demonstrations" get no badge — *unless* the matched venue's own
official name contains that word (IWQoS, NOSSDAV, HotNets are genuine
workshop-named venues and are kept). The same exclusion gates the CORE badge.

CORE conference tiers and SJR journal quartiles come from a smaller bundled
table with an OpenAlex fallback for journals not listed.

## The injected panel

`ensurePanel` builds a card and inserts it at the top of Scholar's right sidebar
(`.gsc_rsb`). It is styled to match Scholar's native look (Arial, light only —
Scholar never renders dark — scoped CSS reset so Scholar's own button/input
styles don't bleed in). It offers role checkboxes, venue-badge checkboxes, a
"show only highlighted" toggle, an author-name highlight toggle, a year range,
and live highlighted-vs-total metrics (Papers, Citations, h-index, i10-index).

A `MutationObserver` reprocesses rows Scholar appends via "Show more"; it is
paused around the extension's own DOM writes so decorating author names can't
retrigger processing and fight a toggle.

## Cross-browser packaging

The extension code is identical on every browser. Chromium loads `src/`
directly. The Safari build (`scripts/build-safari.sh`) generates a native
wrapper from `src/` with `safari-web-extension-converter` at build time, so the
wrapper is never committed and cannot drift from the source.
