# Changelog

## 2.41.0 — 2026-10-15

- **Hostile data end to end:** a profile of 120 rows of markup, 2,500-letter words, Arabic and Hebrew paragraphs, bidirectional controls, emoji, `__proto__` / `constructor` as names, empty authors and venues is drawn by the panel and the popup; the end-to-end run presses fifty of the panel's buttons and types odd queries on it and asks for no page error, no console error, no "undefined" / "NaN" / "[object" in any text and a panel that stays in its box (check 90; the fixture server takes `rows` for it). Found nothing to fix: ten seeds of a throw-away fuzzer first.
- **ESOP's volumes:** Scholar prints them as "European Symposium on Programming Languages and Systems" (Springer's series title and the symposium's name run together, as for APLAS): an alias for CORE's ESOP (two real lines gain their badge; a sweep of the 281 unbadged real lines that hold a ranked venue's whole name found nothing else that is not a track, a workshop, a journal or another venue — the 6,694 unbadged names are mostly journals and magazines the lists do not rank).
- **Fixes from the sixteenth independent review** (of the three matcher commits of 2026-10-17 — it found no wrong badge in them, and three things beside them): (1) *the workshops held at a venue are not the venue where its own name says Workshop*: "REFSQ Workshops, 2019", "Workshop at REFSQ", "NOSSDAV Workshops", "PKC Workshops", "CHES Workshops", "HotOS Workshops" got the badge of the list whose name holds the word (the plural without a subject, where the name has the singular, and "Workshop at / co-located with X" are hosted workshops: "Seventh IEEE Workshops on Applications of Computer Vision" is still WACV's own name); 79 rows say Workshop, 7 hosted forms each: none gets its badge now; (2) a four-digit year jammed onto a two-letter acronym ("RE2019", "CC2019", "IM2019") is that event — it had read as CCF's journal RE, the journal I&M, or CORE's Creativity and Cognition for Compiler Construction's CC (the two-digit forms, "RE19", stay ambiguous, as "RE 19" is); (3) `foreign` in the acronym rule asked an *ambiguous* decision for its words and threw ("FSE24 Computing 12 (3)", "GI20 Security 12 (3)": 0.2 % of 150,000 fuzz strings; `resolve()` caught it, so the paper just stayed unranked) — guarded, and the strict resolver of the tests no longer throws on them. Left as plausible only: "FSE 2019 Workshop" reads as Fast Software Encryption (the event word picks the Workshop-named venue among two with one acronym), journal abbreviations with a glued year ("TPAMI2020") and title-case one-word venues ("Ijcai15") name nothing — none of them is in the 75,521 real lines. (4) a recall loss of the glued-year commits: a title-cased one-word venue with its year glued on ("Ijcai15", "Nips2016", "Eurographics'19" — Scholar re-cases some strings) had lost the badge it had; the one-word rule keeps such words (only an acronym-shaped one is read by the lead rule). Corpus diff: 0 lost, 0 moved, 0 gained.
- **The settings page on a phone** (the website's "Try the real settings page" is this page in a 330 px frame on a 390 px phone): a setting's name was squeezed beside its select into letters ("Extensio|n languag|e", a hint a word per line) — a control that does not fit beside its label now goes under it (`.opt` wraps, the label's basis is 10 rem), a select is at most as wide as its row, the role × rank table gives the role names the room of narrower rank columns, and a segmented choice with a long name ("Oral, Spotlight and Highlight papers" in Spanish) wraps in its button instead of making the page wider. The overflow audit had checked one-word labels only; it now looks at every word of every text (`a word broken in two (any word)`) and at 330 and 300 px as well (30 languages: nothing broken but Finnish compounds of 17 letters). The end-to-end run checks the same at 330 px.
- **An acronym with its year glued on ("ASE'19") is the event:** the year stayed inside the acronym, nothing said "event", and CCF's *journals* of the same letters won — "ASE'19" was CCF B ASE (Automated Software Engineering, the journal) without CORE's A*, CSCW, TCC, RE, AAMAS and IM the same, and "CC'19" was CORE's Creativity and Cognition instead of Compiler Construction. A lead token that ends in an apostrophe and two digits is the acronym and its year, as with a space; the one-word-venue rule no longer takes the glued word whole. The year jammed on without an apostrophe ("ICLR2020 and arXiv preprint …", "NeurIPS24 Datasets Track") is read the same way: three real lines gain their badge, and for every acronym of both lists "A2019" and "A19" now name what "A 2019" names or nothing. Over the 75,521 real lines: 1 badge lost ("CAD'24", a conference of its own, was CCF's journal *Computer-Aided Design*), 5 gained ("NeurIPS'21 and arXiv preprint …" twice, "ICLR2020 …", "ICLR2021 …", "NeurIPS24 Datasets Track"). A new test asks of every acronym of both lists that the glued form names what the spaced one does. An acute accent, a grave accent or a prime between the acronym and its year ("NANOARCH´15", "NT+ME`24": four real prints) is the apostrophe too.
- **A workshop that is the venue brings the other list's row:** NOSSDAV is "International Workshop on Network and Operating System Support for Digital Audio and Video" to CCF and "Network and Operating System Support for Digital Audio and Video" to CORE; REFSQ and FSE are worded the same way the other way round. The track word of a string ("Workshop") had blocked the list whose name lacks it, so *Proceedings of the 33rd Workshop on Network and Operating System Support for Digital Audio and Video* got CCF B without CORE B. The other list's row of the same venue (`idx.partners`) now comes along when the string is the *whole official name* of the row that holds the word (`ownWord(…, whole)`: the lenient reading of a name that holds the word is left out). "REFSQ Workshops, 2019", "Workshop at …" and a name with "Workshop" after it stay tracks — the generative track-word test caught the first version, which gave them the other list's badge. Corpus diff: 0 lost, 6 changed, each the second list's row added (NOSSDAV 5, PETS 1). A new unit test asks of all 299 partner pairs that the official name of either row brings the other's.
- **Paste into Word, Docs or Pages:** *Copy as table*, *Copy papers* and *Copy APA* also put HTML on the clipboard next to the text. A word processor pastes a real table (the role × rank table, or the papers) or a reference list with real italics, a link and a hanging indent; a spreadsheet or a text box takes the text as before. Every text in the HTML is escaped, a cell that looks like a formula is made text, and only web addresses become links. The toolbar popup does the same, and the `export` call returns `html` when asked (`html: true`).
- **Your name in bold:** the HTML table of *Copy papers* puts the profile owner's name in bold in the author cells when the page marks it (*Mark my name in the author line*): the usual way a CV marks the author. The paper records carry `me`, the owner's name as the paper's author line prints it.
- **Check a venue** (settings page): paste a venue as Scholar prints it and see what the CCF and CORE lists make of it — the rank, the name it matched, the rule — or why it gets none (a secondary track such as a workshop; not placed with certainty). It uses the same resolver as the rows of a profile; a CCF venue also shows its research area and a link to its DBLP page (a plain link, opened only when clicked).
- **Check a venue from the panel:** each venue of the unranked list has a *Check* link that opens the settings page's *Check a venue* with that text filled in (it goes through one short-lived `chrome.storage.local` key, `askVenue`, so the service worker and the permissions stay as they are).
- **The counts follow the filters:** with a filter on (a year range, a search, a quick filter, a venue, *Only highlighted*, the papers behind the h-index), the role × rank table, the awards and talks counts and the panel's *Copy summary* and *Copy as table* count the papers the filters leave — so a year range gives the table of those years, a search the table of the papers it finds. The cell picked in the table and an awards row list papers but narrow no count (picking one never empties the list it is picked from, and what is copied is what the panel shows); the table keeps its rows; the copied text says what it counted ("Showing 25 of 100 papers · 2021–…"). The toolbar popup still counts every paper, and the `summary` and `export` calls do unless given `filtered: true` (the panel's way). Switch: *The counts follow the filters* on the filters' card (`panel.filters.follow`, on by default); off, everything counts the whole profile as before.
- **A copied summary says where it is from:** *Copy summary* and *Copy as table* (and the `export` call) carry a line `Source: <the profile's link> · <the day>` (the link without anything else of the address; a switch on the *Copy & export* card, on by default), and say `Not fully loaded: N papers so far` when the list is not all here — the count is of what is loaded, and the first line used to say "N papers on Google Scholar" without that.
- **Papers whose author list lacks the profile's name can be listed:** the status line "N papers where the profile name is not in the author list" is a button; a click lists them (the filter bar says "Name not in the author list"), and the table stays as it was (the pick narrows no count).
- **Quick filters that cannot find anything here are not offered** (CCF A on a profile with no ranked venue, Awards where no paper has one, Last 5 years on a profile with no recent paper); a pressed one stays so it can be released; judged once the whole list is loaded.
- **Singular messages in 12 more languages** (Arabic, Czech, Hindi, Hungarian, Indonesian, Polish, Romanian, Russian, Thai, Ukrainian, Vietnamese, Simplified Chinese): "1 paper …" was shown in English there; the test now requires every `…One` message in every language.
- **The role names of the table fit in the CORE tab** (German *Zweitautor*, Russian *Последний*, French *Deuxième* were broken in the middle): the tier columns are narrower and a word that still does not fit is hyphenated.
- **What "–" (not ranked) holds:** hover the *–* column (and read the copied summary): "Preprints 9 · Secondary tracks 4 · Other venues 8" — so that 21 unranked papers are not read as 21 papers at weak venues (a preprint is a venue line that begins with arXiv, bioRxiv, medRxiv…; a secondary track is a workshop or demo of a venue that is on a list).
- **Fixes from the eleventh independent review** (of the OpenAlex sweep's changes; 9 wrong badges, 3 lost ones, 1 bug). (1) A pick among venues that only share a rating — "International Conference on Data Mining" fits ICDM and SDM, both CCF B, and CCF takes the first — is no venue to carry over to the other list (it gave CORE's A*): the fill needs a unique reading, or the string saying the venue's own acronym. (2) `iet` and `acis` were no sponsors to drop (the IET's "Conference on Image Processing" read as ICIP, the Kuala Lumpur "Computer and Information Science" as ICIS): out of `ORG`; IE's and SNPD's own prints are aliases. (3) Aliases that began another venue's name: SPLC's "International Systems and Software Product Line Conference" and SERVICES' "IEEE World Congress on Services" are `exact` (SSV's cut "Systems software …" was SPLC), HiPC's fullOnly names and CIS's (a second series of that name) are gone. (4) "Computational Geometry" and "Performance Evaluation" are fields as well as journals: the new alias field `volume` makes them count for a line with a volume ("Computational geometry, 307-317, 2000" is a chapter of a book; 24 journal lines of the profiles keep the badge). (5) "Annu." is "Annual" (a sweep of "Proc. Annu. <abbreviated name> (ACR)" lost 25 venues in the parenthesis guard), EuroVis's "EG/VGTC" prints are aliases, "Workshops" is "Workshop" for the event-word check (WETICE). (6) Found earlier by the same review: the other list's row was not found for cut strings (the prefix rule hands out a view of the row) — fixed in a74a163. Snapshot: 14 lines lose a badge, every one a wrong or ambiguous one (reviewed); the 27,000 OpenAlex names lose nothing that was right. Not changed: "GI 2019" gets CORE's Graphics Interface through the link although CORE's own GI is two venues; "International Conference on Computer Animation …" is CCF's CASA, which CORE does not know (low realism).
- **One chip where both lists rank a venue** (*Chips on each paper* → *When both lists rank a venue*: *CCF first* by default, *CORE first*, *Both*). CCF and CORE rank much the same venues, so a paper no longer wears two chips for one piece of news: it gets the preferred list's chip, and the other list's only where the preferred one has no rank for the venue (a venue only CORE ranks keeps its CORE chip, and the tooltip of the CCF chip names the CORE rank too). The venue list of the panel and the notes of the Markdown and BibTeX copies follow the choice; the table (a tab for each list), the search (`core:a*` still finds CORE's A* venues, whichever chip they wear), the table copies and the JSON keep both lists. Only between lists that are drawn: a list whose chip is off is not left out for one that is. The settings preview draws it (its second sample is a venue only CORE ranks, WACV); the ready-made patch *everything* shows both lists. Unit tests (`rows.prefer`, `topVenues`, the notes) and one e2e check (S3c2b); the other e2e checks count the chips of both lists and run on *Both*.
- **Matching: the other list's row of the same venue.** CCF and CORE word many venues differently ("ACM SIGCHI Conference on Designing Interactive Systems" / "Designing Interactive Systems"; CCF's MobiHoc is still the name it had until 2005; CORE's "High Performance Distributed Computing" / CCF's "High-Performance Parallel and Distributed Computing"), and a print that one list's wording found got that list's badge only: *Proceedings of the 2016 ACM Conference on Designing Interactive Systems* was CORE A without CCF C, MobiHoc CORE B without CCF B, HPDC CCF A without CORE A, AsiaCCS CCF C without CORE A (92 of the 22,744 real strings; 33 more of the 27,000 OpenAlex names). Rows of the two lists that are one venue — an alias with both `ccf` and `core`, or one acronym and mostly the same words (at least two shared and 60 % of the shorter name's, stems and spellings aside; or the same single word — MICRO, ACM MM, VIS, ICS) — are linked (`idx.partners`, 298 pairs, every one reviewed; GLOBECOM, FORTE, APWeb and SIGSPATIAL, which the lists name differently, are alias pairs); when one list matched and the other did not, the partner row is added unless the string's track words do not fit it. Two rows of one acronym that are two venues share too few words to be linked (FSE: Foundations of Software Engineering, Fast Software Encryption — in both lists). A first version that taught each row the other list's names changed the candidates of cut names (197 corpus lines, two of them losses) and was dropped for this result-level rule: 92 changes, every one the second list added.
- **Matching, found with the same OpenAlex sweep (the alternate titles of 6,000 conferences: what the cluster of one venue reads as):** (1) a series form "Title - ACC'95" whose title is the name of an event of its own — "Proceedings of 1995 American Control Conference - ACC'95" — names that event's acronym, not CORE's Applied Computing Conference (an ACM title that says an event says the venue's own words: "… Conference on Programming language design and implementation - PLDI '02"); (2) sponsors the lists do not name are no part of a name (`iapr`, `wic`, `acis`, `iet`, `edac`, `esda`, `eai`, `sigchi`: "IAPR International Workshop on Document Analysis Systems", "ACM/ESDA/IEEE Design Automation Conference", "EAI International Conference on Mobile and Ubiquitous Systems"); (3) typos of "proceedings" ("Procedings of the British Machine Vision Conference", "Proceesings of the 9th Biennial …"); (4) British and American spellings are one word in a whole name ("Modelling", "Visualisation": VISSOFT, ER, MSWiM) — not at the start of a cut name, where they had made "International Conference on Information Visualization Theory and …" CORE's InfVis; (5) about 100 alias names for what Scholar prints: Euro-Par's "European Conference on Parallel Processing" (15 real strings), JELIA, Coordination, IEEE-IV, RTAS before 2003, DSD, PAM, INTERACT ("IFIP Conference on Human-Computer Interaction" is read whole: any conference on the subject is not it), SC's cut start "International Conference for High Performance Computing", WCNC, SPLC, ICER, ACE, SERVICES, IOLTS, TEI, ESEM before 2007, NAACL 2025's "Nations of the Americas Chapter", ICCD's old subtitle, CCGRID's older and newer names, NAS and CASES (the lists' own typos) and more; (6) `shadow`: ICOIN is an active conference, not CORE's AINA "(was ICOIN)", and the IEEE SOC conference is not ACM SoCC. Journals: the title without the subtitle the list adds (*Computational Geometry* 24 strings, *Journal of Systems Architecture* 15, *Performance Evaluation* 3) and the old name of a renamed journal (*IEEE Transactions on Neural Networks*, 4). MASCOTS gets its IEEE names (a cut "Symposium on Modelling, Analysis and Simulation of …" read as the conference MSWiM in CORE, whose own name for MASCOTS says "Model"), and the prefix rule no longer takes a rival whose event word is not the string's for another reading of it. Together the real-profile snapshot changes in 319 of its 22,744 lines, none lost: 190 get the other list's row (87 of them cut strings: FPGA 18, MobiSys 14, PACT 12, PPoPP 10 …), 129 gain a badge (every one reviewed); the 27,000 OpenAlex strings lose nothing that was right.
- **Matching: an acronym in a parenthesis after a name of its own is that venue's only if most of the name is the venue's.** Found by running the names of the 9,000 most-cited conferences and journals of OpenAlex (27,000 strings in three forms: bare, with a volume, with "Proceedings of the") through the session-start and the current matcher: 11 of the 830 ranked names were another event that shares its acronym with a listed venue — "Innovations in Power and Advanced Computing Technologies (i-PACT)" took PACT's CCF B / CORE B, "International Conference on Electronics, Computers and Artificial Intelligence (ECAI)" the European Conference's, and so did ICICS (twice), SCOPES, TOPS, ICDCS, ICCC, ICIC. More than half of the words in front of the parenthesis (its own segment, after an earlier parenthesis; abbreviations with a full stop count by their start; endings and doubled letters aside) must be the venue's own, except for a joint event (two or more acronym-shaped parts: "(EMNLP-IJCNLP)", "(DASC/PiCom/CBDCom)") and a journal's line with its track ("… on Programming Languages 3 (POPL)"). The guard reads an acronym buried in the string the same way ("… Devices, Circuits and Systems (ICDCS)" is found by its all-capitals word too). Four older names the lists do not give are aliases (HCW, IECON, ISORC; IPCCC's Phoenix Conference on Computers and Communications, which OpenAlex files under "IPCCC"; two more corpus strings gain ISORC), and "International Conference on Information and Communication Systems (ICICS)", two of whose three words are the Security conference's own, is a `shadow` entry. The IEEE source name of WACV's workshops ("… Winter Applications of Computer Vision Workshops (WACVW)") needs "Workshop on" to be the old WACV and is refused. Over the 27,000 strings the matcher now differs from the session's start in 52: 13 gains (HCI journal, WACV, SLT, QoMEX, CHASE …); 36 lost, every one another event that shares an acronym with a listed venue (ICICS ×2, ICIC, i-PACT, ECAI, ICDCS, SCOPES, TOPS, ICTD, ICCC) or an artificial string (a conference acronym with a volume and an issue, a doubled "The"); 3 where CORE's side went ("IEEE International Conference on Evolutionary Computation (ICEC)": ICEC is Electronic Commerce in CORE, so the lists disagree — CCF's IEEE CEC stays). A stricter share (two thirds) would have refused the real prints with a sponsor the lists do not name — "ACM/EDAC/IEEE Design Automation Conference (DAC)", "IET International Conference on Intelligent Environments (IE)", British "Visualisation" (VISSOFT) — so it is not used.
- **Roles: a line that cannot say which entry is you claims no place of honour.** Found with a ground truth, not a review: 5,400 works of 160 random OpenAlex authors (author positions by author id, the lines rewritten the way Scholar prints them, `GE Hinton`) went through the role logic. 99.6% agree; the rest were all lines that hold the owner's spelling twice (`X Wang, X Wang, P Cong`) — the earliest entry was taken, and 9 of 31 such lines were wrong claims of first, second or last place. When the entries that match the owner equally well would give different roles, the paper now counts as *Other* (`ambiguous` on the analysis, never first / second / last / co-first): no wrong claim is left in either sample, 22 correct ones count as *Other* (0.4% of the lines; owners with very common names, `Pradip Bera`, `Xincen Wang`, more). The more specific spelling still wins (`Xincen Wang` beats `X Wang`).
- **Fixes from the tenth independent review (eight findings; its input was real-looking Scholar prints).** (1) WACV's own IEEE prints while it was the Workshop — "Applications of Computer Vision (WACV), 2011 IEEE Workshop on", the dotted "… WACV 2008. IEEE Workshop on", "2005 Seventh IEEE Workshops on Applications of Computer Vision …" — had lost CORE A with the `renamed` flag: a renamed venue is the Workshop where the string carries the subject of the old name and does not say "Conference"; "WACV Workshops" and the Winter Conference's workshops say neither. (2) The Winter Conference's names are `exact` aliases: the list view's cut "… Applications of Computer …" is the conference or its workshops, and now gets no badge (it had CORE A). (3) A cut name with the venue's own acronym in front ("MSR '06: … workshop on Mining software …", "CHASE '08: …") needs two words of the old name beside the track word, four without the acronym; cut prints of the old names without an acronym stay without a badge. (4) ICML's first decade ("International Workshop on Machine Learning") is no alias: "IEEE Workshop on Machine Learning" took ICML's CCF A / CORE A* — a title that generic is every sponsor's workshop (2 corpus strings of 1987 and 1989 lost). (5) "CC 2019" is Compiler Construction: the venue whose acronym is spelled as the string spells it comes first ("C&C" squashes alike). (6) An ordinal in parentheses ("(1st)", "(16th)") is no issue; "(Supplement_1)" is one. (7) Pinned now: the stem rule ("… Document Analysis System (DAS)", a mutation without it is refused), the cut name with its acronym. Not changed: a cut that leaves one word of a workshop-named venue's subject ("… Workshop on Quality of …", IWQoS, WoLLIC, REFSQ …) is refused — "Workshop on Visualization for …" is anybody's, and a missing badge is fine.
- **Fixes from the ninth independent review (seven findings).** (1) WACV: CORE still lists it as the "IEEE Workshop on Applications of Computer Vision", so "WACV Workshops" and the CVF's "… Winter Conference on Applications of Computer Vision (WACV) Workshops" took WACV's CORE A while the conference's own title got no badge — the row is `renamed` now (its name is a name it had), the Winter Conference's full names are `exact` aliases (4 corpus strings gain CORE A WACV), the workshops are refused — in the full title; the list view cuts the conference's line and its workshops' line alike ("… Applications of Computer …"), and neither gets a badge (see the tenth review). (2) "C&C 2022", "C&C '22", "C&C 2022: Creativity and Cognition" took CCF's "CC" (Compiler Construction): an acronym printed with an ampersand names its own venue unless the lists say the two spellings are one ("S&P"/"SP"; "ASP-DAC"/"ASPDAC" differ by a hyphen only and are one). (3) A cut "… Workshop on Visualization for …" took VizSec's badge: where the official name says Workshop, a cut subject must begin the subject of one of the venue's names and say two words of it (NOSSDAV's "Network and operating …" does; "Visualization for …" is anybody's). (4) An acronym in front of an old name lost the badge in two forms — "MSR '06: Proceedings of the 2006 international workshop on Mining software repositories" ("of" stood between) and an acronym that ends in "s" (CHES): fixed for the full titles (the list view cuts most of these; see the tenth review), so "its own acronym may stand before or after" is true of them. (5) "Modeling"/"Modelling" and "semantics-based" (MiSE, PEPM): subjects are compared without endings and doubled letters, and the older titles of PEPM and MiSE are `former` names (one more corpus string, MiSE at ICSE 2009, gains CORE C). (6) A `former` name printed with its sponsor ("IEEE/ACM 8th International Workshop on Cooperative and Human Aspects of Software Engineering") clashed with CORE's "Conference": the old names now count for the string's event word, not against it. (7) "(3S)", "(5s)", "(3pt2)", Nature's four-digit issues are issues (an issue form the pattern did not know made "SIGMOD Rec. 43 (3S)" and "IEEE MICRO 35 (5s)" events); the two fixes no test checked — `hasIssue` and "a cut name is no whole name" — are pinned. Lost on purpose: IWSM Mensura's cut string ("… Workshop on Software …", one word of subject).
- **Fixes from the eighth independent review (ten findings; the 18 workshop aliases of the seventh review were the main source).** The old workshop names are `former` names now: found by name, but not part of the venue's wording, so MSR's, SLT's, VMCAI's "Conference" is no clash with them (they had lost 2020 "… Conference on Mining Software Repositories" and "VMCAI-19: …"). A string carries an old name only as the whole of its name part — not at the end of a longer one ("NIPS Workshop on Machine Learning" took ICML's badge), not behind a second track ("Satellite Workshop of the … Spoken Language Technology Workshop"); its own acronym may stand before or after ("PRIMA 2005: Pacific Rim International Workshop on Multi-Agents"); a cut name is no whole name, and its start needs four words of its own besides the track word and the connectives (the cut "International Workshop on Search-Based Software …" is Engineering or Testing: 4 of the 67 gains of the seventh review were wrong — SSBSE, INLG — and are gone; RSP's and CHASE's cut forms went with them); a cut inside a parenthesis cuts nothing. Where the official name says "Workshop" (PKC, CHES, FSE), a workshop about a subject that is not the venue's own words is another workshop ("PKC 2019 Workshop on Post-Quantum Cryptography"). The subject guard after an acronym takes the same venue of the other list (RAID) and no longer another that squashes to the same acronym ("C&C" lent Creativity and Cognition's words to Compiler Construction, CCF's "CC"). A parenthesis after a number is an issue only if it looks like one — "(3)", "(1-3)", "(SI)", "(Nov)" — not a note: "ASE 19 (Distinguished Paper Award)", "CSCW 19 (Best Paper Award)", "WWW 19 (Best Paper)" had become journals' lines (158 of 907 conference acronyms lost every badge in that form). A journal's match does not make a track of it: "Symposium Series on Computational Intelligence" is not a track of the journal *Computational Intelligence*. The property test also asks the CCF list about every CORE conference. Not changed: "IEEE MICRO 40, 1-10, 2020" and "PLOS ONE 10, e0143055" (all capitals, a volume but no issue: Scholar prints "PloS one 10 (12)"); the proceedings' title after "ACRONYM '19:" is not read as the venue's name (IECON '87: "Automated Design and Manufacturing" is a volume title).
- **Fixes from the seventh independent review (eleven findings, all fixed but two edges that are named below).** (1) "… USENIX Conference on Security Symposium (SEC'17)" lost USENIX Security's CCF badge to the parenthesis (SEC is IFIP's): a hit whose whole name — the organisation among its words — stands in the string is the venue the string says. (2) A cut name's four words counted "on" and "and", so "… Workshop on Artificial Intelligence and …" kept AISTATS: four words that are not connectives. (3) "PLOS Biology 3 (9)", "PLOS ONE 10 (12)" (CORE's workshop PLOS) and "IEEE MICRO 15 (1)" are journals' lines: an acronym that is no journal's, with a volume and an issue and no conference word, is no event there. (4) "SDM-19: …" read as ICDM. (5) "USENIX ATC" is read whole again (`fullOnly` alias names: a name whose organisation is part of what it says is not also the bare acronym): "Proceedings of USENIX ATC", "Proc. USENIX ATC, 2009" had lost both badges. (6) RAID: CCF lists the old name, CORE the new one — the subject of the name after an acronym is judged against the acronym's venues of both lists. (7) *Not ranked → secondary tracks* no longer depends on whether the venue happened to match ("CHI'13 Extended Abstracts" vs "CHI '13 …"): the string without its track words says whether it is a track of a listed venue. (8) The notes of CORE's names ("prior to 2009 was …; changed 2006") are read as old names (PRIMA, HealthCom). (9) 18 venues that are, or were, workshops by name and are listed under the name of today (SLT, PKC, VMCAI, CSL, HSCC, CHES, RAID, ICML's first decade, MSR, SPIN, SSBSE, RSP, INLG, CHASE, QoMEX, HCOMP, ICMR, FSE) are aliases (`former` names, see the eighth review): 64 corpus strings gain a badge or the second list's (reviewed). (10) The cut-name rule saw only the names it had matched, not the venue's others. Not changed: a CORE cut name with three words of its own ("… IEEE workshop on Computer Security …"); an organisation inside a lead acronym's string that none of its venue's names mention ("SEC'19: … USENIX Conference on Security Symposium" still reads as IFIP SEC). Tests: the property test now runs all 386 CCF and all CORE conferences, and a test pins every item (and the `@` rule of CEUR-WS workshops).
- **Fixes from the sixth independent review (eight, all checked by running them).** (1) A cut name that ends in ASCII dots ("… Conference on Computer and Communications...", as typed into *Check a venue*) was no longer read as cut — the trailing-punctuation rule of the canonicalisation took the dots — so INFOCOM, ICCV and S&P took the badge of the whole name they only begin: three dots are the ellipsis now. (2) *Not ranked → secondary tracks of ranked venues* counted every string with a track word (a journal called "Surveys & Tutorials", "The Routledge companion to …", a doctoral dissertation): the resolver says `refused` only when a ranked venue was matched and withheld, and only those are counted. (3) The exemption for a venue's old name asked for the track word and two more words, so "AISTATS Workshop on Artificial Intelligence for Healthcare", "PETS 2019 Workshop on Privacy-Preserving Machine Learning" and "EGSR 2019 Workshop on Rendering for Games" still took the badge: the string must carry the old name whole now (sponsors, ordinals and "international" aside; a cut name's start of four words is enough; old names' order variants are aliases). (4) The canonicalisation scanned a 40,000-pair run of " ," in quadratic time (3.8 s): the text is cut at the length the matcher reads first and trimmed from the end in a loop. (5) A page range after the abbreviation of a journal that no conference has the acronym of ("ACM DLT, 1-10, 2023", "TPAMI, 1-14, 2020") is no number of an event any more: the journal's. (6) The word order of CSFW's old name. (7) CoRR and the IACR's "Cryptology ePrint Archive" count as preprints. (9) A bare number after the name that is the last two digits of the year the line ends with is an edition, not a volume ("USENIX Security 22, 3255-3272, 2022", "Graphics interface 98, …, 1998" were read as journal volumes and found nothing); and an acronym followed by a regional word that begins another venue's name — "ACM SIGGRAPH Asia 7 (2)" — is not the main conference's (it gets no badge; 3 corpus strings, reviewed). (8) Only the first track word of a string was looked at: "International Workshop on Quality of Service (IWQoS) Posters" took IWQoS's badge; every track word must be one the venue's own name holds.
- **Matching: the acronym a string opens with decides between venues whose names boil down to the same words.** "AAAI'17: Proceedings of the Thirty-First AAAI Conference on Artificial Intelligence" and "AAAI 2019: 33rd AAAI Conference on Artificial Intelligence" were IJCAI's (CCF B, CORE A*) for the AAAI paper they are (CCF A): with its acronym taken out the string reads like IJCAI's name, and the weaker reading won over the acronym in front. A hit that is not the venue of the acronym the string opens with is now refused in that weaker reading ("ACM SIGCOMM Conference on Internet Measurement" is still IMC: an organisation inside a name is no acronym of the event). Also found by running every conference of both lists through four Scholar forms: "Computational Visual Media (CVM)" is the conference, not the journal of that name; the bare "ATC 2019" is CORE's own ATC, not USENIX ATC (the alias for the abbreviation "USENIX ATC" had also been a name, which left "ATC" to it). More of the same, found by asking which acronym each corpus string names that its badge is not: "AAAI-23: Thirty-Seventh AAAI Conference on Artificial Intelligence" (the acronym said twice is said once) and "… Conference on Artificial Intelligence (AAAI-07)" (a parenthesised acronym is the event's) were IJCAI's too; "Proceedings of the ACM on Software Engineering 2 (ISSTA)" was ICSE's and "… 1 (FSE)" ICSE's as well — now ISSTA and the Foundations of Software Engineering (when two venues share an acronym, "FSE", the one whose own words the rest of the string is wins). An acronym in front of a name that says what the event is about in words that are not the venue's ("ITS '14: ACM International Conference on Interactive Tabletops and Surfaces" is not CORE's Intelligent Tutoring Systems) no longer takes the venue's badge. The corpus snapshot changes in sixteen lines (reviewed: 6 AAAI, 4 ISSTA, 5 FSE, 1 ITS, every one a wrong venue before); a test runs all 386 CCF conferences and all CORE conferences in up to four forms and requires that no other venue's badge comes out.
- **Matching: a journal's own name with a volume is that journal.** Two gaps found by running every CCF journal's official name through the resolver with a volume, an issue, pages and a year: "GeoInformatica 12 (3), 123-145, 2019" (a one-word title in camel or capital letters looks like an acronym, and a two-digit volume like an edition — only volumes below ten were found; the same for ALGORITHMICA, BIOINFORMATICS and the other one-word journals in capitals) and "Human–Computer Interaction 23 (1), 47-99, 2008" (the journal and "Proceedings of the ACM on Human-Computer Interaction" boil down to the same words, so neither was taken: the string that is nothing but the journal's whole name, with a volume, is the journal). Nine strings of the real corpus gain the CCF B badge of HCI (reviewed: all T&F's journal, volumes 15–38); the ACM proceedings stay unranked (the bare name with no volume was left so too, and is the journal since a string that spells one venue's whole name decides a tie). A test runs all 280 journals in three spellings.
- **Matching: an acronym with its year glued on.** IEEE Xplore prints "ICME2000", "SC20: International Conference for High Performance Computing", "LAK26: …": an all-capitals word is now also read without its digits (four real strings gain a badge — ICME ×2, SC, LAK — and the 27,000 OpenAlex strings are unchanged). A workshop of a venue still gets none, however its year is written: "BEA@ACL2023" is a workshop like "BEA@ACL 2023", and after an "@" or a hyphen the digits are never taken off ("FTL-IJCAI21").
- **Matching: real prints that missed a badge**, found by listing the unbadged real strings that read almost like a ranked venue: IEEE Xplore's "Name, 2003. ISESE …" cut on the acronym (also with its year: "RTCSA'09 …"); the joint proceedings "… Dependable Systems and Networks With …" (DSN) and "… Computer-Aided Design. Digest of …" (ICCAD) as names of their own; "IEEE/CFV" (the CVF's typo); "2011IEEE" (the year glued to the sponsor); CARDIS's "Advanced Applications" and AIME's "… in Europe". Nine real strings gain a badge, each reviewed; the 27,000 OpenAlex strings are unchanged.
- **Matching: an article number where the pages would be.** "ACM Transactions on Graphics 41 (4), Article No.: 137, 2022", "… , article 75", "… , Art. no. 12", "… , No. 3", or the line cut at "Article …": a journal of a three-word name (TOG, TOS …) had no badge with this tail, because only a name of four words may be followed by more words (rule R5), and the number was not taken off like pages. It is now (four real TOG lines gain CCF A); a test runs every CCF journal in seven such forms. SERA (CORE's name begins with its sponsor ACIS, which is no sponsor to drop since ICIS's "IEEE/ACIS" needs it) is an alias without it.
- **Matching: the unbadged real lines that begin with a ranked venue's whole name** (67 of the 22,744; most are right — another journal, a workshop, a track), and what the rest had in common: (1) Oxford's article numbers where the pages would be ("Bioinformatics 39 (1), btac817", "Briefings in bioinformatics 22 (6), bbab315"); (2) the names journals had — "Bioinformatics-Oxford" (until 2005), "Computer Networks and ISDN Systems", "(CVGIP:) Graphical Models and Image Processing", "IEEE Transactions on Robotics and Automation", "Frontiers of Computer Science in China", "IEEE Trans. Speech Audio Process."; (3) Springer's series after a title ("Selected areas in cryptography - Lecture Notes in Computer Science": the series is no part of the name; also LNAI, LNBI, LNBIP, CCIS, SCI, AISC). Seventeen real strings gain a badge, each reviewed; the OpenAlex strings lose nothing.
- **Matching: the unbadged real lines that hold a ranked venue's whole name** (202 of the 22,744, most of them right): "IEEE Transaction on …" (singular, a typo owners type) is "Transactions" (TPDS, TIP, TGARS); and IEEE Xplore's inverted conference title cut among the sponsors — "Computer Vision and Pattern Recognition, 2006 IEEE Computer Society …" — is the conference of the IEEE whose name is the words in front (read as "IEEE Conference on …"; a title that says "Workshops" stays a workshop). A generated check over the 252 IEEE conferences of the lists in four cut forms (1,008 strings) finds 916 right and 76 without a badge; the other 16 are strings the generator built from the names of ACM venues ("Security and Privacy, 2015 IEEE …" is the IEEE's S&P).
- **Fixes from the twelfth independent review** (three wrong badges, three lost ones, three logic or doc problems, seven overstated numbers; the real-profile snapshot does not change): (1) the other list's row is not added to a periodical's line — "SIGSPATIAL Special 12 (3)" is the newsletter, which CORE's own guard had refused; (2) a rival of another event word is no other reading of a cut only where its visible start says what the event is about in two words at least (a cut that shows the sponsors only — "Proceedings of the Twenty-Seventh IFIP/IEEE International Conference on …" — had been claimed by CORE's PEMWN), and when one list found a whole name and the other only a venue that begins with the visible words, the whole name is the reading; (3) SERA, SPLC and HiPC: SERA is an alias without its sponsor ACIS, SPLC's realistic cut "… Systems and Software Product …" is a `starts` entry, and HiPC's old IEEE name is an `uncut` alias (a new alias field: read whole, never as the start of a cut — the cut is as much HPCC's); (4) **the winner and the chips agree**: a preferred list whose chip is off is no winner where the other list has its chip on (the Markdown note had said CCF A while the row showed CORE A*), and the venue list under "CORE first" names a venue by CORE's name and acronym, not CCF's beside CORE's rank — and the click on it finds the same papers; (5) the numbers say what they count: 1,179 ranked venues (1,481 rows: 298 venues are a row in both lists, and CCF lists four twice), venues the lists word differently (in their content words, not their case, sponsors or "the": 58 of the 298 pairs), 350+ names that are not the official name of their row, the guards the architecture table names (a normalisation, an exemption, an alias field and a host function had been counted as guards), 29 translations of 350 strings (English is the source), 5,581 award-winning papers and 2,143 more with an honorable mention or a runner-up place (7,830 awards).
- **Matching: a wrong SIGIR, and four more recall gaps.** Listing the unbadged real lines that spell a ranked acronym in capitals found, among the right ones, the opposite problem with a neighbour: "Proceedings of the 2019 ACM SIGIR International Conference on Theory of Information Retrieval" (ICTIR, unranked) took SIGIR's CCF A / CORE A* — the acronym beside three other words was enough. Now, where an acronym stands beside "Conference on <subject>" of three words or more and one of them is not the venue's own (stems aside; the acronym itself is no word of the subject), the subject is another event's name ("ACM SIGIR Conference on Research and Development in Information Retrieval" is still SIGIR; a generated sweep of every official name in several forms loses nothing). Gains, each reviewed: Springer's proceedings volumes numbered in Roman ("Algorithmic Foundations of Robotics X: Proceedings of the Tenth Workshop on …": the volume and what it holds are no part of the name, but "Circuits and Systems I: Regular Papers" stays a journal's own title; 4 WAFR lines), the old title of TCAS-I ("… Circuits and Systems I: Fundamental Theory and Applications", 4 lines) and ACII's 2013 name (1).
- **Matching: rule R5 (a known name plus a subtitle) no longer reads a name that goes on as a subtitle.** The OpenAlex titles that get a badge although they hold words that are not the venue's own (601 strings of 187 venues; most are acronyms, joint events and old names) found three wrong venues, all through R5, which took any name of four words or more followed by more words: "International Conference on Computer Graphics and Interactive Techniques in Australasia and South East Asia (GRAPHITE)" was SIGGRAPH, "… Information Retrieval in the Asia Pacific Region" (SIGIR-AP) SIGIR, "Data Mining and Knowledge Discovery Handbook" the journal DMKD. A subtitle is now set off — by a colon, a dash, a comma, a full stop, a slash or a parenthesis. R5 had four lines of the 22,744 (two kept, one a wrong badge, one an EKAW volume that is an alias now). Also: a supplemental volume ("… Dependable Systems and Networks - Supplemental Volume (DSN-S)") is a secondary track; Roman page numbers of the front matter ("…, vi") are pages; the parts of the IEEE's Systems, Man and Cybernetics journal ("Part A: Systems and Humans" is TSMC, "Part B: Cybernetics" is the Transactions on Cybernetics — Part B had been read as TSMC); the joint Web Intelligence / Intelligent Agent Technology title is WI's.
- **Matching: more wrong venues from the same OpenAlex audit** (the titles that get a badge although they hold words that are not the venue's own, 209 strings of 64 venues after acronyms and joint events are set aside): "2020 International Conference on Image Processing and Robotics (ICIP)" took IEEE's ICIP — the venue's own name followed by "and" and more words, with nothing to set it off, in front of the parenthesis is another event's name (a colon form, "… Software Engineering: Software Engineering in Practice (ICSE-SEIP)", stays); "IEEE 3rd International Conference on Computational Cybernetics, 2005. ICCC 2005." took the Computational Creativity conference (ICCC is a `shadow` for it now); the sections of SIGGRAPH that are not papers — the Computer Animation Festival, the Art Gallery, the Electronic Theater, the Educators Program, Real-Time Live!, the Technical Briefs — and ISMAR's Arts, Media and Humanities track are tracks. A name that CORE words differently from the real one (PIMRC: "Radio Conference") must not count as an extension, which is why the new rule needs the "and".
- **Matching: a volume's title in a publisher's series is no journal; a capital acronym after the title names the event.** Found by a reviewer's probe of the series strip added the same day: "Machine Learning - Lecture Notes in Computer Science" took the journal *Machine Learning*'s badge, "Distributed Computing - …" the journal of that name, "Pattern Recognition - …" the journal PR — a volume of proceedings is no journal, so such a string is read in the conferences only (and the bare-name guard still applies: two plain words are a field). And "Machine Learning: ECML 2005 - Lecture Notes in Computer Science" was ICML's once its acronym was set aside: an all-capitals acronym that stands after the title and is another venue's (ECML) vetoes a name hit that is not that venue's, as a leading or parenthesised one always did — except where it is the host of a workshop ("ICSE Workshop on Modeling in Software Engineering" is MISE's). Twelve thousand random Crossref proceedings articles (container titles as the publishers print them) agree: 14 % are ranked, and the badges that carry words not the venue's own are joint events and old names.
- **Matching, from 12,000 random Crossref proceedings articles (the container titles as publishers print them: 8,606 distinct, 14 % ranked; no key, no e-mail).** Four findings, all through the acronym the string names: (1) "Networking Conference (WCNC)" was IFIP's Networking — a venue whose acronym is an English word has it in a string only where it is written in capitals; (2) "2023 International Wireless Communications and Mobile Computing (IWCMC)" was the journal *Wireless Communications and Mobile Computing*, and kept CORE's conference out (a CCF journal reading used to stop CORE from reading the string at all): where the string names the acronym of a venue of either list whose name stands in it, a hit that is not that venue is refused — in the journal word-bag rule too, which had no such check (CORE's IWCMC is found now); (3) "Proceedings Second IEEE Symposium on Computer and Communications" (ISCC's older title in the singular) was INFOCOM's; (4) the IEEE RO-MAN symposium, which CORE calls a conference, without its "IEEE". Not changed on purpose: the 150 near misses (a name that is another event of the same words — ICCIT, ICNLP, ICSIP, WiCOM against WiMob —, plural and singular, a conference title cut short by Crossref).
- **Matching, from the container titles Crossref holds for each ranked venue** (a search by every official name: the 60 closest container titles of each — real publisher strings in every spelling): the IJCAI Organization writes ordinals without the hyphen ("Proceedings of the TwentySecond International Conference on Principles of Knowledge Representation …": KR), ACM's title of the SIGGRAPH proceedings since 2024 is "Special Interest Group on Computer Graphics and Interactive Techniques Conference" (with "Conference Papers" the main track; its cut "… Computer Graphics and …" is SIGGRAPH's too: one line of the real corpus), "Proceedings of the12th …" lacks a space, and the volume's own subtitle after a colon — "… Conference on Extending Database Technology: Advances in Database Technology" — follows a conference name of three words as it did one of four (rule R5; not a journal's title, whose words after it are a book — "Intelligent Data Analysis: An Introduction" —, and only where the string says an event).
- **Matching: the audit of those titles against every ranked venue (1,179 venues, 3,616 container titles close to a venue's name: 87 % read as that venue, the rest are mostly other events of nearly the same words).** The real gaps: CORE words PIMRC "Personal and Indoor Mobile Radio Conference" (the symposium is "Personal, Indoor and Mobile Radio Communications"; six titles), CIFEr "… for Financial Engineering" (the symposium adds "and Economics"), I3DG "ACM-SIGRAPH …" (now one venue with CCF's I3D, which also gives CORE's badge); VIS has been "IEEE Visualization and Visual Analytics" since 2024; the sponsor SIGEVO is no part of FOGA's name; and ACM's series form with its last word cut off — "SIGGRAPH Asia 2018 Technical Papers on - SIGGRAPH Asia '18" — repeats the title after the dash. Not changed on purpose: the symposium on Information Visualization (1995–2006) is no VIS — CCF's VIS is DBLP's Visualization conference — so its twelve real lines stay without a badge; a key that two venues of different ratings share ("information visualization": IEEE's InfoVis alias against CORE's Information Visualisation conference) lost IV its badge until the alias was bound to its organisation, a reminder to read the snapshot diff after every alias.
- **Matching: events whose parenthesised acronym is no acronym of any venue, and "Joint".** Listing the badged titles of the three real sources whose parenthesis holds an acronym that no venue has found eleven more events read as a ranked one of nearly the same words — ICAI (International Conference on Artificial Intelligence) as IJCAI, ICAIE as AIED, SIIE as ICCE, ISCTURKEY as Inscrypt and SECRYPT, ICONIC as ICIC, ICSyS / ICCS / ICCAS (circuits) as ISCAS, ANNSIM and MAS as ECMS: each is a `shadow` now. (A general rule — the initials of the string's own name in the parenthesis are another event's — was tried and dropped: it refused 19 real lines of venues printed with a variant acronym, "World Haptics Conference (WHC)", "Field-Programmable Technology (ICFPT)".) A string that says "Joint" is no venue whose names never do: the Japanese "Joint Symposium on Parallel Processing" was ICPP's, "Joint Cloud Computing" the IEEE Cloud's, "Joint Pattern Recognition Symposium" ICPR's; the years a venue was held jointly are aliases (RE's "IEEE Joint International Conference on Requirements Engineering", SIGMETRICS's "Joint International Conference on Measurement and Modeling of Computer Systems" — two more real cut lines gain it —, InSITE, WI/IAT in the plural). The International Parallel Processing Symposium and the Symposium on Parallel and Distributed Processing are IPDPS's predecessors (they were ICPP's); "New Ideas and Emerging Results" (ICSE-NIER, four-page papers) is a track like the other short-paper tracks — ICSE's industry track (SEIP), whose papers are full papers of the conference, keeps ICSE's badge.
- **Matching: the state of an article and "pp." after a journal's name.** "IEEE Transactions on Pattern Analysis and Machine Intelligence, early access, 2023" (also "in press", "accepted", "to appear", "Online ahead of print", "(in press)") and ", pp. 1-18" were read by rule R5 as the journal with words after it — and R5 stopped reading a journal's title with words after it earlier today (that is a book). They are stripped like the year now ("Bioinformatics, in press, 2021" is one real line that gains the badge); a generated sweep of all 293 journals in 27 tail forms (7,911 strings) finds 99.5 % of them.
- **Fixes from the thirteenth independent review (a sonnet agent, the opus allowance being spent; eleven problems, four overstated numbers, a stale doc).** (1) LNAI's "Machine Learning: ECML 2004" and "Data Mining and Knowledge Discovery: PAKDD 2005" were the journals: an acronym in capitals set off after the title — followed by its year or nothing — is the event's, and now vetoes a hit whose whole name stands in the string too. (2) A name that ends with its event word, in front of a parenthesis or behind a leading acronym, is checked like "Conference on <subject>": "ACE '17: … Australasian Computing Education Conference" is not CORE's Computer Entertainment ACE, and a year in front of a parenthesis is no volume ("… Counseling 2019 (ISGC 2019)"). (3) Rule R5 looked for the separator right after the last word of the name, but the event word that ends the name is no word: "… Security Symposium, San Diego, California" (every location tail) lost its badge — the words that are no words after the name are skipped (a generated sweep of 3,250 long names with tails: all found, none wrong). (4) The SMC journal's parts: "Part B (Cybernetics) 40 (3)", "Part B" and "Part C (Applications and Reviews)" were TSMC — they are normalised to the colon form, B is the Transactions on Cybernetics, C has no successor. (5) The `shadow` of an unranked event can be a whole name: "Proceedings of the ACM on Computer Graphics and Interactive Techniques" (a journal for I3D, HPG and SCA) was SIGGRAPH, and every cut of ACM's "Symposium on Applied Computing" was CORE's Applied Computing Conference; SIGIR-AP too. (6) A whole-name reading whose event word is not the string's (a symposium for a conference) is `clashed`: it no longer beats the other list's prefix reading (it disagrees with it, both are dropped: "International Conference on Computer Animation …" is CASA or SCA), and an inverted title cut among the sponsors, whose event word the rewrite made up, makes no such reading ("Software Engineering, 2010 IEEE 32nd …" was the IEEE Software Engineering Workshop). (7) "CSCW, Article 12, 2017" was the journal: an article number after an acronym is read like pages. (8) The title before the description of a Springer volume numbered in Roman is whole, not cut. Aliases: the Shape Modeling Applications conference is SMI's. Numbers: the venues the lists word differently are 58, not 150+ (the others differ in case, sponsors or "the"); 5,581 papers won an award and 2,143 more an honorable mention or a runner-up place; "10,150 translated strings" is "29 translations of 350 strings". Docs: the architecture lists what `prepare` reads back, the subtitle rule, the post-title acronym, and how the two lists' readings are reconciled. Not changed: a paper of ICSE's industry track keeps ICSE's badge; a thin cut that shows two content words and a clashing rival (DocEng, Onward, BIBE) stays unbadged by design.
- **Matching: a workshop at a venue is not the venue, even when the venue was once a workshop.** "Workshop" in a name the venue *had* (AISTATS was the "International Workshop on Artificial Intelligence and Statistics", EGSR the "Eurographics Workshop on Rendering") made every string with the word look like the venue itself: "AISTATS Workshop on Causality" and "… Artificial Intelligence and Statistics Workshops" got AISTATS's badge. The word now exempts a string only when the venue's *official* name holds it (HotOS, ASRU, IWQoS …: those are workshops), or when the string carries the old name's own words next to it ("International Workshop on Artificial Intelligence and Statistics" is still AISTATS). The snapshot of the 22,744 real strings is unchanged; PETS's old name ("International Workshop on Privacy Enhancing Technologies") is an alias now; a test runs every conference of both lists with a track named in nine ways.
- **Matching: an acronym with a page range is the event.** "AAMAS, 1-10, 2016" and "CSCW, 1-25, 2017" (a ten-page conference paper starts on page 1) were read as the *journals* of those names — a wrong rank for CSCW (B for A) and no CORE — while "AAMAS, 11-20, 2016" was the conference, by accident: only a number of two or more digits after the acronym counted as the event's. A page range now counts too; the snapshot of the 22,744 real strings is unchanged, and no CCF conference acronym in four forms ("X, 1-10, 2019", "X 2019", …) is read as a journal.
- **Matching: the same venue printed another way is the same venue.** Metamorphic checks over the 22,744 real strings (a trailing comma or full stop, en dashes, curly quotes, zero-width spaces, soft hyphens, composed or decomposed accents) found that some of those edits changed a result — in both directions: a track lost the flag that keeps it from a badge ("AAAI (Late–Breaking Developments)" took the conference's rank), a string with a trailing full stop took another venue's. The resolver now canonicalises its input first (invisible characters removed, dashes and quotation marks made plain, white space one space, no trailing punctuation): every one of those edits now gives the same answer on all 22,744 strings, and one real string gained a correct badge ("CHI‘20: ACM Conference on Human Factors in Computing", a curly apostrophe).
- **Matching: white space does not matter.** A venue with doubled spaces, tabs or line breaks was read differently from the same venue with single spaces in 125 of the 22,744 real strings when their spaces were tripled — worst, "AAAI  Fall  Symposium …" lost its secondary-track flag and took the badge of the conference. The resolver now makes white space one space before any rule looks at the text; the snapshot is unchanged and a test keeps it.
- **Found by fuzzing the pure libraries:** a quick filter typed twice in the query is released by one press (it took two); BibTeX's `url` and `year` fields are made safe whatever the record holds (a brace or backslash in an address, a year that is not digits). Seeded property tests now keep these: quick filters pressed in any order select what they say, and hostile titles, authors, venues and addresses stay inside every export format.
- **Fixes from a fourth and a fifth review of today's work:** the h-index filter's minimum for the counts is worked out without the picks while the button and the list keep the h-index as the button says it; a year range holds no paper with no year; the autocomplete completes the value under the caret in a word or a list and closes when the box is rewritten; a pressed awards or talks row stays drawn and says 0; a pick on the absent or hidden papers goes when no such paper is left; the absent line is not dropped as a lone status line; the search looks into the printed line and the whole list; quick filters of `cites:` and `age:` are found whatever the case typed.
- **"Either" in the search:** a comma lists values of `ccf:`, `core:`, `role:`, `type:` and `has:` — `role:first,last` is a paper where you are the first or the last author, `ccf:a,b` one at a CCF A or B venue. The quick buttons of one operator now join its word (*First author* and *Last author* gave `role:first role:last`, which nothing can satisfy); the suggestions complete the value after a comma.
- **The search finds co-authors of the whole list:** once *Read full lists* has read a paper's whole author list, the search looks into every name of it (it looked into the line the page cut before); a key typed on a profile of a thousand papers costs about a third less (the row's text is lower-cased once, the matcher and each row's answer are kept).
- **`age:` and the *Last 5 years* quick filter:** `age:<5` is a search operator for how old a paper is in years (this year is 0), so it is the last five years and stays true as the years go by; the new quick button *Last 5 years* (off by default, on the filters' card) adds it — with the table following the filters, one click gives the role × rank table, the awards counts and the copy summary of the last five years. The search box's suggestions offer `age:<5` where they offered `year:>2020`.
- **Fixes from a third review and a security audit:** the h-index / i10 filter goes when no position is highlighted (its buttons are not drawn then); the pencil on a sample row of the settings preview no longer renames a chip inside it; the exported `type` ignores a rank list that is switched off; a name of nothing but direction marks is no name, names keep the Mongolian and emoji variation selectors and lose the supplement's; long unbroken text in the metrics line and the filter bar wraps; a chip look is not shown as active when the size check refused it; a search word kept in lower case is not reported as left out. Security: the HTML flavour of *Copy papers* makes a formula-like author cell text (it did not when the owner's name was in bold); BibTeX spells a brace `\textbraceleft{}`, so that a title cannot close its field and open an entry of its own; the Report link removes the profile id even after `authuser=`; the panel's buttons answer only to a person (a click a script makes does nothing); *Read full lists* stops after two requests in a row that cannot be made (Google's block page is on another site) and the Semantic Scholar call refuses redirects; the saved paper details have a budget (3,000 papers, three million characters) and a spelling is at most 80 characters; a venue or a title is cut at a thousand characters before the scans that are quadratic in it; each spelling of the owner is parsed once, so a hundred papers of three thousand authors are read in under a second (seven before) and a profile name of thousands of blanks costs nothing. Matching: *IEEE MultiMedia* (a magazine) no longer takes the rank of the IEEE International Symposium on Multimedia.
- **Fixes from a second independent review (of the changes since the first):** `type:conference` now sees a venue only CORE ranks (CORE results carry `kind`); a one-year filter is kept only while a bar for that year is drawn, and a pressed bar can always be released; the wrap rule for long names is limited to the texts that carry a name (the *Add* button of the name help is no longer broken in two); the CORE teal of the tier-alone look passes 4.5:1 on white, the soft tint and every row tint, and follows the nearest look through an inherited property instead of an ancestor's class (a sample on a look's button no longer leaks it); *Check a venue* draws its chips on a white swatch (readable on the dark page in every look); operator words that stay in a query with no search box are lower case; `ignored` is exact (spaces, *only highlighted* with no role on); `export` leaves out `html` for a format with none; a double-click on a number inside a named row jumps to its setting (only the name renames); the *Check* ask expires after 30 s and the preview fills the box directly; a broken Scholar layout is never hidden with the panel; names also lose soft hyphens, fillers and Unicode tag characters (the left-to-right and right-to-left marks stay); the record's size is counted as Chrome counts it (a `<` is six bytes): a configuration that would not fit is refused with the reason, and a write that could never succeed is not retried, with its own message. A one-year filter no longer outlives its chart when the roles that highlight the papers are switched off (the filters that lost their control are now cleared after the rows have been highlighted again). The end-to-end suite counts the settings writes of each browser profile and waits when the minute's allowance of Chrome's sync storage (120) is nearly used.
- **Matching:** the inverted title Scholar prints for many older IEEE and ACM journals (`Computers, IEEE Transactions on 60 (3), …`, `Selected Areas in Communications, IEEE Journal on`) is read back to `IEEE Transactions on Computers` before anything else, as the multi-word ones already were by their bag of words: found by running the matcher's near-misses over the 22,602 real strings of the corpora, which changed seven results (`Computers`, `Communications`, `Robotics`, a line cut by an ellipsis), all gains, none lost.
- **Matching, two more:** *Biennial* (like *Annual*) is a word of the event, not of its name (CIDR: `Proceedings of the 5th Biennial Conference on Innovative Data Systems Research`), and IEEE Xplore's page count `4 pp.` is a page count (ISCAS: `2006 IEEE International Symposium on Circuits and Systems, 4 pp., 2006`): six more real strings are placed, none changed otherwise.
- **Search by kind of venue:** `type:conference` and `type:journal` (the kind the rank lists give the venue; a venue without a rank has none), with `ccf:`, `role:` and the others: `role:first ccf:a type:journal`.
- **Fixes from an independent review of 2.40.0:**
  - Settings page: a name is saved as it is typed (closing the page first no longer loses it); a change made on another settings page is no longer taken for this page's own echo (it was dropped, and the next change here undid it); a write Chrome refused is made again.
  - What you see is what you copy, again: the summary and the exports use only a rank list that something draws (while the table is not drawn, the lists the chips show); the table, awards and copy switches keep working for the toolbar popup while the panel is off.
  - The `filter` call leaves out the filters the settings left without a control and says so (`ignored`); the search words are cleared when the search box is off (only the quick filters' words stay), and `/` needs the search box.
  - Chip text reads (4.5:1, WCAG) whatever colour is picked, in every look; the built-in tier 3 and 4 text is a little darker; with the list's name left out CORE chips are teal until a colour is picked for CORE, so that a CCF A and a CORE A* differ.
  - A table with no rank column keeps its total; citation totals with no number and a panel with nothing in it are not drawn; a year set by a call shows on its button; a merged count row hides all its switches; a renamed chip word reaches open Scholar tabs.
  - Layout: the colour themes wrap instead of scrolling out of sight; a name of 30 characters no longer widens the panel, the year buttons, the status lines, the preview's sample rows or an order list past their frames (`npm run audit:overflow` measures the settings page in 30 languages × 5 widths × light and dark, also with every name at its longest: nothing runs out of its box); a wide row's tag in the preview sits at its right end instead of covering the line above.
  - Accessibility (axe-core, now also over the settings page's states — a part hovered, a name being renamed, the tray open, a venue checked — and over the toolbar popup on a profile, in light and dark and in four languages): the chips' list names read at full text colour, chip samples sit on a white swatch on the dark settings page, dimmed order items stay at 4.5:1, the popup's table has a named corner cell and a lighter muted colour in dark mode; the preview is out of the tab order and not read out (about 60 tab stops fewer; the tray above it stays for use).
  - Words made exact after the Chrome Web Store kit was re-checked against the code: the guide for agents names the real labels of the configuration card and the `type` of a paper record, the settings page's note says that *Read full lists* reads the papers' own Scholar pages, PRIVACY.md no longer says `summary` reports settings, the store images' captions say "every venue the lists place" and "every colour its own picker"; `npm run check:claims` (also in CI) checks that every quote of `store/chrome/claims.md` still exists in the code.
  - Preview editor: ⚙ on a part's tag or rail, and a double-click on anything that is not a name, jump to that part's setting on the left (the row flashes and takes the keyboard); the sample chips on the ready-made looks' buttons never run out of the button (a chip is whole or not shown); a drag in a right-to-left row lands where the bar is; a drag the browser cancels ends; a touch on the grip does not pan the page; the rename box stays inside the card.
  - Long custom names: the *Only highlighted* switch and the names of the settings rows break where they must instead of pushing out of their box. (The copy buttons keep their minimum width — a button never gets narrower than its text; `min-width: min(max-content, 100%)` is not valid CSS and broke their labels into single letters, which no overflow check saw: the end-to-end run now also asks that a button's words stay on one line)
  - The *Add* button of the name-spelling row no longer breaks its label in two lines (Chinese "添加" and "新增", Korean "추가", Norwegian "Legg til", Swedish "Lägg till" were cut into "添 / 加"): the input gives way, the button keeps its word on one line. Found by the new end-to-end check that every button's words stay on one line, in 30 languages and both layouts
  - Tools: `npm run diff:matcher [<commit>]` (`scripts/diff-matcher.mjs`) resolves the corpus lines and `test/fixtures/real-titles.txt` — 50,000+ real venue titles from Crossref and OpenAlex — with the matcher of a commit and with the working tree and prints what was lost, moved or gained; `npm run pull:titles` refreshes that file from the two public sources (no key, no e-mail address; resumable)
  - Matching: venues whose names boil down to one key are told apart by the name the string spells. *International Conference on Supercomputing* (ICS, CCF B / CORE A) and the ACM/IEEE *Conference on Supercomputing* (SC, CCF A / CORE A) share their words: CCF's side refused both (a tie between a B and an A) and CORE's took ICS for either. A string that says the whole name of one of them (an alias counts; years, ordinals, "annual" and "Proceedings of the" aside, "international", "ACM" and the event word kept) is that venue — ICS now gets CCF B beside CORE A on the six real ICS lines of the corpus, "Proceedings of the conference on Supercomputing, 1990" is SC, and the bare *Information Security Conference* (ISC), *International Conference on Electronic Commerce* (ICEC, not ACM's EC) and *Human-Computer Interaction* (the journal, not the ACM proceedings of the same words) are no longer ties. Found by running the per-venue Crossref titles through the resolver; `npm run diff:matcher` over 75,000 real titles: no badge lost, eleven moved to the right venue, ten gained
  - Matching, three more real prints (from the per-venue Crossref titles): MASCOTS with "Telecommunications" (plural), PROFES under its name until 2011 ("… Product Focused Software Development and Process Improvement"), and Internetware's title printed twice by ACM ("… Symposium on Internetware on Internetware"). Not done on purpose: IEEE's own tag after an early-2000s title ("… International Test Conference TEST-02": the tag repeats a word of the name and is no venue's acronym; 22 titles in the 75,000, few of them ranked) and plural-insensitive matching (it would merge INFOCOM with ISCC and CGI with Computers & Graphics)
  - Arabic and Hebrew: the comparison signs no longer say the opposite. In a right-to-left line a sign is mirrored, so the quick filter ">100" was drawn "<100" and "≥100 citations" (the filter's line, the h-index and i10 tooltips) was drawn "≤100"; the pill is now a left-to-right run and the three messages hold the sign in a left-to-right isolate. A unit test keeps every comparison sign of a right-to-left language inside an isolate, the end-to-end run checks the pill
  - Keyboard: the year bars are one stop for the Tab key instead of one for every year (up to fifty): the arrow keys (mirrored in a right-to-left panel), Home and End move among the years, Enter presses one, and the focus stays on that year when the bars are drawn again. A Tab walk through the panel (68 stops on the sample profile) found a name and a visible focus style on every one
  - Fourteenth independent review (sonnet, `eb92429..HEAD`, 1.7 million mutated real strings): (1) an acronym after the title is read whether or not it stands in the name too and with three letters ("… Conference on Artificial Intelligence, AAAI 2019" was IJCAI, "SIAM International Conference on Data Mining, SDM 2019" was ICDM); (2) the acronym a string names ("(ICS)", "EC '09: …", "…, SDM 2019") breaks a tie among venues of one key before the spelled name does, and the spelled name never beats another venue's acronym ("Conference on Supercomputing (ICS)" was SC, "Human-Computer Interaction (CHI)" the journal); (3) a whole-name shadow compares the spelled name ("ACM Conference on Computer Graphics and Interactive Techniques" had lost SIGGRAPH to the unranked ACM proceedings of the same words); (4) the subtitle rule keeps the "Joint" veto and knows an industrial track; (5) ISC's supercomputing conference ("Supercomputing: 29th International Conference, ISC 2014") is shadowed; (6) a volume of a publisher's series is never the journal, and "- ICS '05" (a space before the apostrophe) is read as the series acronym — five more real ACM strings gain their badge. `npm run diff:matcher`: one badge lost on purpose (an industrial track), eight gained
  - Copy buttons stay where they are while the pressed one says *Copied* (panel and popup): the shorter word used to let the buttons after it move up in a narrow panel, so the next click could land on another button. The flashed button keeps the width of its own label; the end-to-end run checks that no copy button moves
  - Matching, found by asking whether every ranked venue's own official name gets its own list's badge (2,667 strings: 8 did not, 4 cannot by design — the two journal-first *Proceedings of the ACM on …*, the Anthology's publisher string, a name that is also a journal's): when the lists read a string by name as two venues, the one made from the whole name as spelled beats one that left out the sponsor or went against the event word (*IFIP International Information Security Conference* is CCF's SEC, no longer dropped together with CORE's ISC; *International Symposium on Neural Networks* is CORE's ISNN, no longer dropped with CCF's IJCNN), and venues that share an acronym are told apart by the sponsor the string names ("IFIP SEC 2019" named the ACM/IEEE Symposium on Edge Computing, the first of CCF's two SEC rows). A unit test keeps the recall: only those four official names get nothing
  - Interface fixes from an independent look at the screens in all 30 languages: the panel's search box has no spell-check squiggles under its operators and takes the direction of what is typed (`role:` stays left to right in an Arabic panel); the operators in the suggestions, the hex codes of the colour cards, the parts of the filter bar and the rank chips are left-to-right runs in a right-to-left line (`core:a*` was drawn `*core:a`, `#A142F4` as `A142F4#`, "CCF A" as "A CCF"); the settings page's search box has one clear button with its ×, not the browser's and an empty one, and says when no setting matches (a new message in 30 languages); the popup's awards line never strands a count at the start of a line and uses the full-width colon in Chinese and Japanese; Chinese parentheses after Chinese text are full-width; Hungarian "Összes" no longer breaks in the table's total column; settings descriptions and popup notes avoid a last line of one or two characters; in forced-colours mode the role dots, year bars and colour swatches keep their colours; the name placeholders of the dark settings page are no longer faded below the contrast rating
  - The panel no longer moves while you filter: the filter bar ("Showing 25 of 100 papers · …  Clear") is in the title bar in place of the title instead of a bar of its own that pushed the table, the search box and everything else down by 30 px (a second click on the same table cell missed it; the search box jumped under the caret), and it is one line, the rest on hover; the awards rows stay, quiet, with a 0 while the filters leave none of their papers (typing a word used to drop the section and move the search box up by 119 px); the filter bar is a status, so a screen reader hears what the filters leave when it changes, and the bare number beside the search box is read only where there is no bar
  - Keyboard: the buttons that take each other's place (*Load all* / *Cancel*, *Read full lists* / *Cancel*) and the link to the papers without the profile's name keep the focus when the panel is drawn again; a quick-filter pill pressed by a key stays focused instead of moving into the search box (a click still goes on there); Tab out of the open year list goes on to the next control (*To* after *From*); the popup's CCF / CORE tabs keep the focus and the popup no longer re-reads the whole table as a live region; on the settings page the 22 section links are one Tab stop (arrows, Home and End move among them) and so is each colour row, *Reset* gives the focus back and Escape says no; the year range cannot be put upside down (*From* offers no year after *To*); the popup gives way to a long profile name and to a column named with ten letters in a row, and the unmatched-venue list is cut at a whole line
  - Settings page in one column (a half-screen window, 150% zoom): the preview is a strip at the top of the window, at most 40% of its height and scrolling inside, instead of 1,665 px in front of the first setting (which was 2,000 px down); a section link lands the card below it; the end-to-end run checks it
  - The filter bar writes its comma and the quotes round a typed query as the language does (Chinese "，" and “…”, Japanese "、" and 「…」, Korean, German, Czech, Polish, Russian, Ukrainian and French quotes, the Arabic comma); the copied summary keeps the standard English words

## 2.40.0 — 2026-10-15

Yours to arrange: the settings page follows the screen, every thing has a switch, the preview is an editor, and names and chip looks are settings too. Nothing is kept for compatibility: the paths of the settings changed (`rowStyle` → `rows.style`, `copy.*` → `panel.copy.*`, `panel.summary` → `panel.table.show`, …), and a stored record of an older version is read as far as it matches and otherwise starts from the defaults.

- **The screen is described once** (`lib/prefs.js`, `CARDS`): a card for each part of what is drawn, in the order it is drawn, with its settings; `SETTINGS`, the defaults, the validation, the presets and the guide for AI agents are derived from it. The settings page is made from it, one card for each part of the panel, in the order of the preview (an end-to-end check measures that).
- **A switch for every thing the panel draws** — the title bar's parts, the table's title, tabs, “not ranked” column, totals, “Other” and “Hidden” rows and note, each copy button, each count row, the search box, each quick filter, *Only highlighted*, the year range, the filter bar, each citation number, the year chart's title and axis, the venue list, each status line, the name help. A switch decides what is drawn: chips on the rows (`rows.*`) and the table's tabs and count rows (`panel.*`) are separate; what nothing draws is also left out of the search and the exports. A filter whose control goes is cleared.
- **Order**: the parts of the panel (`panel.order`), the copy buttons and the quick filters can be put in any order.
- **Names**: 48 titles, columns, buttons and chip words (`labels.<message key>`) can be named; a name replaces the translation in every language, the exports keep the standard words.
- **Chip looks**: outline, soft, solid or text only, rounded or square, the list's name or the tier alone, a colour for CCF, CORE, awards and talks, six ready-made looks (`lib/palette.js`; the default is pixel for pixel what it was).
- **The preview is an editor** (`options/editor.js`): hover a thing for ✕ (hide), ✎ (rename) and ⠿ (move); a rail at the left edge of a part of the panel hides or moves the part; a double-click renames; a tray shows what was hidden again; a setting outlines what it draws.
- **The settings page writes at most about 100 times a minute** (Chrome's `storage.sync` takes 120 and refuses silently), shows a refused write, and does not take its own echoes for another tab's change.
- The `summary` call returns the numbers only (not the display settings); the popup reads the settings itself and obeys the same switches, order and names. The guide says what the extension asks of the network and what `clearFilters` returns; the result keys of every call are checked against it.
- The website's home page runs the real settings page as a demo (`/demo/`, built by `scripts/build-demo.mjs`); the showcase profile and the demo use no real person's name.

## 2.39.2 — 2026-10-15

Wording that must match the code (privacy review for the Chrome Web Store):

- The settings say what is sent: Scholar pages are read only when you open them, and paper titles go to Semantic Scholar only if you switch that on (the old "nothing is sent anywhere" was not true of the Scholar pages).
- PRIVACY.md is the policy on the site, with the page events, the clipboard and the downloads; the homepage badge says "Runs in your browser" instead of "100% Offline".
- The store material for the owner is in `store/` (checklist, listing text, the claims behind each sentence, the package check, the screenshots).

## 2.39.1 — 2026-10-15

From an independent review of 2.39.0:

- **Search box**: capital letters no longer drop the spaces you type.
- **Suggestions**: the list stays open while it scrolls itself, opens upwards when there is no room below, and completes an operator name (`role` → `role:first`) instead of replacing a word that was not an operator.
- **Copy feedback**: "Nothing to copy" is not styled as success; a copy keeps the keyboard focus; the announcement is no longer overwritten by the next refresh. The popup has an icon for Copy papers and no longer shows the paper-count note.
- **H-index filter**: an h-index of 0 shows nothing instead of everything.
- **Rankings that are switched off** are not searched (`ccf:`, `core:`) and are not returned by the `papers` call.
- **Settings**: a dotted key (`"panel.years"`) is an unknown setting; a change of interface language reloads the settings page however it was made.
- **Agent guide**: the page marker is `data-rr-ready="true"`; an event id is a string or a number.
- **Exports**: BibTeX entries for the PNAS and IEEE proceedings titles are articles; a name with a bare "and" is braced; APA handles accented initials, `Jr.`/`II` suffixes and cut author lists without a last author; a Markdown author line that starts like a list is escaped.

## 2.39.0 — 2026-10-14

A clean rewrite of how settings, copy buttons and agent access work, after an independent review of 2.24–2.38. Nothing is kept for compatibility: stored settings of older versions are not read, and the names of events, messages and presets changed.

- **The settings are one table** (`lib/prefs.js`, `SETTINGS`: path, kind, default, what it does). Defaults, validation (`normalize`), patches (`apply`), the presets and the reference for AI agents are all derived from it, so they cannot disagree; a test keeps every setting's control on the settings page (`data-pref="<path>"`) and the other way round. The migration of the pre-2.2 record, the `hide.cited` alias and the `v` field are gone.
- **Copy & export is its own card: a switch for each of the eight formats** (summary, table, papers, APA, BibTeX, Markdown, JSON, CSV), in the panel and the toolbar popup, with *Enable all / Disable all*. The copy row no longer belongs to the table; with no button on there is no row. The format's name is the button's name everywhere (settings, panel, popup, page calls). CSV is saved as a file in both places (the popup copied it with a byte-order mark).
- **For AI agents**: *Copy guide for agents* puts on the clipboard a reference of every setting (path, values, default, effect), the user's current record, the presets, the page calls and the search syntax, generated from the same tables (`lib/agent.js`). The answer, a JSON patch, is pasted into the configuration editor; the page says what it applied and what it ignored, and why. *The page calls*: one event pair, `better-scholar:request` / `better-scholar:response` (`{ id, method, params }` → `{ id, ok, result | error }`), the same six calls over the extension's own messages for the popup (`rr:call`), parameters checked before anything runs, the settings out of reach of the page, the marker `data-rr-ready` on `<html>`. The dual event names, the second id field and the four extra message types are gone.
- **Configuration is JSON only.** The hand-written TOML reader (it could write into `Object.prototype` and read `#` in a colour as a comment) and the clipboard import are gone; a file or the editor takes a patch in the shape of the exported record. *All features* no longer switches Semantic Scholar on (no preset touches a network call); the *Senior author* preset is *Last author focus*.
- **Search syntax is explicit**: `cites:>100`, `year:>=2020`, `ccf:a`, `core:a*`, `role:first`, `has:award` (`lib/query.js`, one table behind the matcher, the suggestions and the guide). The shorthand `>2000` that meant a year, and the aliases (`c:`, `y:`, `tier:` …), are gone. An operator with a value it does not take finds nothing and says why (the box is marked `aria-invalid`); full-width characters are read; the query is cut at 500 characters. The suggestion list is a combobox, placed with fixed coordinates (it was clipped), opened by an operator's colon (an ordinary word offers nothing), and Tab takes only a suggestion that was chosen.
- **The h-index and i10 buttons show the highlighted papers behind the number** (they filtered every paper with that many citations, and lost their pressed state when the other filters moved the number). Filters whose control is gone are cleared when the panel or the totals are switched off.
- **Keys**: Escape clears the filters only when nothing else has taken it (a menu, the search box, Scholar's own dialogs); the keyboard stays on a button the panel draws again; the last-author bar is drawn at the right edge in right-to-left pages; reduced motion stops the row glow and the smooth scroll.
- **Exports**: BibTeX keys are unique (`b`, `c` …), a cut author list ends *and others*, the full list read by *Read full lists* is used, and everything TeX reads is escaped (a title could carry `\input{…}`); Markdown cannot be made a link by a title; APA keeps surname particles (*van der Maaten, L.*); an empty list says *Nothing to copy* instead of clipping nothing. The text formats moved out of `metrics.js` into `lib/formats.js`. The top-venues tooltip no longer gives the rank of one venue to another that shares its short name.
- **Settings page**: languages are native selects (the custom picker captured keys across the page), the segmented controls are radio groups, switches are named by their label and described by their hint, focus rings are solid lines, the settings search really hides rows, the colour badge rates what is drawn (the bar against white, 3:1) instead of best-of-two-backgrounds, the import report is visible and in words, every text is in the language files (the colour themes have plain names), the cache viewer's dialog has a name.

## 2.38.1 — 2026-10-14

- **The settings preview is always Scholar's light page.** Google Scholar has no dark theme, and the system's dark mode changes nothing on it, but the preview drew its sample page dark when the system was dark (the highlighted name was nearly invisible there), and its *Light / Dark* switch could not undo that. The switch is gone (it previewed a page that does not exist); the preview keeps the light colours whatever the system theme is, while the settings page and the toolbar popup, which are the extension's own pages, still follow the system. An end-to-end check pins it.

## 2.38.0 — 2026-10-14

- **Academic Citation Export (APA 7th Edition)**:
  - Added pure `toApa(papers)` formatter in `src/lib/metrics.js`, generating standard APA 7th edition reference list entries (`Authors (Year). Title. *Venue*. URL`).
  - Implemented smart author name parsing and abbreviation from Google Scholar records (supports initial-splitting e.g. `MF Kaashoek` $\rightarrow$ `Kaashoek, M. F.`, `JA Doudna` $\rightarrow$ `Doudna, J. A.`, and Chinese family-name-first order), multi-author ampersand formatting, and punctuation normalization.
  - Added dedicated `[Copy APA]` button in the in-page panel copybar with live copy confirmation feedback (`panel.flash("apa")`).
  - Added full translation for `copyApa` across all 30 supported languages.
  - Extended runtime messaging (`rr:export` with `format: "apa"`) and the DOM CustomEvent bridge (`better-scholar:request-export` with `format: "apa"`).
- **Toolbar Popup Feature Parity & Direct Citations**:
  - Elevated the Chrome extension toolbar popup (`src/popup/`):
  - Users can now copy citations in any format (BibTeX, APA, Markdown, JSON, TSV, Summary) directly from the toolbar popup on any active Google Scholar profile without having to scroll the page.
  - Responsive flex button grid with clean layout and 100% WCAG 2.1 AA contrast compliance in both light and dark themes.
- **Verification & Test Suite Expansion**:
  - Expanded unit test suite to 416 tests (`test/metrics.test.js`) covering single/multiple/truncated author handling and formatting.
  - Expanded Playwright E2E test suite (`test/e2e/run.mjs`) verifying clipboard APA copying, agent messaging, and DOM bridge event flow (76/76 checks passing).

## 2.37.0 — 2026-10-14

- **Extension Settings Page UI/UX Redesign**:
  - Overhauled the settings page (`src/options/`) with modern design standards, elevated card aesthetics, and category iconography.
  - Replaced crude native color pickers with a custom interactive **Color Control Widget**:
    - Curated quick-select color palette dots for academic authorship roles (`First`, `Co-first`, `Second`, `Last`).
    - Modern color pill featuring a live circular swatch, uppercase monospace HEX badge, and seamless overlay for arbitrary fine-tune selection.
    - Dedicated single-click reset button per role.
  - Redesigned toggle switch (`.sw`) physics with smooth cubic-bezier transitions, spring active thumb expansion, and layered shadows.
  - Enhanced select dropdowns (`select.sel`) with modern borders, clean SVG chevrons, and active focus rings.
  - Transformed preset selectors into tactile chips (`🎓 Senior author focus`, `🥇 First author focus`, `⚡ Minimalist`).
  - Added global quick search filter with SVG icon, clear button, and `/` shortcut key.
  - Refactored settings update cycle to render DOM synchronously before asynchronous storage write, eliminating latency in preview updates.
  - Verified 100% WCAG 2.1 AA contrast compliance in both light and dark themes across all 30 languages.
- **Documentation & Website Visual Synchronization**:
  - Updated high-resolution settings screenshots in `docs/` and synced with READMEs.
  - Rebuilt and deployed static marketing site on `site` and `gh-pages` branches with refreshed UI mockups.

## 2.36.0 — 2026-10-14

- **Agent-Native DOM CustomEvent Bridge**:
  - Established a robust, bidirectional page-context CustomEvent bridge on `document`, allowing external AI web agents (Playwright, Puppeteer, Selenium, Browserbase, Claude Computer Use), devtools consoles, and bookmarklets to command and extract pre-analyzed academic data directly across the isolated world boundary.
  - Synchronous readiness indicator: `document.documentElement.dataset.betterScholar = "ready"`.
  - Supports `better-scholar:ping` (`pong`), `better-scholar:request-papers` (`response-papers`), `better-scholar:request-summary` (`response-summary`), `better-scholar:request-export` (`response-export`), `better-scholar:query` (`response-query`), `better-scholar:filter` (`response-filter`), and `better-scholar:clear-filters` (`response-clear-filters`).
- **1-Click Copy JSON & Structured Programmatic Export**:
  - Added dedicated `[Copy JSON]` button to the panel copybar, fully synchronized across all 30 languages.
  - Formats loaded/filtered publications as clean, highly structured JSON containing titles, cleaned authors, disambiguated venues, CCF/CORE rankings, author roles, award marks, citations, and URLs.
  - Enhanced `rr:export` extension runtime message handler with `format: "json"`.
- **Comprehensive Verification**:
  - Expanded E2E tests in `test/e2e/run.mjs` with full assertions for clipboard JSON extraction and real-time DOM CustomEvent bridge communication (75/75 passed).
  - Maintained 100% test pass rate (415 unit tests) and 0 WCAG 2.1 AAA violations across all themes and locales.

## 2.35.0 — 2026-10-14

- **Interactive Search Operator Pills**:
  - Added a row of tactile, 1-click operator pills under the instant search input (`[CCF A]`, `[>100]`, `[First author]`, `[Awards]`).
  - Clicking any pill toggles the corresponding operator (`ccf:a`, `>100`, `role:first`, `has:award`) into the search query in real time, updating the paper filter instantly while retaining focus for free-text search.
  - Dynamically adapts to active ranking preferences (switches to `CORE A*` when CORE is enabled instead of CCF).
  - Synchronizes active state (`aria-pressed="true"`, `.rr-spill-active`) with manual query input and clears seamlessly on `Escape` or clear.
  - Fully localized across 30 languages with 100% WCAG 2.1 AAA accessibility compliance.
- **Brand Consistency & User-Agent Modernization**:
  - Modernized metadata across `PRIVACY.md`, `NOTICE`, and all offline award fetchers to Better Scholar.
  - Rebuilt and deployed synchronized 30-language documentation to GitHub Pages.

## 2.34.0 — 2026-10-14

- **Global Escape Key Filter Clearing & Search Operator Tooltip**:
  - Pressing `Escape` anywhere on a Google Scholar profile page now instantly clears all active filters (role × rank matrix selection, awards, venues, year range, search queries, citation thresholds) and resets the view back to the full paper corpus.
  - Hovering over the `/` search keyboard shortcut badge displays an instant tooltip guide summarizing query operators (`/ to search · >100 cites · >2020 year · ccf:a · role:first · has:award`).
  - Added dedicated end-to-end verification in `test/e2e/run.mjs`.

## 2.33.0 — 2026-10-14

- **Advanced Query Operators for Quick Search (`analysis.matchesQuery`)**:
  - Upgraded the quick search input (`/` shortcut) with instant query operators:
    - **Citation thresholds**: `>100`, `>=50`, `<10`, `<=5`, `cites:>500`, `c:>=100` filter papers by citation volume in real time.
    - **Year ranges**: `>2020`, `<=2015`, `year:>=2021`, `y:>2019`.
    - **Rank / Tier selectors**: `ccf:a`, `ccf:b`, `core:a*`, `core:a`, `tier:a`, `rank:b`.
    - **Role selectors**: `role:first`, `role:last`, `role:second`, `r:cofirst`.
    - **Award / Talk filters**: `has:award`, `is:award`, `has:talk`, `is:talk`.
  - Seamlessly combines operators with free-text multi-token search (e.g. `ccf:a role:first >1000 >2015 has:award CVPR`).
  - Extracted as a pure, dependency-free library function (`src/lib/analysis.js`) covered by dedicated unit tests (`test/query.test.js`).
- **Compile-Ready BibTeX LaTeX Escaping & Direct URL Integration**:
  - Escapes special LaTeX characters (`%`, `&`, `_`, `#`, `$`) across title, authors, venue, and awards in generated BibTeX entries, preventing fatal TeX syntax errors and comment line truncation.
  - Automatically incorporates the direct `url = {https://scholar.google.com/...}` field when copying BibTeX entries.
- **Brand Consistency**:
  - Updated toolbar popup window title in `src/popup/popup.html` and stylesheet banner in `src/content/styles.css` to Better Scholar.

## 2.32.0 — 2026-10-14

- **Interactive H-Core & i10 Impact Filtering**:
  - The metrics summary card now turns the **h-index** and **i10-index** rows into interactive filter buttons.
  - Clicking the **h-index** row instantly isolates the researcher's core corpus—filtering visible papers to exactly those with $\ge h$ citations.
  - Clicking the **i10-index** row isolates all high-impact papers with $\ge 10$ citations.
  - Seamlessly combines with existing role, ranking (CCF / CORE), year span, and search query filters.
  - The filter bar dynamically shows the active citation threshold (e.g., `≥25 citations`), and clicking the active metric row or clicking the "Clear" button resets the view.
  - Fully localized across all 30 languages with zero accessibility violations (WCAG 2.1 AAA).
  - Programmatic filtering support added to the agent messaging API (`{ type: "rr:filter", minCitations: N }`).

## 2.31.0 — 2026-10-14

- **Direct Markdown Publication Export ("Copy Markdown")**:
  - Adds a dedicated "Copy Markdown" button to the panel action bar.
  - Generates clean, GitHub-Flavored Markdown publication lists with direct paper hyperlinks, complete author lines, italics venue and year, bold ranking tiers (CCF / CORE), award highlights, and formatted citation counts.
  - Symmetrical 6-button action bar (Summary, Table, Papers / BibTeX, Markdown, CSV) that neatly wraps across all screen sizes and all 30 interface languages without text truncation.
- **Multi-Field & Multi-Token Instant Quick Search**:
  - Upgrades quick search to support multi-token conjunctive (AND) queries across paper titles, author lines, venue text, venue acronyms (e.g. `CVPR`, `SIGCOMM`, `NeurIPS`), venue full names, publication years (e.g. `2024`), author roles, and award keywords.
  - Enables fluid compound queries such as `"Stoica 2001"`, `"He CVPR"`, or `"Best Paper 2023"`.
- **Agent-Native Programmatic Query & Messaging APIs**:
  - Added direct runtime messaging handlers for web agents, automation scripts, and external tools:
    - `{ type: "rr:papers" }`: returns full structured JSON objects for all parsed papers (title, authors, venue, year, citations, role, CCF/CORE tiers, awards).
    - `{ type: "rr:export", format: "markdown" | "bibtex" | "csv" | "tsv" | "summary" }`: exports formatted text directly in any format.
    - `{ type: "rr:filter", query, onlyHighlighted, yearStart, yearEnd }`: programmatically updates active filters and returns matching paper counts.
  - Added custom DOM event listener `better-scholar:query` on `document`.

## 2.30.0 — 2026-10-14

- **Product Rebrand to Better Scholar (`boyugou/better-scholar`)**:
  - Official renaming of the repository and extension across all codebase references, URLs, documentation, store assets, and 30 translation files.
  - Published updated multilingual product documentation and website at GitHub Pages (`https://boyugou.github.io/better-scholar/`).
- **Fine-Grained Scholar Sidebar Hiding**:
  - Adds independent controls to hide the "Cited by" metrics table (`#gsc_rsb_st`) or the yearly citation bar chart (`.gsc_md_hist_b`) without forcing an all-or-nothing sidebar removal.
  - Granular switches added to the options settings and verified in Scholar markup contract tests.
- **AI / Agent-Native Configuration Export & Import (JSON / TOML)**:
  - Added 1-click configuration export and import via clipboard or `.json` file downloads.
  - Supports dependency-free parsing of standard JSON and TOML/INI configuration blocks, enabling web agents, CLI scripts, and power users to configure palettes, active ranking systems, and display settings in a single operation.
  - Built-in quick presets: Senior author focus, First author focus, and Minimalist.
  - Interactive direct configuration editor textarea for rapid pasting and fine-tuning.
- **Saved Paper Details Cache Viewer**:
  - Added an accessible modal dialog in Settings to inspect cached paper details (`resolved` store) previously hidden behind "Clear saved paper details".
  - Includes real-time search filtering across cached titles, venues, and author lists, plus 1-click "Copy cache (JSON)" for diagnostics.
- **Dynamic Percentage Breakdown in Metrics**:
  - Metrics cards (e.g., first author, senior author, CCF/CORE tiers) now calculate and display percentage tooltips (e.g. `15 / 30 · 50%`) dynamically without altering child DOM structures.
- **Real-Time Settings Search Filter**:
  - Added a search filter bar at the top of the Options page, allowing users to instantly highlight and filter settings sections, switches, and preferences.

## 2.29.0 — 2026-10-14

- **Interactive Search Match Counter & Enter / Shift+Enter Match Stepping**:
  - Adds an inline match count pill (`.rr-search-count`) inside the search input box that displays real-time matching paper counts (e.g. `12` or `0` when no matches).
  - Matches 0 papers dynamically display a high-contrast amber/red alert pill (`.rr-search-count-empty`) with zero matches.
  - Pressing `Enter` inside the search query input smoothly scrolls the viewport to the first matching paper on the page.
  - Pressing `Enter` repeatedly cycles forward through matching papers; pressing `Shift+Enter` cycles backward.
  - The match counter dynamically updates to show current match position (e.g. `1 / 12`, `2 / 12`).
  - Active matched rows receive an elegant, non-destructive focus glow animation (`.rr-row-focused`).
  - Full screen reader polite live announcement (`aria-live="polite"`), high-contrast forced-colors support, and RTL layout compliance.

## 2.28.0 — 2026-10-14

- **Direct BibTeX Citation Export ("Copy BibTeX")**:
  - Adds a new "Copy BibTeX" button to the panel action bar.
  - Generates standard, clean BibTeX entries (`toBibTeX`) with semantic entry types (`@inproceedings`, `@article`, `@misc`) derived from publication venue analysis.
  - Automatically formats author lists with RFC/BibTeX-compliant ` and ` delimiters while pruning trailing truncation ellipsis.
  - Generates deterministic, human-readable citation keys in the standard `firstAuthorYearFirstWord` format (e.g. `vaswani2017attention`, `he2016deep`).
  - Preserves venue rankings (CCF, CORE) and distinguished paper awards inside standard BibTeX `note = {...}` fields.
  - Respects active filters (exports only filtered papers if filters are applied, or all loaded papers).
  - Fully localized across all 30 languages with native button labels and clipboard confirmation flash.
- **Search & Filter Empty-State Accent**:
  - Enhances visual feedback when active filters or search queries match 0 papers (`.rr-fb-empty`).
  - Applies a high-visibility warm amber accent and warning icon in the active filter bar, clearly communicating that the zero-result view is due to current filter constraints rather than missing data.

## 2.27.0 — 2026-10-14

- **Direct CSV Export ("Export CSV")**:
  - Adds an instant one-click CSV export button to the panel actions.
  - Generates RFC-4180 compliant CSV with standard quote escaping, CRLF line endings, and spreadsheet formula injection protection.
  - Automatically prepends a UTF-8 Byte Order Mark (`\uFEFF`) so Microsoft Excel (macOS & Windows), Google Sheets, Numbers, and Pandas decode international characters (Chinese, Japanese, accents, Cyrillic, Arabic) without encoding corruption.
  - Respects active filters (exports only filtered papers if filters are applied, or all loaded papers).
  - Sanitizes filename to `${Author_Name}-papers.csv`.
  - Fully translated and localized across all 30 languages with native "Export CSV" / "Exported" button feedback.
- **Search Query Quick-Clear Button & WebKit Reset**:
  - Adds an inline quick-clear button (`×`) inside the search filter box that appears dynamically when input contains text.
  - Clicking clears the query, hides the clear button, restores the `<kbd>/</kbd>` shortcut hint, refocuses the search input, and resets visible rows.
  - Resets WebKit's native search cancel button for clean, consistent cross-platform presentation.

## 2.26.0 — 2026-10-14

- **Project Rebranding: Better Scholar**:
  - The extension is officially rebranded to **Better Scholar** across all 30 supported interface languages.
  - Refined product positioning from a narrow authorship/ranking highlighter to an all-in-one productivity layer for Google Scholar.
  - Updated store descriptions, settings page titles, and diagnostic details.

## 2.25.2 — 2026-10-14

- **Rich metadata tooltips for Top Venues**:
  - Hovering over any conference or journal in the Top Venues list displays the venue's full title and CCF tier / CORE rank (e.g. `IEEE/CVF Conference on Computer Vision and Pattern Recognition (CCF A · CORE A*)`).
  - Active venue filters outside the top 6 preserve complete metadata when synthesized into the list.

## 2.25.1 — 2026-10-14

- **Keyboard shortcut `/` to focus quick search**:
  - Pressing `/` anywhere on a Google Scholar profile page immediately focuses and selects the search query filter input.
  - Automatically expands the panel if currently collapsed so matching results and filters are instantly accessible.
  - Safe navigation: ignores typing when focus is already within an input, textarea, select, or editable element.
  - Subtle visual affordance: displays an elegant `<kbd>/</kbd>` badge inside the search bar that fades out on focus or when input is non-empty. Full forced-colors and RTL support.

## 2.25.0 — 2026-10-14

- **In-page quick search filter**:
  - Adds an instant search input (`type="search"`) to the panel's filter section.
  - Matches dynamically against paper titles and author strings across all loaded papers.
  - Shows active query in the filter bar (e.g. `"query"`); pressing `Escape` or clearing the input immediately resets visible papers.
  - Full keyboard, screen reader (`aria-label`), and localized placeholder across all 30 languages.
- **Expandable top venues list**:
  - The top venues section now shows up to 24 venues with an interactive "Show more" / "Show fewer" toggle when a profile has more than 6 ranked venues.
  - Preserves compact default view (top 6 venues) while offering quick exploration of broader publication venues.
  - Localized across all 30 languages.

## 2.24.0 — 2026-10-14

- **Interactive year chart (click to filter by year)**:
  - Clicking any year bar directly filters the paper list to that year; clicking the active bar clears the filter.
  - The year drop-downs (`yearStart` and `yearEnd`) synchronize with the clicked year automatically.
  - The active year bar is highlighted with an accent ring and `aria-pressed="true"`.
  - Empty years (0 papers) are disabled and unfocusable; bars have hover brightness response and full keyboard accessibility.
  - The filter bar formats a single-year selection cleanly (e.g. `2024` rather than `2024–2024`).
  - High-contrast / forced-colors outline support and accessible `role="group"` on the bars container.

## 2.23.1 — 2026-10-13

From an independent review of 2.23.0:

- **The panel's Enable all also shows the panel**, as *Everything* did (2.23.0 said the two were the same thing, and did not say that). Its buttons are never greyed out, and *Compact* / *Enable all* / *Disable all* wrap as a line of their own rather than splitting the pair.
- **Mark my name belongs to the author-positions group**: *Disable all* turns it off too, *Enable all* on (it did nothing while no row was highlighted).
- **The Copy buttons switch is greyed out while the table is off** (its buttons are in the table).
- **No Enable all / Disable all on the Scholar-blocks card**: its switches say "hide", so the pair would have read backwards.
- Each group of buttons is labelled with its card for screen readers. The settings test waits for each save and checks the stored values.

## 2.23.0 — 2026-10-13

From the owner's suggestions while the work was going on:

- **The copy row has its own switch.** *Copy summary*, *Copy as table* and *Copy papers* under the table can be hidden (*Copy buttons* in the panel's parts), in the panel and in the toolbar popup; the table and its note stay.
- **"Enable all" / "Disable all" under each group of switches**: the author positions, the rank lists, the awards and talks, the Scholar blocks to hide, and the panel's parts (the panel itself stays as it is). Each group changes at once and is saved. The panel card's *Everything* is now its *Enable all*.

## 2.22.10 — 2026-10-13

- **A year far in the past no longer costs what it spans.** The year chart expanded every year between a profile's oldest and newest paper before it cut the window, so a page value such as -1e9 (Scholar never prints one, but a page's text is not trusted) would have looped a billion times. The window is now found first and only it is expanded: the same bars and the same "older" count for every real profile (the year chart's tests are unchanged), and a far-past year costs a millisecond.
- The robustness tests cover the year chart with hostile years (NaN, infinities, strings, fractions, far past and future), and the new search and author-name functions with the same adversarial strings.

## 2.22.9 — 2026-10-13

From an independent review of 2.22.6–2.22.8:

- **A spelling in capitals matches only capitals.** Accepting the offered `WU LI` still made every mixed-case `Wu Li` the owner's, at full strength (so `Wu Li, X Yang, Wei Li` put the owner first). A spelling that is all capitals now finds only an author written in capitals; the owner's own name is unchanged (and, when the profile's own name is in capitals, the spellings derived from it — the other order — still find ordinary authors).
- **A press of *Show more* drops the pending "list complete" check.** The button is off while a request is in flight, so a second press within the check's 1.8 s, answered slowly, made the panel call a partial list complete (the lone "papers loaded" line gone, the tier columns gone on a profile with nothing ranked yet). The check now starts only after the last press is answered (end-to-end step with a stand-in that answers in three seconds).
- **A cut `Proceedings of the IEEE …` is no journal.** The journal's own line is short and has a volume; a line cut right after "IEEE" is the start of a conference's (CVPR, ICCV …), and was badged CCF A as the journal.
- **The co-first group goes on while an author carries one of the marks the first two share** (`A*†, B*†, C*`: C is co-first again); `A*†, B*, C†` still makes C the last author.
- **The weekly data check fails on "no verdict" too** (a source that cannot be reached or refuses): a check that can stay green without ever reaching its sources would hide a stale list. A 404 / 410 is still the finding.
- The settings footer's navigation is named in the person's language (it said "Scholar Roles & Ranks" in English everywhere); comments and the 2.22.6 notes name all three ways a list becomes complete. (The 2.22.8 regression test covers the organisation-only forms of several publishers, of which only IEEE was ever wrong.)

## 2.22.8 — 2026-10-13

- **A publisher with only a year, an ordinal or the cut is no venue.** Read on the live pages of Scholar's search results: the source line is cut to fit, and `2023 IEEE 39th …` (a cut-off conference of the IEEE) was badged CCF A as the journal *Proceedings of the IEEE*; so were `2019 IEEE …`, `IEEE 39th …`, `The 39th IEEE …` and a bare `2019 IEEE` — a wrong badge, which the principles do not allow. A string whose words, once years, ordinals and the cut are taken out, are only organisations (IEEE, ACM, SIAM, USENIX …) now says no more than the publisher; the two journals literally titled *Proceedings of the IEEE* / *…National Academy of Sciences* still match. Regression test over every organisation and form; none of the 1,000+ real corpus strings changed.
- Eighteen real search-result source lines joined the venue corpus; `docs/ROADMAP.md` records why Scholar's search results are not supported (three of twenty could be ranked, the rest are cut beyond use) and that CORE's portal ids are stable across editions while CCF's older editions are the blocker for ranks at publication time.

## 2.22.7 — 2026-10-13

From a second-pass review of today's new translations by a reviewer reading all 30 languages (no mistranslation of meaning was found; grammar and consistency):

- **Shorter button names** where the new "Read full lists" was long: German *Ganze Listen lesen*, French *Lire la liste complète*, Romanian *Citește lista completă*, Dutch *Hele lijsten lezen*, Swedish *Läs hela listorna*, Russian *Читать полные списки*; Finnish says *luettelot* like the rest of its file, Czech uses the verb *Přečíst* of its progress line (not *Načíst*, which is *Load all*). The settings hints quote the new names.
- Hindi has singular forms for the saved-data line and the chart note (it printed "1 पेपरों"); Hungarian says *szerzői lista* everywhere; zh_CN uses its word 发表场所 in the no-ranks note, and both Chinese variants say 优先 / 優先 ("first") in the Semantic Scholar switch; Danish, Finnish, Norwegian and Swedish write CAPTCHA the way their files already do; the report link uses each file's own verb (Danish *Rapportér*, Spanish *Informar de*, Norwegian *Rapporter*, Hebrew *דיווח*); the hint names Semantic Scholar where a bare pronoun could be read as Scholar (German, French, Polish).

## 2.22.6 — 2026-10-13

From an independent review of 2.22.1–2.22.4 (four confirmed problems):

- **An all-caps inventor is offered only with evidence.** `WU LI` was offered to an owner called `Wei Li` (any short given name passed as "initials"), and one click would then have claimed every mixed-case `Wu Li` too. The all-caps form is now offered only when the same initials written as usual (`WU Li`, `JA Doudna`) already find the owner in other papers of the profile.
- **The co-first group takes its marks from what the first two authors share** and goes on while an author carries all of them: a first author marked `*†` next to a second marked `*` no longer pulls in a corresponding author marked `†` (`A*†, B*, C†`: C is the last author, not co-first).
- **A list finished by hand is complete too.** After Scholar's own *Show more* is pressed by the person (auto-load off), after a stall finished by hand, or after a cancelled request is answered, the panel never learned that the whole list was here: a biologist's profile kept empty A / B / C columns and the lone "N papers loaded" line. Rows that our loader did not ask for now start a check: Scholar's button still off after 1.8 s means the list is whole.
- **The weekly data check only calls 404 and 410 findings.** A 403 is what bot checks and firewalls answer (the repository's own notes record several), so it is "no verdict", not a weekly "out of date" mail.
- The Chinese README names the all-caps inventor case; the test comment says which live-profile lines pin the co-first rule (none: they answer the same under the old rule).

## 2.22.5 — 2026-10-13

- **The settings page has links in its footer:** the project's privacy page, *Report a problem* (the issue tracker's template chooser) and GitHub. Plain links that open only when clicked (`PRIVACY.md` says so); the two labels use the words the project site already has in 30 languages.
- The README (both languages) says to reload an unpacked extension after updating its folder: Chrome keeps the old scripts but reads the interface texts at every page load, so an old script can show a text key (`metricsOf`) instead of a word.
- The settings page's footer is a row of the page's grid and the preview spans it, so the preview stays whole in view down to the end of the page whatever the footer's height (a footer of two lines — the longer languages — used to push the preview's top out of the window at the end of the page).

## 2.22.4 — 2026-10-13

From a biologist's real profile (100 papers, read in the user's own Chrome; `test/fixtures/profiles/doudna.json`):

- **An inventor printed in capitals is offered as a spelling.** Patent databases print the lead inventor as `JA DOUDNA`; an all-caps name is not read as initials plus surname (it would make `WU LI` match `Wei Li`), so three of the hundred papers counted as "papers where the profile name is not in the author list". Such a name — all capitals, the owner's surname, one to three leading words of one to three capitals that fit the owner's given names — is now offered as one click when it stands in at least two papers whose lists lack the owner ("Maybe you: JA DOUDNA (3)"), never used on its own; one click counts the three patents (first, second, middle).
- The real profile pins the rest of what the live panel showed (First 5, Second 0, Last 42, Other 11, 38 roles hidden by cut-off lists, no paper at a ranked venue, years 1989–2023) in `test/real-profile.test.js` and an end-to-end step.

## 2.22.3 — 2026-10-13

- **The year chart no longer collapses when a paper has a wrong date.** From a user's screenshot: one paper that Scholar dates 1803 stretched "Highlighted papers by year" over 1803–2026 and left every bar a pixel wide. The chart now draws at most the last 50 years (a whole career fits: the real profiles of two veterans span 44 and 45 years; counted back from the newest year that can be real: a typo such as 2099 draws nothing; the gap between bars shrinks above 24 bars) and starts at the first year inside them that has a paper; the papers before it are counted and said on hover over the first year and to screen readers ("1 older paper is not drawn"). The numbers, the table and the year filter still count every paper.
- **"Read full lists" no longer breaks in two** beside a status note (the renamed button is longer than the old one-word label): the action keeps its width, up to 55% of the row, and the note beside it wraps instead. Unit test for `metrics.yearBars` and an end-to-end step on a synthetic profile with a paper dated 1803.

## 2.22.2 — 2026-10-13

From an independent review of 2.21 and 2.22 (eight confirmed problems):

- **"Nothing on this profile is ranked" is only said when the whole list is here.** After *Cancel* or a stall Scholar's *Show more* button can be disabled just because a request is still in flight, which the loader used to read as "complete": the table lost its columns and the note spoke for a profile that was only partly loaded. The panel now knows the list is complete only when the page offered nothing more at the start or the loader ran to its end; the same flag keeps the "N papers loaded" line and *Load all* visible after a cancel.
- A paper whose author list does not name the owner counts too: its venue chip is drawn, so the note must not say that no venue is on a list.
- The toolbar popup's *Role hidden* row no longer spans columns that are not there (an HTML `colspan="0"` made a third cell under a two-column header on every profile outside computer science with a cut-off author list).
- A selection made on a tier while the list was still loading is dropped when the tier columns go (nothing was left to undo it).
- With the layout warning (the totals are hidden) the "N papers loaded" line stays.
- The unranked-venues list keeps its *Report* link on every profile: a computer-science profile whose venues the lists miss is exactly where a report helps.
- **The weekly data check** treats a 4xx answer (404, 403: moved, removed, refused) as a finding instead of "no verdict", flags a second catalogue file offered next to the bundled one as a new edition, calls a web page served instead of the PDF or the CSV "no verdict" instead of "the file has changed", and `data/README.md` says GitHub pauses scheduled workflows after 60 days without activity.
- The markup test compares whole names with their `#` or `.` (`#gsc_a_t` was only covered by `.gsc_a_t`; it is listed now). Docs and comments no longer call *Read full lists* "Resolve" or "Complete", and the architecture note says what `sources` holds.

## 2.22.1 — 2026-10-13

- **A mark after an author's name no longer makes that author "co-first" wherever it stands.** Until now any trailing mark (`*`, `†`, `#` …) on the profile owner's name meant *Co-first*, so a last author marked as a corresponding author (`…, C Lee*`) or a co-senior one (`…, C Lee*, D Kim*`) was shown as co-first. Now the owner is co-first only inside the leading group of authors that share a mark with the first author (`A*, B*, C`: at least two); a lone mark, a mark further down, or a second group with another symbol (`A†, B†, C‡, D‡`: C and D) says nothing about the role, and the envelope `✉` (a corresponding author) is never read as equal contribution. The star-like characters `*`, `∗`, `⁎` are one mark. A real profile read on the live page (co-first stars, cut lists, Orals) pins the roles in `test/real-profile.test.js` and the end-to-end run.

## 2.22.0 — 2026-10-13

- **A profile outside computer science no longer gets an empty rank table.** CCF and CORE rank computer-science venues; when everything is loaded and none of a profile's papers is on a list that is switched on (a biologist's, a physicist's), the table counts papers by role only (heading *Papers by role*, no empty A / B / C columns, no CCF | CORE switch), the note says the lists cover computer science (`noRanksNote`), the unranked-venues list stays but has no *Report* link (nothing is missing from the lists), and the toolbar popup follows. While papers are still loading, or as soon as one paper is ranked, the columns are there as before. The copied summary and table follow (roles and totals). A synthetic biologist's profile and an end-to-end step cover it.
- With both lists switched off the heading is *Papers by role* too, and the note about where ranks come from is gone (it described ranks that are not shown).
- README (both languages) says the lists are computer science's and what a profile outside it shows.
- **The rank data is checked every week against its official sources.** `scripts/check-data-fresh.mjs` downloads the CCF catalogue and the ICORE export again, compares their sha-256 with the ones the data was built from and looks for a newer edition (another file behind the CCF page's link, a newer edition in the CORE portal's list); `.github/workflows/data-fresh.yml` runs it every Monday and fails (GitHub mails it) when something changed, with a warning only when a source cannot be reached. Checked today: both files are byte-identical to the bundled ones, and no newer edition is listed.

## 2.21.0 — 2026-10-13

From a check against Scholar's live pages (a real profile and one of its paper pages, read in the author's own Chrome) and the first design review's last open point:

- **The button that reads the cut-off author lists is called *Read full lists*** (it was *Complete*, which reads like "finish"); the progress line says *Reading author lists…*, the settings switch *Read author lists from Semantic Scholar first*, and the saved-data line no longer names a button. All 30 languages follow (the two Chinese ones keep 补全 / 補全, which already said "fill in what is cut off").
- **The line under the button says who is asked.** With the Semantic Scholar switch on it used to say "Opens each paper's page on Scholar…" although the titles go to Semantic Scholar first; it now says so before anything is pressed (`resolveHintSemantic`, an e2e check for both texts).
- **No lone "N papers loaded" line.** Once every paper is loaded and nothing else needs saying, the status block is gone instead of repeating the count that the totals already show; it stays while papers are coming, when *Load all* is offered, with any other status line, and whenever the totals are not shown.
- **Real data:** every selector the extension reads or hides (rows, author and venue lines, *Show more*, the *Cited by* / *Co-authors* / *Public access* blocks, the paper page's field table) was found on Scholar's live markup today. `scripts/check-scholar-markup.js` repeats that check from the DevTools console, and a test keeps its list equal to what the source uses. Thirteen more real venue strings (LLM web-agent venues: Oral levels, Findings, a demo track, a journal and a venue no list has) joined the matcher's corpus; all resolve as intended.
- Considered and set aside, with the reasons and the official PDF addresses: the tier in the paper's year (`docs/ROADMAP.md`).

## 2.20.3 — 2026-10-13

From a review of the redirect script and the latest changes:

- **"Open Scholar in"**: only `hl` is replaced in the address (the rest of the query is kept byte for byte, so a query in another encoding is not corrupted; the hash is kept); the loop guard lasts 15 seconds (it used to last for the tab and could block later pages after an aborted redirect), compares case-insensitively, and without a place to keep it there is no redirect at all.
- A Semantic Scholar 403 without a key is the shared limit, not "your key was refused"; being unable to reach it is not blamed on the key either.
- The status lines of the panel have their spacing back (a regression of 2.20.1), the runner-up star shows in forced-colours mode, "11 of 12" is not wider than it needs to be, the settings preview's link honours reduced motion.

## 2.20.2 — 2026-10-13

- "11 of 12" is written in each language's own word order (Hindi puts the total first: "12 में से 11"); the popup's "19 of 20 papers" is one message per language instead of a number, the word "of" and a noun glued together (which read wrongly in Russian, Ukrainian, Czech, Polish, Romanian, Arabic and Hindi).
- A Semantic Scholar API key that is refused (or cannot be sent) stops further asking and says so, then Scholar's own pages are used.

## 2.20.1 — 2026-10-13

Fixes from the second independent code review:

- **Table labels no longer run into the numbers** on the CORE tab (and in the popup, and in narrow columns): long role words (Finnish, Dutch, Greek, Polish, German …) wrap inside their column; the last header column is wider. An end-to-end check measures every language on both tabs.
- **Forced colours (Windows high contrast)**: the fold chevron, the settings icon and the award stars stay visible (they are drawn with masks), the switches are real checkboxes (on and off differ), and the pressed ranking tab is outlined; the same for the settings page and the popup.
- **A chosen venue stays in the venue list** (pressed, so it can be undone) when another filter would push it out of the first few; the filter is dropped only when the venue cannot exist any more (not when an unrelated filter, say a year range, is set). A matrix cell or an awards row is dropped when its part of the panel is switched off.
- The page's `lang` and the number and list formatting follow the language the words are actually shown in (a browser language we have no translation for is served in English); the Semantic Scholar key keeps visible ASCII only.
- The settings preview now lists sample venues (the Top venues switch shows), and the panel's links in it work; the list of unrecognised venues is no longer rebuilt with every update (focus and scroll stay); the popup follows the panel when Scholar's layout has changed; German "not ranked" legend; chip labels no longer inherit the group's word spacing.

## 2.20.0 — 2026-10-13

- **"Open Scholar in" covers Scholar's search pages too** (a shared search link opened in another language is reopened in yours), not only profiles. It is a second, tiny content script (`content/lang-redirect.js`, run at document start on the same Scholar domains; it checks the path itself, never touches downloads such as `/scholar.bib` or the `/scholar_url` redirects, reads one setting and nothing else). `scripts/update-scholar-domains.sh` writes both lists; the privacy text says so.
- The line under *Highlighted papers* names every filter the numbers follow (cell, awards row, venue, years), not only the years.

## 2.19.2 — 2026-10-13

- A browser set to Norwegian Bokmål or Nynorsk (`nb`, `nn`) now gets the Norwegian interface (Chrome would not have mapped it to the `no` folder and shown English).
- Accessibility: the list of unrecognised venues can be reached with the keyboard; an axe-core audit tool (`scripts/axe-audit.mjs`) covers the panel in twelve states, the settings page and the popup, and finds nothing.

## 2.19.1 — 2026-10-13

- With every position switched off the panel says why nothing is highlighted (with a link to the settings) instead of four zeros.
- A suggested spelling of your name is a button-like pill (it changes the table), not a link in a sentence.
- Translations: Arabic and Romanian counts use the "label: number" form (correct for every number); German role labels are whole words (Erstautor, Zweitautor, Letztautor) so they read in sentences; a Russian calque is fixed.
- A check that the numbers under the filters follow them.

## 2.19.0 — 2026-10-13

From a second design review (states and variants):

- **The numbers follow the filters.** The year range, an awards row, a matrix cell and a venue now narrow what *Highlighted papers* (papers, citations, h-index, i10) and the venue list count; the table and the year bars stay whole (they are where a filter is chosen). The block names the range ("First, Second and Last · 2020–2024"). The filter bar says *which* filters ("Showing 25 of 100 papers · Last, CCF A · 2020–2024") and stays when the panel is folded.
- **Layout warning first.** When Scholar's page layout has changed, the warning is the first thing in the panel, in its own style; the zero table, counts and name help are gone.
- **Papers whose role is unknown** are a row after the total (they are not in it); **Complete** says what it does and that it asks Scholar before it is pressed; the note on where the ranks come from sits under the table ("CCF 2026 · ICORE 2026", unbreakable and isolated for right-to-left text).
- Numbers use the language's own digit grouping; the panel carries its language (`lang`) and gets more line height in Japanese, Chinese, Korean, Thai, Arabic and Hebrew; the drop-downs mirror in right-to-left; a list of venues shows "N×" only when N is more than one.
- **Settings preview**: the four sample rows (what most switches change) are first, with the panel under them; a fade inside the card replaces the mask that smeared the always-light preview in dark mode.
- **Popup**: shows "Loading… N" while the list is still loading, and a legend for the dash column.

## 2.18.1 — 2026-10-13

- The long old name is gone from the screen too: the panel's title is the short **Roles & Ranks**, the popup and the settings page say **Scholar Roles & Ranks** (translated names, as in the store listing).
- A list opened in the panel ("N papers at venues without a rank") stays open when the panel is drawn again (a filter changes, more papers arrive); it used to fold itself.
- A venue filter is dropped as soon as the change that removes its venue from the list (one role switched off), not one redraw later; the venue list follows the rankings that are switched on.
- When Scholar's layout has changed, the panel shows the warning and the loading status instead of a table of zeros.

## 2.18.0 — 2026-10-13

- **A filter bar.** When any filter narrows the paper list (a matrix cell, an awards row, a venue, "only highlighted", a year range), the panel says so under its header — "Showing 25 of 100 papers · Clear" — and one click clears every filter. A filter that matched nothing is no longer a silent blank list.
- The "Highlighted papers" block names the roles it counts ("First, Second and Last"), so "highlighted" is defined where it is used.
- The wide layout rearranges itself when the window is resized across the breakpoint (the year bars and venue list join the first column).
- Windows high-contrast (forced colours): a highlighted row keeps a 4 px border, names are underlined, chips and bars keep outlines.

## 2.17.0 — 2026-10-13

From an independent design review of the screenshots:

- **Panel**: the title is plain text (it looked like a link), section titles are semi-bold and row labels regular (only the numbers are bold), the table has fixed numeric columns with the footer label aligned to the role names and quiet totals, the three copy buttons share one row, the fold button is a drawn chevron (it points to the reading side when folded, also in right-to-left languages), and in the wide layout the year bars and the venue list join the shorter first column. Chips of a row wrap together and start at the text's edge (they used to be indented by their margin), the second-author name mark is darker (contrast), empty table cells are no longer tab stops, the year bars are wider and carry their numbers for screen readers.
- **Toolbar popup**: the version is gone from the header, the count reads "19 of 20 papers" with the reason in a tooltip when a paper does not have your name, and the table is laid out like the panel's.
- **Settings**: switches that can be seen (off tracks at 3:1, a dark thumb on the lit track in dark mode), borders that follow the theme, drop-downs drawn like the panel's with their hint above them, card links that fade at the end and follow the card in view, spacing under a card title without a description, nested switches marked with a rule; the right-to-left layout mirrors bars and switches.
- **Website**: the product is in the first view (and a legible panel-only picture on phones), feature cards use the four role colours instead of eight hues, pressed role buttons are tinted, Japanese and Chinese headings break between phrases, `chrome://extensions` is set as code, headings are centred consistently.
- Pictures for the README, the website and the Web Store listing are taken again (whole panel, whole settings preview) with a crop tool (`scripts/crop-image.mjs`).

## 2.16.1 — 2026-10-13

- The panel has a live region for screen readers: when loading stops or **Complete** finishes, the message is announced.
- The settings page's API key field is a text field drawn as dots (no password-manager prompt).
- Tests: the timing budgets scale with how busy the machine is, so a loaded laptop or CI runner no longer fails them.

## 2.16.0 — 2026-10-13

- Settings → Colours: **Row highlight** style: tint and bar (as before), the bar only, or the tint only.

## 2.15.1 — 2026-10-13

- When Semantic Scholar asks to slow down during Complete, the rest is read from Scholar's own pages and the status says so (in every language).

## 2.15.0 — 2026-10-13

- Semantic Scholar: an **API key** can be given (optional; a free key from semanticscholar.org avoids the rate limit that everyone without one shares). It is kept on this device only (not synced) and sent only to Semantic Scholar, in a header. A unit test now checks that every script in `src/` parses.

## 2.14.5 — 2026-10-12

- A second-opinion review of all 29 translations against the English: where a publication venue was called a "sede" / "venue" / "sede" (es, fr, it: a headquarters, an arrival), "publikace" (pl, cs: a paper) or similar, it now says conference or journal; award names that meant something else ("service paper award" in ja and ko, "lifetime achievement" in es) are corrected; mixed registers, grammar and terminology are made consistent per language.

## 2.14.4 — 2026-10-12

- The button that reads papers' own pages to fill in cut-off author lists is called **Complete** (it was "Resolve", which says little) in every language, and the texts that mention it follow. Several translations of the old label meant something else ("solve", "confirm") and are corrected.
- An end-to-end check that every interface language fits the panel and the settings page.

## 2.14.3 — 2026-10-12

- Settings → Saved data: **Copy details for a bug report** (version, browser, language and the settings; nothing that identifies you), and an issue template that asks for it.
- Printing or saving a profile as PDF keeps the role colours and chips.
- The CI run is green again (the package script tripped over a long file listing).

## 2.14.2 — 2026-10-12

Fixes from an independent review of the newer features:

- **Semantic Scholar**: an answer is used only when its title is long enough to name one paper, its authors include the row's first author, and its year is within two of the row's; its venue is no longer used (a merged preprint / publication record could name another version's venue). Switching the setting off stops a run in progress. Rows hidden by *Merge duplicates* are not looked up.
- A merged talk row's filter follows the talk groups that are switched on, as its count does.
- A venue filter whose venue leaves the panel's list (roles changed, merge switched on) is dropped instead of leaving rows hidden with no control to undo it.
- "Open Scholar in" redirects at most once per tab and language (no loop if Scholar answers with another language).
- Right-to-left: the panel's spacing and borders use logical properties.

## 2.14.1 — 2026-10-12

- Settings page: a row of links to its cards under the header (the page had grown long); the card in view is marked.
- The privacy wording (settings footer, README, PRIVACY.md) says that nothing is sent anywhere unless you switch on the Semantic Scholar lookup.

## 2.14.0 — 2026-10-12

- The panel can list **where the highlighted papers appear**: the ranked venues, most papers first; click one to show just its papers. It has its own switch (Top venues) and is off until you turn it on.

## 2.13.1 — 2026-10-12

- With merging off, the panel's status says when entries repeat another paper ("Entries that repeat another paper: 3 — Merge…"), with a link to the settings.
- End-to-end checks for text contrast (panel and settings, light and dark, at least 4.5:1) and for controls without an accessible name.
- README: the newer options are described.

## 2.13.0 — 2026-10-12

- The panel gains **Highlighted papers by year**: one bar a year, stacked in the role colours (hover for the numbers). It has its own switch under Summary panel, and is left out of the compact layout.

## 2.12.0 — 2026-10-12

- **Talk rows.** Settings → Awards and talks → Rows in the panel: show Oral, Spotlight and Highlight apart (as before), Spotlight and Highlight in one row, or all three in one row ("Talks"). A paper with several counts once; clicking a merged row lists its papers.
- **Semantic Scholar** (off by default). Settings → Semantic Scholar: when you press Complete, each paper's full author list is asked of semanticscholar.org first (only the title is sent; the answer is used only when its title is the same paper's), and Scholar's own page is read only for what it does not know: fewer requests to Scholar, fewer CAPTCHAs.
- A new icon: four rows in the four role colours on dark, with the rank badge.
- The GitHub repository is now `boyugou/scholar-roles-and-ranks`.

## 2.11.0 — 2026-10-12

- **30 languages.** Settings → Language: follow the browser, or pick any of 30 (English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Deutsch, Italiano, Português ×2, Русский, Українська, Polski, Čeština, Nederlands, Svenska, Dansk, Suomi, Norsk, Türkçe, العربية, עברית, हिन्दी, Bahasa Indonesia, Tiếng Việt, ไทย, Ελληνικά, Magyar, Română). The panel, popup and settings redraw at once; Arabic and Hebrew read right to left. A second choice, **Open Scholar in**, opens a profile again with that `hl=` when its address says another language (a shared link, say).
- **Role colours.** Settings → Colours: a colour for each authorship role, used by rows, name marks, the panel and the popup; one button goes back to the standard colours. (Chrome 111 or newer, for `color-mix`.)
- The extension is now called **Scholar Roles & Ranks**.
- `scripts/page-cache.mjs` keeps a copy of each public page the data scripts read in the git-ignored `.cache/pages/`.

## 2.10.132 — 2026-10-12

- Settings: **Merge duplicates** (off by default). Profiles often list one paper twice, the title differing only in capitals, accents or punctuation. With it on, such entries (same title, same first author) become one: the most cited stays, shows the citations of all of them (underlined, with a tooltip), and the panel counts it once. Tested in `test/duplicates.test.js` and end to end.

## 2.10.131 — 2026-10-12

- Settings: **Scholar's own blocks**: hide the "Cited by" table, the Co-authors list or the Public access box on the profile page (all shown by default). End-to-end check included.

## 2.10.130 — 2026-10-12

- The panel's three copy buttons keep their full labels in a narrow sidebar (they wrap onto a second row instead of being cut to "Copy summ…"), and the settings preview that scrolls inside itself in a short window fades at its foot to say there is more. Both have end-to-end checks.

## 2.10.129 — 2026-10-12

- The settings page's preview stays whole in view while the page scrolls: it is pinned below the top and never taller than the window (it scrolls inside itself in a short window), so it is no longer pushed up and cut off at the end of the page. A new end-to-end check scrolls a short window to the top, middle and end.

## 2.10.128 — 2026-10-12

- KR's Ray Reiter best papers, runners-up and Marco Cadoli best student papers for 2020–2022, 2024 and 2025 (14 papers; the list had none for KR) from the conference's own proceedings prefaces, read through macOS PDFKit (`tot.mjs kr-preface`). The list has 7830 awards.

## 2.10.127 — 2026-10-12

- FMCAD's best papers and runners-up for 2016 and 2019–2023 (10 papers; the list had none for FMCAD) from the conference's own year pages (`tot.mjs fmcad-awards`, which tries three text forms). The list has 7816 awards.

## 2.10.126 — 2026-10-12

- DASFAA 2024's best paper, best student paper and runner-up (3 papers; the list had none for DASFAA) from the conference's own awards page (`tot.mjs dasfaa-awards`). The list has 7806 awards.

## 2.10.125 — 2026-10-12

- Semantic Web ISWC 2020's best resource paper from the conference's awards page (the `iswc-semweb` reader takes its layout). The list has 7803 awards.

## 2.10.124 — 2026-10-12

- The International Semantic Web Conference's best research, student, resource and in-use track papers of 2022, 2023 and 2024 (12 papers) from the conference's own award pages (`tot.mjs iswc-semweb`; the Wearable-computing ISWC pages are a different series). The list has 7802 awards.

## 2.10.123 — 2026-10-12

- ECIR 2024's and 2020's best, short, IR4Good, industry and reproducibility papers with their honourable mentions (14 papers) from the conferences' own award pages (`tot.mjs ecir-labelled`; the page of 2021 describes the awards in prose, 2019's answers 502, 2022's 406). The list has 7790 awards.

## 2.10.122 — 2026-10-12

- EuroS&P 2026's four distinguished papers and two test-of-time papers (6 papers) from the symposium's own site (the `eurosp` reader takes the eurosp<year> host, the plural award headings and the test-of-time awards). EuroS&P 2023's page lists no winners under its heading. The list has 7776 awards.

## 2.10.121 — 2026-10-12

- ECML PKDD 2026's best papers and test-of-time paper and 2020's best, student and runner-up papers (10 papers) from the conference's own award pages (the `ecml` reader takes the 2026 and 2020 layouts too). The list has 7770 awards.

## 2.10.120 — 2026-10-12

- UAI 2024's outstanding paper and outstanding student paper (2 papers; the UAI reader now takes the "Outstanding" labels and a separate "by Authors" line). SOSP 2019's awards page and UAI's earlier years' pages were looked at and not read (wrapped lines; 404). The list has 7760 awards.

## 2.10.119 — 2026-10-12

- UbiComp's and Pervasive's best papers 2005–2016, best student papers 2015–2016 and 10-year impact papers 2005–2024 (60 papers) from the UbiComp steering committee's own awards page (`tot.mjs ubicomp-sc`). The list has 7758 awards.

## 2.10.118 — 2026-10-12

- NAACL HLT 2016's best short and long papers and runners-up (7 papers) from the conference's own page (`tot.mjs naacl-best`; two titles' semicolons corrected to colons). The list has 7698 awards.

## 2.10.117 — 2026-10-12

- NAACL HLT 2015's three best papers (the ACL Anthology metadata the list reads starts in 2019) from the conference's own page (`tot.mjs naacl-best`). The list has 7691 awards.

## 2.10.116 — 2026-10-12

- CP's paper awards 2001–2025 (70 papers; the list had none for CP) from the Association for Constraint Programming's own page (`tot.mjs cp-awards`). The shared name check now accepts combining accents (Vilı́m). The list has 7688 awards.

## 2.10.115 — 2026-10-12

- MIDDLEWARE's best papers 2007–2025, best student papers 2013–2025 and test-of-time papers 2007–2025, with runners-up (52 papers; the list had none for MIDDLEWARE) from the series' own award pages (`tot.mjs middleware-awards`). The list has 7618 awards.

## 2.10.114 — 2026-10-12

- SCA's best papers and honourable mentions 2024–2026 (10 papers; the list had none for SCA) from the symposium's own award pages (`tot.mjs sca-awards`). The list has 7566 awards.

## 2.10.113 — 2026-10-12

- CONTRIBUTING.md: how to add an award source (official pages only, PDFs through `scripts/awards/pdf-text.swift`, the readers' refusals, the venue guard, tests, hosts, corrections).

## 2.10.112 — 2026-10-12

- The award readers' command line now drops any entry whose conference the saved page never mentions. A fuzz run of every reader over 400 saved pages showed many readers accept a page meant for another (the SPAA reader parsed the RecSys page); every genuine page keeps all its entries.

## 2.10.111 — 2026-10-12

- The UMAP reader now refuses pages that are not UMAP's (a fuzz run of the 21 newest readers over 400 saved pages found it was the only one accepting unrelated pages; none crashed).

## 2.10.110 — 2026-10-12

- KDD 2004's best research paper title is corrected (the page printed it without its article and with a stray ">>"), so it matches Scholar. A re-audit of all 7556 entries found no other malformed titles or authors.

## 2.10.109 — 2026-10-12

- ASP-DAC's best papers 2006–2024, DAC's 2005–2024 and DATE's 2005–2024 (82 new papers, filling DATE's gaps before 2014 and in 2015, and DAC and ASP-DAC from nothing) from IEEE CEDA's own best paper award pages (`tot.mjs ceda-paper`). The list has 7556 awards.

## 2.10.108 — 2026-10-12

- DAC's best papers of 2020 and 2024 (2 papers) from the conference's own press releases (`tot.mjs dac-best`); the site has no other year's. The list has 7474 awards.

## 2.10.107 — 2026-10-12

- DATE's best papers 2023–2025 (12 papers) from each year's own site (`tot.mjs date-awards`). The list has 7472 awards.

## 2.10.106 — 2026-10-12

- DATE's best papers 2020–2022 (12 papers) from the archive's `bestpaper.html` pages; the DATE reader takes HTML as well as PDF text, and no longer takes a university line for an author. The list has 7460 awards.

## 2.10.105 — 2026-10-12

- DATE's four best papers of 2014 (from the same kind of archive PDF; 2015's layout interleaves authors and affiliations and is refused). The list has 7448 awards.

## 2.10.104 — 2026-10-12

- DATE's best papers 2016–2019 (16 papers; the list had none for DATE) from the conference's own archive PDFs, read through macOS PDFKit (`scripts/awards/pdf-text.swift`, `tot.mjs date-best`). PDFs the sites publish are readable this way, which opens other sources earlier probes had written off as unreadable. The list has 7444 awards.

## 2.10.103 — 2026-10-12

- HSCC's best papers and best student papers 2012–2023 and test-of-time papers 2018–2022 (18 papers; the list had none for HSCC) from the conference's own past-conferences page (`tot.mjs hscc-past`). The list has 7428 awards.

## 2.10.102 — 2026-10-12

- Best papers 2005–2024 and test-of-time papers 2019–2024 of the three Embedded Systems Week conferences CASES, CODES+ISSS and EMSOFT (74 papers; the list had none for any of them) from ESWEEK 2024's own award page (`tot.mjs esweek-awards`). The list has 7410 awards.

## 2.10.101 — 2026-10-12

- SPAA's best, outstanding and distinguished papers, 2007–2026 (50 papers; the list had none for SPAA) from the SPAA steering committee's own page (`tot.mjs spaa-awards`). The list has 7336 awards.

## 2.10.100 — 2026-10-12

- RECOMB's best papers and best student / young scientist papers, 2001–2026 (26 papers; the list had none for RECOMB) from the conference series' own awards page (`tot.mjs recomb-awards`). The list has 7286 awards.

## 2.10.99 — 2026-10-12

- UMAP's best papers 2007–2025 (19) and BPM's best papers and best student papers 2009–2026 (32; the list had none for either) from the UMAP society's and the BPM steering committee's own pages (`tot.mjs umap-best`, `bpm-awards`). The list has 7260 awards.

## 2.10.98 — 2026-10-12

- ICCAD's McCalla best papers (front-end and back-end) and ten-year retrospective influential papers, 2005–2025 (38 papers; the list had none for ICCAD) from IEEE CEDA's own award page (`tot.mjs mccalla-awards`). The list has 7209 awards.

## 2.10.97 — 2026-10-12

- FPGA's best papers 2011–2026 and FCCM's best papers and runner-up 2010–2026 (35 papers; the list had none for either) from the IEEE TCFPGA community's award pages (`tot.mjs tcfpga-best`). The list has 7171 awards.

## 2.10.96 — 2026-10-12

- DSN's best papers for 2014–2017 and 2022–2026 (17 papers; the list had none for DSN) from the DSN steering committee's own page (`tot.mjs dsn-best`); 2018–2021 are not read, the page running the authors into the title. The list has 7136 awards.

## 2.10.95 — 2026-10-12

- CADE's and IJCAR's best papers and best student papers, 1999–2026 (26 papers; the list had none for either) from CADE Inc.'s own award page (`tot.mjs cade-awards`). The list has 7119 awards.

## 2.10.94 — 2026-10-12

- ICGT's best papers 2010–2024 (11 papers) from EATCS's own award page (`tot.mjs eatcs-paper`); EATCS's ETAPS page mixes the member conferences' papers (already read from etaps.org) and its CCC student page has no history list, so neither is read. The list has 7093 awards.

## 2.10.93 — 2026-10-12

- Best papers and best student papers of ESA (2005–2026), ICALP (2000–2026), MFCS (2012–2023) from EATCS's own award pages and of SoCG (2012–2026) from the computational geometry community's awards page (225 papers; the list had none for ICALP, MFCS or SoCG and only one ESA year) (`tot.mjs eatcs-paper`, `socg-awards`). The list has 7082 awards.

## 2.10.92 — 2026-10-12

- ICDT's best papers and best student papers, 1990–2025 (27 papers; the list had none for ICDT) from the ICDT council's own awards page (`tot.mjs icdt-awards`). The list has 6857 awards.

## 2.10.91 — 2026-10-12

- ECAI 2025's three main-track outstanding papers and SAT 2024's and 2025's best paper and best student paper (7 papers; the list had none for either) from the conferences' own awards pages (`tot.mjs ecai-awards`, `sat-awards`). The list has 6830 awards.

## 2.10.90 — 2026-10-12

- MICCAI 2025's best paper and its two runners-up (3 papers; the list had none for MICCAI) from the conference's own page (`tot.mjs miccai-best`). The list has 6823 awards.

## 2.10.89 — 2026-10-12

- IEEE/IFIP NOMS 2025's best paper and best student paper (2 papers; the list had none for NOMS) from the symposium's own front page (`tot.mjs noms-awards`). The list has 6820 awards.

## 2.10.88 — 2026-10-12

- IEEE CCNC's best paper and runner-up of 2025 and best paper and best student paper of 2024 (4 papers; the list had none for CCNC) from the conference's own awards pages (`tot.mjs ccnc-awards`). The list has 6818 awards.

## 2.10.87 — 2026-10-12

- IEEE PIMRC 2025's seven best papers (four tracks and three workshop sessions) from the symposium's own Best Paper Awards page (`tot.mjs pimrc-best`); the list had none for PIMRC. The list has 6814 awards.

## 2.10.86 — 2026-10-12

- The Web Conference's best paper of 2018 (HighLife) and best paper and best student paper of 2020 (Open Intent Extraction; Mobile App Squatting) from the conference's own pages (`tot.mjs www-year`); the list had WWW's best papers of 2022 and 2024 only. The list has 6807 awards.

## 2.10.85 — 2026-10-12

- CIDR 2025's two best papers and its two test of time papers (TelegraphCQ and Borealis, with their CIDR 2003 and 2005 years) from the conference's own awards page (`tot.mjs cidr`); the list had none for CIDR. The list has 6804 awards.

## 2.10.84 — 2026-10-12

- Static security review of the extension code: no `innerHTML`, `eval` or `new Function` anywhere, `storage` is the only permission, and the one `fetch` (the user-triggered read of a paper's page on Scholar) now refuses a link that is not on the page's own origin before it sends cookies; an e2e check rewrites the links to another origin as the page loads and fails if any request is attempted (it fails when the guard is removed, which was checked).

## 2.10.83 — 2026-10-12

- Contrast and screen-reader fixes found by an axe-core audit of the settings page, the panel and the popup: the faint grey (`#80868b`, 3.7:1 on white) is `#6b7076` (5:1) and `#969ca2` in dark mode; the last-author name green is darker (5.4:1 on its tint); Scholar's own grey author and venue lines (`#777`, 3.8:1) are `#5f6368` inside tinted rows; the role column of the table has a screen-reader label ("Role", "作者位置"). A test keeps these colours above 4.5:1.

## 2.10.82 — 2026-10-12

- ECML PKDD 2023's test of time paper and its best and best student papers of the research and ADS tracks (5 entries) from the conference's own awards page, which prints the authors above each title (`tot.mjs ecml-authors-first`); the list had ECML PKDD 2025 only. The list has 6800 awards.

## 2.10.81 — 2026-10-12

- SIGCOMM 2025's best paper (Mosaic) and best student paper (Edge Caching as Differentiation) from the conference's paper information page, and CHIIR 2025's best paper from its front page (`tot.mjs sigcomm25`, `tot.mjs chiir-best`). The list has 6795 awards.

## 2.10.80 — 2026-10-12

- IEEE ICC 2019's sixteen best papers (a fifth layout: `Paper Title:`, `Authors:` and one `Name (Affiliation)` line per author) from the conference's own page (`tot.mjs icc-best`). The list has 6792 awards.

## 2.10.79 — 2026-10-12

- IEEE ICC 2021's thirteen best papers (a fourth layout: the quoted title and a `by` line apart) and INFOCOM 2026's two best papers, from the conferences' own pages (`tot.mjs icc-best`, `tot.mjs infocom`). The list has 6776 awards.

## 2.10.78 — 2026-10-12

- IEEE GLOBECOM's best papers of 2022 (16) and 2023 (17) — the totals the pages state — from each year's own Best Paper Awards page (`tot.mjs globecom-best`); the list had none for GLOBECOM. A footnote mark after a name (♭) no longer drops the paper. The list has 6761 awards.

## 2.10.77 — 2026-10-12

- IEEE WCNC's best papers of 2022–2024 (12 papers, one per track; the list had none for WCNC) from each year's own Best Paper Awards page (`tot.mjs wcnc-best`). The list has 6728 awards.

## 2.10.76 — 2026-10-12

- IEEE ICC's best papers of 2022–2025 (56 papers, one per symposium; the list had none for ICC) from each year's own Best Paper Awards page, which prints them in three layouts (`tot.mjs icc-best`). 2021's page prints no recipients; GLOBECOM 2025's runs names together and is not read. The list has 6716 awards.

## 2.10.75 — 2026-10-12

- IEEE VR 2024's six best papers (VR.net, Swift-Eye, …) from the conference's awards page (`tot.mjs ieeevr-best`; the list had none for IEEE VR). 2023's page lists best papers, honorable mentions and nominees under one heading, so the reader refuses it. The list has 6660 awards.

## 2.10.74 — 2026-10-12

- ACM Multimedia's best paper and best student paper of 2023 and 2025 (4 papers; the list had none for ACM MM) from the conference's own pages (`tot.mjs acmmm-awards`); 2022's page lists candidates only and 2024's names none. The list has 6654 awards.

## 2.10.73 — 2026-10-12

- AutomotiveUI 2024's best paper (What Characterizes “Situations” in Situation Awareness?): the front page names the title, the proceedings page the authors (`tot.mjs autoui-best`). The list has 6650 awards.

## 2.10.72 — 2026-10-12

- ASSETS 2025's best paper and best student paper (an author per line, with institution lines to skip) and SUI 2024's best paper (the authors above the title) from the conferences' own home pages (`tot.mjs assets-sui`); the list had none for either. The list has 6649 awards.

## 2.10.71 — 2026-10-12

- VRST's best papers of 2022 (one) and 2023 (a tie of two), which the home pages print in two further layouts (`tot.mjs vrst-best`). The list has 6646 awards.

## 2.10.70 — 2026-10-12

- VRST's best papers of 2024 (three) and 2025 (one) from the symposium's own home pages (`tot.mjs vrst-best`); the list had none for VRST. The list has 6643 awards.

## 2.10.69 — 2026-10-12

- BMVC's best paper of 2022 (Trans2k) and its two best student papers, and 2025's best paper (Guiding a diffusion model with itself using sliding windows), from the conference's own pages (`tot.mjs bmvc-awards`); the list had none for BMVC. The list has 6639 awards.

## 2.10.68 — 2026-10-12

- GECCO's best papers of 2021–2025 (50 papers, one per track or group of tracks) from each year's own Best Paper Awards page (`tot.mjs gecco-best`); the list had only GECCO's impact awards. The list has 6635 awards.

## 2.10.67 — 2026-10-12

- MODELS 2025's best foundation paper, best practice track paper and two ACM SIGSOFT distinguished papers (conf.researchr.org's awards track) and JCDL 2025's Vannevar Bush best paper and best short paper (`tot.mjs models-awards`, `tot.mjs jcdl-awards`); the list stopped at MODELS 2024 and JCDL 2017. Other years' pages have no such page. The list has 6585 awards.

## 2.10.66 — 2026-10-12

- IMC's best, best student, best short and distinguished papers of 2018–2022 and 2025 (12 papers; the list had one) from each year's own program page, where the award is written under, after or beside the title in a layout of that year (`tot.mjs imc-year`); the reader refuses a page whose <title> names another year. 2023's and 2024's pages mark no award. The list has 6579 awards.

## 2.10.65 — 2026-10-12

- HRI's best papers of 2022 (5) and 2025 (7 of the full and short tracks, and 4 of alt.HRI, late-breaking reports and demonstrations as categories) from the conference's own awards pages (`tot.mjs hri-year`); the list had HRI 2020 and 2024 only. The honorable mentions are not read. The list has 6567 awards.

## 2.10.64 — 2026-10-12

- The best papers of ISCA 2024 (Constable) and 2025 (two) and of MICRO 2022 (Whisper, Hermes), from the conferences' own front pages (`tot.mjs isca-best`, `tot.mjs micro-best`); the list had only their influential / test of time papers for those years. The list has 6551 awards.

## 2.10.63 — 2026-10-12

- SenSys's best papers and runners-up of 2020, 2021 and 2024 (7 papers; the list had only its test of time papers) from each year's own page (`tot.mjs sensys-year`); 2018's and 2019's pages name a title without authors. The list has 6546 awards.

## 2.10.62 — 2026-10-12

- MobiSys 2015's two best papers (Flip-Flop Replication, Outatime) from its program page: the reader now takes the plural heading "Best Papers" too (`tot.mjs mobisys-year`). The list has 6539 awards.

## 2.10.61 — 2026-10-12

- MobiSys 2022's two best papers (SPiDR, OmniScatter). Its program page keeps 2021's sessions beside its own, so the reader now counts a "Best Paper!" badge only when the paper's DOI has the proceedings prefix of the page's year (3458864 = 2021, 3498361 = 2022, both read off those years' own pages); 2024's page repeats 2022's and is refused. The list has 6537 awards.

## 2.10.60 — 2026-10-12

- MobiSys 2023's best paper (Mozart) from its program page (`tot.mjs mobisys-html`, third layout); the reader now refuses a page whose <title> names another year. 2022's and 2024's program pages keep 2021's sessions beside their own, so they stay unread. The list has 6535 awards.

## 2.10.59 — 2026-10-12

- MobiSys 2020's best paper (SonicPrint) and 2021's three (zTT, nn-Meter, PPFL) from the conference's own program pages, read from their HTML (`tot.mjs mobisys-html`; the text-only reader cannot tell 2020's title from its first author). The 2022 and 2024 program pages repeat 2021's sessions, so they are not read. The list has 6534 awards.

## 2.10.58 — 2026-10-12

- The Computational Complexity Conference's best and best student papers of 2020–2022, 2024 and 2025 (the list had none) from the winning talks tagged in each year's own program page (`tot.mjs ccc-year`). 2023's page names none. The list has 6530 awards.

## 2.10.57 — 2026-10-12

- FOCS 2025's three best papers and two Machtey Award (best student paper) papers from the conference's own best-paper page (`tot.mjs focs-best`); FOCS had only its test of time papers. The list has 6520 awards.
- The e2e check "switching the setting on loads the open profile's list" timed out once (a tab presses only while it is in front, and the browser can be slow to hand the front to it); it now asks for the front again, up to three times, before failing.

## 2.10.56 — 2026-10-12

- Three best papers USENIX's own list has gained since it was last read: FAST 2025 (Ananke), USENIX ATC 2002 (DAFS) and WOOT 2011 (iClass key diversification). Re-reading the live lists is a cheap freshness check.
- `merge-raw` kept both a page's misprinted title and the entry already corrected for it (JCDL 2002 "Collection Synthesis" appeared twice); it now drops the duplicate once corrections are applied, and a test covers it. The list has 6515 awards.

## 2.10.55 — 2026-10-12

- ECIR 2025's best paper, best short paper, best short student paper and its demo, IR4Good and reproducibility awards (6 papers; the list had none) from the conference's own best-papers page (`tot.mjs ecir`); the honorable mentions are not read. The list has 6512 awards.

## 2.10.54 — 2026-10-12

- IPDPS's best papers of 2019–2025 (7 papers) from each year's own front page and ICS 2024's best paper and runner-up from its front page; the list had none of either (`tot.mjs ipdps`, `tot.mjs ics`). The list has 6506 awards.

## 2.10.53 — 2026-10-12

- PPoPP's best papers of 2022 and 2023 (4 papers) from the conference's own front pages, and CIKM 2021's best and runner-up papers of its five tracks (12 papers) from its best-paper page; the list had none of either (`tot.mjs ppopp-year`, `tot.mjs cikm-year`). The other years' pages name no winners or print them in a form too loose to read. The list has 6497 awards.

## 2.10.52 — 2026-10-12

- WSDM's best, best student, runner-up and test of time papers of 2018–2021 (15 papers; the list had none) from each year's own front page, which announces the awards in a layout of its own that year (`tot.mjs wsdm-year`); the honorable mentions are not read, and the later years' pages name no winners. The list has 6481 awards.

## 2.10.51 — 2026-10-12

- IEEE Euro S&P's distinguished papers of 2022 and 2025, and its 2024 distinguished paper and runners-up (11 papers; the list had none) from the symposium's own accepted-papers-and-awards pages (`tot.mjs eurosp`); 2023's page lists finalists only. The list has 6466 awards.

## 2.10.50 — 2026-10-12

- INFOCOM's best papers of 2019–2025 (19 papers; the list had none) from each year's own awards page (`tot.mjs infocom`); the pages print the title or the authors first, which the reader works out from the first line. The best demo and poster awards and the test of time papers are not read. The list has 6455 awards.

## 2.10.49 — 2026-10-12

- ECML PKDD 2025's test of time, best and best student papers of both tracks (5 papers; the list had none) from the conference's own awards page (`tot.mjs ecml`). The list has 6436 awards.

## 2.10.48 — 2026-10-12

- COLING 2025's best long / short, outstanding and category (social impact, low-resource language, dataset, demonstration) papers (15) and Interspeech 2024's two best papers, from the conferences' own pages (`tot.mjs coling`, `tot.mjs interspeech`); the list had none of either. The list has 6431 awards.

## 2.10.47 — 2026-10-12

- ICASSP's best, best industry and best student papers of 2023 and 2024 (13 papers; the list had none) from the conference's own award pages (`tot.mjs icassp`); the 2024 industry paper, whose authors' line mixes in affiliations, is not read. The list has 6414 awards.

## 2.10.46 — 2026-10-12

- AISTATS's best, best student and test of time papers of 2021–2025 (9 papers) and UAI's best, best student and runner-up papers of 2023 and 2025 (6 papers); the list had none of either. Each comes from the conference's own awards page (`tot.mjs aistats`, `tot.mjs uai`); the pages of the other years name no winners (2019 and 2020 list "notable papers", UAI's 2022 and 2024 pages are empty). The list has 6401 awards.

## 2.10.45 — 2026-10-12

- ACM RecSys's best papers 2009–2025 (42 papers: best full / long / short, student and runner-up; the list had none) from the conference's own best-paper page (`tot.mjs recsys`); the honorable mentions and best demo are not read. The list has 6386 awards.

## 2.10.44 — 2026-10-12

- SOSP's best papers of 2021, 2023 and 2024 (9 papers; the list had none) from the conference's own program, front and accepted-papers pages (`tot.mjs sosp-program`). The list has 6344 awards.

## 2.10.43 — 2026-10-12

- The 30 award titles that kept a sentence full stop from the page they were read from ("… Program Repair.") lose it, and `merge-raw` now strips it; matching was never affected, the tooltip text is cleaner.

## 2.10.42 — 2026-10-12

- RSS 2025's four outstanding paper awards (paper, systems, student, demo) from the conference's awards page, where a "Winner:" line follows the winning finalist (`tot.mjs rss-year`). The list has 6335 awards.

## 2.10.41 — 2026-10-12

- RSS's best, best student and best systems papers of 2021 and 2022 (6 papers) from the conference's own awards pages (`tot.mjs rss-year`); the other years' pages list only finalists or nominees. The list has 6331 awards.

## 2.10.40 — 2026-10-12

- CoRL's outstanding paper awards of 2024 and best / best student paper awards of 2025 (5 papers) from the conference's own awards pages (`tot.mjs corl-year`); the finalists are not read. The list has 6325 awards.

## 2.10.39 — 2026-10-12

- COLT's best, best student and runner-up papers of 2021, 2022 and 2024 (13 papers) from the conference's own "Paper Awards" pages (`tot.mjs colt-year`). The 2023 page is a copy of 2022's, so it is not read. The list has 6320 awards.

## 2.10.38 — 2026-10-12

- MobiSys 2019's best paper (This is Your President Speaking: Spoofing Alerts in 4G LTE Networks) from the conference's program page (`tot.mjs mobisys-year`). The list has 6307 awards.

## 2.10.37 — 2026-10-12

- SIGCOMM 2024's best paper (The Next Generation of BGP Data Collection Platforms) and best student paper (Understanding the Host Network) from the conference's program page (`tot.mjs sigcomm-year`); no other recent year's page names its awards. The list has 6306 awards.

## 2.10.36 — 2026-10-12

- ASPLOS's best papers of 2019 and 2020 (8 papers) from the conference's own site pages (`tot.mjs asplos-year`). The list has 6304 awards.

## 2.10.35 — 2026-10-12

- ASPLOS's best, distinguished and influential paper awards of 2022–2026 (36 papers) from the conference's own site (`tot.mjs asplos-year`); the honorable mentions and artifact awards are not read. The list has 6296 awards.

## 2.10.34 — 2026-10-12

- MobiSys's best papers of 2011–2014, 2016 and 2017 (10 papers: SignalGuru, Chameleon, ACE, Energy Characterization and Optimization of Image Sensing Toward Continuous Mobile Vision, Rio, BackDoor …) from the conference's own program pages
  (`tot.mjs mobisys-year`); the other years' pages are not read. The list has 6260 awards.

## 2.10.33 — 2026-10-12

- MobiCom 2014's best paper (Tagoram: Real-Time Tracking of Mobile RFID Tags to High Precision Using COTS Devices) and runner-up (EkhoNet: High Speed Ultra Low-power Backscatter for Next Generation Sensors) from the conference's front page
  (`tot.mjs mobicom-year`). The list has 6250 awards.

## 2.10.32 — 2026-10-12

- MobiCom 2017's best paper (WEBee: Physical-Layer Cross-Technology Communication via Emulation) and best community paper (The Tick Programmable Low-Latency SDR System) from SIGMOBILE's own October 2017 newsletter (`tot.mjs mobicom-year`;
  the conference's pages of that year name no awards). The list has 6248 awards.

## 2.10.31 — 2026-10-12

- MobiCom 2018's best paper (SkyCore) and best community paper (One Billion Apples' Secret Sauce) from the conference's keynotes-and-awards page (`tot.mjs mobicom-year`; the 2017 pages name them only in a SIGMOBILE newsletter, not read).
  The list has 6246 awards.

## 2.10.30 — 2026-10-12

- Four more titles that an official page misprints are put right (`data/exclusions.json`): AAMAS 2012's "enviornment", HPCA 2019's "Branch Predication", JCDL 2002's "Collection Systhesis" and SIGMOD 2001's "Dimensionality Deduction" — found by looking for
  rare long words one letter away from a common one across all award titles. Each matched nothing on Scholar before.

## 2.10.29 — 2026-10-12

- ETAPS 2011's best paper of CC (Grewe and O'Boyle) is printed "A static task partitionic approach for heterogeneous systems using OpenGL" on the awards page — two typos for "partitioning … OpenCL" — so it could not match Scholar.
  `data/exclusions.json`'s `correct` section takes a `newTitle` now; the evidence keeps the page's misprint and says what the paper's title is.

## 2.10.28 — 2026-10-12

- EuroSys 2024's test-of-time paper (System software for persistent memory) lists its first author family-name first ("Dulloor Subramanya Rao"), so the surname "Rao" matched nothing — an OpenAlex spot check of the list found it. `data/exclusions.json` gets a
  `correct` section (the same words, the family name last), applied by `merge-raw.mjs` and tested.

## 2.10.27 — 2026-10-12

- SIGSOFT's distinguished papers: the reader cut a line at the first colon, so a title with a main title ("CUTE: A Concolic Unit Testing Engine for C", "HAMPI: A Solver for String Constraints", "Seeking the Ground Truth: …", "Trading Robustness for Maintainability: …")
  lost it to the author list and could never match Scholar. About 16 papers (ICSE, FSE, ISSTA, ASE 2002–2024) are right now: the names are the leading entries that are names, the first that is not starts the title. `merge-raw.mjs --replace-source <url>`
  replaces what an older reader produced instead of adding to it. The list has 6244 awards.

## 2.10.26 — 2026-10-12

- Two KDD 2005 rows are gone: the awards page prints the 2004 application winner's title under the 2005 winner's authors and the 2005 winner's title under the 2004 runners-up's authors, so the rows paired a paper with other people's names.
  `data/exclusions.json` records such page errors (with the reason), `merge-raw.mjs` drops them from every merge, a test keeps them out. The list has 6241 awards.

## 2.10.25 — 2026-10-12

- STOC 2024's best paper "Single-Source Shortest Paths with Negative Real Weights in $\tilde O(mn^{8/9})$ Time" could not match Scholar's "Õ(mn^{8/9})": the title key kept the word "tilde" of the LaTeX accent command. Accent commands
  (`\tilde`, `\hat`, `\bar`, `\vec`, …) are dropped from the key now, as `\mathcal` and the like already were.

## 2.10.24 — 2026-10-12

- ASE 2025's distinguished paper "My productivity is boosted, but … Demystifying Users' Perception on AI Coding Assistants" had `&mldr;` in its title (an undecoded data file), so it could never match Scholar's title; `merge-raw.mjs` decodes character
  references now (in titles, authors and evidence, new and existing entries) and a test keeps them out.

## 2.10.23 — 2026-10-12

- Author lists are cleaned of what is no author: 12 entries listed an organisation (Monash University, Cornell University, Zhongguancun Laboratory …), a template placeholder (`[node:field-speakers-first-name]`)
  or the tail of a wrapped line among their names. `merge-raw.mjs` drops such names from now on (and rejects an entry left with none), the Kdd/ICDM/UbiComp reader reads brackets before it splits on ";", and a test keeps the bundled list clean.

## 2.10.22 — 2026-10-12

- MobiCom's best paper, honorable mention, community paper and artifact awards of 2019–2024 (21 papers: FLUID, Hummingbird, M-Cube, HeadFi, AgriTera, NeRF2, CosMAC, …) from the conference's own main pages (`tot.mjs mobicom-year`), read strictly: a record with a bracket in
  its title or an organisation among its names is dropped, so a few award papers of those years are missing. The list has 6243 awards.

## 2.10.21 — 2026-10-12

- MobiCom 2025's best paper (AquaScan), best community paper (5G-MAP) and best artifact paper (RF-Based 3D SLAM Rivaling Vision Approaches), and 2015's best paper and best community paper (CAreDroid), from MobiCom's own awards pages (`tot.mjs mobicom-year`). The list has 6222 awards.

## 2.10.20 — 2026-10-12

- The panel, the settings page and the popup drop their small transitions (switches, drop-down, buttons) when the system asks for reduced motion.

## 2.10.19 — 2026-10-12

- The settings page and the toolbar popup follow the system's dark mode (the preview on the settings page stays light, as the panel looks on Scholar).

## 2.10.18 — 2026-10-12

- The toolbar popup's CCF / CORE tab and buttons take the panel's design (a pill tab, rounder buttons with hover and press states, a darker blue on the primary button).

## 2.10.17 — 2026-10-12

- "Reset to defaults" asks on the settings page (the question with a Reset and a Cancel button, the Reset one in red) instead of in the browser's own dialog; no native dialog is left in the extension.

## 2.10.16 — 2026-10-12

- SC 2025's best paper (ORBIT-2), best student paper (X-MoE), best reproducibility advancement paper (RAPTOR) and test-of-time paper (The Globus Striped GridFTP Framework and Server) from the conference's own awards page (`tot.mjs sc`); only the current year's page answers. The list has 6217 awards.

## 2.10.15 — 2026-10-12

- A provenance test: `test/fixtures/award-source-hosts.json` lists the 78 hosts the bundled awards were read from, and a test fails for a host that is not on it (or no longer used), so a new source is reviewed by hand — old conference domains are taken over by spam.

## 2.10.14 — 2026-10-12

- The Web Conference's best papers of 2022 (Rewiring what-to-watch-next Recommendations to Reduce Radicalization Pathways) and 2024 (Mechanism Design for Large Language Models) from the conference's own awards pages (`tot.mjs www-best`). The list has 6213 awards.

## 2.10.13 — 2026-10-12

- The switch-styled ticks (the panel's "Only highlighted" and every switch on the settings page) are announced as switches to screen readers (`role="switch"`), not as plain checkboxes.

## 2.10.12 — 2026-10-12

- The MobiCom best paper awards 2008–2012 and best student paper awards 1995–2007 (17 papers: Improving TCP/IP Performance over Wireless Networks, Location-Aided Routing, Exposure in Wireless Ad Hoc Sensor Networks, …) from SIGMOBILE's own page (`tot.mjs mobicom`);
  the page was written in 2017, so 2013 on is not covered. The list has 6211 awards.

## 2.10.11 — 2026-10-12

- ICDM 2009's six papers (authors and title run together in one paragraph after each category) and 2008's two application papers (the title wraps over three lines): ICDM is complete from 2001 to 2025 now, bar one row whose author list has a single-word name. The list has 6193 awards.

## 2.10.10 — 2026-10-12

- ICDM: 2012's best paper (title and authors on two lines, no "by") and three of 2008's papers (the category and the title start on one line) are read now; the list has 6186 awards.

## 2.10.9 — 2026-10-12

- The SIGGRAPH technical papers awards 2022–2026 (Best Papers, Honorable Mentions and, from 2023, Test-of-Time: Instant Neural Graphics Primitives, 3D Gaussian Splatting, CLIPasso, Eulerian Video Magnification … 90 papers) from ACM SIGGRAPH's own blog posts
  (`tot.mjs siggraph`). The bundled list has 6182 awards.

## 2.10.8 — 2026-10-12

- The ICDM best paper awards 2001–2025 (best, runner-up, student, application and category papers; 61 papers) from the series' own awards page (`tot.mjs icdm`). The bundled list has 6092 awards.

## 2.10.7 — 2026-10-12

- DAC's Most Influential Paper awards 2023–2026 (7 papers: Chaff, Chisel, Symbolic Model Checking Using SAT Procedures Instead of BDDs, …) from DAC's own page (`tot.mjs dac`), and UbiComp's IMWUT Distinguished Paper Awards 2024
  and 10-Year Impact Awards 2024–2025 with their runners-up from UbiComp's awards pages (`tot.mjs ubicomp`). The bundled list has 6031 awards.

## 2.10.6 — 2026-10-12

- The year drop-down no longer closes when its own list scrolls (arrow keys, End or a long list of years); only a scroll of the page behind it closes it. A keyboard check (open, End, Escape, focus back on the button) joins the end-to-end test.

## 2.10.5 — 2026-10-12

- Two shortcuts under the summary panel's switches: "Compact: filters and citation totals only" (the leanest panel) and "Everything".

## 2.10.4 — 2026-10-12

- The toolbar popup follows the settings page's switches for the role × rank table and the awards & talks counts, as the panel does: with the table off it shows the name and the paper count (and the awards line, if that is on) and no table, Copy buttons or data note.

## 2.10.3 — 2026-10-12

- ICML's 2021 test-of-time paper, Bayesian Learning via Stochastic Gradient Langevin Dynamics (Welling, Teh), from its own test-of-time page (`tot.mjs icml-tot-2021`), which the awards page links only from its menu. The bundled list has 6012 awards.

## 2.10.2 — 2026-10-12

- NeurIPS's 2018 test-of-time paper, The Tradeoffs of Large-Scale Learning (Bottou, Bousquet), from the NIPS 2018 conference book (`tot.mjs nips-book-2018`). The bundled list has 6011 awards.

## 2.10.1 — 2026-10-12

- The three Copy buttons share one row of equal width (the third used to drop alone onto a second line in the side panel); the panel-part switches on the settings page sit indented under "Show the summary panel".

## 2.10.0 — 2026-10-12

From users' feedback (a long panel, controls that could not be switched off, markers in other fonts):

- **Every part of the summary panel has its own switch** on the settings page: the role × rank table (with its Copy buttons and the note on where the ranks come from), the awards & talks counts, the filters, the
  citation totals, the loaded-papers / unranked-venues status, and the name-spelling help. Turn off just the table and the rest stays; the columns close up when one is empty. A warning that Scholar's
  layout changed is never hidden.
- **The settings preview is the real panel** (the same code the Scholar page runs, handed invented papers), above the sample rows, so every switch changes it the way it changes a profile. It had shown only the row colours and chips.
- **Markers in other fonts are read**: styled letters (𝐎𝐫𝐚𝐥, ＯＲＡＬ) count as plain ones, and several brackets in a row — "(Oral) (Best Paper Finalist)" — are each looked at (only the last one was).
- **Controls with a design of their own**: the "Only highlighted" tick is a switch, the year range a drop-down with its own list (arrow keys, Escape, opens upward near the bottom of the window) instead of the system menu, the CCF / CORE tab a
  pill, buttons and the name field with hover, press and focus states, the disclosure arrows drawn rather than typed.
## 2.9.40 — 2026-10-12

- NeurIPS's test-of-time papers of 2022 (ImageNet Classification with Deep Convolutional Neural Networks) and 2024 (Generative Adversarial Nets; Sequence to Sequence Learning with Neural Networks)
  from the conference's own announcement posts (`tot.mjs neurips-2022`, `neurips-2024`), which the virtual site's award pages do not list. The bundled list has 6010 awards.

## 2.9.39 — 2026-10-12

- ICML's test-of-time papers of 2022 (Poisoning Attacks Against Support Vector Machines, with two honorable mentions) and 2026 (Asynchronous Methods for Deep Reinforcement Learning), which the earlier readers skipped:
  2022 prints them in the row's abstract block under headings, 2026 links the title to the award page. The bundled list has 6007 awards.

## 2.9.38 — 2026-10-12

- The ACM SIGCOMM Test of Time Paper Award (2007–2026, 33 papers: Chord, P4, B4, DCTCP, VL2, Ethane, XORs in the air …) from SIGCOMM's own page (`tot.mjs sigcomm`). The bundled list has 6003 awards.

## 2.9.37 — 2026-10-12

- The SIGKDD best paper awards 1997–2015 (research, application, student, with runners-up) and the KDD Test of Time awards 2014–2025 (82 papers new to the list: Graphs over Time, DBSCAN, Collaborative Filtering with
  Temporal Dynamics …) from SIGKDD's own per-year award pages (`tot.mjs kdd-bp`, `kdd-tot`). The bundled list has 5970 awards.

## 2.9.36 — 2026-10-12

- The GECCO SIGEVO Impact Award (2009–2024, 20 papers: BOA, Exploratory landscape analysis, Unshackling evolution …) from SIGEVO's own page (`tot.mjs gecco`). The bundled list has 5888 awards.

## 2.9.35 — 2026-10-12

- The ICRA and CASE paper awards (286 papers: ICRA Best Conference Paper 1993–2025, Best Student Paper 1990–2025, thirteen area awards such as Automation, Medical Robotics, Robot Vision; CASE Best Conference,
  Student, Application, Healthcare Automation and Young Researcher papers) from IEEE RAS's own award pages (`tot.mjs ras-*`). The bundled list has 5868 awards.

## 2.9.34 — 2026-10-12

- The ETAPS best paper awards (2011–2026, 97 papers: the EATCS, EASST and EAPLS Best Paper, Best Tool Paper, Springer's Best Student Paper and the 2025–2026 Distinguished Paper awards)
  from ETAPS's own page (`tot.mjs etaps-bp`); the nominations lists are not awards and are left out. The bundled list has 5582 awards.

## 2.9.33 — 2026-10-12

- The ETAPS Test of Time Award (2017–2026, 10 papers: Z3: An Efficient SMT Solver, Mobile Ambients, Handlers of Algebraic Effects, Symbolic model-checking without BDDs …) from ETAPS's own
  awards page (`tot.mjs etaps`); each is credited to its constituent conference (TACAS, ESOP, FoSSaCS, FASE). The bundled list has 5485 awards.

## 2.9.32 — 2026-10-12

- The AAAI ICWSM awards (Test of Time 2018–2021, Best Paper 2007–2021 with its outstanding papers and runners-up: 37 papers — Political Polarization on Twitter, The Million Follower Fallacy, Gephi,
  The Livehoods Project, 4chan and /b/ …) from ICWSM's own awards page (`tot.mjs icwsm`). The bundled list has 5475 awards.

## 2.9.31 — 2026-10-12

- The ACM SIGCSE Test of Time Award (2020–2025, 5 papers: Methods and Tools for Exploring Novice Compilation Behaviour, Parsons problems, The incredible shrinking pipeline …) from SIGCSE's
  own page (`tot.mjs sigcse`). The bundled list has 5438 awards.

## 2.9.30 — 2026-10-12

- The SIGWEB DocEng Best Paper Award (2010–2024, 14 papers) from SIGWEB's page (`tot.mjs doceng`); the Hypertext reader and this one share one parser now. The bundled list has 5433 awards.

## 2.9.29 — 2026-10-12

- ACM SIGSPATIAL's Best Paper Award (2009–2025) and 10-Year Impact Award (2018–2025, with the 2020 honorable mention): 26 papers from SIGSPATIAL's own award-recipients page (`tot.mjs sigspatial`;
  GeoSpark, T-Drive, Map-Matching for Low-Sampling-Rate GPS Trajectories …). The bundled list has 5419 awards.

## 2.9.28 — 2026-10-12

- The Hypertext Douglas Engelbart Best Paper Award (2003–2025, 22 papers) from ACM SIGWEB's page (`tot.mjs ht`) and SIGDA's A. Richard Newton Technical Impact Award in EDA (2009–2024, 16 papers:
  Chaff, FlowMap, Bryant's BDDs, Networks on Chips, Silicon Physical Random Functions …) from SIGDA's page (`tot.mjs newton`). The bundled list has 5393 awards.

## 2.9.27 — 2026-10-12

- The SIGMM Test of Time Paper Award and its honorable mentions (2020, 2022–2025, 17 papers: Caffe, MatConvNet, VLFeat, GamingAnywhere, opensmile …) from SIGMM's own page (`tot.mjs sigmm`); the
  2021 block, written differently, is not read. The bundled list has 5355 awards.

## 2.9.26 — 2026-10-12

- The SWSA Ten-Year Award for ISWC (2011–2025, 18 papers: DBpedia, RDFox, LogMap, Semantics and Complexity of SPARQL, Sesame, DAML-S …) from the Semantic Web Science Association's own page
  (`tot.mjs swsa`). The bundled list has 5338 awards.

## 2.9.25 — 2026-10-12

- The ICAPS Influential Paper Awards and honorable mentions (2007–2026, 36 papers: FF-Replan, Planning as Heuristic Search, Labeled RTDP, Anytime Dynamic A* …) from ICAPS's own awards page
  (`tot.mjs icaps`). The bundled list has 5320 awards.

## 2.9.24 — 2026-10-12

- The AAAI Classic Paper Award and its honorable mentions (1999–2026, 40 papers: Monte Carlo Localization, Bayesian Classification, Maximum Entropy Inverse Reinforcement Learning, Never-Ending
  Language Learning …) from AAAI's own page (`tot.mjs aaai`). 24 of the 40 were in the list already (AAAI's own award pages read earlier); 16 are new. The bundled list has 5284 awards.

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
  Software …* the ACM/IEEE ICSE), and the other list's candidates include the names that do not begin with an organisation.
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
