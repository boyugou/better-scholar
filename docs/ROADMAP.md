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

**Built — a bundled list of award-winning papers** (6579 entries on 2026-10-12: the ACL family, ICLR, NeurIPS, ICML,
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
official page does is left out. The test-of-time rows whose award page omitted the paper title (NeurIPS 2025, ICML 2022 and 2026) are read now (2.9.39).

*Non-CS profiles (2026-10-12):* Scholar answers profile requests with its CAPTCHA redirect (not worked around), so no real non-CS profile could be read. As a stand-in, 400 works of ten non-CS fields (biology, physics, medicine, economics, chemistry, mathematics, psychology, geology, history, law; OpenAlex sample, 2018+, no key or e-mail in the request) went through the venue matcher and the award list: 389 venue strings, one ranked — a mathematician's paper in *IEEE TCAD*, a true CCF A match — and no title equal to an award paper. A second pass fed 800 journal names and abbreviations (800 random journals with over 5,000 works, `api.openalex.org/sources?filter=type:journal,works_count:>5000&sample=100&seed=<n>`) to the matcher: 12 ranked, every one a journal that really is on the CCF list (*TSE*, *TMM*, *JSS*, *Cognition*, *Journal of Symbolic Logic* …), none wrongly. To repeat it: fetch `api.openalex.org/works?filter=concepts.id:<id>,type:article&sample=40&select=title,primary_location` per field and run `createResolver(...).resolve("<source> 12 (3), 100-110, 2021")`.

*Known gaps, 2026-10-12 (so they are not rediscovered):* MobiCom best papers of 2013 and 2016 (no award is named on those years' pages) and the ones the strict reader drops in 2019–2024 (SIGMOBILE's list was written in 2017 and stops at 2012); IROS (only 2022's conference site is a real page — later years' domains now serve spam or nothing; a past
conference's own domain must be checked for what it serves before anything is read from it); SC (every page but the current year's answers 403; 2025's is read since 2.10.16); The Web Conference best papers other than 2022 and 2024 (one site per year, each laid out differently or gone); probed on 2026-10-12 and found to name no winner, or only finalists, or to be unreachable (so no reader was written): SIGCOMM 2022, 2023 and 2025; MobiSys 2018 (no award named) and 2024 (the program page is 2022's again); ICWSM 2022+; COLT 2023 (a copy of 2022's page) and 2025; SOSP 2022 and 2025; ASPLOS 2021 and earlier (2021 names none); RSS 2020, 2023 and 2024 (nominees / finalists); CoRL 2020 and 2021; AISTATS 2019, 2020 and 2024 (notable papers, no best paper); UAI 2022 and 2024; Interspeech 2023 (a shortlist); CIKM 2022–2024; WSDM 2022+; PPoPP 2020, 2021, 2024 and 2025; CGO (a "Distinguished Papers" session whose author lines glue the affiliation to the name); SC past years (finalists only on the program site); SODA (SIAM's pages answer 403); ACM's own "Conference Best Paper Awards" pages (acm.org answers Cloudflare's bot block, which is not worked around); IJCAI 2024 and 2025 (the proceedings mark only "Sister Conferences Best Papers", other conferences' papers); APPROX/RANDOM, ESA, SoCG, SAT, CP, ICALP, STACS, ITCS, CCC 2023 and FOCS before 2025 (only calls for papers, test of time lists already read, 404s or sites that no longer answer); NAACL 2024 (its "Best Paper Awards" link is a Google Slides deck, not a page), EMNLP 2022 and EACL 2026 (no awards page), DocEng 2025 (no award on the site), IMC 2023 and 2024 (their programs mark none); HPDC, CAV (the award is for tools and people), ECAI, ACM Multimedia, ICALP, KR, SoCG, PerCom and IEEE VR (no readable winners page found);
SODA, COLT, UbiComp before 2024, ICDM 2025's second runner-up (an author printed with one word). A web search for "<venue> best paper awards list" has found the series' own page twice (ICDM, SIGGRAPH) where menus did not.

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
