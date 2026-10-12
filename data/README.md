# Ranking data

The extension's rankings come from two public sources. Both are converted by scripts in
this repository, so the numbers in the UI can be traced to — and re-derived from — the
original files. `npm run data` turns the JSON files here into `src/data/*.js`.

## CCF — `ccf-2026.json`

| | |
|---|---|
| Source | 《中国计算机学会推荐国际学术会议和期刊目录（2026年）》— the **7th edition** (第七版, 正式版), published by the China Computer Federation |
| Index page | <https://www.ccf.org.cn/Academic_Evaluation/By_category/> |
| PDF | <https://www.ccf.org.cn/ccf/contentcore/resource/download?ID=112CF3BF7E1140ACEB271ADAED12A67ADFABB8FF099E40C2759502A85C8A281F> (72 pages) |
| PDF sha-256 | `271b630b576bf8a4f802e767f5694caded93680e22b3a19bef7902591c45c1d3` |
| Rows | 386 conferences (A 58 / B 132 / C 196) + 295 journals (A 37 / B 113 / C 145) = 681; by tier A 95 / B 245 / C 341 |

The totals match an independent third-party extraction of the same PDF. CCF itself publishes
only the *changes* against the 2022 edition (it states no totals).

Each entry: `kind` (`C` conference / `J` journal), `tier` (`A`/`B`/`C`), `area` (as printed, in
Chinese), `serial` (as printed), `abbr` (`""` when the PDF prints none — 48 journals), `name`, `publisher`,
`dblp` (the DBLP URL printed per venue), `page`.

### Why not parse the text layer?

PDFKit emits the table cells in a different order on every page, so plain-text extraction is
useless. `scripts/ccf/extract-pdf.swift` dumps every glyph with its bounding box;
`scripts/ccf/build-ccf.mjs` rebuilds the rows from the geometry (columns from horizontal gutters,
rows anchored on the serial-number cells, wrapped lines re-joined). The builder is deterministic
and asserts structural invariants; it refuses to run if an override does not match exactly one row.

### Regenerate

```bash
curl -L -o ccf7.pdf 'https://www.ccf.org.cn/ccf/contentcore/resource/download?ID=112CF3BF7E1140ACEB271ADAED12A67ADFABB8FF099E40C2759502A85C8A281F'
shasum -a 256 ccf7.pdf                                     # must equal the sha-256 above
swift scripts/ccf/extract-pdf.swift ccf7.pdf /tmp/ccf-chars.json   # macOS: needs PDFKit
node scripts/ccf/build-ccf.mjs /tmp/ccf-chars.json         # writes data/ccf-2026.json
node scripts/ccf/verify-ccf.mjs                            # counts, empty abbreviations, duplicates, diff vs the old hand table
npm run data                                               # rebuilds src/data/ccf.js
```

### Overrides

`ccf-2026.overrides.json` holds the only manual fixes — three abbreviation cells where the PDF
wraps a long abbreviation across two lines and the text layer cannot tell a wrap hyphen from a
printed one (`SIG-`/`METRICS` → `SIGMETRICS`, `INTER-`/`SPEECH` → `INTERSPEECH`, and
`JCOMPLEXI`/`TY` → `JCOMPLEXITY`). Each states the value the parser produced and why it is
wrong, and applies only to the PDF above. Typos that are in the PDF itself are *not* corrected:
the table says what CCF's file says.

### Reading the list correctly

CCF states that the catalogue **is not a basis for academic evaluation**, and that conferences
count **only full/regular papers** (short papers, demos, workshops, Findings are excluded). The
extension excludes secondary tracks it can recognise, but cannot tell a short paper from a full
one in Scholar's text. Tiers are those of this edition, not of the year a paper appeared.

Licence: the catalogue is © 中国计算机学会 (CCF). It is included for reference and is not
covered by this project's Apache-2.0 licence.

## CORE — `core-2026.json`

| | |
|---|---|
| Source | ICORE 2026 conference rankings, CORE (Computing Research and Education Association of Australasia) — public portal export <https://portal.core.edu.au/conf-ranks/> |
| CSV sha-256 | `607cb795bfadb47dbeab7db6ab91f96e5a5aef0c76fef1ec0d221926d7402242` (987 rows) |
| Kept | the letter ranks A\* (62), A (108), B (249), C (381) = 800 conferences; "National", "Unranked", "Australasian …" categories are dropped |

```bash
curl -s -o core.csv 'https://portal.core.edu.au/conf-ranks/?search=&by=all&source=ICORE2026&sort=atitle&page=1&do=Export'
node scripts/core/build-core.mjs core.csv                  # writes data/core-2026.json
npm run data
```

(The portal can be slow; retry if the download times out.) CORE's terms of use could not be
confirmed when this was added: the data is included with attribution for reference, and is not
covered by this project's licence. If CORE objects, remove `data/core-2026.json` and the CORE
badge — the rest of the extension does not depend on it.

## Paper awards — `awards-2026.json`

Award-winning papers, so a paper can carry a ★ chip even when its author did not write the award on
Scholar. **Not exhaustive**: a paper that is not listed simply has no mark.

| | |
|---|---|
| Entries | 2032: 5th Annual Tcl/Tk Workshop 1997–1997 (1 yr); AAAI 2010–2026 (17 yrs); ACL 2019–2026 (8 yrs); AIware 2024–2024 (1 yr); ALS 2000–2001 (2 yrs); ASE 2006–2025 (9 yrs); BSDCon 2002–2003 (2 yrs); CVPR 1991–2026 (33 yrs); CoNLL 2026–2026 (1 yr); EACL 2021–2024 (3 yrs); ECCV 1992–2024 (16 yrs); EMNLP 2019–2025 (6 yrs); ESEC/FSE 2005–2023 (5 yrs); EVT/WOTE 2009–2009 (1 yr); FAST 2002–2026 (23 yrs); FSE 2012–2025 (5 yrs); Feedback Computing 2013–2013 (1 yr); HotStorage 2020–2020 (1 yr); ICAC 2013–2014 (2 yrs); ICCV 1990–2025 (18 yrs); ICGSE 2019–2019 (1 yr); ICLR 2019–2026 (7 yrs); ICML 2019–2026 (8 yrs); ICPC 2020–2020 (1 yr); ICSE 2004–2025 (12 yrs); IJCAI 2023–2023 (1 yr); IMC 2005–2005 (1 yr); ISSTA 2002–2025 (17 yrs); JCDL 1998–2017 (20 yrs); JVM 2001–2001 (1 yr); Java VM 2002–2002 (1 yr); KDD 2016–2025 (9 yrs); LEET 2008–2008 (1 yr); LISA 2001–2013 (12 yrs); MODELS 2020–2024 (4 yrs); MSR 2025–2025 (1 yr); MobiSys 2003–2005 (3 yrs); NAACL 2019–2025 (4 yrs); NSDI 2004–2026 (21 yrs); NeurIPS 2019–2025 (7 yrs); OSDI 1996–2026 (15 yrs); PODS 1997–2026 (30 yrs); S&P 2016–2025 (10 yrs); SIGCOMM 2008–2022 (15 yrs); SIGIR 1996–2025 (30 yrs); SIGMOD 1994–2026 (30 yrs); SOUPS 2018–2025 (8 yrs); STOC 1990–2026 (35 yrs); USENIX ATC 2001–2025 (23 yrs); USENIX Security 2001–2026 (24 yrs); USITS 2003–2003 (1 yr); VM 2004–2004 (1 yr); VehicleSec 2025–2026 (2 yrs); WOOT 2011–2026 (9 yrs) |
| Kinds | `best`, `outstanding`, `distinguished`, `runner-up`, `student`, `category` (a named category such as *Best Resource Paper* or *Best Theme Paper*, shown under its printed name), `tot` (test of time) |
| Source | **Official pages only.** Each entry has `source` (the page it was read from) and `evidence` (a quoted snippet that contains the title). Aggregator lists and Wikipedia are never a source |
| ACL family | [ACL Anthology](https://aclanthology.org) metadata (CC BY 4.0): the `<award name="…"/>` element on each paper, read by `scripts/awards/anthology.mjs`. Only years and venues the Anthology records are present |
| ICLR, NeurIPS, ICML | each conference's own awards page on its virtual site (`/virtual/<year>/awards_detail`), read by `scripts/awards/virtual-site.mjs` with `scripts/awards/parse-virtual.mjs`. ICML 2023 also from its official awards page (`icml.cc/Conferences/2023/Awards`), which lists six outstanding papers. Where a virtual page is incomplete, the missing paper is added only when an official page names it |
| STOC | ACM SIGACT's own prize pages: *STOC Best Paper Award* (`sigact.org/prizes/best_paper.html`, 2003–2025), the Machtey / Danny Lewin *Best Student Paper* page (`…/student.html`, 1990–2025) and the *STOC Test of Time* page (`…/stoc_tot.html`, 2021–2026: 30, 20 and 10 years, with the paper's own year kept as `paperYear`), read by `scripts/awards/sigact.mjs`. A title that is mostly TeX is kept as printed, so Scholar's rendering of it may not match |
| SIGMOD, PODS | ACM SIGMOD's own best-paper pages: the *SIGMOD Best Paper Award* table (`sigmod.org/sigmod-awards/sigmod-best-paper-award/`, 1994–2026: best papers, honorable mentions and the industry track's best paper and honorable mention from 2021 on; a title and its authors on two lines in 2022–2026, "Title. Authors" lines before) and the *PODS Best Paper Awards* list (`sigmod.org/pods-home/pods-best-paper-awards/`, 1997–2026), read by `scripts/awards/sigmod.mjs`. An entry whose title cannot be told from its authors is reported and skipped. The 2001 title is printed on the page with a typo ("Deduction" for "Reduction"), so that paper is not matched |
| S&P | the IEEE Symposium on Security and Privacy's own awards page of each year (`ieee-security.org/TC/SP<year>/awards.html`, `sp<year>.ieee-security.org/awards.html`; 2016–2025): Distinguished Paper, Distinguished Practical Paper and Distinguished Student Paper awards (Best Paper / Best Practical Paper / Best Student Paper in 2020 and 2021), read by `scripts/awards/sp.mjs` (three page markups). Reviewer, poster, workshop and test-of-time awards are not read |
| SIGCOMM | ACM SIGCOMM's *Best Paper Award* page (`sigcomm.org/awards/best-paper-award`), the years it lists (2008–2022), read by `scripts/awards/sigcomm.mjs`. One line prints its title without quotation marks (2012) and is read after the last comma, with a note |
| EMNLP 2021, 2023, NAACL 2025 | years the Anthology's award metadata lacks, from the conferences' own pages: EMNLP 2023's *Best Papers* page (`2023.emnlp.org/program/best_papers/`, 5 best and 25 outstanding papers), EMNLP 2021's *Best Paper Awards* blog post (best long, best short, outstanding) and NAACL 2025's *Award Winners* blog post (best, runner-up, theme, social impact, outstanding), read by `scripts/awards/acl-sites.mjs`. The same reader parses EMNLP 2024 and 2025's pages into exactly the entries the Anthology gives (25 and 10, same kinds and first authors — a cross-check; those two files are merged too, which adds the page as `alsoAt`). Demo, SAC / area-chair, reviewer and People's Choice awards are not paper awards. EMNLP 2022 has no official list that was found and NAACL 2024's is a Google Slides link, so neither is read |
| ICLR 2021, 2025, 2026 | the years whose virtual-site awards page is empty. 2025 and 2026: ICLR's own blog posts *Announcing the Outstanding Paper Awards at ICLR 2025* / *…the ICLR 2026 Outstanding Papers* (Outstanding Papers and Honorable Mentions) and the *Test of Time* posts (`blog.iclr.cc`; Adam and Bahdanau et al. for 2015, DCGAN and DDPG for 2016). 2021: the 8 Outstanding Papers of the conference's Fact Sheet (`iclr.cc/media/Press/ICLR_2021_Fact_Sheet.pdf`; one title is printed without its first word; the entry carries the full title from the conference's own poster page, quotes both pages and lists the poster page under `alsoAt`; `--verify` re-fetches that page). Read by `scripts/awards/iclr.mjs`. For ICLR 2020 no official page naming best papers was found |
| CVPR 2025, ECCV 2024, ICLR 2019 | the conferences' own best-paper pages (`cvpr.thecvf.com/Conferences/2025/BestPapersDemos`, `eccv.ecva.net/Conferences/2024/Awards`, `iclr.cc/Conferences/2019/Awards`), read by `parsePaperAwardPage` |
| CVPR, ICCV, ECCV | the **Computer Vision Foundation's own award list** (`www.thecvf.com/?page_id=413`): one table per award — CVPR / ICCV (Marr Prize) / ECCV best papers, best student papers and honorable mentions, and the Longuet-Higgins (CVPR), Helmholtz (ICCV) and Koenderink (ECCV) test-of-time prizes — read by `scripts/awards/cvf.mjs`. Its 2023 and 2024 CVPR and 2021 ICCV rows match the conferences' own pages; 54 of its best papers agree with the independent cross-check list. Years before 1990 are left out |
| AAAI | AAAI's own paper-awards page (`aaai.org/about-aaai/aaai-awards/aaai-conference-paper-awards-and-recognition/`: Outstanding, Best (special tracks), Distinguished and Student papers with their honorable mentions, 2010–2026) and its Classic Paper Award page (`…/aaai-classic-paper-award/`, 2012–2026, as test of time), read by `scripts/awards/aaai.mjs`. Demonstration, poster and student-abstract awards are not paper awards and are left out; older lists print affiliations and are not read |
| USENIX | USENIX's own *Best Papers* list (`www.usenix.org/conferences/best-papers`, 9 pages: USENIX Security, OSDI, NSDI, FAST, ATC, SOUPS, LISA, WOOT, MobiSys … 1996–2026), read by `scripts/awards/usenix.mjs`. The page calls all of them best papers (USENIX Security's distinguished papers included), so the label is *USENIX Best Paper* |
| SIGIR, JCDL | ACM SIGIR's own award pages (`sigir.org/awards/`): best papers, best short papers (shown under that name), best student papers, and the Vannevar Bush best papers of JCDL it lists too; read by `scripts/awards/sigir.mjs` |
| ICSE, FSE, ASE, ISSTA … | ACM SIGSOFT's Distinguished Paper Award list (`www2.sigsoft.org/awards/distinguishedpaper/`), read by `scripts/awards/sigsoft.mjs`; only lines in the `Authors: Title` form are read — older lines in another form would be cut at the wrong colon and are skipped |
| KDD | SIGKDD's own best-paper pages (`kdd.org/awards/view/<year>-sigkdd-best-paper-award-winners`, one per year): best papers, runners-up, honorable mentions and best student papers of the Research, Applied Data Science and Dataset & Benchmark tracks, read by `scripts/awards/kdd.mjs`. 2016–2020 and 2022–2025 are in that form (2016–2019 mark each paper *Winner* or *Runner Up*, which decides its kind); 2014, 2015, 2021 and 2026 have no such page and are not read |
| IJCAI 2023 | the conference site's *Distinguished Paper Awards* page (`ijcai-23.org/distinguished-paper-awards/`), read by `scripts/awards/ijcai.mjs`. Only this year's page of that shape was reachable; other IJCAI years are not covered |
| CVPR 2016 | the home page's best-paper lines (`cvpr2016.thecvf.com`); the authors come from the programme page (`cvpr2016.thecvf.com/program/main_conference`) entry with the identical title (`parseHomepageAwards`) |

Matching in the extension is deliberately strict (`src/lib/awards.js`): the full title must be identical
(ignoring case, accents and punctuation) **and** the award's first author must be among the paper's authors.
Tooltips say whether a mark comes from the list ("On the award list: …") or from the author's own words.

```bash
node scripts/awards/anthology.mjs --out raw/anthology.json          # fetches the Anthology XML (or --dir cache/)
node scripts/awards/virtual-site.mjs --out raw/virtual-site.json                 # ICLR, NeurIPS, ICML (virtual sites + ICML's own page)
node scripts/awards/cvf.mjs > raw/cvf.json                                        # the Computer Vision Foundation's list (CVPR, ICCV, ECCV)
node scripts/awards/aaai.mjs > raw/aaai.json; node scripts/awards/aaai.mjs --classic > raw/aaai-classic.json
node scripts/awards/ijcai.mjs 2023 https://ijcai-23.org/distinguished-paper-awards/ > raw/ijcai.json
node scripts/awards/iclr.mjs blog 2025 https://blog.iclr.cc/2025/04/22/announcing-the-outstanding-paper-awards-at-iclr-2025/ > raw/iclr-2025.json   # likewise the other posts (see the reader's header)
node scripts/awards/iclr.mjs factsheet fact-sheet.txt > raw/iclr-2021.json                          # the text of the 2021 Fact Sheet PDF
node scripts/awards/acl-sites.mjs EMNLP 2023 https://2023.emnlp.org/program/best_papers/ > raw/emnlp-2023.json   # likewise EMNLP 2021 / 2024 / 2025 and NAACL 2025 (see the reader's header)
node scripts/awards/sigact.mjs best > raw/stoc-best.json; node scripts/awards/sigact.mjs student > raw/stoc-student.json; node scripts/awards/sigact.mjs tot > raw/stoc-tot.json
node scripts/awards/sigcomm.mjs > raw/sigcomm.json
for y in 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025; do node scripts/awards/sp.mjs $y > raw/sp-$y.json; done
node scripts/awards/sigmod.mjs sigmod > raw/sigmod.json; node scripts/awards/sigmod.mjs pods > raw/pods.json
node scripts/awards/usenix.mjs > raw/usenix.json; node scripts/awards/sigir.mjs > raw/sigir.json; node scripts/awards/sigsoft.mjs > raw/sigsoft.json
node scripts/awards/kdd.mjs 2014-2026 > raw/kdd.json                 # one page a second; a year in another form yields nothing
node scripts/awards/merge-raw.mjs raw/anthology.json raw/virtual-site.json raw/cvf.json raw/aaai.json raw/aaai-classic.json raw/ijcai.json raw/usenix.json raw/sigir.json raw/sigsoft.json raw/kdd.json raw/iclr-2025.json raw/iclr-2021.json raw/emnlp-2023.json raw/stoc-best.json raw/stoc-student.json raw/stoc-tot.json raw/sigcomm.json raw/sp-*.json raw/sigmod.json raw/pods.json --write  # validate (sources, evidence, kinds) and merge
npm run data                                                       # rebuilds src/data/awards.js
```

`merge-raw.mjs` also takes `--cross-check list.json` to compare against an independent list (for example
parsed from jeffhuang.com/best_paper_awards — it states no licence and does not separate award levels, so it
is a cross-check and never a source). All 21 top awards that list has for ACL agree with this file.

**Known gaps (on purpose):** IJCAI before 2023 and after (the other years' official pages are not of one shape, or PDFs), AAAI before 2010,
and venues whose official lists are not yet read (CHI, SIGPLAN, FOCS, SOSP, NDSS, S&P before 2016 and its test-of-time papers …; SIGCOMM after 2022; CCS, whose page is a different layout for most years); older SIGSOFT lines in another form.
A paper that only a secondary source names is never added. NeurIPS 2026
had no paper awards on its pages yet when this was written. Test-of-time rows whose page omits the paper title
are read from the award's own page when that names the paper and its first author (NeurIPS 2025 does); otherwise
they are skipped (ICML 2022 and 2026 today).

## Curated aliases

`src/data/aliases.js` (not generated) lists names that Scholar prints but the official titles do not
contain ("Advances in Neural Information Processing Systems", "International Conference on
Management of Data", …). Every alias must point at a real row in these datasets; a test checks it.
