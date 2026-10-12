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
| Entries | 434: ACL 2019–2026 (8 yrs); CVPR 2025–2025 (1 yr); CoNLL 2026–2026 (1 yr); EACL 2021–2024 (3 yrs); ECCV 2024–2024 (1 yr); EMNLP 2019–2025 (4 yrs); ICLR 2022–2024 (3 yrs); ICML 2019–2026 (8 yrs); NAACL 2019–2022 (3 yrs); NeurIPS 2019–2025 (7 yrs) |
| Kinds | `best`, `outstanding`, `distinguished`, `runner-up`, `student`, `category` (a named category such as *Best Resource Paper* or *Best Theme Paper*, shown under its printed name), `tot` (test of time) |
| Source | **Official pages only.** Each entry has `source` (the page it was read from) and `evidence` (a quoted snippet that contains the title). Aggregator lists and Wikipedia are never a source |
| ACL family | [ACL Anthology](https://aclanthology.org) metadata (CC BY 4.0): the `<award name="…"/>` element on each paper, read by `scripts/awards/anthology.mjs`. Only years and venues the Anthology records are present |
| ICLR, NeurIPS, ICML | each conference's own awards page on its virtual site (`/virtual/<year>/awards_detail`), read by `scripts/awards/virtual-site.mjs` with `scripts/awards/parse-virtual.mjs`. ICML 2023 also from its official awards page (`icml.cc/Conferences/2023/Awards`), which lists six outstanding papers. Where a virtual page is incomplete, the missing paper is added only when an official page names it |
| CVPR 2025, ECCV 2024 | the conferences' own best-paper pages (`cvpr.thecvf.com/Conferences/2025/BestPapersDemos`, `eccv.ecva.net/Conferences/2024/Awards`), read by `parsePaperAwardPage` |

Matching in the extension is deliberately strict (`src/lib/awards.js`): the full title must be identical
(ignoring case, accents and punctuation) **and** the award's first author must be among the paper's authors.
Tooltips say whether a mark comes from the list ("On the award list: …") or from the author's own words.

```bash
node scripts/awards/anthology.mjs --out raw/anthology.json          # fetches the Anthology XML (or --dir cache/)
node scripts/awards/virtual-site.mjs --out raw/virtual-site.json                 # ICLR, NeurIPS, ICML (virtual sites + ICML's own page)
node scripts/awards/merge-raw.mjs raw/anthology.json raw/virtual-site.json --write  # validate (sources, evidence, kinds) and merge
npm run data                                                       # rebuilds src/data/awards.js
```

`merge-raw.mjs` also takes `--cross-check list.json` to compare against an independent list (for example
parsed from jeffhuang.com/best_paper_awards — it states no licence and does not separate award levels, so it
is a cross-check and never a source). All 21 top awards that list has for ACL agree with this file.

**Known gaps (on purpose):** CVPR 2022–2024 and 2026 and ICCV best papers, and ICML 2022, are on an independent
list but not on any official page this tooling can reach, so they are not in the file. Add them when an official
page is found; a paper that only a secondary source names is never added. ICLR 2025–2026 and NeurIPS 2026
had no paper awards on their pages yet when this was written. Test-of-time rows whose page omits the paper title
(NeurIPS 2025, ICML 2022 and 2026) are skipped rather than guessed.

## Curated aliases

`src/data/aliases.js` (not generated) lists names that Scholar prints but the official titles do not
contain ("Advances in Neural Information Processing Systems", "International Conference on
Management of Data", …). Every alias must point at a real row in these datasets; a test checks it.
