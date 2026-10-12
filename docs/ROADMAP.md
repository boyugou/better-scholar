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

**Built — a bundled list of award-winning papers** (5970 entries on 2026-10-12: the ACL family, ICLR, NeurIPS, ICML,
CVPR / ICCV / ECCV from the Computer Vision Foundation's list, AAAI, IJCAI 2020–2023, USENIX, SIGIR, KDD, SIGSOFT, STOC, SIGCOMM, S&P,
CCS, NDSS, SIGMOD, PODS, VLDB, and the test-of-time awards of WWW, ISCA, MICRO, USENIX, SIGMOD, SIGPLAN's most influential papers, SIGMETRICS, FOCS's test of time, SIGOPS's Hall of Fame, EuroSys's test of time, AAMAS's and ASPLOS's influential papers, the IACR test of time (CRYPTO / EUROCRYPT / ASIACRYPT), the TCC, PKC and CHES tests of time, HPCA's, IMC's and IEEE VIS's test of time, ICDE's influential papers, ISMAR's best and impact papers, ICSE's most influential papers, LICS's test of time and distinguished papers, AAAI's classic papers, ICAPS's influential papers, ISWC's ten-year papers, SIGMM's test of time, Hypertext's and DocEng's best papers, SIGDA's Newton technical impact award, SIGSPATIAL's best and 10-year impact papers, SIGCSE's test of time, ICWSM's test of time and best papers, SIGMOBILE's and SenSys's test of time, SIGecom's test of time and PODC / DISC's Dijkstra Prize; CHI, CSCW, UIST and other SIGCHI conferences from SIGCHI's own program data). Only official pages are sources (the ACL Anthology's award metadata; each
conference's own or the CVF's awards pages), each entry carries its page and a quoted snippet, and the matcher requires
the identical full title and the award's first author. Award kinds stay distinct (`best`, `outstanding`,
`distinguished`, `runner-up`, `student`, `category`, `tot`); an honorable mention is never upgraded.
Oral / spotlight lists stay author-written only: CVPR and ICCV's "Highlight" rows are about a tenth of the
papers, which is the 'too many' case, so they are not used.

**Next — more venues, where an official page exists.** UIST 2018–2020 and 2026, CSCW 2018, most IUI and MobileHCI years carry no award flags in SIGCHI's program data (and a few programs there are still drafts); SOSP, ASPLOS / HPCA, the distinguished papers of POPL / PLDI / OOPSLA, UIST and the best papers of VLDB, ISCA, MICRO and WWW (only their test-of-time awards sit on one official page) have a page per
year in different shapes; CCS's page covers 2013–2023 only (2024 and 2025 are on the conference sites). The ACM's own "Conferences Best Paper Awards" pages would cover most of them at once, but answer every automated
request with 403 and are not worked around. Add a reader only after reading the page's markup for every year it covers; review its output
line by line; test it with synthetic pages and a few well-known winners.
The independent list at jeffhuang.com/best_paper_awards (no licence, no award levels) is only a cross-check; a paper it names but no
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
