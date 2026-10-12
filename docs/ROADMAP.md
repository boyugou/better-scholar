# Roadmap

Ideas that are worth doing but not done, with the reasoning, so they are not rediscovered
from scratch. Roughly in order of value.

## Awards and talk levels

**Built — what the authors wrote** (`src/lib/marks.js`, 2026-10-11). A paper whose title or venue text
says Oral / Spotlight / Highlight / Best, Outstanding or Distinguished Paper / Test of Time gets a chip
(gold ★ for an award, plain outline for a talk level, dashed for a finalist), the panel counts each
group, and the copied summary gets a line. The detector is precision-first: an award phrase counts in a
venue string; a talk word must stand alone (after a delimiter, year or venue acronym); in a title only a
trailing or leading `( … )` / `[ … ]` made of nothing but marker and venue/year words counts. Yield is
low by nature — across four real profiles (400 rows, including one whose owner has CVPR'16 and ICCV'17
best papers) Scholar's text contained **no** such markers — so this is best effort, not a promise.

**Next — a cached list of award-winning papers.** Awards are few and public (a flagship venue has a
handful per year), so a bundled list can mark papers whose authors did not write it. Oral / spotlight
lists are too large and drift between venues and years, so they stay author-written only. Plan: official
award pages only, a reproducible extraction like the CCF data, one source URL and one quoted snippet per
entry, `best` / `outstanding` / `distinguished` / `runner-up` / `student` / `test of time` kept distinct
(never upgrade an honorable mention), match on normalised full title + first-author surname, and
tooltips that say where each mark came from ("written by the author" vs "official award list"). The
best-known public aggregator (jeffhuang.com/best_paper_awards) states no licence and does not
separate award levels, so it is a cross-check, not a source.

## Tier at publication time

Tiers are those of the current lists. CCF's earlier editions (2012, 2015, 2019, 2022) could be
bundled to show the tier *in the paper's year*, which is what an evaluator of an old paper
usually wants. Needs the older catalogues extracted the same reproducible way (`scripts/ccf/`).

## Venue matching coverage

Unrecognised venues are listed in the panel. Feed real unrecognised strings back into
`test/fixtures` and `src/data/aliases.js` — the snapshot test makes each change reviewable.
A DBLP-derived alias table (the official catalogue prints a DBLP URL per venue) could extend
coverage offline without runtime network access.

## Other surfaces

DBLP person pages are the best-aligned second surface for CCF users (exact venue keys, full
ordered author lists; no citation counts, so no h-index there). Semantic Scholar is lower
priority: its API licence forbids shipping a key, the shared pool rate-limits, and author IDs
contain misattributions.

## Distribution

Stores are a nice-to-have, not a requirement; GitHub plus *Load unpacked* is the primary route.
When listing: the permission set is already minimal (`storage`); a one-page privacy statement,
1280×800 screenshots, and per-store listing text are what remains (Edge's policy asks that listings
not mention other browsers). The Edge Add-ons store is the more reachable one from mainland China;
the Chrome Web Store is blocked there without a proxy.
