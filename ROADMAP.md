# Roadmap

The roadmap, with the reasoning behind each item, is [`docs/ROADMAP.md`](docs/ROADMAP.md); this page is its index.
What has been built is in [`CHANGELOG.md`](CHANGELOG.md).

## What every item must keep

- **Precision over recall**: a missing badge is fine, a wrong one is not; matching and name rules are tuned on real
  Scholar strings (`test/fixtures`).
- **A pure core**: `src/lib/` has no DOM and no `chrome.*`, runs under `node --test`, and needs no build step.
- **No network use of its own** beyond *Read full lists* (Scholar's own paper pages, after a click) and the opt-in
  Semantic Scholar title lookup; anything new that sends data is off by default, and `PRIVACY.md` says what it sends.
- **Today's lists**: ranks are the current CCF and CORE lists, not the rank at publication time, and the interface
  says so.
- **Chrome first**: other Chromium browsers run the same package; Safari is best-effort.

## Next

- **More award sources**, only where the organisation's own page lists the winners; the pages that were probed and
  why they were not read are listed in [*Known gaps*](docs/ROADMAP.md#awards-and-talk-levels).
- **Venue matching coverage**: real unrecognised strings into `test/fixtures` and `src/data/aliases.js`; a DBLP-derived
  alias table could extend coverage offline ([details](docs/ROADMAP.md#venue-matching-coverage)).
- **More citation styles** (IEEE, the ACM reference format), each one more copy format
  ([details](docs/ROADMAP.md#exports)).
- **Other ideas, not started** ([details](docs/ROADMAP.md#other-ideas-not-started)): name spellings beyond today's
  rules, from real strings only; a list of the keys in the panel; user-defined weighting of ranks; an MCP server
  (it would need the `nativeMessaging` permission and a program installed outside the browser); end-to-end pictures
  at other display scalings, in Chromium.
- **A store listing**: optional; the kit is ready in `store/` ([details](docs/ROADMAP.md#distribution)).

## Set aside

Each with its reason in [*Considered and set aside*](docs/ROADMAP.md#considered-and-set-aside-2026-10-13):

- **Tier at publication time**: the older CCF catalogues need their own extraction and audit, and a mode that works
  for CORE but not for CCF would be half a feature.
- **DBLP person pages**: `dblp.org` answers scripted requests with a bot check, so there is no real page to develop
  against.
- **Semantic Scholar author pages, and its venues**: its author ids contain misattributions and its records merge
  versions of a paper; the opt-in title lookup for cut-off author lists is the safe part.
- **SCImago / JCR quartiles**: unclear licensing, and a large data build.
- **Sorting the paper list by rank or role**: fragile against Scholar's own sorting and *Show more*, for little gain
  next to the filters.
- **Frequent co-authors, and comparing roles across co-authors**: surname + initial merges different people.
- **Rank chips on Scholar's search results**: the venue line there is cut short, so most results could not be ranked.

## Built, and taken off this list

- The weekly check of the rank data against its official sources: `.github/workflows/data-fresh.yml`.
- Search operators with suggestions; eight copy and export formats, each with its own switch, also in the toolbar
  popup; the viewer of saved paper details; the guide for AI agents and the page events; 30 interface languages.
  See [`CHANGELOG.md`](CHANGELOG.md).
- Accessibility is checked, not certified: what `scripts/axe-audit.mjs` and the tests check is in
  [*Accessibility*](docs/ROADMAP.md#accessibility).
