# Roadmap

Ideas that are worth doing but not done, with the reasoning, and what was considered and set aside, with the
reasons — so that neither is rediscovered from scratch. Roughly in order of value. What has been built is in
[`CHANGELOG.md`](../CHANGELOG.md); a built item stays here only where it explains a limit or a next step.
[`ROADMAP.md`](../ROADMAP.md) at the root of the repository is the index of this page.

## Exports

**Built** (2.28–2.41). Twelve formats, each a button in the panel's copy row and in the toolbar popup with its own
switch under *Settings → Copy & export*: the summary as text, the summary table (tab-separated), the table as a picture
(*Copy as image*, a PNG), the papers (tab-separated), APA 7th edition, IEEE, the ACM Reference Format, GB/T 7714-2015, BibTeX, Markdown, JSON, and CSV
(saved as a file). IEEE, ACM, GB/T 7714 and the picture are off until switched on, so the default row is eight buttons. The table,
the papers and the four reference styles also put HTML on the clipboard, the references with the owner's name in bold. The text is made by
`src/lib/formats.js`; the same formats answer the `export` page call. The README's *Copy and export* has the details
(BibTeX keys such as `vaswani2017attention`, escaping, formula protection in the CSV and tab-separated text).

**Built — the ACM Reference Format** (2.41), the last style this list named. A further style is one more copy format: a row
`copy.<format>` in `SETTINGS`, its text in `lib/formats.js`, its case in `exportText()` (`content/main.js`), its label in every
language and an end-to-end check (`CONTRIBUTING.md`, *Adding a setting*).

## Filters and counts

**Built** (2.41). The role × rank table, the awards and talks counts and the panel's *Copy summary* / *Copy as table* count the
papers the narrowing filters leave (`counted()` in `src/content/main.js`; setting `panel.filters.follow`, on by default), so a
year range or *Last 5 years* (`age:<5`) gives the table of those years, and a search the table of the papers it finds. This
reverses an earlier choice (the table stayed whole because it is where a cell is picked). What decides it: the cell picked in
the table and an awards row are *picks* that list papers and narrow no count, so picking one never empties the list it is
picked from and the copied text equals what the panel shows; the table keeps the rows of the whole profile; the coverage lines
(loaded, hidden, absent), the year bars and the toolbar popup stay over every paper (the `summary` and
`export` take `filtered: true` for the panel's way). Not done: counting by the *year chart's* other filters (the bars stay
whole: a range is chosen against them), and a scope note on the table itself (the filter bar and the metrics line already say
which papers are counted).

**Built — your own quick filters** (2.41). Three buttons of your own words (`panel.filters.searches.search1` …, at most 60
characters, as typed in the search box), each with a switch, a place in the quick filters' order and a name (`labels.pillSearch1` …);
fixed slots rather than a list kind in `SETTINGS`, so that the order, the preview's hide, move and rename and the presets work on them
as on any other quick filter. `age:<=10` and the like need no button of their own now.

## Data freshness

**Built.** `.github/workflows/data-fresh.yml` runs `scripts/check-data-fresh.mjs` every Monday: the run fails when
the official CCF file or the ICORE export changed, is gone, or a newer edition is offered, and when a source cannot
be reached (no verdict). Regenerating the data stays a manual, reviewed step (`data/README.md`): a new CCF PDF needs
its extraction checked, as the 2022 layout showed (see *Tier at publication time* under *Considered and set aside*).

## Awards and talk kinds

**Built — what the authors wrote** (`src/lib/marks.js`, 2026-10-11). A paper whose title or venue text
says Oral / Spotlight / Highlight / Best, Outstanding or Distinguished Paper / Test of Time gets a chip
(gold ★ for an award, plain outline for a talk level, dashed for a finalist), the panel counts each
group, and the copied summary gets a line. The detector is precision-first: an award phrase counts in a
venue string; a talk word must stand alone (after a delimiter, year or venue acronym); in a title only a
trailing or leading `( … )` / `[ … ]` made of nothing but marker and venue/year words counts. Yield is
low by nature — across four real profiles (400 rows, including one whose owner has CVPR'16 and ICCV'17
best papers) Scholar's text contained **no** such markers — so this is best effort, not a promise.

**Built — a bundled list of award-winning papers** (7830 entries on 2026-10-12: the ACL family, ICLR, NeurIPS, ICML,
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

*Known gaps, 2026-10-12 (so they are not rediscovered):*

- MobiCom best papers of 2013 and 2016 (no award is named on those years' pages) and the ones the strict reader drops in 2019–2024 (SIGMOBILE's list was written in 2017 and stops at 2012)
- IROS (only 2022's conference site is a real page — later years' domains now serve spam or nothing; a past conference's own domain must be checked for what it serves before anything is read from it)
- SC (every page but the current year's answers 403; 2025's is read since 2.10.16)
- The Web Conference best papers other than 2022 and 2024 (one site per year, each laid out differently or gone)
- Probed on 2026-10-12 and found to name no winner, or only finalists, or to be unreachable (so no reader was written), or later found to have no series page:
  - SIGCOMM 2022 and 2023.
  - MobiSys 2018 (no award named) and 2024 (the program page is 2022's again)
  - ICWSM 2022+.
  - COLT 2023 (a copy of 2022's page) and 2025.
  - SOSP 2022 and 2025.
  - ASPLOS 2021 and earlier (2021 names none)
  - RSS 2020, 2023 and 2024 (nominees / finalists)
  - CoRL 2020 and 2021.
  - AISTATS 2019, 2020 and 2024 (notable papers, no best paper)
  - UAI 2022 and 2024.
  - Interspeech 2023 (a shortlist)
  - CIKM 2022–2024.
  - NOMS 2024 (PDF links only)
  - MICCAI 2022–2024 (403) and 2021 (404)
  - 3DV 2025 (the awards page lists candidates only) and ACCV 2024 (no award page)
  - WACV (the Computer Vision Foundation's page for it is gone)
  - ACM EC 2025 (the program has a "Best Papers Session" slot with no titles marked) and KR 2025 (no award on the site)
  - BMVC 2023 and 2024 (no award page linked from the sites), CIDR before 2025 (only 2025's awards page and 2009's best-paper presentation page exist; the other years' winners are marked in their programs), IUI (per-year pages; the steering committee lists the Most Impact papers, which are not best papers), SOSP 2019 and earlier (2019's page wraps titles and authors; other years' pages are gone), UAI before 2023 (404 or 500); NAACL 2017 and 2018, EMNLP 2017 and 2018, ACL 2017 (their sites answer but name no awards), ACL 2014–2016, EMNLP 2016 and EACL 2017 (410, 409, 406 or no answer), ACL 2018's best-paper and honourable-mention pages (acl2018.org resolves but does not answer a request), ACL 2016 and 2017, EMNLP and EACL before 2019 (no page that names the winners found); MobileHCI, MSR (researchr-hosted), ICS, PPoPP and ACM MM before 2023 (a domain-restricted search finds only people's pages and per-year program pages), FMCAD 2017, 2018 and 2024–2025 (the pages answer 404), KR 2023 (its preface's text lost ligatures and a surname) and before 2020 (no preface at that address), PAKDD (its awards page lays each year out differently, and the 2017–2018 lines separate authors and title with commas), DASFAA before 2024 (the sites do not answer or answer 403), Semantic Web ISWC 2018 (its winners are announced in prose on an http-only page, which the list does not take as a source), 2019 and 2021 (500, no answer) and 2020's research-track best paper (its awards page names only the resource paper), ICASSP 2025's paper-awards page (2025.ieeeicassp.org answers 403, a bot block, not worked around; 2023 and 2024 are read), ICASSP 2026 (no page found), ECIR 2021 (its award categories are described in prose), ECIR 2019 and 2022 (502, 406), ECIR 2023 and 2026 (the sites do not answer), the ACL Wiki's "Best paper awards" page (ACL, EMNLP, NAACL best papers before 2019; aclweb.org answers 418, a block, so it is not read), ICSME, ESEM, SANER and RE (no series page; SIGSOFT's distinguished-paper page, already read, covers ISSTA and the ACM SIGSOFT conferences); CogSci (the society's page lists the Marr Prize and modelling prize winners by name, without paper titles), EDM (one page per year), SC before 2025 (one page per year, answering 403), CAV, ICPP, HiPEAC and SYSTOR (no series page); IACR's CRYPTO, EUROCRYPT and ASIACRYPT best papers, VLDB's research-paper awards, EuroSys's best papers (the societies list the test-of-time awards already read; the best papers sit on one page per year), SCA 2021–2023, GROUP, IWQoS, NOSSDAV (no series page)
  - IEEE TCCA's award pages for ISCA and HPCA best papers (ieeetcca.org answers 406 from ModSecurity, not worked around), ESWEEK 2025's award page (the same list as 2024's, no 2025 winners yet), SIGBED and the Computer Society's technical committees (no page of conference winners found)
  - LREC, ICPR, IJCNN and PSB (no series page; ICPR's are one page per edition; ISMB's student award has a list but is not a paper award in the list's sense)
  - SAS (staticanalysis.org lists the Radhia Cousot award's recipients with their papers but no years, in a Latin-1 page, so the year of each is not read), MSST, ICCD, VEE (no series page, or researchr-hosted)
  - ISWC (a page per year on iswc.net; the SWSA's own site was not found), ICDE best papers (TCDE's archived page lists the influential papers already read), ECSA, ICSA, ICPC and SANER (researchr-hosted or no series page)
  - SIGGRAPH Asia (best papers only since 2022, one page per year), Eurographics's Enderle award (its page names the committee chairs; the winners are in the digital library), Pacific Graphics, EGSR, ICPP, Euro-Par, DASFAA, COCOON, ICCBR (no series page)
  - CPS-IoT Week (no page groups the conferences' awards; ICCPS, IPSN, RTAS and IoTDI show only per-year pages and news items, and an earlier probe of ICCPS's site got no answer)
  - I3D (the awards page the search points to is a 404), ICMR, WINE and PACT (no series page; only scattered per-year news)
  - CONCUR (only the test-of-time award has a series page), ISMB (the society lists the Overton Prize, not best papers), ECSCW (EUSSET's David B. Martin page describes the award without winners), CogSci, SGP (its awards page lists software, not papers), EDBT and SoCC (no series page found)
  - ER, ISSRE, ESEM, SEAMS, AIED and LAK (a web search finds no steering-body list, only per-year pages and news items; SEAMS's pages are researchr-hosted)
  - HPDC (each year's `awards/best-paper-award` page from 2019 to 2023 shows the same winner, LABIOS: a template copy, so none is read; 2024 and 2025 answer 404)
  - IROS's IEEE RAS award pages (ieee-ras.org answers Cloudflare's bot block, not worked around), the IEEE SPS awards (society awards, not ICASSP's best papers)
  - IROS and ICDAR (one differently laid-out page per year, and the IEEE RAS and IAPR summary pages were not found)
  - RTSS, RTAS and ECRTS (the IEEE TCRTS best paper page answers a Cloudflare bot block, which is not worked around)
  - DATE 2026 (2005–2025 are read, the earlier years from IEEE CEDA's page from the archive PDFs; 2015's layout interleaves authors and affiliations; none found for the rest)
  - MICCAI's society page (its winners are for the IJCARS journal, not the conference)
  - ACSAC 2024 (the program names the distinguished-paper session, not the papers), PETS, FPGA, HotOS, RAID, LAK and UMAP (no readable award page, or the site did not answer) and CoNEXT 2025 (a bare front page)
  - ESORICS, CSF, ICSA, Middleware, FC, MMSys, ISMB, GD, AsiaCCS and MSWiM 2025 (no award named on the pages that answered; the rest did not answer or 404; ICSA is researchr-hosted)
  - ICNP 2025 (the visible page shows the winner as an image; the title sits only in an HTML comment, which is not read) and ICDCS (the site answers 406)
  - WSDM 2022+.
  - PPoPP 2020, 2021, 2024 and 2025.
  - CGO (a "Distinguished Papers" session whose author lines glue the affiliation to the name)
  - SC past years (finalists only on the program site)
  - SODA (SIAM's pages answer 403)
  - ACM's own "Conference Best Paper Awards" pages (acm.org answers Cloudflare's bot block, which is not worked around)
  - IJCAI 2024 and 2025 (the proceedings mark only "Sister Conferences Best Papers", other conferences' papers)
  - APPROX/RANDOM, ESA, SoCG, SAT, CP, ICALP, STACS, ITCS, CCC 2023 and FOCS before 2025 (only calls for papers, test of time lists already read, 404s or sites that no longer answer)
  - NAACL 2024 (its "Best Paper Awards" link is a Google Slides deck, not a page), EMNLP 2022 and EACL 2026 (no awards page), DocEng 2025 (no award on the site), IMC 2023 and 2024 (their programs mark none)
  - most conf.researchr.org-hosted sites (POPL, PLDI, OOPSLA, ICFP, ECOOP, ICSE-family years: curl now gets a 13,918-byte CrowdSec CAPTCHA page, a bot challenge that is not worked around, and conf.researchr.org is no longer requested; MODELS 2025's awards track, read before the challenge appeared, is in the list), ECML PKDD 2022 and 2024 (no awards page), CIKM 2022 (www.cikm2022.org now serves a spam page at its award URLs, so nothing is read from it), HPDC, RTSS 2025 (the announcement names the authors without the titles), ACM Multimedia 2022 (candidates only) and 2024, CAV (the award is for tools and people), ECAI, ACM Multimedia, ICALP, KR, SoCG, PerCom and IEEE VR (no readable winners page found)
  - SODA, COLT, UbiComp before 2024, ICDM 2025's second runner-up (an author printed with one word)

A web search for "<venue> best paper awards list" has found the series' own page twice (ICDM, SIGGRAPH) where menus did not.

## Venue matching coverage

Unrecognised venues are listed in the panel. Feed real unrecognised strings back into
`test/fixtures` and `src/data/aliases.js` — the snapshot test makes each change reviewable.
A DBLP-derived alias table (the official catalogue prints a DBLP URL per venue) could extend
coverage offline without runtime network access.

*Wrong badges, 2026-10-16.* The reviewed snapshot is not proof of precision — it held an AAAI paper under IJCAI's badge. Questions put to the
22,744 real strings and to every official name of both lists found, in one day, fourteen wrong venues in the snapshot (AAAI as IJCAI,
PACM Software Engineering's ISSTA and FSE papers as ICSE, ACM ITS as CORE's ITS, SIGGRAPH Asia as SIGGRAPH …) and a dozen rules that
gave a venue's badge to a workshop, a regional edition, a journal's title or a cut name read as whole (each fixed, each pinned by a test; see the
CHANGELOG): *which acronym does the string name, and is it the badge's?*; *how many of its words are outside the venue's names?*;
*do the two lists name different venues?* (never, in the corpus); *is the same name printed another way answered the same?*; *does every official name,
in the forms Scholar prints it, come out as itself or as nothing?*; and two independent reviews that ran the old and the new matcher side by side
over perturbed copies of the corpus. Left as they are on purpose: an acronym that is both a journal and a conference of the lists and carries no
other sign ("CSCW" with pages is read as the conference, "World Wide Web" without a volume as the journal); "Proceedings of the ACM on Interactive,
Mobile, Wearable and Ubiquitous Technologies" (UbiComp's journal-first form, not on the lists); an acronym-only "X Workshops" for a venue whose
official name still says Workshop (HotOS, CORE's WACV).

*Print forms, 2026-10-17.* Every official name in 21 print forms (upper and lower case, `&` for "and", hyphens, no diacritics, "The …", "In …", pages, "Proc. of the …", year in front or behind, a quotation, …) comes out as itself or nothing — the exceptions are listed here because
no real string has them: a **publisher after the name** (", Springer, 2019": 31–40 rows lose their badge, and "SIAM International Conference on Data Mining, ACM, 2019" reads as ICDM; none of the 22,744 real Scholar lines ends with a publisher), "15th Annual" in front
of HotStorage, and the year written with a hyphen or jammed onto a mixed-case word ("Mobisys2019"; the jammed capital-letter acronyms and the apostrophe forms are read as events since 2.41.0). The probe: resolve each form of every row, count rows that lose the badge or get another venue's.

## Other ideas, not started

- **Name spellings beyond today's rules**: composite, hyphenated and other romanised names (Iberian double surnames,
  Nordic and East Asian romanisations). Like every name rule, only from real Scholar strings added to
  `test/fixtures`, never guessed: a wrong owner match is a wrong role. The roles review of 2026-10-29 left three more, for the same
  reason: "and" in other languages as a separator ("y", "und", "et" — also words of names and titles), the reversed spelling
  ("Wei Zhang" printed "Zhang W") taken without the person's say, and lists in alphabetical order (economics, mathematics), where
  first and last say nothing of the work: a setting could say so, the page cannot tell.
- **An export's type with the rank lists off**: with both lists switched off, "Advances in neural information processing systems 25,
  1097-1105" is typed by its words alone (a journal's shape: volume, pages) — as Scholar's own BibTeX does. The kind of venue the lists
  know could be used whether or not their chips are shown.
- **A list of the keys in the panel**: built (2.41) — the `/` hint's tooltip has a line of the keys (Enter, Shift+Enter, ↓, Esc),
  and the search box's description for a screen reader is that line.
- **User-defined weighting of ranks**, a score per role and rank. The panel shows CCF's own statement that its list
  is not a basis for academic evaluation; a score would have to keep saying so.
- **An MCP server** for AI assistants outside the browser. An extension reaches a program outside the browser only
  through native messaging: a new permission (`nativeMessaging`) and a program the user installs, which the
  permission policy asks a very good reason for. Agents that drive a browser already have the page events and the
  agent guide.
- **An acronym inside a name** (seen 2026-10-29): "International ISC Conference on Information Security and Cryptology" is the Iranian ISCISC,
  read as Inscrypt — shadows count an acronym in front or in a parenthesis only.
- **Cut-off venue lines that unlisted venues share.** Scholar cuts a long venue name ("… International Conference on Machine Learning and
  …"), and the start-of-a-cut-name rule gives the badge of the one listed venue whose name begins that way; the lists cannot say which
  unlisted venues begin so too. Measured 2026-10-29 by cutting the 52,800 Crossref / OpenAlex titles of `test/fixtures/real-titles.txt`
  where Scholar would: of the cut titles that carry a year (and no hidden track word), 882 keep the whole title's badge and 183 got
  another. The owner chose the edition check: 18 venues have their numbering in aliases.js (`edition`), which took the 183 to 132 and
  cost no right badge there. What is left: venues whose lines print no edition (CIDM, SIGGRAPH's other conferences) and venues not
  yet anchored — more anchors, each checked against the venue's own lines, as the measurement shows where they pay.
- **End-to-end pictures at other display scalings** (Chromium only — other engines are out of scope by the platform
  policy). The end-to-end run already takes `E2E_SCALE` for the website's pictures; nothing compares them yet.

## Accessibility

What is checked: `node scripts/axe-audit.mjs` runs axe-core 4.10's default rules over the panel on the local Scholar
stand-in (light, with the system in dark mode, filtered with the unranked-venue list open, every part on, the
narrow-window layout, in Arabic, Japanese, Thai and German), the settings page (light and dark, and in the states a person
puts it in: a part hovered, a name being renamed, the tray open, a venue checked) and the toolbar popup (no profile tab, and
over a profile in light and dark and in four languages), measures the popup with every name at its longest, and exits 1 on any
violation; CI runs it in the demo job (since 2026-10-29), and `npm run check:all` in its second lane. `npm run audit:overflow` measures the settings page in 30 languages × 7 widths ×
light and dark for anything that runs out of its box (also with every name at 30 characters). Unit tests keep the faint text
colours at a contrast of 4.5:1 or more and the text of every chip at any picked colour (`test/palette.test.js`), and the
settings page rates each role colour against Scholar's white page (3:1). The preview on the settings page is out of the tab
order and not read out: the controls on the left are the page for a keyboard and a screen reader. None of this is a claim of
conformance to a WCAG level.

*Audit of 2026-10-12* (axe-core 4.10, then injected into the end-to-end pages): on the settings page (light and dark),
the panel (also with the year list open, and in two presets of that version) and the popup, after 2.10.83 no
violation remained that the extension owns (the three left — one main landmark, a level-one heading, content in
landmarks — belong to the stand-in Scholar page). A Tab walk through the panel reached all 34 controls in reading
order, each with a visible focus style and an accessible name. axe reported one dark-mode chip contrast failure
mid-transition; the computed colours (white pill, #3345a8 text, 8.6:1) showed it was not real.

## Decided by the owner (2026-10-29)

- **No `activeTab` for exact advice in the popup.** A profile opened before an install or update has no script of the extension; with `storage`
  alone the popup cannot read a tab's address, so it cannot tell that tab from any other page. Since 2026-10-29 it says in a general line,
  only from an install or update until a profile answers, that such a profile needs a reload — which covers the case. `activeTab` (no
  install warning, granted when the popup is opened) would let it say so only on a Scholar page, with a button; not worth a new permission.
- **No third ranking list for now** (for instance TH-CPL, the list of Tsinghua University's computer science departments, which many
  Chinese institutions read beside CCF's). It would need its own extraction from its official source and an audit like CCF's and CORE's,
  a column, a chip and a switch, and it overlaps CCF's list for most venues. Revisit if users ask for it (an institution that evaluates by it).

## Considered and set aside (2026-10-13)

So that they are not rediscovered from scratch:

- **DBLP person pages** (the best-aligned second surface for CCF users: `li.entry` ids are DBLP keys such as `conf/cvpr/HeZRS16`, and 679 of the 681 CCF venues carry their `dblp` URL, so the match could be exact; full ordered author lists, but no citation counts, so no h-index there). A scripted request to `dblp.org` is now answered with a proof-of-work bot check ("Making sure you're not a bot!"), which is not worked around, so there is no real page to develop against; a reader written from memory of the markup would break the "develop against real data" rule. Revisit if a saved page is supplied.
- **Semantic Scholar author pages** (summary only; the data would come from `/author/<id>/papers`). The author-ID graph contains misattributions (the profile of a well-known author returned another person's paper in its first three results), so roles computed from it would carry wrong badges; the shared unauthenticated pool also rate-limits within a handful of requests, and the API's licence does not allow shipping a key with the extension (the optional key in the settings is the user's own). The opt-in title lookup for cut-off author lists (2.12.0, with a precision check on first author and year) is the safe part of that idea.
- **Preprint → published venue through Semantic Scholar**: its record merges versions, so a venue can belong to another version of the paper (the same reason its venue is not used in the author-list lookup).
- **SCImago / JCR quartiles for journals outside the CCF list**: licensing of redistributed data is unclear and matching ~30k journal titles exactly is a large data build for a content script that runs on every profile.
- **Sorting the paper list by rank or role**: Scholar re-renders the list when its own sort headers are used and appends rows on *Show more*; keeping a reordered list consistent with both would be fragile for little gain next to the cell filters.
- **Frequent co-authors, and comparing roles across co-authors**: the key would be surname + initial, which merges different people ("J Wang"); a wrong claim about who someone works with is worse than none.
- **Rank chips on Scholar's search results**. Evaluated on 2026-10-13 (two queries, ten results each, through the user's own Chrome; Scholar's CAPTCHA answers scripts): a result's source line is cut to fit — authors (`N Parmar…`) and venue (`Advances in neural …, 2017`, `International Conference on …, 2026`, `IEEE Transactions …, 2026`, `Proceedings of the 26th …, 2017`, `2023 IEEE 39th …`) — so of the twenty results the resolver ranks three (`ACM Transactions on Storage (ToS)`, `Proceedings of the 2012 ACM SIGMOD …`, `ICASSP 2021-2021 …`; the strings are in the venue corpus), the arXiv ones are rightly unranked and the other thirteen or so are cut beyond use. (The same read found a real wrong badge, fixed in 2.22.8: `2023 IEEE 39th …` was taken for the journal *Proceedings of the IEEE*.) A chip on one result in seven, with no way to say that a missing chip means "cut off" and not "unranked", would read as broken; resolving the cut ones would need a request per result to an outside service, and the extension makes no such request (its one request outside Scholar is the opt-in Semantic Scholar title lookup for a cut-off author list). The publisher host (`proceedings.neurips.cc`, `proceedings.iclr.cc`) names two series, but `dl.acm.org`, `ieeexplore.ieee.org` and `aclanthology.org` name none. Revisit only if Scholar stops cutting the line.
- **Tier at publication time** (CCF 2019 / 2022 and earlier ICORE editions instead of today's lists). The data side is uneven. CORE is easy and exact: the portal exports every edition (ERA2010, CORE2013 / 2014 / 2017 / 2018 / 2020 / 2021 / 2023, ICORE2026) as the same CSV, and its ids are stable (checked 2026-10-13: 953 of ICORE2026's 987 rows have the same id and the same venue in CORE2023, none a different one). CCF is the blocker, and CCF is what the main audience reads: its sources are there, CCF's own site serves the 2019 catalogue (`https://www.ccf.org.cn/ccf/contentcore/resource/download?ID=99185`, 74 pages, sha-256 `3ad7de2a…0729`) and the 2022 one (attached to the notice of 2025-05-09, `…download?ID=5CB6670D4D81C9197633DF76D9843ED98D61484435CC1D2FB27663252659138E`, 73 pages, sha-256 `dda21c1a…a28b`); the 2013 and 2015 editions have announcement pages only. But `scripts/ccf/build-ccf.mjs` stops on the 2022 layout (the journal column is headed 刊物简称, and cells sit 4–8 pt from their row's serial, so rows cannot be told apart), so each edition needs its own geometry pass and audit, with no independent totals to check against. Matching a venue across editions needs a stable identity (renames, venues dropped from today's list) that only a hand-made table would give, and institutions disagree on which edition counts (the latest, or the one in force). A mode that works for CORE and not for CCF would be half a feature, and a wrong or missing badge in a mode meant for evaluators costs more than the limitation the note already states. Revisit if someone asks for it and brings the policy they need.

## Considered and set aside (2026-10-17)

- **Plural-insensitive matching** ("Telecommunications" for "Telecommunication"). It would merge distinct venues whose names differ only by a plural: INFOCOM (*Computer Communications*) with ISCC (*Computers and Communications*), CGI (*Computer Graphics International*) with *Computers & Graphics*. The one real plural gap in the per-venue Crossref titles (MASCOTS) is an alias.
- **Demanding the spelled name for every one-word name key** ("Annual Cryptology Conference", "Proceedings Visualization'93"): it would remove "International Supercomputing Conference" read as ICS, and 38 correct badges with it. Only a tie between venues is broken by the name the string spells (and by the acronym it names).
- **IEEE's own tag after an early-2000s title** ("… International Test Conference TEST-02", "… VISUAL-04"): the tag repeats a word of the name and is no venue's acronym; 22 titles in 75,000, few of them ranked.
- **Marking a badge that rests on a tie** between venues of one rating ("International Conference on Data Mining" is ICDM or SDM, CCF B either way): about one line in 5,000 of the real titles; the rank is right, the venue named may not be.
- **A roving-focus grid for the role × rank table** (one Tab stop, arrows in two dimensions): the table is 15–25 stops on a typical profile; the year bars, which were up to 50, are one stop now. The table is the panel's main control and keeps its plain buttons.

## Distribution

Stores are a nice-to-have, not a requirement; GitHub plus *Load unpacked* is the primary route, and no store
listing has been made. The listing kit is ready in [`store/README.md`](../store/README.md): the description,
1280×800 screenshots, promo tiles and the answers to the privacy form; the privacy policy is the website's copy of
`PRIVACY.md`, and the permission set is already minimal (`storage`). What remains is the per-store listing itself
(Edge's policy asks that listings not mention other browsers). The Edge Add-ons store is the more reachable one
from mainland China; the Chrome Web Store is blocked there without a proxy.
