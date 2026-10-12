# Changelog

## 2.3.1 — 2026-10-12

- Matcher, from a sweep of realistic Scholar strings for AI, systems and security venues:
  - **No badge for tracks that are not a conference's main proceedings**: *Tiny Papers*, *Blogpost*, *Creative AI* and
    *Competition* tracks, *AAAI Symposium Series* / *Spring Symposium*, *Sister Conferences*, *Journal Track* /
    *Journal-First* (they used to inherit the main conference's rank).
  - `ACM CCS 2023`, `IEEE INFOCOM 2020`, `USENIX NSDI 2022`, `IEEE/ACM ASE 2023`: an organisation word in front of the acronym is
    ignored. `Proceedings of the ACM Web Conference 2024` is WWW. A PMLR tail (`…Machine Learning, PMLR 235:12345-12367`)
    is dropped, so those ICML strings match.

## 2.3.0 — 2026-10-12

- **More paper awards: the list grows from 440 to 857 entries.** The **Computer Vision Foundation's own award
  list** gives CVPR, ICCV (Marr Prize) and ECCV best papers, best student papers and honorable mentions back to
  1990, plus the Longuet-Higgins, Helmholtz and Koenderink **test-of-time prizes** — so *Deep Residual Learning* now
  shows both *Best paper* (CVPR 2016) and *Test of time* (CVPR 2026). **AAAI**'s paper-awards page (Outstanding, Best of
  the special tracks, Distinguished and Student papers with their honorable mentions, 2010–2026) and its **Classic Paper
  Award** page (2012–2026) are read too, and **IJCAI 2023**'s Distinguished Paper Awards. Each entry still cites its
  official page and a quoted line, and the matcher still needs the identical title and the award's first author. New
  readers: `scripts/awards/cvf.mjs`, `aaai.mjs`, `ijcai.mjs`; the CVF rows for CVPR 2023 / 2024 and ICCV 2021 were
  checked against the conferences' own pages.

## 2.2.1 — 2026-10-11

- **NeurIPS Datasets and Benchmarks Track papers are NeurIPS (CCF A / CORE A\*) in every spelling** — the phrase
  *Datasets and Benchmarks (Track)* (also *Track on Datasets and Benchmarks*, *Datasets; Benchmarks*, *D&B Track*,
  *(Round 2)*) is dropped before matching, so `NeurIPS Datasets and Benchmarks Track, 2024` and
  `Advances in Neural Information Processing Systems 36, 2023 (Datasets and Benchmarks Track)` are no longer missed
  (the year-first form `NeurIPS 2025 Datasets and Benchmarks Track` already worked). A workshop on the subject, or a
  title that merely says it, is still not NeurIPS.
- A dropped "h" in a spelled-out ordinal no longer hides a conference: `The Thirty-eight Conference on Neural
  Information Processing Systems` (also *Thirty-nine*; only after a tens word).
- The end-to-end test brings the tab under test to the front (a background tab cannot be screenshotted on Linux CI).
- With every author position switched off nothing is highlighted, so *Only highlighted* is cleared and hidden instead of
  hiding every row.

## 2.2.0 — 2026-10-11

- **Settings page** — what the extension draws is now configured in one place instead of in the panel:
  which author positions are coloured, whether your name is marked, the CCF and CORE chips, each of Awards /
  Oral / Spotlight / Highlight, and whether the summary panel, its filters and its citation totals appear at
  all. A live preview shows the result, changes reach open Scholar tabs at once, and whatever is switched off
  disappears from the page (a hidden filter also stops filtering). Open it with the sliders button in the
  panel header or the toolbar popup. With both rank lists off the table shows roles only.
  Technically: preferences (`prefs`, written only by the settings page) and view state (`ui`, written only by the
  Scholar page) are separate records, so a stale tab can never overwrite a saved choice; settings from earlier
  versions carry over once. A four-line service worker opens the settings page for the panel's button.
- **The panel keeps only quick controls**: the ranking tab, *Only highlighted*, the year range and the
  clickable counts. The role / badge / name switches that used to sit in it are gone.
- **Quieter rows.** The *1st / 2nd / Co-1st / Last* chip is gone: the row tint and the marked name already say
  it, and hovering the name gives "First author · position 1 of 8". The owner's name is now marked by default
  and the choice is remembered. CCF / CORE chips are white pills with an indigo outline that fades with the
  tier (no more black blocks). The question-mark cursor over chips is gone.
- **Awards and talks, one visual language.** Awards are gold (an honorable mention silver, a finalist
  dashed), talk levels slate, all with the same small icons. In the panel they are a section of their own: one row
  per group with its count, the same icons, click a row to list just those papers.
- Fixed: the toolbar popup printed a stray "null" under the table when the profile had no awards or talks.
- Maintenance: `npm run check:profile -- page.html` runs the extension on a real saved Scholar page and checks the
  selector contract and the drawn result (verified on a 100-paper profile saved from live Scholar: every
  selector present, tints / chips / marks identical to the libraries, the one list award found).

## 2.1.0 — 2026-10-11

- **Renamed** to *Scholar Author Roles & Venue Ranks* (was "Byline", earlier "Scholar Lens"): a plain
  name for what it shows. The UI now says "rank" throughout; the GitHub repository moved to
  `boyugou/scholar-author-roles-and-venue-ranks` (the old URL redirects). Saved settings are kept.
- **Awards and talk levels the authors wrote** — *Oral*, *Spotlight*, *Highlight*, *Best / Outstanding /
  Distinguished Paper*, *Test of Time* in a paper's title or venue text become a small chip (awards in gold
  with a ★), a count in the panel that filters the list, and a line in the copied summary. A switch turns
  it off. Nothing is looked up: only the author's own words are read, and the tooltip says "not checked".
- **Paper award list** (`lib/awards.js`, `data/awards-2026.json`, 440 entries): a paper is matched to an
  award-winning paper by full title *and* first author, and tooltips say where a mark came from. Entries come
  only from official pages — the ACL Anthology's award metadata for the ACL family, and ICLR, NeurIPS and ICML's
  own awards pages (and the CVPR 2025 and ECCV 2024 best-paper pages) — each with its source and a quoted snippet. Not exhaustive: a missing paper has no mark.
  Named categories (*Best Resource Paper*, *Outstanding New Directions Paper*) show under their printed names.
- **Matcher fixes from nine more real profiles** (HCI, networking, software engineering, programming
  languages, security, graphics, theory): Computer Graphics Forum is the journal, not Computer Graphics
  International; the CHI proceedings' own name (`2018 CHI Conference on …`); SIGGRAPH proceedings
  (`… conference on Computer graphics and …`) no longer read as CGI; INFOCOM no longer read as CCS, ICSE as
  SEKE, PODS as SIGMOD; publisher names (`ACM`, `IEEE`) are not venues; `ACM Trans. Graph.` and other ISO
  abbreviations; SC, I3D, AVI, POPL names. A truncated name is no longer claimed on one common word.
- Verified once on a live Google Scholar profile: all 100 visible rows classified identically to the
  library, *Load all* and *Resolve* worked. Scholar prints a no-break space before the truncating "…";
  now covered by tests.

## 2.0.0 — 2026-10-11

Rebuilt around pure, corpus-tested libraries (names, venues, metrics, analysis): Chrome-first MV3
content-script extension, CCF 2026 (7th edition) and ICORE 2026 extracted reproducibly, role × rank
summary with filters, *Load all* and *Resolve*, English and 简体中文. See `docs/ARCHITECTURE.md`.
