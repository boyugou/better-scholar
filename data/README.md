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
| Entries | 4889: 5th Annual Tcl/Tk Workshop 1997–1997 (1 yr); AAAI 2010–2026 (17 yrs); AAMAS 2006–2026 (20 yrs); ACL 2019–2026 (8 yrs); AIware 2024–2024 (1 yr); ALS 2000–2001 (2 yrs); ASE 2006–2025 (9 yrs); ASIACRYPT 2019–2025 (7 yrs); ASPLOS 2017–2022 (6 yrs); BSDCon 2002–2003 (2 yrs); C&C 2021–2026 (6 yrs); CCS 2012–2025 (14 yrs); CHI 2018–2026 (9 yrs); CHI PLAY 2020–2025 (6 yrs); CI 2025–2025 (1 yr); CRYPTO 2019–2025 (7 yrs); CSCW 2019–2026 (8 yrs); CVPR 1991–2026 (33 yrs); CoNLL 2026–2026 (1 yr); DIS 2024–2026 (3 yrs); EACL 2021–2024 (3 yrs); ECCV 1992–2024 (16 yrs); EMNLP 2019–2025 (6 yrs); ESEC/FSE 2005–2023 (5 yrs); EUROCRYPT 2019–2026 (8 yrs); EVT/WOTE 2009–2009 (1 yr); EuroSys 2016–2026 (11 yrs); FAST 2002–2026 (24 yrs); FAccT 2025–2026 (2 yrs); FOCS 2019–2025 (6 yrs); FSE 2012–2025 (5 yrs); Feedback Computing 2013–2013 (1 yr); HRI 2020–2024 (2 yrs); HotStorage 2020–2020 (1 yr); ICAC 2013–2014 (2 yrs); ICCV 1990–2025 (18 yrs); ICFP 2006–2025 (20 yrs); ICGSE 2019–2019 (1 yr); ICLR 2019–2026 (7 yrs); ICML 2017–2026 (10 yrs); ICPC 2020–2020 (1 yr); ICSE 2004–2025 (12 yrs); IH 2026–2026 (1 yr); IJCAI 2020–2023 (4 yrs); IMC 2005–2005 (1 yr); IMX 2020–2020 (1 yr); ISCA 2003–2025 (23 yrs); ISSTA 2002–2025 (17 yrs); IUI 2022–2022 (1 yr); JCDL 1998–2017 (20 yrs); JVM 2001–2001 (1 yr); Java VM 2002–2002 (1 yr); KDD 2016–2025 (9 yrs); LEET 2008–2008 (1 yr); LISA 2001–2013 (12 yrs); MICRO 2014–2025 (12 yrs); MODELS 2020–2024 (4 yrs); MSR 2025–2025 (1 yr); MobiSys 2003–2005 (3 yrs); MobileHCI 2025–2026 (2 yrs); NAACL 2019–2025 (4 yrs); NDSS 2017–2026 (10 yrs); NSDI 2004–2026 (21 yrs); NeurIPS 2014–2025 (12 yrs); OOPSLA 2007–2025 (19 yrs); OSDI 1996–2026 (15 yrs); PLDI 2000–2026 (27 yrs); PODC 2000–2002 (3 yrs); PODC/DISC 2003–2026 (24 yrs); PODS 1997–2026 (30 yrs); POPL 2003–2026 (24 yrs); S&P 2016–2025 (10 yrs); SIGCOMM 2008–2022 (15 yrs); SIGIR 1996–2025 (30 yrs); SIGMETRICS 1996–2026 (26 yrs); SIGMOD 1994–2026 (32 yrs); SIGOPS 2005–2025 (19 yrs); SIGecom 2015–2025 (11 yrs); SOUPS 2018–2025 (8 yrs); STOC 1990–2026 (35 yrs); TCC 2015–2025 (11 yrs); TEI 2018–2026 (4 yrs); UIST 2021–2025 (5 yrs); USENIX ATC 2001–2025 (23 yrs); USENIX Security 2001–2026 (24 yrs); USITS 2003–2003 (1 yr); UbiComp-ISWC 2024–2024 (1 yr); VLDB 1995–2026 (30 yrs); VM 2004–2004 (1 yr); VehicleSec 2025–2026 (2 yrs); WOOT 2011–2026 (9 yrs); WWW 2015–2026 (12 yrs) |
| Kinds | `best`, `outstanding`, `distinguished`, `runner-up`, `student`, `category` (a named category such as *Best Resource Paper* or *Best Theme Paper*, shown under its printed name), `tot` (test of time) |
| Source | **Official pages only.** Each entry has `source` (the page it was read from) and `evidence` (a quoted snippet that contains the title). Aggregator lists and Wikipedia are never a source |
| ACL family | [ACL Anthology](https://aclanthology.org) metadata (CC BY 4.0): the `<award name="…"/>` element on each paper, read by `scripts/awards/anthology.mjs`. Only years and venues the Anthology records are present |
| NeurIPS 2014–2018, ICML 2017–2018 | the years before the virtual sites list awards: `nips.cc/Conferences/<year>/Awards` (outstanding / best papers, the best student paper of 2016, the 2017 test-of-time award) and `icml.cc/Conferences/<year>/Awards` (best papers, runners-up and honorable mentions, test-of-time awards and their honorable mentions), seven hand-typed markups read by `scripts/awards/ml-archive.mjs`. Demonstration and reviewer awards are not read |
| ICLR, NeurIPS, ICML | each conference's own awards page on its virtual site (`/virtual/<year>/awards_detail`), read by `scripts/awards/virtual-site.mjs` with `scripts/awards/parse-virtual.mjs`. ICML 2023 also from its official awards page (`icml.cc/Conferences/2023/Awards`), which lists six outstanding papers. Where a virtual page is incomplete, the missing paper is added only when an official page names it |
| STOC | ACM SIGACT's own prize pages: *STOC Best Paper Award* (`sigact.org/prizes/best_paper.html`, 2003–2025), the Machtey / Danny Lewin *Best Student Paper* page (`…/student.html`, 1990–2025) and the *STOC Test of Time* page (`…/stoc_tot.html`, 2021–2026: 30, 20 and 10 years, with the paper's own year kept as `paperYear`), read by `scripts/awards/sigact.mjs`. A title that is mostly TeX is kept as printed, so Scholar's rendering of it may not match |
| NDSS | the NDSS Symposium's own year pages (`ndss-symposium.org/ndss<year>/`, 2017–2026), each page's "<year> Awards" section: Distinguished Paper Awards (called Best Paper Awards in 2026), the 2019 honorable mentions, the 2018 Cisco Network Security Best Paper Award and the Test of Time Awards (classic papers, with the year they appeared), read by `scripts/awards/ndss.mjs`. Poster, artifact and reviewer awards and the workshops' own best papers are not read |
| CCS | ACM SIGSAC's own pages: *ACM CCS Best Paper Awards* (`sigsac.org/ccs/CCS_awards/ccs-bestpaper.html`, 2013–2023: best papers to 2021, distinguished papers from 2022; the page was typed by hand in several layouts — authors and title on one line, on two lines, with affiliations in parentheses — and `scripts/awards/ccs.mjs` reads a line as authors for as long as every piece of it is a person's name) and *ACM CCS Test-of-Time Awards* (`…/ccs-tta.html`, 2012–2025, with the year of the original paper). The Test-of-Time page prints one title cut short (*Path ORAM: An Extremely Simple Oblivious*, 2023), kept as printed |
| VLDB | the VLDB Endowment's own *Test of Time Award* pages: `vldb.org/awards_10year.html` (2012–2026, "Award Winner(s)" and "Paper Title" lines; the 2017 entry lists a 2017 article — the award talk's retrospective, not the award paper — and is skipped) and the archive table `vldb.org/archives/10year.html` (1995–2011, the "10-year awards"; the paper in parentheses on the second line of each cell is the memorial talk and is not read), read by `scripts/awards/vldb.mjs`. Typos the pages print stay (*Sterfano Ceri*, *Constraint Maintainance*): a title that does not match a real paper marks nothing |
| WWW, ISCA, MICRO | test-of-time and influential-paper awards that one official page lists in full, read by `scripts/awards/tot.mjs`: the Web Conference's *Seoul Test of Time Award* (`iw3c2.org/ToT/`, 2015–2026), the *Influential ISCA Paper Award* (`sigarch.org/awards/acm-sigarchieee-cs-tcca-influential-isca-paper-award/`, 2003–2025, each with the ISCA year of the paper) and the *MICRO Test of Time Award* (`sigmicro.org/awards/tot/`, 2014–2025, including the 2014 round of ten classic papers from 1978–1992). The pages' own spelling is kept (*Qiaozhu Me* for the WWW 2026 winner's last author) |
| USENIX Test of Time | the USENIX Test of Time Awards page (`usenix.org/conferences/test-of-time-awards`, 2012–2026: USENIX Security, NSDI and FAST; each entry gives the paper's year in its "Published in …" line), read by `scripts/awards/usenix-tot.mjs`. Text the page hides in an HTML comment (a second 2020 Security entry) is not read |
| PODC / DISC | the *Edsger W. Dijkstra Prize in Distributed Computing* (`podc.org/dijkstra/`, 2000–2026: sponsored jointly by PODC and DISC, so the entries read "PODC/DISC"; a line "Authors for “Title” in …" per paper under its year's heading), read by `scripts/awards/tot.mjs dijkstra`. 2000–2002 were the *PODC Influential-Paper Award* (the page's footnote), and the entries carry that name and PODC alone. The citations are in free form, so no paper year is read |
| POPL, PLDI, ICFP, OOPSLA | SIGPLAN's *Most Influential Paper Award* pages (`sigplan.org/Awards/POPL/`, `…/PLDI/`, `…/ICFP/`, `…/OOPSLA/`: the paper presented ten years before the award year; per year the authors, then "(for 2016) Title" and a citation paragraph), read by `scripts/awards/tot.mjs popl|pldi|icfp|oopsla`. The page's own spelling is the title (its Halide row says "Representation" where the paper says "Recomputation", so that paper is not matched). Hand-typed stray quotes and commas in the older rows are dropped; entries whose authors are not names are reported and skipped |
| FOCS | the FOCS Test of Time Award page (`tc.computer.org/tcmf/focs-test-time-award/`, 2019–2025: "At FOCS 2025:", "1995 award (citations):", then "Authors:" and the title per paper; the paper's FOCS year is kept), read by `scripts/awards/tot.mjs focs`; a missing space after an initial is put back, a names line that does not read as names is reported and skipped |
| SIGOPS Hall of Fame | the SIGOPS Hall of Fame Award page (`www.sigops.org/awards/hof/`, 2005–2025: a heading per year, then per paper a list item "Authors. For their paper, <a>Title</a>. In …"; the paper may be of any venue — SOSP, OSDI, CACM, TOCS), read by `scripts/awards/tot.mjs sigops`; the title is the first link of the item, the page's blog list after the winners is ignored, a names line that does not read as names is reported and skipped |
| EuroSys | the EuroSys Test-of-Time Award page (`www.eurosys.org/awards/test-of-time-award`, 2016–2026: "EuroSys 2026 Test-of-Time Award Recipients", then "Authors, for their EuroSys 2016 paper Title"; under "Past Recipients" a line per paper, dated "2024:" except the newest, whose year is the paper's + 10 as in every dated row), read by `scripts/awards/tot.mjs eurosys`; a names line that does not read as names is reported and skipped |
| AAMAS | IFAAMAS's Influential Paper Award page (`aamas.csc.liv.ac.uk/award-influential.html`, 2006–2026: "2026:", then per paper three lines — "Authors (1994)", the title, the venue; the paper may be a book or a journal article), read by `scripts/awards/tot.mjs aamas`; the two 2019 rows, whose authors are written "Surname, I., …", are reported and skipped |
| SIGecom | the SIGecom Test of Time Award page (`sigecom.org/award-tot.html`, 2015–2025: a year heading, then per paper the title, the authors and the venue line(s); the paper may be of any venue — EC, SODA, STOC, a journal), read by `scripts/awards/tot.mjs ec`; a paper whose lines do not read as title / authors / venue is reported and skipped |
| ASPLOS | the ASPLOS Most Influential Paper Award rows of SIGPLAN's "Other Awards at SIGPLAN-sponsored Events" page (`sigplan.org/Awards/Other`, 2017–2022: a year line, "ASPLOS Most Influential Paper Award:", the authors, the title with ", ASPLOS 2008" after it in the newer rows), read by `scripts/awards/tot.mjs asplos`; 2023 and later are not on the page (SIGARCH's own page lists no winners) |
| CRYPTO, EUROCRYPT, ASIACRYPT | the IACR Test of Time Awards page (`iacr.org/testoftime/`, 2019–2026: a heading per year, "From Crypto 2010", then per paper a lead paragraph "<a>Title</a> by Authors"; commented-out blocks are ignored), read by `scripts/awards/tot.mjs iacr`; the paper's year is kept. CHES and PKC have their own awards on their own sites and are not read |
| TCC | the TCC Test of Time Award page (`www.iacr.org/workshops/tcc/awards.html`, 2015–2025: a heading per year, then per paper a paragraph "<a>Title</a> by Authors (affiliations). This paper was published in TCC 2006. The award is given for …"), read by `scripts/awards/tot.mjs tcc`; the paper's TCC year is kept where the page names it |
| SIGMETRICS | ACM SIGMETRICS's own awards page (`sigmetrics.org/awards.shtml`): the *Test of Time Award* "Past Winners" (2010–2026; the authors, the title in quotation marks, "In Proceedings of ACM SIGMETRICS …") and the *Paper awards* (1996–2026: best papers, the Sevcik / Lavenberg–Sevcik student paper awards and, since 2025, runners-up; `"Title" by Author (Affiliation), …` under category lines; the page says its list is incomplete), read by `scripts/awards/sigmetrics.mjs`. A paper that won both the best-paper and the student award (2013) has both entries; a surname-first first author (the 2017 row) is put right; an entry whose authors are not names is reported and skipped |
| SIGCHI conferences | SIGCHI's own conference programs: `programs.sigchi.org` draws each conference's *Awards* page from public JSON files (`files.sigchi.org/conference/cache/<id>/<version>/program`: content types, sessions, papers with their authors and an `award` flag; its robots.txt allows everything). A paper of the main *Papers* track flagged `BEST_PAPER` is a best paper, `HONORABLE_MENTION` an honorable mention (the two names the page shows; kind `runner-up`); other tracks' flags (late-breaking work, demos, pictorials, posters, works in progress), `BEST_DEMO` / `BEST_POSTER` and programs still marked as drafts (DIS 2023, IUI 2024, IMX 2022 / 2026, CUI 2024, CHI PLAY 2026, UIST 2026) are not read. Years with flags: CHI 2018–2026, CSCW 2019–2026, UIST 2021–2025, DIS 2024–2026, C&C 2021–2026, CHI PLAY 2020–2025, TEI (2018, 2023, 2024, 2026), MobileHCI 2025–2026, FAccT 2025–2026, HRI 2020 and 2024, IUI 2022, IMX 2020, CI 2025, IH 2026 and one paper of UbiComp-ISWC 2024. Read by `scripts/awards/sigchi.mjs`; the entry's source is the program file's address (with its version). A nickname in an author's name ("Sungsoo (Ray) Hong") is dropped. The program lists authors by person id, in the paper's order |
| SIGMOD, PODS | ACM SIGMOD's own award pages: the *SIGMOD Best Paper Award* table (`sigmod.org/sigmod-awards/sigmod-best-paper-award/`, 1994–2026: best papers, honorable mentions and the industry track's best paper and honorable mention from 2021 on; a title and its authors on two lines in 2022–2026, "Title. Authors" lines before) and the *PODS Best Paper Awards* list (`sigmod.org/pods-home/pods-best-paper-awards/`, 1997–2026), and the *SIGMOD Test of Time Award* list (`sigmod.org/sigmod-awards/sigmod-test-of-time-award/`, 1999–2026: a year, then "Title. Authors" per award; the page does not give the paper's year, so `paperYear` is left out), read by `scripts/awards/sigmod.mjs sigmod|pods|tot`. An entry whose title cannot be told from its authors is reported and skipped. The 2001 title is printed on the page with a typo ("Deduction" for "Reduction"), so that paper is not matched |
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
| IJCAI 2020–2023 | each conference site's *Distinguished Papers* page (`ijcai20.org/distinguished-papers/`, `ijcai-21.org/…`, `ijcai-22.org/…`, `ijcai-23.org/distinguished-paper-awards/`; 2021 also lists an honorable mention), four page markups, read by `scripts/awards/ijcai.mjs`. 2018, 2019, 2024 and 2025 have no such page (the proceedings prefaces list finalists or "TBA") |
| CVPR 2016 | the home page's best-paper lines (`cvpr2016.thecvf.com`); the authors come from the programme page (`cvpr2016.thecvf.com/program/main_conference`) entry with the identical title (`parseHomepageAwards`) |

Matching in the extension is deliberately strict (`src/lib/awards.js`): the full title must be identical
(ignoring case, accents and punctuation) **and** the award's first author must be among the paper's authors.
Tooltips say whether a mark comes from the list ("On the award list: …") or from the author's own words.

```bash
node scripts/awards/anthology.mjs --out raw/anthology.json          # fetches the Anthology XML (or --dir cache/)
node scripts/awards/virtual-site.mjs --out raw/virtual-site.json                 # ICLR, NeurIPS, ICML (virtual sites + ICML's own page)
node scripts/awards/cvf.mjs > raw/cvf.json                                        # the Computer Vision Foundation's list (CVPR, ICCV, ECCV)
node scripts/awards/aaai.mjs > raw/aaai.json; node scripts/awards/aaai.mjs --classic > raw/aaai-classic.json
for y in 2020 2021 2022 2023; do node scripts/awards/ijcai.mjs $y <that year's Distinguished Papers page> > raw/ijcai-$y.json; done
node scripts/awards/iclr.mjs blog 2025 https://blog.iclr.cc/2025/04/22/announcing-the-outstanding-paper-awards-at-iclr-2025/ > raw/iclr-2025.json   # likewise the other posts (see the reader's header)
node scripts/awards/iclr.mjs factsheet fact-sheet.txt > raw/iclr-2021.json                          # the text of the 2021 Fact Sheet PDF
node scripts/awards/acl-sites.mjs EMNLP 2023 https://2023.emnlp.org/program/best_papers/ > raw/emnlp-2023.json   # likewise EMNLP 2021 / 2024 / 2025 and NAACL 2025 (see the reader's header)
node scripts/awards/sigact.mjs best > raw/stoc-best.json; node scripts/awards/sigact.mjs student > raw/stoc-student.json; node scripts/awards/sigact.mjs tot > raw/stoc-tot.json
node scripts/awards/sigcomm.mjs > raw/sigcomm.json
for y in 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025; do node scripts/awards/sp.mjs $y > raw/sp-$y.json; done
node scripts/awards/sigmod.mjs sigmod > raw/sigmod.json; node scripts/awards/sigmod.mjs pods > raw/pods.json; node scripts/awards/sigmod.mjs tot > raw/sigmod-tot.json
for y in 2014 2015 2016 2017 2018; do node scripts/awards/ml-archive.mjs neurips $y > raw/nips-$y.json; done; for y in 2017 2018; do node scripts/awards/ml-archive.mjs icml $y > raw/icml-$y.json; done
for y in 2017 2018 2019 2020 2021 2022 2023 2024 2025 2026; do node scripts/awards/ndss.mjs $y > raw/ndss-$y.json; done
node scripts/awards/ccs.mjs best > raw/ccs-best.json; node scripts/awards/ccs.mjs tot > raw/ccs-tot.json
node scripts/awards/vldb.mjs current > raw/vldb-current.json; node scripts/awards/vldb.mjs archive > raw/vldb-archive.json
for k in www isca micro dijkstra popl pldi icfp oopsla focs; do node scripts/awards/tot.mjs $k > raw/tot-$k.json; done
node scripts/awards/usenix-tot.mjs > raw/usenix-tot.json
node scripts/awards/sigmetrics.mjs > raw/sigmetrics.json
node scripts/awards/sigchi.mjs CHI CSCW UIST DIS IUI TEI MobileHCI "CHI PLAY" CHIPLAY C\&C FAccT HRI IMX CI IH UbiComp-ISWC > raw/sigchi.json   # three seconds between requests; --dir <saved programs> reads files instead
node scripts/awards/usenix.mjs > raw/usenix.json; node scripts/awards/sigir.mjs > raw/sigir.json; node scripts/awards/sigsoft.mjs > raw/sigsoft.json
node scripts/awards/kdd.mjs 2014-2026 > raw/kdd.json                 # one page a second; a year in another form yields nothing
node scripts/awards/merge-raw.mjs raw/anthology.json raw/virtual-site.json raw/cvf.json raw/aaai.json raw/aaai-classic.json raw/ijcai-*.json raw/usenix.json raw/sigir.json raw/sigsoft.json raw/kdd.json raw/iclr-2025.json raw/iclr-2021.json raw/emnlp-2023.json raw/stoc-best.json raw/stoc-student.json raw/stoc-tot.json raw/sigcomm.json raw/sp-*.json raw/sigmod.json raw/pods.json raw/sigmod-tot.json raw/ndss-*.json raw/nips-*.json raw/icml-*.json raw/ccs-*.json raw/vldb-*.json raw/tot-*.json raw/usenix-tot.json raw/sigmetrics.json raw/sigchi.json --write  # validate (sources, evidence, kinds) and merge
npm run data                                                       # rebuilds src/data/awards.js
```

`merge-raw.mjs` also takes `--cross-check list.json` to compare against an independent list (for example
parsed from jeffhuang.com/best_paper_awards — it states no licence and does not separate award levels, so it
is a cross-check and never a source). All 21 top awards that list has for ACL agree with this file.

**Known gaps (on purpose):** IJCAI 2018, 2019, 2024 and 2025 (no official page lists the winners), AAAI before 2010,
and venues whose official lists are not yet read (CHI — its program site needs JavaScript —, SOSP's best papers, ASPLOS, UIST; best papers of ISCA, MICRO and WWW (only their test-of-time awards are read); VLDB's best papers; S&P before 2016 and its test-of-time papers; SIGCOMM after 2022; CCS before 2013 and from 2024 (its page covers 2013–2023);
the ACM's own "Conferences Best Paper Awards" pages answer every automated request with 403, which is not worked around);
older SIGSOFT lines in another form; NeurIPS before 2014 and ICML before 2017; EMNLP 2022 (no official page), NAACL 2024 (a slide deck).
A paper that only a secondary source names is never added. NeurIPS 2026
had no paper awards on its pages yet when this was written. Test-of-time rows whose page omits the paper title
are read from the award's own page when that names the paper and its first author (NeurIPS 2025 does); otherwise
they are skipped (ICML 2022 and 2026 today).

## Curated aliases

`src/data/aliases.js` (not generated) lists names that Scholar prints but the official titles do not
contain ("Advances in Neural Information Processing Systems", "International Conference on
Management of Data", …). Every alias must point at a real row in these datasets; a test checks it.
