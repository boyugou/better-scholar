# Roadmap

Ideas that are worth doing but not done, with the reasoning, so they are not rediscovered
from scratch. Roughly in order of value.

## Distinguish oral / spotlight / best paper

A talk-level or award marker next to the tier chip would be a useful third dimension for a
CV-style summary ("a first-author CCF-A paper, and it was an Oral"). **Not built yet, on purpose.**

Measured on 2026-10-11: across four real profiles (400 rows of titles and venue fields — including
one whose owner has CVPR'16 and ICCV'17 best papers) Scholar's text contained **zero** such
markers. Regex detection from the page would be code that never fires. Two routes would
actually produce data:

1. **Manual per-paper tags** (profile owners preparing a CV): a small star on a row to mark
   Oral / Spotlight / Best paper, stored per paper in `chrome.storage`, shown as a quiet chip
   (gold outline for awards, plain outline for talk level) and included in the copied summary.
2. **Opt-in lookups** against OpenReview (ICLR/NeurIPS/ICML decisions) and the ACL Anthology
   (award fields). Needs network, title matching and an explicit consent step — which
   conflicts with the "nothing leaves the browser" promise unless it is off by default.

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
