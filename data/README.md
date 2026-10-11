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

## Curated aliases

`src/data/aliases.js` (not generated) lists names that Scholar prints but the official titles do not
contain ("Advances in Neural Information Processing Systems", "International Conference on
Management of Data", …). Every alias must point at a real row in these datasets; a test checks it.
