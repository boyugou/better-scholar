# Changelog

## 2.5.0 — 2026-10-12

- **A profile name written surname first is read the other way round, automatically.** Of 22 real public profiles the owner was found
  in nearly every paper on 20; on the two Chinese-name profiles whose header reads `Tang Jie` / `Huang Xuanjing (黄萱菁）` — the papers
  print `J Tang`, `X Huang` — in none. The panel then said "73 papers where the profile name is not in the author list" and
  every role was blank until the owner typed a spelling. Now, when the name as printed finds the owner in under 10% of at least
  8 rows and the reversed order in at least four times as many (and a quarter of all rows), the reversed order is used at once
  (0 → 76 of 100 and 0 → 77 of 100 on those two profiles). It is shown as an outlined, non-removable spelling in the panel
  and derived again on every load, never stored.
- **Rearranged spellings are offered.** Scholar prints Philip S. Yu as `SY Philip` in 6 of his 100 papers and Mikolov as `M Tomas` in 3.
  When an author name in at least two papers whose complete author lists do not otherwise contain the owner is the owner's name rearranged
  with initials (`SY Philip`; not `PA David` for David Patterson), the panel offers it under the "papers where the profile name is not in
  the author list" line — one click adds it as an ordinary spelling. Nothing is added without a click except the surname-first case.
- Two more real profiles (Philip S. Yu, Tang Jie) join the fixtures; two e2e checks (automatic reversed spelling; offered spelling).

## 2.4.7 — 2026-10-12

Eight more real profiles (HPC, systems and machine learning, software engineering, AI planning, robotics, NLP in China, knowledge graphs;
about 800 venue strings) went through the matcher; 3,000 real strings are now in the corpora.

- **`SC18: International Conference for High Performance Computing, Networking …`** (the ACM Digital Library's citation form —
  acronym, two-digit year, colon) is SC, with or without an apostrophe and however much of the name follows. Every HPC profile prints
  its SC papers this way; none was recognised. `ICSE '06: …` and the like are read the same way.
- **`International Conference on Software Maintenance … ICSM 2003`** is ICSME (renamed in 2014).

## 2.4.6 — 2026-10-12

Six more real profiles (databases, architecture, cryptography, HCI, information retrieval, theory; 570 venue strings) through the matcher.

- **ISCA is found when Scholar cuts its name after "… symposium on computer …"** (six rows on an architecture profile, including the
  TPU paper): the event words in front of the one common word left (*annual international symposium on computer*) must begin
  exactly one venue's name, and that venue must call itself annual. Without "annual" nothing is claimed.
- **EUROCRYPT is found from "Annual International Conference on the Theory and Applications of …"**, which also fits SAT and
  others: when several venues begin with what is left, only those that call themselves annual stay.
- **The two lists may not contradict each other.** `AAAI Conference on Human Computation and Crowdsourcing` is HCOMP to CORE, but CCF
  (which does not list HCOMP) saw the acronym AAAI and badged it CCF A. A whole-name hit now beats an acronym lying in the string
  when the two lists name different venues (unless the alias table says they are one venue under two acronyms, as SIGKDD / KDD).
- **USENIX ATC's "General Track"** is its main program, not a track that makes it something else.
- A few cut-off names that were silent now resolve because their words begin exactly one venue's name: COLING (*… 23rd International
  Conference on Computational …*) and MobiCom 1997–1999 (*… annual ACM/IEEE international conference on Mobile …*).

## 2.4.5 — 2026-10-12

Five more real profiles (data mining, machine learning, robot learning, statistical learning; 480 venue strings) went through the
matcher; the false badges and misses they showed are fixed, each with a test, and the strings join the corpora.

- **A special interest group's magazine is not its conference.** `ACM SIGMOD Record`, `SIGKDD Explorations`, `ACM SIGPLAN Notices`,
  `ACM SIGIR Forum` … were read as the conference when the acronym came in title case ("Sigmod"); they are periodicals now whatever the case.
- **One or two plain words are a field, not a conference.** A book chapter's venue `Data mining` was badged ICDM because the official
  name "IEEE International Conference on Data Mining" boils down to those two words. A string with no organisation, no conference
  wording and at most two words now matches only a name that really is those words (a curated alias such as `Pacific Graphics`, a
  journal called `Machine Learning`).
- **KDD and SIGKDD are one venue in both lists** (`KDD 2014` had only its CORE badge), and so are **ECML, PKDD and ECML PKDD**, which were
  not recognised at all, and the older **`ACM SIGOPS … Symposium on Operating Systems Principles`** (SOSP had only its CORE badge).
- **A name that Scholar cut short can go on.** `… International Conference on Distributed Computing …` was read as CORE's symposium
  DISC; the string says "conference" and ICDCS's longer name begins the same way, so DISC is no longer chosen. A complete name
  followed by a cut (CHI, ICSE, STOC …) is unaffected.

## 2.4.4 — 2026-10-12

- **EMNLP 2021 and 2023 and NAACL 2025 paper awards** (51 entries) from the conferences' own pages — the ACL Anthology records
  none of them: EMNLP 2023's *Best Papers* page (5 best, 25 outstanding), EMNLP 2021's *Best Paper Awards* post (best long,
  best short, outstanding) and NAACL 2025's *Award Winners* post (best, runner-up, best theme paper and its runner-up, social
  impact, outstanding). The new reader (`scripts/awards/acl-sites.mjs`) parses EMNLP 2024 and 2025's pages into exactly the entries
  the Anthology already gives, which is its cross-check. Demo, SAC, reviewer and People's Choice awards are left out.

## 2.4.3 — 2026-10-12

- The one ICLR 2021 title the Fact Sheet prints without its first word (*Beyond* Fully-Connected Layers with Quaternions …) is now
  restored from ICLR's own poster page for that paper instead of from memory: the entry's evidence quotes both pages, the poster
  page is recorded as a second source (`alsoAt`, which `merge-raw.mjs` checks by the same rules as `source`), and
  `iclr.mjs factsheet … --verify` re-fetches the page and fails unless it prints the title.

## 2.4.2 — 2026-10-12

- **ICLR 2025, 2026 and 2021 paper awards** (21 entries). ICLR's virtual-site awards page is empty for those years, so they come
  from ICLR's own announcements: the Outstanding Paper / Honorable Mention blog posts, the Test of Time posts (Adam and the
  attention paper for 2015; DCGAN and DDPG for 2016) and the 2021 Fact Sheet's eight Outstanding Papers. The Fact Sheet prints one
  title without its first word; the reader restores the paper's real title and the entry's evidence says so. New reader:
  `scripts/awards/iclr.mjs`.
- The documentation can no longer fall behind the data: a test compares `data/README.md`'s coverage row (printed by
  `node scripts/awards/coverage.mjs`) and the award counts quoted in `README.md` and `docs/ROADMAP.md` with the list.
  (`README.md` still said 1606 after the KDD update.)

## 2.4.1 — 2026-10-12

- **KDD best papers** (research, applied data science and dataset & benchmark tracks: best, runner-up, honorable mention, best
  student paper; 2016–2020 and 2022–2025 — 49 entries) from SIGKDD's own pages. The 2016–2019 pages mark each paper *Winner* or
  *Runner Up*; reading that matters (a first pass filed the runners-up as best papers, caught in review before release).
  A new test keeps an award's kind consistent with its printed label across the whole list.
- The award readers share one HTML-to-text helper (`scripts/awards/html.mjs`) that now decodes every accented-letter entity
  (`Z&uuml;gner` → Zügner) and drops soft hyphens and zero-width characters; the merged list is byte-for-byte what it was.

## 2.4.0 — 2026-10-12

- **More paper awards: 857 → 1606 entries**, again only from official pages, each citing its page and a quoted line:
  - **USENIX's Best Papers list** — USENIX Security, OSDI, NSDI, FAST, ATC, SOUPS, LISA, WOOT and more (412 papers).
  - **ACM SIGIR's award pages** — best papers, best short papers, best student papers (and JCDL's Vannevar Bush best papers).
  - **ACM SIGSOFT's Distinguished Paper Award list** — ICSE, FSE/ESEC-FSE, ASE, ISSTA, MSR, MODELS … (older lines that are
    not in the `Authors: Title` form are skipped rather than guessed).
  The tooltip names the list ("USENIX Best Paper", "Best Short Paper", "ACM SIGSOFT Distinguished Paper"). New readers:
  `scripts/awards/usenix.mjs`, `sigir.mjs`, `sigsoft.mjs`.
- LaTeX left in an official title (ICML 2022's `$\mathcal{V}$-Usable Information`) is ignored when matching, so that paper — in the
  list but never matched — now is.

## 2.3.2 — 2026-10-12

- **A bare publisher is not a venue.** `Association for Computational Linguistics, 2013` (the ACL Anthology's publisher
  name, printed as the venue of ACL, NAACL, EMNLP and CoNLL papers alike — on a real profile it was a NAACL paper that
  got an ACL badge), `AAAI Press, 2015` (AAAI Press also publishes ICWSM, HCOMP, ICAPS …) and `NIPS Foundation` no
  longer get a badge; with an acronym (`… (ACL 2016)`) or as the conference's own name they still do.
- Two more real profiles join the matcher corpora (Kaiming He: computer vision; Tomas Mikolov: language and learning —
  venue strings only, 144 new): every result reviewed, none of the earlier results changed. A saved-page check of the two
  profiles also confirmed the award list: eight marks on Kaiming He's papers (*Deep Residual Learning* best paper
  and test of time, *Mask R-CNN* Marr Prize, *Focal Loss* best student paper, …), each on the right paper, none elsewhere.

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
