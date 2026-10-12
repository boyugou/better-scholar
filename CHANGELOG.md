# Changelog

## 2.9.23 — 2026-10-12

- The LICS Distinguished Papers (2021–2026, 46 papers) from LICS's own archive page (`tot.mjs lics-dp`). The bundled list has 5268 awards.

## 2.9.22 — 2026-10-12

- The LICS Test-of-Time Award (2006–2026, 44 papers) from LICS's own archive page (`tot.mjs lics`); "C.-H." (C.-H. Luke Ong) is an initial. The bundled list has 5222 awards. (The first commit of this version read the page but the data gate refused every row: the address was `http`, the gate takes `https` only — the next commit has the rows.)

## 2.9.21 — 2026-10-12

- The ICSE Most Influential Paper Award (1990–2025, 35 papers: Program Slicing, Statemate, Feedback-Directed Random Test Generation, On the Naturalness of Software, IccTA …) from the ICSE
  Steering Committee's own page (`tot.mjs icse`); the HTML entities for Central European letters (`&Ccaron;` in Čubranić) are decoded. The bundled list has 5178 awards.

## 2.9.20 — 2026-10-12

- ISMAR's awards (2007–2025, 88 papers: best papers, best student papers, honorable mentions, and the impact / lasting-impact papers) from ISMAR's own page of past symposia (`tot.mjs ismar`);
  16 rows of it are reported and skipped. The bundled list has 5143 awards.

## 2.9.19 — 2026-10-12

- The ICDE Influential Paper Awards (2005–2026, 21 papers: Data Cube, Volcano, One Size Fits All, l-Diversity, Hive, Bw-Tree …) from the TCDE's own page (`tot.mjs icde`), found through the page's
  "Influential Papers" menu entry; the 2013 row whose authors have no separator is reported and skipped. The bundled list has 5055 awards.

## 2.9.18 — 2026-10-12

- *Cell (Cambridge, Mass.)* and *MIT Press (Cambridge, Mass.)* were drawn as the IEEE MASS conference: "Mass." in a parenthesis, the abbreviation of a state, was read as the acronym MASS. A
  state's abbreviation written as a word (*Mass.*, *Md.*, *Calif.* …) is no acronym; *(MASS)* in capitals still is. Found by running the alternate titles of the 3,700 most-cited journals
  (OpenAlex) through the matcher.

## 2.9.17 — 2026-10-12

- The three misreadings recorded in 2.9.14 are fixed, and so are a dozen more of the same kind, with a short curated list (`aliases.js`, `shadow`): acronyms of events whose names boil down to the
  words of a ranked venue's. *… Computer and Communications (ICCC)* is not INFOCOM (the word keeps the Computational Creativity ICCC apart), *… Image and Signal Processing (CISP)* not ICISP,
  *IEEE Region 10 Symposium (TENSYMP)* not TENCON, and ASYU, CAI, ICTIR, ISCISC, ICCIT, COMM, ICNLP, MODSIM, ONCON, IntelliSys, ICALTE and ICSOFT-PT likewise. *IEEE International Conference on Joint
  Cloud Computing (JCC)* (two rows of the corpora) was read as IEEE CLOUD; it now gets no badge — CCF ranks the JointCloud conference, but the words boil down to CLOUD's. The ranked venues
  themselves are untouched, and a test keeps a plain shadow acronym from ever being a ranked venue's abbreviation.

## 2.9.16 — 2026-10-12

- A one-word string that is an English word or a journal's whole name (*Crisis*, *Fast*, *Spin*, *Image*, *Cluster*, *Wine*, *Group*, *mAbs* …) is no longer read as the conference of that acronym
  (CRiSIS, FAST, SPIN, …) unless it is written in capitals (*FAST*, *NDSS*, and the title-case *Ndss* Scholar prints still are). *INTERACT* and *date* stay: both are real rows of the corpora.
- *DS 30: Proceedings of DESIGN 2002 …* (the Design Society's report series) was read as the conference DS through the ACM Digital Library's form "SC18:": a two-letter acronym needs the
  apostrophe or no space before the number there (*CHI '09:*, *SC18:*).

## 2.9.15 — 2026-10-12

- Four more names that only look like a venue, found the same way: *International Security* (a political-science journal) was read as the USENIX Security Symposium, a bare *Journal* as the
  Journal of the ACM, *Journal of Knowledge Management* and *Journal of Intelligent Systems* as the *International Journals* of those names (a journal's own "International" now counts; "Int." and
  "Intl" are the word), and *ACM SIGIR International Conference on Theory of Information Retrieval (ICTIR)* as SIGIR (a parenthesis that names another event by its own acronym is not read as the
  sponsor SIGIR's conference). None of these changes touches a string of the real-profile corpora.

## 2.9.14 — 2026-10-12

- **A wrong badge fixed.** *Journal of Marketing* was drawn as CCF A, the Journal of the ACM: the cleanup that removes a trailing month ("Dec. 2010") took any word that begins with a month's three
  letters for one, so "Marketing" went and "Journal of" was left. A month now has to be the whole word (January … December and their usual short forms). Found by running the names of the 2,000
  most-cited journals and conferences (OpenAlex) through the matcher; none of the real-profile corpora contained such a string. A trailing month and year with no comma (*Journal of the ACM, December 2009*) is now dropped too.
- Known, not changed: *International Conference on Computer and Communications (ICCC)* reads as INFOCOM, *International Congress on Image and Signal Processing (CISP)* as ICISP and
  *IEEE Region 10 Symposium (TENSYMP)* as TENCON — the names boil down to the same words and the acronym in the parenthesis alone cannot tell them apart without wrongly dropping
  real ones (*(ICFPT)* for FPT, *(WHC)* for the World Haptics Conference).

## 2.9.13 — 2026-10-12

- The IEEE VIS Test-of-Time Awards (InfoVis, VAST, SciVis and VIS tracks, awarded 2016–2025, 51 papers) from IEEE VIS's own history page (`tot.mjs vis`). The bundled list has 5034 awards.

## 2.9.12 — 2026-10-12

- The IMC Test of Time Award (2022–2023, 5 papers) from the ACM-hosted copy of SIGCOMM's page (`tot.mjs imc`). The bundled list has 4983 awards.

## 2.9.11 — 2026-10-12

- The HPCA Test of Time Award (2018–2026, 10 papers) from the TCCA's own page (`tot.mjs hpca`). The bundled list has 4978 awards.

## 2.9.10 — 2026-10-12

- The PKC Test of Time Award (2019–2026, 16 papers) and the CHES Test of Time Award (2020–2025, 6 papers), each from its own page (`tot.mjs pkc`, `tot.mjs ches`).
  The bundled list has 4968 awards.

## 2.9.9 — 2026-10-12

- The SenSys Test of Time Award (2014–2023, 17 papers) from SenSys's own page (`tot.mjs sensys`). The bundled list has 4946 awards.

## 2.9.8 — 2026-10-12

- SIGMOBILE's 2018 rows typed in citation style ("Kistler, James J., and Mahadev Satyanarayanan") are read too: the first author's surname is put last (12 more papers, 40 in all).
  The bundled list has 4929 awards.

## 2.9.7 — 2026-10-12

- The SIGMOBILE Test-of-Time Paper Awards (2018–2026, 28 papers: MobiCom, SIGCOMM, SOSP, SenSys …) from SIGMOBILE's own page (`tot.mjs sigmobile`); 12 rows of 2018, typed
  "Surname, Given", are reported and skipped. The bundled list has 4917 awards.

## 2.9.6 — 2026-10-12

- Springer's colon form of a conference-proceedings title, *Theory of Cryptography: 18th International Conference, TCC 2020, Durham, NC …*, is now read through its acronym
  (the series rule that already read *Advances in Cryptology–CRYPTO 2009*): the open gap of 2.8.5. Also read now: *Computer Aided Verification: 13th International Conference,
  CAV 2001, Paris …* and *Search-Based Software Engineering: 17th International Symposium, SSBSE 2025 …*. An acronym that is no conference's (*IOT 2008*) still proves nothing.

## 2.9.5 — 2026-10-12

- The TCC Test of Time Award (2015–2025, 12 papers) from the TCC's own page (`tot.mjs tcc`). The bundled list has 4889 awards.

## 2.9.4 — 2026-10-12

- The IACR Test of Time Awards for CRYPTO, EUROCRYPT and ASIACRYPT (2019–2026, 27 papers) from IACR's own page (`tot.mjs iacr`); "te" (te Riele) is a name particle.
  The bundled list has 4877 awards.

## 2.9.3 — 2026-10-12

- ASPLOS Most Influential Paper Award (2017–2022, 12 papers) from SIGPLAN's page of other awards (`tot.mjs asplos`). The bundled list has 4850 awards.

## 2.9.2 — 2026-10-12

- IFAAMAS's Influential Paper Award (AAMAS, 2006–2026, 39 papers) and the SIGecom Test of Time Award (2015–2025, 17 papers), each from its own official page
  (`tot.mjs aamas`, `tot.mjs ec`). The bundled list has 4838 awards.

## 2.9.1 — 2026-10-12

- EuroSys Test-of-Time Award (2016–2026, 12 papers: Borg, Omega, Dryad, Delay Scheduling, GeePS …) from EuroSys's own page, read by `scripts/awards/tot.mjs eurosys`.
  The bundled list has 4782 awards.

## 2.9.0 — 2026-10-12

- SIGOPS Hall of Fame Award (2005–2025, 62 papers) from SIGOPS's own page, read by `scripts/awards/tot.mjs sigops`: the Google File System, Bigtable,
  MapReduce, Time Clocks, seL4, The Tail at Scale … The paper may be of any venue, so the mark reads "SIGOPS Hall of Fame Award". The bundled list has 4,770 awards.

## 2.8.8 — 2026-10-12

Sixteen more real profiles (Peking, Jiao Tong, Nanjing, Harbin, NUDT and Wuhan groups — 1,533 venue strings; no wrong badge found).

- *ESEC/FSE '11 Proceedings of the 19th ACM SIGSOFT symposium and the 13th …* and *ESEC/FSE 2021 29th ACM Joint European … Conference and …* (the
  joint-meeting acronym with its slash, then a cut-off title) are now read as FSE.

## 2.8.7 — 2026-10-12

Fifteen more real profiles (computer architecture at ICT-CAS, Tsinghua and Zhejiang groups in learning, data, vision and graphics — 1,472 venue strings).

- *HPCA (China)* (the Chinese conference on High Performance Computing and Applications) was read as the architecture symposium HPCA: a country in
  parentheses after an acronym now says it is another event or edition, and the acronym is not claimed.

## 2.8.6 — 2026-10-12

Fifteen more real profiles (real-time systems, visualization, computing education, data mining, ML security, SLAM — 1,500 venue strings; no wrong badge found).

- The 2016 SIGCSE Technical Symposium printed *… Technical Symposium on Computing Science Education*; that wording is now read.

## 2.8.5 — 2026-10-12

Sixteen more real profiles (verification, storage systems, medical imaging, music retrieval, software testing — 1,384 venue strings).

- FoSSaCS as ETAPS prints it (*Foundations of Software Science and Computation Structures*; CORE writes "Computational") is now read.
- Known gap: a three-letter acronym after a comma in a Springer series title (*Theory of Cryptography: 18th International Conference, TCC 2020, Durham, NC …*) is not read; three-letter acronyms are too often something else.

## 2.8.4 — 2026-10-12

Sixteen more real profiles (lattice and zero-knowledge cryptography, quantum algorithms, wireless sensing, computational biology, geometry processing and rendering — 1,583 venue strings).

- Three names Scholar prints that were not read: PKC as *IACR International Conference on Public-Key Cryptography* (and the older *… Workshop on Public Key Cryptography*), the CCC of 1994–95 as *Annual Conference on Structure in Complexity Theory*, and FOCS as *Foundations of Computer Science, 2000. Proceedings. 41st Annual Symposium on …*.

## 2.8.3 — 2026-10-12

Twelve more real profiles (approximation algorithms, HPC and FPGAs, parallel programming, video understanding, code synthesis — 988 venue strings).

- FSTTCS under the name the IARCS printed from 2009 on (*35th IARCS Annual Conference on Foundations of Software Technology and …*) is now read.

## 2.8.2 — 2026-10-12

Fifteen more real profiles (dialogue and generation, speech, robot learning, blockchain, neuromorphic computing — 1,393 venue strings).

- *DS 75-4: Proceedings of the 19th International Conference on Engineering …* (a Design Society report series) was read as the conference DS: after a
  two-letter acronym a bare two-digit number is no year (an apostrophe or four digits still is: *KR'96*, *KR 2018*).

## 2.8.1 — 2026-10-12

- A long list is decorated once, not once per batch: a row whose drawn state (role, ranks, marks, switches) is the same as last time is left alone. With the
  whole list now loading by itself, the longest main-thread task while 1,000 papers load fell from 62 ms to under a frame (the review's point 5).

## 2.8.0 — 2026-10-12

- **FOCS Test of Time Awards** (24 entries, 2019–2025; the list holds 4708) from the TCMF's own page: *Private Information Retrieval*, *Cache-Oblivious
  Algorithms*, *Algorithms for quantum computation*, *Universally Composable Security* … each with the paper's FOCS year. `tot.mjs focs`.

## 2.7.7 — 2026-10-12

Eighteen more real profiles (autonomous driving, crowdsourcing, ML systems, web search, computational photography, biomedical and nursing informatics,
energy-efficient computing — 1,633 venue strings) went into the corpora; the sweep found no new wrong badge beyond a known limit (an IEEE-numbered
*Computational Science and …* cut reads as ICCSA, the IEEE CSE conference being unranked).

## 2.7.6 — 2026-10-12

- Automatic loading takes a short-lived lock in the origin's `localStorage` before each press, so profiles open in several visible windows load one at a
  time (about one request a second in all) instead of in parallel; a lock that nobody renews for five seconds is stale.

## 2.7.5 — 2026-10-12

An independent review of automatic loading and *Copy papers* found these; each was reproduced first.

- A manual *Load all* that met an answer slower than nine seconds stopped and said nothing (the button was still busy); a press already in flight at
  the start (the user's own) ended an automatic run before its first press. The loader now waits for a busy button and says "stalled" after a silent
  timeout; a shrinking list is not progress.
- A loader whose extension was updated, disabled or removed stops pressing.
- Switching the setting off and on again quickly now restarts the run once the abort has landed.
- Each batch no longer refreshes the page twice (the row observer already schedules one).
- *Copy papers*: a field containing a quotation mark is quoted whole (a spreadsheet reads a leading quote as a text qualifier, which swallowed tabs and
  could hide the formula guard). The hint no longer says Scholar starts at 100 papers.

## 2.7.4 — 2026-10-12

Twenty-eight more real profiles (visualization, usable security, measurement, FPGA, cyber-physical systems, AR/VR, haptics, data mining — 2,800 venue
strings, 2,344 new to the corpora).

- *HCI International* is no longer the journal HCI; *Colloquium for Information Systems Security …* (CISSE) is no longer ICISSP (a colloquium, congress,
  forum or summit is not a "Conference on …" that begins alike); *International Conference on Information Visualization* is IV (CORE spells it
  "Visualisation"), not Information Visualization in Biomedical Informatics.

## 2.7.3 — 2026-10-12

Twenty-eight more real profiles (databases, ubiquitous computing, distributed systems, game research, knowledge representation and constraints,
requirements and testing, SLAM, recommender systems — 2,734 venue strings, 2,413 new to the test corpora).

- **A spelled-out event wins over the acronym beside it.** *International Symposium on Wearable Computers (ISWC)* carried the rank of the *Semantic Web*
  conference of the same acronym (every ubiquitous-computing profile has such strings); so did *AAAI International Conference on Weblogs and Social
  Media* (AAAI's rank for ICWSM, now an alias of ICWSM's first name). Two or more other words, none of them the venue's own, in a string that says
  "symposium", "conference" or "workshop" are the name of something else. A journal's abbreviated name before its track (*Proc. ACM Program. Lang.
  6 (POPL)*) is not such a name.
- **A cut inside a parenthesis that names the event** is not read as a venue that merely begins the same way: *IEEE Symposium on Information Visualization
  (InfoVis' 99 …* was Information Visualization in Biomedical Informatics.
- **One digit glued to two letters is no year**: *IFIP WG2 9* was the graph-theory workshop WG (*KR'96* keeps its reading).
- SIGGRAPH *Talks*, *Sketches*, *Emerging Technologies* and *Conference abstracts and applications* are secondary tracks.

## 2.7.2 — 2026-10-12

- **Copy papers is safe to paste into a spreadsheet.** A paper title is whatever its author typed; one that began with `=`, `+`, `-` or `@` would have
  been a formula in Excel or Google Sheets (`=HYPERLINK(…)` can do more than show itself). Such a field now carries a leading apostrophe, the
  spreadsheets' own sign for text; numbers and ordinary text are left alone.

## 2.7.1 — 2026-10-12

- **SIGMETRICS awards** (76 entries; the list holds 4684) from the conference's own awards page: the *Test of Time Award* (2010–2026) and the paper awards —
  best papers, the Sevcik and Lavenberg–Sevcik student papers and the runners-up (1996–2026). *Counter Braids* is on it twice (best paper 2008, test of time
  2018). New reader `scripts/awards/sigmetrics.mjs`; the page's hand-typed rows (a surname-first first author, "and and", a title that wraps) are handled
  and what cannot be read is reported. The name check now accepts a two-letter initial such as "Iu.".

## 2.7.0 — 2026-10-12

- **Copy papers.** A third button next to *Copy summary* and *Copy as table* copies the papers the page shows now — the filters count, so a click on
  "first author × CCF A" and *Copy papers* is that list — as tab-separated lines for a spreadsheet or a CV: year, title, authors (as Scholar prints
  them), your role, venue, CCF, CORE (only the lists that are switched on), awards and talks (with the award's conference and year) and citations.
  `metrics.toRowsTsv`; interface language follows the browser (English, 简体中文).

## 2.6.4 — 2026-10-12

Sixteen more real profiles (music and audio, computational geometry, SAT and SMT, theorem proving, computational social science, educational data
mining, wireless communications, concurrency theory — 1,552 venue strings, 1,419 new to the test corpora).

- **An acronym in a cut-off name is not the venue when the other words are not the venue's own.** *ACM SIGCSE conference on Innovation and …* was
  the SIGCSE Technical Symposium (it is ITiCSE); the same rule drops three read-as-SIGCOMM / SIGMETRICS strings that had been accepted as known false
  positives — *ACM SIGCOMM conference on Internet measurement …* (IMC), *ACM SIGCOMM symposium on software defined networking …* (SOSR),
  *SIGMETRICS symposium on Parallel and distributed tools …* (SPDT). One correct claim goes with them (ICRA 2000's *Millennium Conference* string).
- **"Place: Publisher" is no venue.** *Nijmegen: ICIS* (a university institute's report series) was read as the Information Systems conference.
- Names Scholar prints in another form: LPAR's current name (CORE lists the older one), ACII (CORE's name stops at "Intelligent"), ISoLA without its
  subtitle (Scholar cuts it at the comma), ITiCSE as the SIGCSE conference.

## 2.6.3 — 2026-10-12

- **What the Awards count is made of.** With CHI's honorable mentions (about one paper in twenty) in the list, a single "Awards 52" hid how many
  were best papers. Hovering the row now says: *Best paper 5 · Honorable mention 47 · Test of time 1* (in the interface language; talk levels
  have no breakdown). `marks.summarizeKinds`.

## 2.6.2 — 2026-10-12

- **SIGPLAN's Most Influential Paper Awards** (90 entries; the list holds 4608) from SIGPLAN's own pages for POPL (2003–2026), PLDI (2000–2026),
  ICFP (2006–2025) and OOPSLA (2007–2025): *Proof-carrying Code*, *Valgrind*, *Quickcheck*, *The DaCapo benchmarks*, *Halide* … each with the year of the
  paper (ten years before). The pages hard-wrap authors and titles (a name may break at a hyphen), the POPL page writes "(for 2016):" in its newest rows,
  and the older rows carry stray quotes and commas; the reader (`tot.mjs popl|pldi|icfp|oopsla`) handles each and reports what it cannot read.
- The first test-of-time pages for SIGIR, SIGCOMM, SIGMETRICS and SIGMOBILE turned out to list no winners or to be gone; KDD's has no list.

## 2.6.1 — 2026-10-12

A second independent review of the matcher (on 2.5.14, re-run at 2.5.22; 7.7 million strings, no input made it throw) found wrong badges. Each
was reproduced, fixed and measured against the 8,395 real venue strings in the test corpora (eight of them change; none was right before).

- **A series title announces a conference.** In Springer's *Series–ACRONYM year* form the conference list answers, one venue only: *Security
  and Cryptography for Networks–SCN* was the journal *Security and Communication Networks*, *World Wide Web–WWW* was the journal (B) and
  not The Web Conference (A). An acronym that proves nothing alone (ACM's SAC) now needs the series title to share a word with the venue
  (*Selected Areas in Cryptography–SAC* yes, *Applied Computing–SAC* no), and a name is no longer read without a known series acronym.
- **A sponsor is part of a curated start.** The IEEE's *International Conference on Computational …* was read as COLING. The *International
  Conference on Distributed Computing …* start for ICDCS is gone: ICDCN's real title cut at 76 characters read as ICDCS (the one real 1996
  ICDCS string loses its badge — it fits ICDCS, DCOSS and ICDCN alike).
- **Special interest groups.** *ACM SIGSAC Workshop on Programming Languages and …* (PLAS) read as the SIGOPS workshop PLOS: a SIG the
  venue's names never mention now needs a rare word to stand on. In the fallback that reads the event words in front of a common word,
  every organisation the string names must be among the venue's own (*ACM/IEEE … Information …* was the ACM's CIKM, *ACM SIGPLAN …
  Software …* the ACM/IEEE ICSE), and the other list's rivals include the names that do not begin with an organisation.
- **An exact name with another event word is the fallback.** *IEEE International Symposium on Neural Networks (ISNN)* read as the IEEE
  Joint *Conference* on Neural Networks (IJCNN): the looser variants, which find the symposium that says "symposium", now come first.
- Aliases: MobiCom's 1990s name *ACM/IEEE International Conference on Mobile Computing and Networking* (the three real strings keep
  their badge, and CCF's A joins CORE's A*); XP's earlier names (*Extreme Programming* …).

## 2.6.0 — 2026-10-12

- **The whole paper list loads by itself.** Scholar shows a profile's first 100 papers and hides the rest behind *Show more*, so the
  role × rank summary only covered what had been loaded. The extension now presses that button for you right after the page loads (the
  page's own script makes the request, to Scholar, exactly as a click would; about once a second, one press at a time, and only while the
  tab is the one you are looking at, so profiles opened in many tabs do not press together). It gives up at
  once if a press brings no rows within nine seconds — Scholar is slow, limiting requests or asking for a CAPTCHA — and the panel says
  so and offers *Load all* to try again. *Cancel* stops it for good on that page. **Settings → Paper list → Load all papers
  automatically** (on by default) turns it off; the panel then keeps its *Load all* button. Switching the setting on or off updates open
  profiles at once.
- `loadAll` now reports why it stopped (done, cancelled or stalled) and waits a moment for Scholar to re-enable the button after a batch
  before calling the list complete. Documented in `PRIVACY.md`, `docs/ARCHITECTURE.md` and the project rules (`CLAUDE.md`).

## 2.5.23 — 2026-10-12

- **CHI, CSCW, UIST and other SIGCHI conferences' awards** (2121 entries; the list holds 4518) from SIGCHI's own conference programs:
  `programs.sigchi.org` draws each *Awards* page from public JSON files (`files.sigchi.org/conference/cache/…`, robots.txt allows
  everything) in which a paper of the *Papers* track carries a `BEST_PAPER` or `HONORABLE_MENTION` flag. CHI 2018–2026 (best papers and
  honorable mentions), CSCW 2019–2026, UIST 2021–2025, DIS 2024–2026, C&C, CHI PLAY, TEI, MobileHCI, FAccT, HRI, IUI, IMX and a few
  more. Other tracks (late-breaking work, demos, pictorials), demo / poster awards and programs still marked as drafts are not read;
  a nickname in an author's name ("Sungsoo (Ray) Hong") is dropped. New reader `scripts/awards/sigchi.mjs`. Checked on saved real
  profiles: an HCI researcher's page now draws seven marks (best papers of UIST 2023, CHI 2022, CHI 2019 …), all of them real.

## 2.5.22 — 2026-10-12

- **Dijkstra Prize in Distributed Computing** (34 entries, 2000–2026; the list holds 2397) from the prize's own page on podc.org:
  *Time, Clocks, and the Ordering of Events in a Distributed System*, *Impossibility of Distributed Consensus with One Faulty
  Process*, *Wait-Free Synchronization*, *Unreliable Failure Detectors …*, *What Can Be Computed Locally?* … The prize is sponsored
  by PODC and DISC together (the entries read "PODC/DISC"); 2000–2002 were the *PODC Influential-Paper Award*, and carry that name.
  Many of these papers first appeared in journals — the list now holds paper awards, not only main-conference ones. `tot.mjs dijkstra`.
- The check that tells a list of names from the end of a title moved to `scripts/awards/people.mjs`; the data README's merge command now
  names every raw file (it had lost the CCS, VLDB and test-of-time ones).

## 2.5.21 — 2026-10-12

- **SIGMOD Test of Time Award** (32 entries, 1999–2026; the list holds 2363) from ACM SIGMOD's own list of recipients: *Pregel*, *Online
  Aggregation*, *BIRCH*, *Implementing Data Cubes Efficiently* (which also holds the 1996 best-paper mark), *Mining Association Rules
  Between Sets of Items in Large Databases*, *A Case for Redundant Arrays of Inexpensive Disks (RAID)* … The page prints "Title. Authors"
  (some authors as initials, the older years without the abstract link) and not the paper's year, so entries carry none. `sigmod.mjs`
  reads it as `tot`; a word that ends in a full stop and is longer than an initial ("… vs. Rollups. Jo Yan") ends a title, never starts a name.

## 2.5.20 — 2026-10-12

Sixteen more real profiles (robotics, reinforcement learning, HCI and visualization, accessibility, program synthesis, learning theory,
genomics, computational biology — 1,506 venue strings, now in the test corpora).

- **Fix (since 2.5.11): RECOMB was read as COLING.** *"Proceedings of the sixth annual international conference on Computational …"* — the
  ACM Digital Library's title of the RECOMB volumes — matched the curated start *"International Conference on Computational …"*. A
  curated start now keeps the word *annual* (RECOMB is annual, COLING is not), and RECOMB has its own curated start.
- ASSETS's earlier name *International ACM Conference on Assistive Technologies*, and *Ubicomp* written as one word.

## 2.5.19 — 2026-10-12

More names the lists spell otherwise (the next batch of the most frequent unmatched strings): SIGCSE's *ACM Technical Symposium on Computer
Science Education* (eleven strings on one profile), SPAA's *Parallel Algorithms and Architectures*, SenSys's *Embedded Network Sensor Systems*,
*ACM CoNEXT conference*, SECON's *IEEE Communications Society Conference on Sensor, Mesh and Ad Hoc …*, SIGdial's *Dialogue*, PODS under
*SIGACT-SIGMOD*, and the IEEE form *"Proceedings ASE 2000. Fifteenth IEEE International Conference on …"* (the proceedings' own title word in
front of an acronym and a year is no longer taken for the venue's first word).

## 2.5.18 — 2026-10-12

From the most frequent venue strings that matched nothing across the 55 real profiles:

- **ISSTA's *ACM SIGSOFT International Symposium on Software …*** (the sponsor in front of a name the lists give without it),
  the 2003–2010 CVPR's *IEEE Computer Society Conference on Computer Vision and Pattern …*, NAACL's *Human Language Technologies: The
  Annual Conference of the North …* titles, and strings that name an organisation twice (*2015 IEEE/ACM 37th IEEE International
  Conference on Software Engineering*, *USENIX security Symposium … USENIX*) now match.
- A cut-off *"24th ACM SIGSOFT International Symposium on …"* is no longer claimed for the Foundations of Software Engineering: it fits
  ISSTA just as well (which is how it was a guess before).

## 2.5.17 — 2026-10-12

- **USENIX test-of-time awards** (39 entries; the list holds 2331) from USENIX's own Test of Time Awards page: USENIX Security, NSDI and FAST,
  2012–2026, each with the year of the paper (*Stealing Machine Learning Models via Prediction APIs*, *Why Johnny Can't Encrypt*, *Tor*,
  *Live Migration of Virtual Machines* …). New reader `scripts/awards/usenix-tot.mjs`.
- **The award readers no longer read what a page hides.** The shared line reader drops HTML comments and tags that run over a line break:
  the USENIX page keeps a commented-out second 2020 Security entry, and the VLDB page's 2012 block is commented out (the archive table
  lists that award, so it is read from there). The one entry that had come from the hidden text is gone.

## 2.5.16 — 2026-10-12

- **Test-of-time awards of WWW, ISCA and MICRO** (64 entries; the list holds 2292) from the pages that list them in full: the Web
  Conference's *Seoul Test of Time Award* (IW3C2, 2015–2026: PageRank-era classics such as *The Anatomy of a Large-Scale Hypertextual
  Web Search Engine* and *Item-based collaborative filtering recommendation algorithms*), the *Influential ISCA Paper Award* (2003–2025,
  with the ISCA year of the paper) and the *MICRO Test of Time Award* (2014–2025). New reader `scripts/awards/tot.mjs`.

## 2.5.15 — 2026-10-12

- **ACM CCS and VLDB awards** (104 entries; the list holds 2228) from the organisations' own pages. CCS (CCF A, CORE A*): the *Best Paper
  Awards* page, 2013–2021 best papers and 2022–2023 distinguished papers (Path ORAM, Imperfect Forward Secrecy, DolphinAttack …), and the
  *Test-of-Time Awards* page, 2012–2025, each with the year of the original paper. VLDB (CCF A, CORE A*): the *Test of Time Award* page
  (2012–2026) and its archive table (the 10-year awards, 1995–2011). New readers `scripts/awards/ccs.mjs` (a hand-typed page in several
  layouts: a line is read as authors for as long as every piece of it is a person's name) and `scripts/awards/vldb.mjs`; the shared HTML
  reader now also decodes the old semicolon-less entities (`J&oumlrg`). One CCS title is printed cut short by the page itself
  (*Path ORAM: An Extremely Simple Oblivious*) and kept as printed; the 2017 VLDB entry lists the award talk's own 2017 article and is skipped.

## 2.5.14 — 2026-10-12

Fifteen more real profiles (NLP, networking, software engineering, multi-agent systems, operating systems and storage, information
retrieval, recommender systems — 1,416 venue strings, now in the test corpora).

- **Acronyms two venues share:** *"SAC 3, 1135-1139, 2003"* (ACM's Symposium on Applied Computing, which neither list ranks) was read as
  Selected Areas in Cryptography; such an acronym now counts only with its name (alias flag `noBareAcronym`, kept for the series form
  *"…–SAC 2015"*). *"USENIX ATC 7, 2007"* was read as the trusted-computing ATC (rank C) instead of the USENIX conference (A): the
  organisation in front of a leading acronym is now tried as part of it first.
- **Earlier names of AAMAS** (*International Conference on Autonomous Agents*, ICMAS — the 1997–2001 proceedings of the agents community)
  and of UMAP (*International Conference on User Modeling*, AH).

## 2.5.13 — 2026-10-12

Twelve more real profiles (databases, vision, security, IoT, algorithmic game theory, cryptography, quantum, type theory — 1,121 venue
strings, now in the test corpora).

- **Springer's series form names the event by its acronym.** *"Advances in Cryptology–ASIACRYPT 2009"* was read as CRYPTO (the series
  title is CRYPTO's too) and got its A* badge; now ASIACRYPT, CT-RSA, SAC, CHES, ESA, GECCO, MICCAI … by the acronym after the dash.
- **A cut-off name is claimed only when the other list does not read it as other venues** (CCF's PPoPP against CORE's PPDP for
  *"International Symposium on Principles and Practice …"*), and two lists that read the same words as different venues claim neither
  (IFIP's SEC against Springer's ISC for *"International Conference on Information Security"*). Where the dominant reading is known it
  is curated: *"… Conference on Distributed Computing …"* is ICDCS, *"… on Web Information …"* is WISE — now in both lists.
- **A name read without its organisation no longer contradicts the venue's own event word** (ACM's *Symposium on Cloud Computing* is not
  IEEE's *Conference on Cloud Computing*).
- **ACM's special interest groups are sponsors, not names:** *"ACM SIGPLAN International Conference on Functional …"* (ICFP),
  *Certified …* (CPP), *Compiler …* (CC), *ACM SIGACT-SIGMOD-SIGART symposium* (PODS), *Memory …* (ISMM) now match.
- Aliases: ICFP (CCF's row says "Function Programming"), ACISP (CCF's row says "Australasia"), CT-RSA, AsiaCCS's earlier name
  *ACM Symposium on Information, Computer and Communications Security*.

## 2.5.12 — 2026-10-12

- **Fix: a rule could throw on one kind of string** (from 2.5.9 on). A cut-off Springer series title that ends in a known acronym —
  *"Financial Cryptography and Data Security: 25th International Conference, FC …"* — reached an index that does not exist for the
  acronym-free reading, and the error stopped the page's whole analysis. Fixed; and the matcher can no longer break a page: a string a rule
  cannot cope with is now simply unranked (the tests run it strict, and a new test cuts and decorates every real venue string in the
  corpora in five ways — 20,000 strings — to prove nothing throws).

## 2.5.11 — 2026-10-12

The rest of the independent review's matcher findings.

- **A cut-off name is no longer claimed for the one venue of a list when the other list has others that begin the same way.** CCF alone
  read *"… Conference on Principles of …"* as KR; CORE also lists OPODIS and others. Where the dominant reading is known it is curated
  (`starts` in `aliases.js`): the ACL Anthology's *"… International Conference on Computational …"* is COLING — now in both lists.
- **A weakened name never contradicts the venue's own event word:** *"ACM symposium on Cloud computing"* (SoCC) was also given CORE's
  *IEEE Conference on Cloud Computing*.
- **One venue under two acronyms is no disagreement between the lists** (the cross-list rule had dropped a correct badge): CSFW / CSF,
  CEC, Big Data, Cloud, WiSec, SSE. *Computer Security Foundations Workshop* (1999) now also reaches CORE's CSF.

## 2.5.10 — 2026-10-12

From the independent review.

- **Loading a long profile is lighter.** The name-spelling check that looks at every row after each page of rows is loaded now remembers
  what it worked out about a row: 1,000 papers of 40 authors took 2.8 s over ten pages, now 0.3 s (results identical on 695 random and
  real cases).
- **A ninth name spelling replaces the oldest** instead of silently doing nothing (at most eight are kept per profile).
- **A cut-off name is read through the names that begin with it.** The event word (*symposium*, *conference*) and *annual* of an alias of
  another era no longer decide between venues (the review's case: CORE's EuroCrypt winning for *"Annual International Conference on the
  Theory and Application of …"* through an alias that says *Annual*).

## 2.5.9 — 2026-10-12

More from the twelve real profiles (1,137 venue strings, now in the test corpora).

- **Wrong badges removed:** *"USDOE Office of Science (SC)"* was read as the supercomputing conference (a short acronym in a parenthesis
  now needs the venue's own words around it); *"AMIA Summits on Translational Science"* was read as the AMIA annual symposium (summits
  are meetings of their own, like workshops); a cut-off *"… Machine Learning and …"* was read as ECML PKDD (a curated name for whole
  strings can no longer be the start of a cut-off one).
- **Matched now:** Springer's series form *"Medical Image Computing and Computer Assisted Intervention− MICCAI 2017 …"* (cut right after
  the acronym — twelve papers on one profile), *"41 st International Conference"*, IEEE Xplore's *"Computer Vision and Pattern
  Recognition, 2004. CVPR 2004. Proceedings of the …"*, the ACM Digital Library titles of ESEC/FSE 2005 and 2011, FM's earlier name.

## 2.5.8 — 2026-10-12

From the independent code review and twelve more real profiles (medical imaging, game theory, verification, human-robot interaction,
semantic web, compilers, computing education, bioinformatics).

- A workshop co-located with a conference and printed the CEUR-WS way (*"OM@ ISWC 2288"*) is no longer badged as the conference.
- Two lists that read one cut-off name by its start as different venues (CCF *DAI*, CORE *ICDCS* for *"Twelfth International Conference on
  Distributed …"*) now claim neither.
- Aliases: ESWC's earlier name *European Semantic Web Conference* (8 of one profile's papers had no badge), UMAP's American spelling,
  and Hot Chips as one venue under two acronyms (the cross-list rule had dropped the CCF badge for *"(HOT CHIPS)"*).

## 2.5.7 — 2026-10-12

Eight more real profiles (multimedia, speech, design automation, wireless networking, graphics — 728 new venue strings in the
test corpora) turned up five wrong badges and a handful of old names the lists do not know. All fixed, each with a regression test.

- **Wrong badges removed.** A cut-off *"… Annual Joint Conference of the IEEE Computer and …"* (INFOCOM until 2003) was read as the IEEE
  Computer and Information Technology conference; *"Eurographics/ACM SIGGRAPH Symposium on Geometry Processing"* was read as SIGGRAPH;
  *"(WF-IoT)"* was read as the IEEE Internet of Things Journal; a cut-off *"ACM Special Interest Group on …"* picked SIGGRAPH out of three
  venues of the same rank; a cut-off *"13th IEEE International Symposium on High performance …"* (HPDC then, IEEE-sponsored) was
  read as HPCA. The prefix rule now treats several different venues of one rank as ambiguous (the badge would be right, its tooltip
  would name the wrong venue), and *joint* is an identity word.
- **Names the lists spell differently, now matched:** INFOCOM's *Annual Joint Conference of the IEEE Computer and Communications
  Societies*, HPDC under its IEEE years, the Eurographics/ACM SIGGRAPH symposia on Geometry Processing and Computer Animation,
  *Interspeech* in CCF, DATE's full name, *IEEE Transactions on Speech and Audio Processing* (TASLP's earlier name), the *International
  Conference on Multimodal Interfaces* (ICMI's earlier name), EGSR's *Rendering Techniques* / *Eurographics Workshop on Rendering*,
  an all-lower-case *Acm siggraph 2011 papers*, and IEEE Xplore's citation form *"IEEE Visualization, 2002. VIS 2002., 355-362"*.

## 2.5.6 — 2026-10-12

- **NeurIPS 2014–2018 and ICML 2017–2018 awards** (27 entries) from the conferences' own awards pages, for the years before the
  virtual sites list awards: Neural ODEs, Value Iteration Networks, Obfuscated Gradients, the NeurIPS 2017 *Random Features* and
  ICML 2018 *Unified Architecture for NLP* test-of-time awards, and the others. Seven hand-typed markups, one new reader
  `scripts/awards/ml-archive.mjs`. The list holds 2124 awards.

## 2.5.5 — 2026-10-12

- **NDSS distinguished papers and test-of-time papers, 2017–2026** (56 entries) from the symposium's own year pages: Distinguished Paper
  Awards (Best Paper Awards in 2026), the 2019 honorable mentions, the 2018 Cisco Network Security Best Paper, and the Test of Time
  Awards (classic papers with the year they appeared — Automated Whitebox Fuzz Testing, Dynamic Taint Analysis …). New reader
  `scripts/awards/ndss.mjs`. The list holds 2097 awards.

## 2.5.4 — 2026-10-12

- **IJCAI distinguished papers 2020–2022** (9 new entries next to 2023's) from the conference sites' own *Distinguished Papers* pages
  (four WordPress markups; 2021 also names an honorable mention). `scripts/awards/ijcai.mjs` reads all four shapes. The list holds
  2041 awards.

## 2.5.3 — 2026-10-12

- **SIGMOD and PODS best papers** (92 entries) from ACM SIGMOD's own pages: the SIGMOD best-paper table (1994–2026, with honorable
  mentions and the industry track's awards) and the PODS best-paper list (1997–2026). New reader `scripts/awards/sigmod.mjs`
  (the table's rows come in three shapes; unreadable entries are reported, not guessed). The list holds 2032 awards.

## 2.5.2 — 2026-10-12

- **IEEE S&P distinguished papers, 2016–2025** (58 entries: Distinguished Paper, Distinguished Practical Paper and Distinguished
  Student Paper; Best Paper / Best Practical / Best Student Paper in 2020–21) from the symposium's own awards page of each year. The
  pages come in three markups, all read by the new `scripts/awards/sp.mjs`; workshop, reviewer and test-of-time awards are not
  read. The list holds 1940 awards.

## 2.5.1 — 2026-10-12

- **STOC and SIGCOMM paper awards** (155 entries) from the societies' own pages: ACM SIGACT's *STOC Best Paper* (2003–2025), Machtey /
  Danny Lewin *Best Student Paper* (1990–2025) and *Test of Time* (2021–2026; the paper's own year is kept) pages, and ACM SIGCOMM's
  *Best Paper Award* page (2008–2022). New readers `scripts/awards/sigact.mjs`, `scripts/awards/sigcomm.mjs`; the shared HTML helper
  now decodes `&copy;` and the thin-space entities and exports `lines()`. The list holds 1882 awards.

## 2.5.0 — 2026-10-12

- **A profile name written surname first is read the other way round, automatically.** Of 22 real public profiles the owner was found
  in nearly every paper on 20; on the two Chinese-name profiles whose header reads `Tang Jie` / `Huang Xuanjing (黄萱菁)` — the papers
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
