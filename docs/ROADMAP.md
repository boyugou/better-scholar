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

**Built — a bundled list of award-winning papers** (434 entries on 2026-10-12: ACL family, ICLR, NeurIPS,
ICML, CVPR 2025, ECCV 2024). Only official pages are sources (the ACL Anthology's award metadata; each
conference's own awards pages), each entry carries its page and a quoted snippet, and the matcher requires
the identical full title and the award's first author. Award kinds stay distinct (`best`, `outstanding`,
`distinguished`, `runner-up`, `student`, `category`, `tot`); an honorable mention is never upgraded.
Oral / spotlight lists stay author-written only: CVPR and ICCV's "Highlight" rows are about a tenth of the
papers, which is the 'too many' case, so they are not used.

**Next — more venues, where an official page exists.** CVPR 2022–2024 and 2026, ICCV, ECCV before 2024, AAAI and
IJCAI: their best-paper pages were not reachable from the tooling when this was written. An independent list
(jeffhuang.com/best_paper_awards: no licence, no award levels) is only a cross-check; a paper it names but no
official page does is left out. Also open: test-of-time rows whose page omits the paper title (NeurIPS 2025,
ICML 2022 and 2026) — the detail page may carry it.

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
