"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const venues = require("../src/lib/venues.js");
const ccf = require("../src/data/ccf.js");
const core = require("../src/data/core.js");
const aliases = require("../src/data/aliases.js");

const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases, strict: true });     // strict: a throwing rule fails the test instead of being contained
const FIX = path.join(__dirname, "fixtures");

// compact "CCF A ACL · CORE A* ACL" form used by the snapshot and the assertions
function brief(raw) {
  const r = resolver.resolve(raw);
  const parts = [];
  if (r.ccf) parts.push(`CCF ${r.ccf.tier} ${r.ccf.abbr || r.ccf.name}`);
  if (r.core) parts.push(`CORE ${r.core.rank} ${r.core.abbr}`);
  return parts.join(" · ");
}

test("bundled datasets are the 2026 editions with the official totals", () => {
  assert.equal(ccf.meta.counts.conference.total, 386);
  assert.equal(ccf.meta.counts.journal.total, 295);
  const tier = (t) => ccf.venues.filter((v) => v.tier === t).length;
  assert.deepEqual([tier("A"), tier("B"), tier("C")], [95, 245, 341]);
  assert.equal(core.meta.edition, "ICORE2026");
});

test("prepare strips volume / pages / years and flags truncation", () => {
  const p = venues.prepare("Nature 521 (7553), 436-44, 2015");
  assert.equal(p.name, "Nature");
  assert.equal(p.hasVolume, true);
  assert.equal(venues.prepare("Advances in neural information processing systems 36, 46595-46623, 2023").plain,
    "Advances in neural information processing systems");
  assert.equal(venues.prepare("ISCA 2014 42 (3), 361-372, 2014").name, "ISCA");
  const t = venues.prepare("10th USENIX symposium on operating systems design and implementation (OSDI …, 2012");
  assert.equal(t.truncated, true);
  assert.equal(t.plain, "10th USENIX symposium on operating systems design and implementation");
  assert.equal(venues.prepare("ICLR 2022 [arXiv preprint arXiv:2110.11309], 2021").name, "ICLR");
  assert.equal(venues.prepare("Computer Vision and Pattern Recognition (CVPR), 2022, 2022").plain, "Computer Vision and Pattern Recognition");
});

test("the audit's headline bugs stay fixed", () => {
  // CVPR was badged CCF-C (the ICPR/PR tie) in the old matcher
  for (const s of [
    "Proceedings of the IEEE conference on computer vision and pattern recognition, 770-778, 2016",
    "Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, 2023",
    "Proceedings of the IEEE Conference on Computer Vision and Pattern …, 2019",
    "Computer Vision and Pattern Recognition (CVPR), 2022, 2022"
  ]) assert.equal(brief(s), "CCF A CVPR · CORE A* CVPR", s);
  // every unrelated "IEEE …" string used to inherit 'Proceedings of the IEEE' = CCF-A
  for (const s of [
    "IEEE Access 8, 123456-123478", "IEEE Sensors Journal 20 (5), 2000-2010",
    "IEEE Transactions on Industrial Electronics 65 (3), 1-10", "IEEE Transactions on Power Systems 33 (1), 1-9",
    "IEEE Photonics Technology Letters 30 (2), 1-4", "Audio, Speech, and Language Processing, IEEE Transactions on 20, 14-22, 2012".replace("Audio", "Video")
  ]) assert.equal(brief(s), "", s);
  // "machine learning" inside another name used to give it ICML's tier
  for (const s of ["Coursera: Neural networks for machine learning, 2012", "Transactions on machine learning research, 2023", "Foundations and Trends in Machine Learning 4 (1), 1-106", "Learning in graphical models, 355-368, 1998"]) {
    assert.equal(brief(s), "", s);
  }
  // abbreviations that are ordinary words / tech-report numbers
  for (const s of ["Technical Report CRG-TR-96-1, University of Toronto, 1996", "Proceedings of the 1988 connectionist models summer school 1, 21-28, 1988",
    "Mass Spectrometry Reviews 25 (3), 1-30", "Health Affairs 35 (5), 1-10", "Networking and Internet Architecture"]) {
    assert.equal(brief(s), "", s);
  }
  // (BMC Bioinformatics, by contrast, really is a CCF-C journal in the 2026 list)
  assert.equal(brief("BMC Bioinformatics 20 (1), 1-12"), "CCF C BMC Bioinformatics");
  // the journal is the journal, the conference is the conference
  assert.equal(brief("Machine learning, 555-610, 1990"), "CCF B Machine Learning");
  assert.equal(brief("International conference on machine learning, 8748-8763, 2021"), "CCF A ICML · CORE A* ICML");
  assert.equal(brief("Pattern Recognition 45 (1), 1-20"), "CCF B PR");
  assert.equal(brief("Information Fusion 50, 71-91, 2019"), "", "a journal volume must not match the conference FUSION");
  assert.equal(brief("Commun. Acm 60, 84-90, 2017"), "", "not CCF-listed, and not ICC");
});

test("same name, different kind: Computer Graphics Forum is the journal, Computer Graphics International the conference", () => {
  assert.equal(brief("Computer graphics forum 33 (3), 351-360, 2014"), "CCF B CGF");
  assert.equal(brief("Computer Graphics Forum (EuroVis'13), 2013"), "CCF B CGF");
  assert.equal(brief("Computer Graphics International 2012"), "CCF C CGI · CORE C CGI");
  assert.equal(brief("Proceedings of Computer Graphics International, 2015"), "CCF C CGI · CORE C CGI");
  // a bare "Forum on …" is still a conference name
  assert.equal(brief("Forum on specification and design languages, 2012"), "CORE C FDL");
});

test("CHI proceedings carry the acronym inside the name", () => {
  for (const s of [
    "Proceedings of the 2017 chi conference on human factors in computing systems …, 2017",
    "Proceedings of the 2018 CHI Conference on Human Factors in Computing Systems …, 2018",
    "Proceedings of the CHI Conference on Human Factors in Computing Systems, 2024",
    "Proceedings of the SIGCHI conference on Human factors in computing systems …, 2007"
  ]) assert.equal(brief(s), "CCF A CHI · CORE A* CHI", s);
  assert.equal(brief("Extended Abstracts of the 2018 CHI Conference on Human Factors in Computing Systems, 2018"), "", "extended abstracts are not the main track");
});

test("a truncated name is not claimed on one common word, nor when a complete name also fits", () => {
  // INFOCOM's "Joint Conference of the IEEE Computer and Communications Societies" is not CCS (and, see below, not CIT either)
  assert.equal(brief("Proceedings IEEE 24th Annual Joint Conference of the IEEE Computer and …, 2005"), "CCF A INFOCOM · CORE A* INFOCOM");
  // the visible words are ICSE's whole name (IEEE named twice, "Volume 1" cut off) — and also the start of SEKE's, which a name that
  // is complete in front of a volume number is not
  assert.equal(brief("2015 IEEE/ACM 37th IEEE international conference on software engineering 1 …, 2015"), "CCF A ICSE · CORE A* ICSE");
  // "Principles of …" could be PODC, PODS or POPL
  assert.equal(brief("Proceedings of the twenty-first annual symposium on Principles of …, 2002"), "");
  // but a rare lone word still identifies its venue, and ACM/IEEE order does not matter
  assert.equal(brief("Proceedings of the twenty-third international conference on architectural …, 2018"), "CCF A ASPLOS · CORE A* ASPLOS");
  assert.equal(brief("Proceedings of the 33rd ACM/IEEE International Conference on Automated …, 2018"), "CCF A ASE · CORE A* ASE");
  assert.equal(brief("Proceedings of the ACM/IEEE 42nd international conference on software …, 2020"), "CCF A ICSE · CORE A* ICSE");
});

test("joint SIG names are not read as one SIG's acronym", () => {
  // "ACM SIGMOD-SIGACT-SIGART symposium" is PODS, not SIGMOD
  assert.equal(brief("Proceedings of the twenty-fifth ACM SIGMOD-SIGACT-SIGART symposium on …, 2006"), "CCF B PODS · CORE A* PODS");
  assert.equal(brief("Proceedings of the 2005 ACM SIGMOD international conference on Management of …, 2005"), "CCF A SIGMOD · CORE A* SIGMOD");
  assert.equal(brief("Proceedings of the 44th ACM SIGPLAN Symposium on Principles of Programming …, 2017"), "CCF A POPL · CORE A* POPL");
  assert.equal(brief("Proceedings of the 35th annual ACM SIGPLAN-SIGACT symposium on Principles of …, 2008"), "CCF A POPL · CORE A* POPL");
});

test("SIGGRAPH proceedings, the SIGGRAPH newsletter, courses and a publisher's name", () => {
  // every pre-2003 SIGGRAPH paper is printed this way — cut right after "and", it is not Computer Graphics International
  assert.equal(brief("Proceedings of the 28th annual conference on Computer graphics and …, 2001"), "CCF A SIGGRAPH · CORE A* SIGGRAPH");
  assert.equal(brief("Proceedings of the 25th annual conference on Computer graphics and interactive techniques, 1998"), "CCF A SIGGRAPH · CORE A* SIGGRAPH");
  assert.equal(brief("ACM SIGGRAPH 2003 Papers, 376-381, 2003"), "CCF A SIGGRAPH · CORE A* SIGGRAPH");
  assert.equal(brief("Acm Siggraph 2011 Papers, 1-12, 2011"), "CCF A SIGGRAPH · CORE A* SIGGRAPH", "Scholar sometimes title-cases the acronym");
  assert.equal(brief("ACM SIGGRAPH Asia 2010 papers, 1-10, 2010"), "CORE A* SiggraphA");
  assert.equal(brief("ACM SIGGRAPH computer graphics 25 (4), 285-288, 1991"), "", "the SIGGRAPH newsletter is neither the conference nor Computer Graphics Forum");
  assert.equal(brief("ACM SIGGRAPH 2005 Courses, 268-es, 2005"), "", "courses are a tutorial track");
  assert.equal(brief("Proceedings of the ACM SIGGRAPH/EUROGRAPHICS conference on Graphics hardware …, 2004"), "", "a joint-sponsor chain is not SIGGRAPH's acronym");
  assert.equal(brief("ACM SIGGRAPH/Eurographics Symposium on Computer Animation, 2010"), "CCF B SCA · CORE B SCA");
  assert.equal(brief("Computer Graphics International 2012"), "CCF C CGI · CORE C CGI");
  assert.equal(brief("Computer graphics forum 28 (3), 831-838, 2009"), "CCF B CGF");
  // a publisher is not a venue
  assert.equal(brief("ACM, 2011"), "");
  assert.equal(brief("IEEE, 2003"), "");
  assert.equal(brief("Proceedings of the IEEE 86 (11), 2278-2324, 1998"), "CCF A Proc. IEEE");
});

test("abbreviated journal names and older conference names", () => {
  assert.equal(brief("ACM Trans. Graph. 33 (4), 144:1-144:11, 2014"), "CCF A TOG");
  assert.equal(brief("IEEE Trans. Pattern Anal. Mach. Intell. 40 (1), 2018"), "CCF A TPAMI");
  assert.equal(brief("J. ACM 12, 1965"), "CCF A JACM");
  assert.equal(brief("Proceedings of the 2006 ACM/IEEE Conference on Supercomputing, 83-es, 2006"), "CCF A SC · CORE A SC");
  assert.equal(brief("SC'05: Proceedings of the 2005 ACM/IEEE Conference on Supercomputing, 11-11, 2005"), "CCF A SC · CORE A SC");
  assert.equal(brief("Proceedings of the 2007 symposium on Interactive 3D graphics and games, 167-174, 2007"), "CCF B I3D");
});

test("CORE now fires on the strings Scholar really prints", () => {
  assert.equal(brief("Advances in neural information processing systems 36, 46595-46623, 2023"), "CCF A NeurIPS · CORE A* NeurIPS");
  assert.equal(brief("Proceedings of the 29th symposium on operating systems principles, 611-626, 2023"), "CCF A SOSP · CORE A* SOSP");
  assert.equal(brief("Proceedings of the 2018 International Conference on Management of Data, 601-613, 2018"), "CCF A SIGMOD · CORE A* SIGMOD");
  assert.equal(brief("Proceedings of the AAAI Conference on Artificial Intelligence 34 (05), 7464-7471, 2020"), "CCF A AAAI · CORE A* AAAI");
  assert.equal(brief("10th USENIX symposium on operating systems design and implementation (OSDI …, 2012"), "CCF A OSDI · CORE A* OSDI");
});

test("acronym forms: leading, one-word, acronym+year, parenthesised", () => {
  assert.equal(brief("ISCA 2014 42 (3), 361-372, 2014"), "CCF A ISCA · CORE A* ISCA");
  assert.equal(brief("Osdi 8 (4), 7, 2008"), "CCF A OSDI · CORE A* OSDI");
  assert.equal(brief("Ndss, 2011"), "CCF A NDSS · CORE A* NDSS");
  assert.equal(brief("NDSS 5, 3-4, 2005"), "CCF A NDSS · CORE A* NDSS");
  assert.equal(brief("EMNLP 2015 [arXiv preprint arXiv:1508.04025], 1412–1421, 2015"), "CCF B EMNLP · CORE A* EMNLP");
  assert.equal(brief("30th USENIX security symposium (USENIX Security 21), 2633-2650, 2021"), "CCF A USENIX Security · CORE A* USENIX-Security");
  assert.equal(brief("2005 IEEE Symposium on Security and Privacy (S&P'05), 226-241, 2005"), "CCF A S&P · CORE A* SP");
  assert.equal(brief("IEEE INFOCOM 2004 4, 2253-2262, 2004"), "CCF A INFOCOM · CORE A* INFOCOM");
});

test("truncated names resolve only when unambiguous", () => {
  assert.equal(brief("Proceedings of the 14th ACM conference on Computer and communications …, 2007"), "CCF A CCS · CORE A* CCS");
  assert.equal(brief("Proceedings of the 2016 ACM SIGSAC conference on computer and communications …, 2016"), "CCF A CCS · CORE A* CCS");
  assert.equal(brief("Proceedings of the 2019 Conference of the North American Chapter of the …, 2019"), "CCF B NAACL · CORE A NAACL");
  assert.equal(brief("Proceedings of the 2012 joint conference on empirical methods in natural …, 2012"), "CCF B EMNLP · CORE A* EMNLP");
  assert.equal(brief("Proceedings of the 3rd international symposium on Information processing in …, 2004"), "CCF B IPSN", "'in' ≠ 'and': not IPMU");
  assert.equal(brief("Journal of Machine Learning…, 2008"), "CCF A JMLR");
  // visible text too generic to know which symposium: stay silent
  assert.equal(brief("Proceedings of the 44th Annual IEEE/ACM international symposium on …, 2011"), "");
  assert.equal(brief("Proceedings of the 4th…, 2007"), "");
  // …but not when the event words in front of the one word left (here "annual international symposium on computer") begin exactly one
  // venue's name that calls itself annual: that is ISCA (see the test on event words below)
  assert.equal(brief("Proceedings of the 40th Annual International Symposium on Computer …, 2013"), "CCF A ISCA · CORE A* ISCA");
});

test("ties are broken by the event word, and by the organisation named in the string", () => {
  assert.equal(brief("Proceedings of the 2017 symposium on cloud computing, 445-451, 2017"), "CCF B SoCC", "symposium, not the JCC conference — and not CORE's IEEE conference on Cloud Computing either");
  assert.equal(brief("Proceedings of the 5th ACM conference on Electronic commerce, 102-111, 2004"), "CORE A* EC", "ACM EC, not ICEC");
  assert.equal(brief("NSDI"), "CCF A NSDI");
  assert.equal(brief("8th USENIX Symposium on Networked Systems Design and Implementation (NSDI 11), 2011"), "CCF A NSDI", "CORE does not rank NSDI; USENIX is not an acronym");
});

test("journals: transactions, reversed order, proceedings-of", () => {
  assert.equal(brief("IEEE Transactions on Pattern Analysis and Machine Intelligence 39 (6), 1137-1149"), "CCF A TPAMI");
  assert.equal(brief("Audio, Speech, and Language Processing, IEEE Transactions on 20, 14-22, 2012"), "CCF B TASLP");
  assert.equal(brief("Proceedings of the IEEE 105 (9), 1666-1704, 2017"), "CCF A Proc. IEEE");
  assert.equal(brief("ACM Transactions on Information and System Security (TISSEC) 10 (4), 1-26, 2008"), "CCF B TOPS");
  assert.equal(brief("Neural computation 18 (7), 1527-1554, 2006"), "CCF B Neural Computation");
});

test("secondary tracks get no badge, unless the venue's own name says so", () => {
  for (const s of [
    "Findings of the Association for Computational Linguistics: ACL 2023, 1-15",
    "NeurIPS 2023 Workshop on Foundation Models for Decision Making",
    "Proceedings of the ACM SIGCOMM 2018 Conference on Posters and Demos",
    "2nd USENIX workshop on hot topics in cloud computing (HotCloud 10), 2010",
    "Extended Abstracts of the 2019 CHI Conference on Human Factors in Computing Systems",
    "ACL System Demonstrations, 55–60, 2014",
    "Proceedings of the CoNLL 2017 Shared Task: Multilingual Parsing from Raw …, 2017"
  ]) assert.equal(brief(s), "", s);
  assert.equal(resolver.resolve("Findings of the Association for Computational Linguistics: ACL 2023").secondary, "finding");
  assert.equal(brief("Proceedings of the 11th ACM Workshop on Hot Topics in Networks, 31-36, 2012"), "CCF C HotNets");
});

test("renamed venues match their former names and abbreviations (from the catalogue's own notes)", () => {
  assert.match(brief("IEEE Virtual Reality, 2019"), /^CCF A VR/, "VR was 'IEEE Virtual Reality'");
  assert.match(brief("International World Wide Web Conference"), /^CCF A WWW/);
  assert.match(brief("USENIX Annual Technical Conference, 2018"), /CCF A ACM SIGOPS ATC/);
  assert.match(brief("USENIX ATC 2019"), /CCF A ACM SIGOPS ATC/, "former abbreviation");
});

test("preprints, books and report series are never badged", () => {
  for (const s of ["arXiv preprint arXiv:1503.02531, 2015", "Cambridge: Cambridge University Press, 2008", "https://github.com/facebookresearch/Detectron, 2018", "", "Cited on 14 (8), 2, 2012"]) {
    assert.equal(brief(s), "", s);
  }
});

test("every alias points at a real dataset row", () => {
  for (const a of aliases) {
    if (a.ccf) {
      const kind = a.kind || "C";
      const hit = ccf.venues.filter((v) => v.kind === kind && venues.squash(v.abbr) === venues.squash(a.ccf) && (!a.ccfTier || v.tier === a.ccfTier));
      assert.ok(hit.length, `CCF row not found for alias ${JSON.stringify(a.ccf)} (${kind})`);
    }
    if (a.core) {
      const hit = core.venues.filter((v) => venues.squash(v.acronym) === venues.squash(a.core) && (!a.coreRank || v.rank === a.coreRank));
      assert.ok(hit.length, `CORE row not found for alias ${JSON.stringify(a.core)}`);
    }
    assert.ok(a.ccf || a.core, "alias needs a target");
    assert.ok(a.names && a.names.length);
  }
});

test("snapshot: every venue string in the real-profile corpora", () => {
  const corpora = {};
  for (const f of ["hinton", "kaiming-he", "ion-stoica"]) {
    corpora[f] = JSON.parse(fs.readFileSync(path.join(FIX, "profiles", f + ".json"), "utf8")).rows.map((r) => r[1]);
  }
  const extra = JSON.parse(fs.readFileSync(path.join(FIX, "venues.json"), "utf8"));
  for (const [k, v] of Object.entries(extra)) if (!k.startsWith("_")) corpora[k] = v;
  const actual = {};
  for (const list of Object.values(corpora)) for (const raw of list) actual[raw] = brief(raw);
  const file = path.join(FIX, "venues.expected.json");
  if (process.env.UPDATE_SNAPSHOTS) {
    const sorted = Object.fromEntries(Object.entries(actual).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(file, JSON.stringify(sorted, null, 1) + "\n");
    return;
  }
  // a missing snapshot must never silently disable the regression guard
  assert.ok(fs.existsSync(file), "test/fixtures/venues.expected.json is missing — restore it from git (or review the output and run `npm run test:update`)");
  const expected = JSON.parse(fs.readFileSync(file, "utf8"));
  const diffs = [];
  for (const raw of Object.keys(actual)) {
    if (!(raw in expected)) diffs.push(`new     ${JSON.stringify(raw)} -> ${JSON.stringify(actual[raw])}`);
    else if (expected[raw] !== actual[raw]) diffs.push(`changed ${JSON.stringify(raw)}\n          was: ${JSON.stringify(expected[raw])}\n          now: ${JSON.stringify(actual[raw])}`);
  }
  for (const raw of Object.keys(expected)) if (!(raw in actual)) diffs.push(`gone    ${JSON.stringify(raw)}`);
  assert.equal(diffs.length, 0, "venue results changed (review, then run `npm run test:update`):\n" + diffs.slice(0, 40).join("\n"));
});

// Scholar's own DOM prints truncated venues as "… California …, 2009" (a no-break space
// before the ellipsis), which the plain-space fixtures did not show until the live page was checked.
test("no-break spaces (as in Scholar's DOM) change nothing", () => {
  const strings = Object.keys(JSON.parse(fs.readFileSync(path.join(FIX, "venues.expected.json"), "utf8")));
  const fresh = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
  const key = (r) => JSON.stringify([r.ccf && [r.ccf.tier, r.ccf.name], r.core && [r.core.rank, r.core.name], r.secondary]);
  const bad = [];
  for (const s of strings) {
    const plain = key(fresh.resolve(s));
    for (const variant of [s.replace(/ …/g, " …"), s.replace(/ /g, " "), s.replace(/ /g, " ")]) {
      if (key(fresh.resolve(variant)) !== plain) bad.push(JSON.stringify(variant));
    }
  }
  assert.deepEqual(bad.slice(0, 10), []);
});

test("resolving is fast enough for large profiles", () => {
  const strings = Object.keys(JSON.parse(fs.readFileSync(path.join(FIX, "venues.expected.json"), "utf8")));
  const fresh = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
  const t0 = Date.now();
  for (let i = 0; i < 3; i++) for (const s of strings) fresh.resolve(s + " ".repeat(i));   // defeat the cache
  const ms = Date.now() - t0;
  assert.ok(ms < 1000 + 0.12 * strings.length * 3, `resolved ${strings.length * 3} strings in ${ms} ms`);   // (about 0.05 ms each; the budget grows with the corpora)
});

test("NeurIPS Datasets and Benchmarks Track is NeurIPS, in every spelling Scholar prints", () => {
  const A = "CCF A NeurIPS · CORE A* NeurIPS";
  for (const s of [
    "NeurIPS 2025 Datasets and Benchmarks Track",                       // seen on a real profile
    "NeurIPS Datasets and Benchmarks Track, 2024", "NeurIPS Datasets and Benchmarks", "NeurIPS Track on Datasets and Benchmarks",
    "NIPS Datasets and Benchmarks Track", "NeurIPS Datasets and Benchmarks Track (Round 2)", "NeurIPS D&B Track",
    "Advances in Neural Information Processing Systems 36, 2023 (Datasets and Benchmarks Track)",
    "Advances in Neural Information Processing Systems 35, 2022 - Datasets and Benchmarks",
    "Neural Information Processing Systems Datasets; Benchmarks Track, 2023",
    "Thirty-fifth Conference on Neural Information Processing Systems Datasets and Benchmarks Track (Round 2)",
    "The Thirty-eight Conference on Neural Information Processing Systems Datasets and Benchmarks Track, 2024"
  ]) assert.equal(brief(s), A, s);
  // the phrase is only dropped, never trusted on its own: a workshop on the subject or a title that says it is not NeurIPS
  for (const s of ["NeurIPS 2025 Workshop on Datasets and Benchmarks", "Workshop on Datasets and Benchmarks for Foo", "Datasets and Benchmarks for Deep Learning", "Datasets and Benchmarks Track"]) {
    assert.equal(brief(s), "", s);
  }
});

test("a dropped 'h' in a spelled-out ordinal does not hide the conference (Thirty-eight / Thirty-nine)", () => {
  const A = "CCF A NeurIPS · CORE A* NeurIPS";
  assert.equal(brief("The Thirty-eight Conference on Neural Information Processing Systems"), A);
  assert.equal(brief("The Thirty-nine Conference on Neural Information Processing Systems"), A);
  assert.equal(brief("The Thirty-eighth Conference on Neural Information Processing Systems"), A);
  assert.equal(brief("Thirty-seventh AAAI Conference on Artificial Intelligence"), brief("AAAI Conference on Artificial Intelligence"));
  // the typo rule only reads "eight" / "nine" after a tens word; a lone "Eight" stays a word of the name
  assert.equal(brief("Eight Conference on Neural Information Processing Systems"), "");
});

test("tracks that are not a conference's main proceedings get no badge: tiny papers, blog posts, symposium series, competitions, sister conferences, journal-first", () => {
  for (const s of [
    "ICLR 2025 Blogpost Track", "ICLR 2024 Tiny Papers Track", "The Twelfth International Conference on Learning Representations (Tiny Papers)",
    "NeurIPS 2024 Creative AI Track", "NeurIPS 2023 Competition Track", "AAAI Spring Symposium Series", "Proceedings of the AAAI Symposium Series 2 (1), 2023",
    "AAAI 2024 Fall Symposium", "IJCAI 2023 Sister Conferences Track", "IJCAI 2023 Journal Track", "ICSE 2024 Journal-First Papers"
  ]) assert.equal(brief(s), "", s);
  // …while the main conferences and the main-conference tracks keep theirs
  for (const s of [
    "Proceedings of the AAAI Conference on Artificial Intelligence 37 (13), 2023", "ICLR 2025", "NeurIPS 2025 Datasets and Benchmarks Track", "ICML 2024 Position Paper Track",
    "Proceedings of the Thirty-Second International Joint Conference on Artificial Intelligence, 2023"
  ]) assert.notEqual(brief(s), "", s);
});

test("an organisation word before the acronym is not part of it ('ACM CCS 2023'), and a PMLR volume tail is not a venue", () => {
  assert.equal(brief("ACM CCS 2023"), "CCF A CCS · CORE A* CCS");
  assert.equal(brief("ACM SIGMOD 2024"), "CCF A SIGMOD · CORE A* SIGMOD");
  assert.equal(brief("IEEE INFOCOM 2020"), "CCF A INFOCOM · CORE A* INFOCOM");
  assert.equal(brief("IEEE/ACM ASE 2023"), "CCF A ASE · CORE A* ASE");
  for (const s of ["ACM", "IEEE", "IEEE 2020", "ACM Press 2019", "IEEE Access"]) assert.equal(brief(s), "", s);
  const icml = "CCF A ICML · CORE A* ICML";
  assert.equal(brief("Proceedings of the 41st International Conference on Machine Learning, PMLR 235:12345-12367"), icml);
  assert.equal(brief("International Conference on Machine Learning, PMLR, 2023"), icml);
  assert.equal(brief("Proceedings of Machine Learning Research"), "", "the series itself is not a venue");
});

test("'Proceedings of the ACM Web Conference 2024' is WWW", () => {
  for (const s of ["Proceedings of the ACM Web Conference 2024", "Proceedings of the ACM Web Conference 2023, 123-134", "The ACM Web Conference 2022", "The Web Conference", "WWW 2025"]) {
    assert.equal(brief(s), "CCF A WWW · CORE A* WWW", s);
  }
});

test("a bare publisher is not a venue: the ACL Anthology's publisher name, AAAI Press, NIPS Foundation", () => {
  // seen on a real profile: a NAACL paper printed as just "Association for Computational Linguistics, 2013" (it was badged ACL)
  for (const s of ["Association for Computational Linguistics, 2013", "Association for Computational Linguistics", "The Association for Computational Linguistics, 2015",
    "Association for Computational Linguistics, 175-186, 2019", "AAAI Press, 2015", "AAAI Press, 1233-1239, 2012", "NIPS Foundation, 2015"]) assert.equal(brief(s), "", s);
  // …but the same words with an acronym, or as the conference they name, still are
  assert.equal(brief("Association for Computational Linguistics (ACL 2016)"), "CCF A ACL · CORE A* ACL");
  assert.equal(brief("ACL, 2017"), "CCF A ACL · CORE A* ACL");
  assert.equal(brief("Annual Meeting of the Association for Computational Linguistics, 2019"), "CCF A ACL · CORE A* ACL");
  assert.equal(brief("Proceedings of the AAAI Conference on Artificial Intelligence 32 (1), 2018"), "CCF A AAAI · CORE A* AAAI");
});

test("a special interest group's magazine is not its conference: SIGMOD Record, SIGKDD Explorations, SIGPLAN Notices, SIGIR Forum", () => {
  // real strings from database and data-mining profiles; "Sigmod" in title case used to slip through as the SIGMOD conference
  for (const s of ["ACM SIGMOD Record 29 (2), 1-12, 2000", "ACM Sigmod Record 27 (2), 13-24, 1998", "SIGMOD Record 31 (4), 2002", "ACM SIGMoD record 28 (2), 61-72, 1999",
    "ACM SIGKDD Explorations Newsletter 14 (2), 20-28, 2013", "SIGKDD Explorations 6 (1), 2004", "ACM SIGPLAN Notices 40 (6), 15-26, 2005", "ACM SIGIR Forum 45 (1), 2011",
    "ACM SIGecom Exchanges 10 (1), 2011"]) assert.equal(brief(s), "", s);
  // the conferences themselves, with the same words around them, still match
  assert.equal(brief("Proceedings of the 2007 ACM SIGMOD international conference on Management of data, 2007"), "CCF A SIGMOD · CORE A* SIGMOD");
  assert.equal(brief("ACM SIGMOD 2024"), "CCF A SIGMOD · CORE A* SIGMOD");
});

test("one or two plain words are a field, not a conference: 'Data mining' (a book chapter) is not ICDM — unless the name really is those words", () => {
  for (const s of ["Data mining, 39-82, 2012", "Data Mining, 2012", "Software engineering, 2012", "Computer vision, 2010"]) assert.equal(brief(s), "", s);
  assert.equal(brief("Pacific Graphics, 2010"), "CCF B PG", "a curated alias that is just those words");
  assert.equal(brief("ACM Multimedia, 307-316, 2006"), "CCF A ACM MM · CORE A* ACMMM", "an organisation word is evidence enough");
  assert.equal(brief("Machine learning 37 (2), 183-233, 1999"), "CCF B Machine Learning", "the journal of that name");
  assert.equal(brief("IEEE International Conference on Data Mining, 2008"), "CCF B ICDM · CORE A* ICDM");
  assert.equal(brief("Proceedings of the 3rd ACM SIGCOMM Conference on Internet Measurement, 91-100, 2003"), "CCF B IMC · CORE A IMC", "a known acronym dropped from the name still leaves a name");
});

test("KDD and SIGKDD are one venue in both lists; ECML, PKDD and ECML PKDD likewise", () => {
  for (const s of ["KDD 2014, 1286-1295, 2014", "SIGKDD 2014", "KDD, 2013", "Proceedings of the 15th ACM SIGKDD international conference on Knowledge discovery and data mining, 2009"]) {
    assert.equal(brief(s), "CCF A SIGKDD · CORE A* KDD", s);
  }
  const ecml = "CCF B ECML-PKDD · CORE A ECML PKDD";
  for (const s of ["ECML, 454-465, 2007", "ECML PKDD 2010, 274-290, 2010", "PKDD 2003, 2003", "ECML-PKDD 2021", "European Conference on Machine Learning, 2005",
    "Joint European Conference on Machine Learning and Knowledge Discovery in Databases, 2008"]) assert.equal(brief(s), ecml, s);
});

test("Scholar's cut-off name that goes on as a venue with the string's own event word: '… Conference on Distributed Computing …' is ICDCS, not the symposium DISC", () => {
  // (the cut string fits ICDCS, DCOSS and ICDCN alike: nothing is claimed — and above all not the symposium DISC)
  assert.equal(brief("Proceedings of 16th International Conference on Distributed Computing …, 1996"), "", "DISC is a symposium; ICDCS, DCOSS and ICDCN are conferences whose names go on");
  assert.equal(brief("Proceedings of the 20th International Conference on Distributed Computing …, 2019"), "", "ICDCN's real title, cut at 76 characters");
  // a complete name followed by a cut stays what it is
  assert.equal(brief("Proceedings of the 28th international conference on Software engineering …, 2006"), "CCF A ICSE · CORE A* ICSE");
  assert.equal(brief("Proceedings of the SIGCHI conference on human factors in computing systems …, 2010"), "CCF A CHI · CORE A* CHI");
  assert.equal(brief("Proceedings of the ACM SIGOPS 22nd symposium on Operating systems principles …, 2009"), "CCF A SOSP · CORE A* SOSP");
});

test("a cut-off name with one common word left is read through the event words in front of it: '… annual international symposium on computer …' is ISCA", () => {
  const isca = "CCF A ISCA · CORE A* ISCA";
  for (const s of ["Proceedings of the 44th annual international symposium on computer …, 2017", "Proceedings of the 25th annual international symposium on Computer …, 1998",
    "Proceedings of the 50th annual international symposium on computer …, 2023"]) assert.equal(brief(s), isca, s);
  // without "annual" the same words fit several venues (IFIP Performance, …): nothing is claimed
  assert.equal(brief("Proceedings of the 3rd international symposium on Computer …, 1990"), "");
  // never when the event words say something else: a conference on computers is not the symposium
  assert.equal(brief("IEEE conference on computer …, 2010"), "");
  // and one venue, not "any of the same rating": 'Principles of …' fits PODC and POPL alike
  assert.equal(brief("Proceedings of the twenty-first annual symposium on Principles of …, 2002"), "");
});

test("'Annual International Conference on the Theory and Applications of …' is EUROCRYPT (the annual one), the same without 'annual' is not claimed", () => {
  for (const s of ["Annual International Conference on the Theory and Applications of …, 2010", "annual international conference on the theory and applications of …, 2011"]) {
    assert.equal(brief(s), "CCF A EUROCRYPT · CORE A* EuroCrypt", s);
  }
  assert.equal(brief("International Conference on the Theory and Applications of …, 2005"), "");
});

test("USENIX ATC's 'General Track' is its main program; the AAAI conference on Human Computation is HCOMP, not AAAI (the lists disagree, the name wins)", () => {
  assert.equal(brief("USENIX ATC, General Track, 263-276, 2000"), "CCF A ACM SIGOPS ATC · CORE A USENIX");
  assert.equal(brief("USENIX Annual Technical Conference, General Track, 2004"), "CCF A ACM SIGOPS ATC · CORE A USENIX");
  assert.equal(brief("Proceedings of the AAAI Conference on Human Computation and Crowdsourcing 7 …, 2019"), "CORE B HCOMP", "CCF does not list HCOMP; it must not call it AAAI");
  assert.equal(brief("Proceedings of the AAAI Conference on Artificial Intelligence 32 (1), 2018"), "CCF A AAAI · CORE A* AAAI");
  assert.equal(brief("Tenth International AAAI Conference on Web and Social Media, 2016"), "CCF B ICWSM · CORE A ICWSM");
  // two acronyms for one venue are not a disagreement
  assert.equal(brief("Proceedings of the 15th ACM SIGKDD international conference on Knowledge discovery and data mining, 2009"), "CCF A SIGKDD · CORE A* KDD");
});

test("the ACM Digital Library's citation form names the event whatever follows: 'SC18: International Conference for …' is SC", () => {
  const sc = "CCF A SC · CORE A SC";
  for (const s of ["SC18: International Conference for High Performance Computing, Networking …, 2018", "SC20: International Conference for High Performance Computing, Networking …, 2020",
    "SC11: Proceedings of 2011 International Conference for High Performance Computing, Networking, Storage and Analysis, 2011",
    "SC'18: International Conference for High Performance Computing, Networking, Storage and Analysis, 2018", "SC '19: Proceedings of the International Conference for High Performance Computing, Networking, Storage and Analysis, 2019"]) {
    assert.equal(brief(s), sc, s);
  }
  assert.equal(brief("ICSE '06: Proceedings of the 28th international conference on Software engineering, 2006"), "CCF A ICSE · CORE A* ICSE");
  assert.equal(brief("Proceedings of the international conference for high performance computing …, 2021"), "", "no acronym, and the visible words fit several venues");
});

test("ICSM is the old name of ICSME", () => {
  for (const s of ["International Conference on Software Maintenance, 2003. ICSM 2003 …, 2003", "ICSM 2008, 2008", "IEEE International Conference on Software Maintenance and Evolution (ICSME), 2014"]) {
    assert.equal(brief(s), "CCF B ICSME · CORE A ICSME", s);
  }
});

// ---- found on eight more real profiles (multimedia, speech, design automation, wireless, graphics): the five wrong badges first

test("'Joint' says what kind of event it is: '… Annual Joint Conference of the IEEE Computer and …' is INFOCOM, not the IEEE Computer and Information Technology conference", () => {
  const infocom = "CCF A INFOCOM · CORE A* INFOCOM";
  for (const s of ["Proceedings. Twenty-First Annual Joint Conference of the IEEE Computer and …, 2002",
    "IEEE INFOCOM 2003. Twenty-second Annual Joint Conference of the IEEE Computer and Communications Societies, 2003",
    "Twenty-First Annual Joint Conference of the IEEE Computer and Communications Societies, 2002"]) assert.equal(brief(s), infocom, s);
  // the conference that really is about computers and information technology is still CIT, and its cut-off name is not INFOCOM
  assert.equal(brief("2012 IEEE 12th International Conference on Computer and Information Technology, 2012"), "CORE C CIT");
  assert.equal(brief("Proceedings of the IEEE International Conference on Computer and …, 2010"), "CORE C CIT");
  // a venue that is not called joint is not what a "joint" string cut short means; the official names that are printed without the word still match
  assert.equal(brief("Proceedings of the 16th Conference on Autonomous Agents and MultiAgent …, 2017"), "CORE A AAMAS");
  assert.equal(brief("Proceedings of the 29th ACM Joint Meeting on European Software Engineering …, 2021"), "CCF A FSE · CORE A* FSE");
});

test("IEEE's High Performance symposia: a cut-off '13th IEEE International Symposium on High performance …' is HPCA or HPDC, so no badge", () => {
  assert.equal(brief("Proceedings. 13th IEEE International Symposium on High performance …, 2004"), "");
  assert.equal(brief("Proceedings of the 13th IEEE International Symposium on High Performance Distributed Computing, 2004"), "CCF A HPDC · CORE A HPDC");
  assert.equal(brief("Proceedings of the 19th ACM International Symposium on High Performance Distributed Computing, 2010"), "CCF A HPDC · CORE A HPDC");
  assert.equal(brief("2017 IEEE International Symposium on High Performance Computer Architecture (HPCA), 2017"), "CCF A HPCA · CORE A* HPCA");
});

test("a country in parentheses after an acronym is another event: 'HPCA (China)' is not the architecture symposium", () => {
  assert.equal(brief("HPCA (China), 497-502, 2009"), "");
  assert.equal(brief("HPCA, 497-502, 2009"), "CCF A HPCA · CORE A* HPCA");
  assert.equal(brief("2017 IEEE International Symposium on High Performance Computer Architecture (HPCA), 2017"), "CCF A HPCA · CORE A* HPCA");
});

test("an acronym in a hyphenated parenthesis names a conference, never a journal: '(WF-IoT)' is not the IEEE Internet of Things Journal", () => {
  assert.equal(brief("2016 IEEE 3rd world forum on internet of things (WF-IoT), 7-12, 2016"), "");
  assert.equal(brief("IEEE Internet of Things Journal 6 (3), 4921-4934, 2019"), "CCF C IOT");
  // the parts of a joint event's parenthesis still count for the conference
  assert.equal(brief("Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing and the 9th International Joint Conference on Natural Language Processing (EMNLP-IJCNLP), 2019"), "CCF B EMNLP · CORE A* EMNLP");
});

test("the Eurographics/ACM SIGGRAPH symposia are not SIGGRAPH, and a cut-off 'ACM Special Interest Group on …' is not any one of them", () => {
  assert.equal(brief("Proceedings of the 2004 Eurographics/ACM SIGGRAPH symposium on Geometry …, 2004"), "CCF B SGP · CORE B SGP");
  assert.equal(brief("Proceedings of the 2003 Eurographics/ACM SIGGRAPH symposium on Computer animation, 2003"), "CCF B SCA · CORE B SCA");
  assert.equal(brief("Proceedings of the 2005 ACM SIGGRAPH/Eurographics symposium on Computer animation, 2005"), "CCF B SCA · CORE B SCA");
  assert.equal(brief("ACM SIGGRAPH 2008 papers, 1-10, 2008"), "CCF A SIGGRAPH · CORE A* SIGGRAPH");
  assert.equal(brief("Acm siggraph 2011 papers, 1-12, 2011"), "CCF A SIGGRAPH · CORE A* SIGGRAPH", "Scholar sometimes prints the acronym in lower case");
  // SIGGRAPH, SIGMOD and SIGCOMM are all CCF A: the badge would be right, its tooltip would name a venue that may be wrong
  assert.equal(brief("Proceedings of the Annual conference of the ACM Special Interest Group on …, 2020"), "");
  assert.equal(brief("Proceedings of the 2018 conference of the ACM special interest group on data communication, 2018"), "CCF A SIGCOMM · CORE A* SIGCOMM");
});

test("Interspeech, DATE and the other names the dataset spells differently", () => {
  assert.equal(brief("Proc. Interspeech 2004, 889-892, 2004"), "CCF B INTERSPEECH · CORE A Interspeech");
  assert.equal(brief("INTERSPEECH, 1265-1268, 2002"), "CCF B INTERSPEECH · CORE A Interspeech");
  assert.equal(brief("Proceedings 2002 Design, Automation and Test in Europe Conference and …, 2002"), "CCF B DATE · CORE A DATE");
  assert.equal(brief("Proceedings Design, Automation and Test in Europe Conference and Exhibition …, 2004"), "CCF B DATE · CORE A DATE");
  assert.equal(brief("2009 Design, Automation & Test in Europe Conference & Exhibition, 375-380, 2009"), "CCF B DATE · CORE A DATE");
});

test("old names of one venue: TASLP's predecessor, ICMI's 'Multimodal Interfaces', EGSR's 'Rendering Techniques'", () => {
  assert.equal(brief("IEEE Transactions on Speech and Audio Processing 13 (3), 441-450, 2005"), "CCF B TASLP");
  assert.equal(brief("IEEE Transactions on Audio, Speech, and Language Processing 17 (6), 1162-1171, 2009"), "CCF B TASLP");
  assert.equal(brief("Proceedings of the 6th international conference on Multimodal interfaces …, 2004"), "CCF C ICMI · CORE B ICMI");
  assert.equal(brief("Proceedings of the 18th Eurographics conference on Rendering Techniques, 309-320, 2007"), "CCF B EGSR");
  assert.equal(brief("Eurographics Workshop on Rendering Techniques, 115-125, 2001"), "CCF B EGSR", "the workshop is the venue's own name");
  assert.equal(brief("Proceedings of the Eurographics Symposium on Rendering, 2005"), "CCF B EGSR");
});

test("IEEE Xplore's citation form 'Name, 2002. ACR 2002., pages' reads as 'Name (ACR)'", () => {
  assert.equal(brief("IEEE Visualization, 2002. VIS 2002., 355-362, 2002"), "CCF A IEEE VIS · CORE A IEEE VIS");
  assert.equal(brief("Proceedings Visualization, 2001. VIS'01., 21-29, 537, 2001"), "CCF A IEEE VIS · CORE A IEEE VIS");
  assert.equal(brief("IEEE International Conference on Communications, 2003. ICC'03. 2, 1080-1084, 2003"), "CCF C ICC");
  // where the acronym is followed by more name, nothing is rewritten
  assert.equal(brief("Data Mining, 2007. ICDM 2007. Seventh IEEE International Conference on, 292-301, 2007"), "CCF B ICDM");
  assert.equal(venues.prepare("IEEE Visualization, 2002. VIS 2002., 355-362, 2002").name, "IEEE Visualization (VIS)");
});

test("a workshop co-located with a conference ('OM@ ISWC') is not that conference, Learning@Scale is its own; two lists that read a cut-off name as different venues claim neither", () => {
  assert.equal(brief("OM@ ISWC 2288, 132-137, 2018"), "");
  assert.equal(brief("NLP-DBPEDIA@ ISWC 13, 2013"), "");
  assert.equal(brief("International Semantic Web Conference, 498-514, 2016"), "CCF B ISWC · CORE A ISWC");
  assert.equal(brief("Proceedings of the second (2015) ACM conference on learning@ scale, 75-84, 2015"), "CORE B L@S");
  // CCF reads this as DAI and CORE as ICDCS: at least one is wrong
  assert.equal(brief("Proceedings of the Twelfth International Conference on Distributed …, 2012"), "");
  assert.equal(brief("Proceedings of the 36th annual international symposium on Computer …, 2009"), "CCF A ISCA · CORE A* ISCA");
});

test("ESWC was the European Semantic Web Conference, UMAP is spelled 'Modeling' by its publishers, Hot Chips is one venue under two acronyms", () => {
  assert.equal(brief("European Semantic Web Conference, 343-359, 2020"), "CCF C ESWC · CORE B ESWC");
  assert.equal(brief("Extended semantic web conference, 22-33, 2013"), "CCF C ESWC · CORE B ESWC");
  assert.equal(brief("International Conference on User Modeling, Adaptation, and Personalization …, 2011"), "CORE A UMAP");
  assert.equal(brief("Symposium on High Performance Chips (HOT CHIPS), 2015"), "CCF B HOT CHIPS · CORE C HOTCHIPS (HCS)");
});

// ---- twelve more real profiles (medical imaging, game theory, verification, HRI, semantic web, compilers, education, bioinformatics)

test("a short acronym in a parenthesis needs the venue's own words around it; 'Summits' are meetings of their own", () => {
  assert.equal(brief("USDOE Office of Science (SC), Washington, DC (United States), 2018"), "", "the DOE's Office of Science is not the supercomputing conference");
  assert.equal(brief("2006 IEEE Symposium on Security and Privacy (S&P'06), 15 pp.-16, 2006"), "CCF A S&P · CORE A* SP", "a stray '15 pp.' is not an objection");
  assert.equal(brief("2013 10th Working Conference on Mining Software Repositories (MSR), 121-130, 2013"), "CCF C MSR · CORE A MSR");
  assert.equal(brief("Proceedings of the 2005 ACM/IEEE Conference on Supercomputing (SC), 2005"), "CCF A SC · CORE A SC");
  assert.equal(brief("AMIA Summits on Translational Science Proceedings 2018, 188, 2018"), "", "not the AMIA annual symposium");
  assert.equal(brief("AMIA Annual Symposium Proceedings 2014, 645, 2014"), "CCF C AMIA");
  assert.equal(brief("Machine Translation Summit, 2007"), "CORE C MT SUMMIT", "a venue whose own name says Summit");
});

test("Springer's series form 'Name− ACRONYM 2017 …' cut after the acronym, a numeral typed apart ('41 st'), IEEE Xplore's tag followed by more name", () => {
  assert.equal(brief("Medical Image Computing and Computer Assisted Intervention− MICCAI 2017 …, 2017"), "CCF B MICCAI · CORE A MICCAI");
  assert.equal(brief("Medical Image Computing and Computer-Assisted Intervention - MICCAI 2016 …, 2016"), "CCF B MICCAI · CORE A MICCAI");
  assert.equal(brief("Proceedings of the 41 st International Conference on Machine Learning, 2024"), "CCF A ICML · CORE A* ICML");
  assert.equal(brief("Computer Vision and Pattern Recognition, 2004. CVPR 2004. Proceedings of the …, 2004"), "CCF A CVPR · CORE A* CVPR");
  assert.equal(brief("Parallel and Distributed Processing, 2008. IPDPS 2008. IEEE International …, 2008"), "CCF B IPDPS · CORE A IPDPS");
  assert.equal(brief("IEEE Workshop on Automatic Speech Recognition and Understanding, 2001. ASRU …, 2001"), "CCF C ASRU · CORE C ASRU", "the workshop is the venue's own name");
});

test("a curated name for whole strings only is never the start of a cut-off one; ESEC/FSE's ACM Digital Library titles and FM's old name", () => {
  // "Machine Learning and Knowledge Discovery in Databases" (ECML PKDD) also begins ICMLA's name: a cut-off "… Machine Learning and …" is not claimed for ECML PKDD
  assert.equal(brief("Proceedings of the 12th International Conference on Machine Learning and …, 2012"), "CORE C ICMLA");
  assert.equal(brief("Machine Learning and Knowledge Discovery in Databases: European Conference, ECML PKDD 2008, Antwerp, Belgium, 2008"), "CCF B ECML-PKDD · CORE A ECML PKDD");
  assert.equal(brief("Machine Learning and Knowledge Discovery in Databases, 2012"), "CCF B ECML-PKDD · CORE A ECML PKDD");
  assert.equal(brief("Proceedings of the 19th ACM SIGSOFT symposium and the 13th European …, 2011"), "CCF A FSE · CORE A* FSE");
  assert.equal(brief("Proceedings of the 10th European software engineering conference held …, 2005"), "CCF A FSE · CORE A* FSE");
  assert.equal(brief("International Symposium of Formal Methods Europe, 503-521, 2003"), "CCF A FM · CORE B FM");
});

test("the words of a cut-off name are judged on the names that begin with it, not on every alias of the venue", () => {
  // CCF's own ASIACRYPT name begins exactly so; CORE's EuroCrypt must not win through its alias that says 'Annual'
  assert.ok(!/EuroCrypt/.test(brief("Annual International Conference on the Theory and Application of …, 2008")));
  assert.equal(brief("Annual International Conference on the Theory and Applications of …, 2008"), "CCF A EUROCRYPT · CORE A* EuroCrypt");
});

test("a cut-off name is not claimed for the one venue of a list when the other list has others that begin the same way; a curated start keeps the dominant reading", () => {
  assert.equal(brief("Proceedings of the 12th International Conference on Principles of …, 2012"), "", "CCF alone would say KR; CORE also lists OPODIS and others");
  assert.equal(brief("Proceedings of the 12th International Conference on Mathematical …, 2012"), "");
  assert.equal(brief("Proceedings of the Twelfth International Conference on Distributed …, 2012"), "");
  // the ACL Anthology's COLING volumes are cut right here: curated (aliases.js `starts`)
  assert.equal(brief("Proceedings of the 23rd international conference on computational …, 2010"), "CCF B COLING · CORE B COLING");
  assert.equal(brief("Proceedings of the 12th International Conference on Computational Science …, 2012"), "CORE C ICCSA");
  assert.equal(brief("Proceedings of the 36th annual international symposium on Computer …, 2009"), "CCF A ISCA · CORE A* ISCA");
});

test("one venue under two acronyms is no disagreement between the lists (CSFW/CSF, CEC, Big Data, Cloud); a weakened name never contradicts the venue's own event word", () => {
  assert.equal(brief("Proceedings of the 12th IEEE Computer Security Foundations Workshop, 192-202, 1999"), "CCF B CSFW · CORE A CSF");
  assert.equal(brief("2016 IEEE 29th Computer Security Foundations Symposium (CSF), 2016"), "CCF B CSFW · CORE A CSF");
  assert.equal(brief("2010 IEEE Congress on Evolutionary Computation (CEC), 2010"), "CCF C IEEE CEC · CORE B CEC");
  assert.equal(brief("2015 IEEE International Conference on Big Data (Big Data), 2015"), "CCF C IEEE BigData · CORE B BigData");
  assert.equal(brief("2012 IEEE 5th International Conference on Cloud Computing, 2012"), "CCF C IEEE CLOUD · CORE B CLOUD");
  // ACM's symposium is SoCC; CORE lists only IEEE's conference, which a string that says "symposium" is not
  assert.equal(brief("Proceedings of the 1st ACM symposium on Cloud computing, 241-252, 2010"), "CCF B SoCC");
});

// ---- a string must never throw (2.5.9 let a cut-off string that ends in a known acronym reach an index that did not exist)

test("Springer's series form cut after a known acronym ('… Conference, FC …') does not throw", () => {
  const s = "Financial Cryptography and Data Security: 25th International Conference, FC …, 2021";
  assert.doesNotThrow(() => resolver.resolve(s));
  assert.equal(brief(s), "CCF C FC · CORE A FC", "Financial Cryptography: the name is complete before the acronym");
});

test("no real venue string, cut anywhere or given an acronym tail, makes a rule throw; and a throwing rule would only cost the badge", () => {
  const extra = JSON.parse(fs.readFileSync(path.join(FIX, "venues.json"), "utf8"));
  const strings = [];
  for (const [k, v] of Object.entries(extra)) if (!k.startsWith("_")) strings.push(...v);
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const tails = [" MICCAI 2017", " (WF-IoT)", " - ICSE 2019", " ACL", " (SC)", " 2024", ", FC", " @ ISWC"];
  let n = 0;
  for (const s of strings) {
    const words = s.split(" ");
    const cut = words.slice(0, 1 + Math.floor(rnd() * words.length)).join(" ") + " …";
    for (const v of [cut, cut.replace(/…$/, "") + tails[Math.floor(rnd() * tails.length)] + " …", s + tails[Math.floor(rnd() * tails.length)], s.toUpperCase(), s.toLowerCase()]) {
      assert.doesNotThrow(() => resolver.resolve(v), v);
      n++;
    }
  }
  assert.ok(n > 10000);
});

test("a resolver that is not strict contains a throwing rule: the string is simply unranked", () => {
  const data = { ccf: ccf.venues, core: core.venues, aliases };
  const strict = venues.createResolver({ ...data, strict: true });
  const lenient = venues.createResolver(data);
  for (const r of [strict, lenient]) r.index.sources.ccf.C.names = null;       // every lookup in the index now throws
  const s = "Proceedings of the 12th International Conference on Anything at All";
  assert.throws(() => strict.resolve(s));
  const r = lenient.resolve(s);
  assert.equal(r.ccf, null);
  assert.equal(r.core, null);
  assert.equal(lenient.resolve(s), r, "and the verdict is remembered");
});

test("Springer's series form 'Series–ACRONYM YEAR' names the event by its acronym, whatever the series is also called", () => {
  assert.equal(brief("Advances in Cryptology–ASIACRYPT 2009, 1-18, 2009"), "CCF B ASIACRYPT · CORE A ASIACRYPT", "'Advances in Cryptology' is CRYPTO's series title too");
  assert.equal(brief("Advances in Cryptology—ASIACRYPT'94, 398-412, 1995"), "CCF B ASIACRYPT · CORE A ASIACRYPT");
  assert.equal(brief("Advances in Cryptology-CRYPTO 2009, 231-249, 2009"), "CCF A CRYPTO · CORE A* CRYPTO");
  assert.equal(brief("Advances in Cryptology—EUROCRYPT'98, 85-99, 1998"), "CCF A EUROCRYPT · CORE A* EuroCrypt");
  assert.equal(brief("Algorithms–ESA 2011: 19th Annual European Symposium, Saarbrücken, Germany …, 2011"), "CCF B ESA · CORE A ESA");
  assert.equal(brief("Topics in Cryptology–CT-RSA 2014, 227-250, 2014"), "CCF C CT-RSA · CORE B CT-RSA");
  assert.equal(brief("Selected Areas in Cryptography--SAC 2015, 21st International Conference …, 2015"), "CCF C SAC · CORE B SAC");
  assert.equal(brief("Cryptographic Hardware and Embedded Systems-CHES 2007, 195-208, 2007"), "CCF B CHES · CORE A CHES");
  // an acronym that is part of a longer one is not the series form
  assert.equal(brief("ASP-DAC 2004: Asia and South Pacific Design Automation Conference 2004 (IEEE …, 2004"), "CCF C ASP-DAC · CORE B ASPDAC");
});

test("two lists that read the same words as different venues claim neither; an event word never decides for a name read without its organisation", () => {
  assert.equal(brief("International Conference on Information Security, 237-254, 2014"), "", "IFIP's SEC (CCF) and Springer's ISC (CORE) share it once the organisation is dropped");
  assert.equal(brief("Proceedings of the 21st International Symposium on Principles and Practice …, 2019"), "", "CCF's PPoPP and CORE's PPDP both begin so");
  assert.equal(brief("Proceedings of 16th International Conference on Distributed Computing …, 1996"), "", "CORE has ICDCS and DCOSS, CCF only ICDCS: the visible words fit both");
  assert.equal(brief("Proceedings of the second International Conference on Web Information …, 2001"), "CCF B WISE · CORE B WISE");
});

// From the second independent review of the matcher (2.5.8–2.5.14): strings that read as another venue.
test("review: a series title announces a conference, a sponsor names the community, an event word keeps its venue, and a start never crosses sponsors", () => {
  // Springer's series form: the acronym after the dash names a conference, never a journal that shares it, and an acronym that two venues share proves nothing
  assert.equal(brief("Security and Cryptography for Networks–SCN 2012"), "", "SCN is also the journal Security and Communication Networks");
  assert.equal(brief("Computational Logic—CL 2000"), "", "CL is also a journal");
  assert.equal(brief("World Wide Web–WWW 2021"), "CCF A WWW · CORE A* WWW", "the conference, not the journal of that name");
  assert.equal(brief("Applied Computing–SAC 2013"), "", "ACM's SAC; the series title shares no word with Selected Areas in Cryptography");
  assert.equal(brief("Selected Areas in Cryptography–SAC 2013"), "CCF C SAC · CORE B SAC");
  assert.equal(brief("Advances in Cryptology–ASIACRYPT 2009"), "CCF B ASIACRYPT · CORE A ASIACRYPT");
  // a curated start keeps the sponsors the string names: the IEEE's "… Conference on Computational …" is not COLING
  assert.equal(brief("Proceedings of the 2012 IEEE International Conference on Computational …, 2012"), "");
  assert.equal(brief("Proceedings of the 27th International Conference on Computational …, 2018"), "CCF B COLING · CORE B COLING");
  // the loose pass leaves organisations out on both sides; a special interest group the venue never mentions needs a rare word
  assert.equal(brief("Proceedings of the 14th ACM SIGSAC Workshop on Programming Languages and …, 2019"), "", "PLAS, not the SIGOPS workshop PLOS");
  assert.equal(brief("Proceedings of the 22nd ACM SIGSOFT International Symposium on Foundations …, 2014"), "CCF A FSE · CORE A* FSE");
  // the seq fallback names the sponsors too: ACM/IEEE is IPSN's, not the ACM's CIKM; ACM SIGPLAN is SLE's, not the ACM/IEEE ICSE
  assert.equal(brief("Proceedings of the 17th ACM/IEEE International Conference on Information …, 2018"), "", "IPSN");
  assert.equal(brief("Proceedings of the 13th ACM SIGPLAN International Conference on Software …, 2019"), "", "SLE");
  assert.equal(brief("Proceedings of the 3rd annual ACM/IEEE international conference on Mobile …, 1997"), "CCF A MobiCom · CORE A* MOBICOM", "MobiCom was an ACM/IEEE conference then (an alias)");
  // an exact name with another event word is only the fallback: the symposium that says "symposium" itself comes first
  assert.equal(brief("1998 IEEE International Symposium on Neural Networks (ISNN), 1-12, 1998"), "CORE C ISNN", "not the IEEE Joint Conference IJCNN");
  assert.equal(brief("Proceedings of 37th Conference on Foundations of Computer Science, 2-11, 1996"), "CCF A FOCS · CORE A* FOCS", "Scholar's own word differs from FOCS's 'Symposium', and nothing else fits");
  // a venue's earlier names are aliases
  assert.equal(brief("Proceedings of the 3rd International Conference on Extreme Programming (XP …, 2002"), "CORE B XP");
});

// From sixteen more real profiles (music, geometry, SAT/SMT, theorem proving, social science, education, wireless, concurrency).
test("an acronym in a cut-off name whose other words are not the venue's is not the venue; a place and a publisher is no venue; names Scholar prints in another form", () => {
  assert.equal(brief("Proceedings of the 14th annual ACM SIGCSE conference on Innovation and …, 2009"), "CORE B ITiCSE", "not the SIGCSE Technical Symposium");
  assert.equal(brief("Proceedings of the 14th annual ACM SIGCSE conference on Innovation and technology in computer science education, 2009"), "CORE B ITiCSE");
  assert.equal(brief("Proceedings of the 2011 ACM SIGCOMM conference on Internet measurement …, 2011"), "", "IMC");
  assert.equal(brief("Proceedings of the 1st ACM SIGCOMM symposium on software defined networking …, 2015"), "", "SOSR");
  assert.equal(brief("Proceedings of the SIGMETRICS symposium on Parallel and distributed tools …, 1998"), "", "SPDT");
  assert.equal(brief("Proceedings of the 2020 ACM SIGCOMM conference on …, 2020"), "CCF A SIGCOMM · CORE A* SIGCOMM", "nothing but the acronym's own words is cut");
  assert.equal(brief("Nijmegen: ICIS, 2008"), "", "an institute's report series, not the Information Systems conference");
  assert.equal(brief("Cambridge: Cambridge University Press, 2008"), "");
  assert.equal(brief("International Conference on Logic for Programming Artificial Intelligence …, 2010"), "CORE B LPAR");
  assert.equal(brief("Logic for Programming, Artificial Intelligence, and Reasoning, 606-621, 2015"), "CORE B LPAR");
  assert.equal(brief("International conference on affective computing and intelligent interaction …, 2011"), "CORE B ACII", "CORE's name stops at 'Intelligent'");
  assert.equal(brief("International Symposium on Leveraging Applications of Formal Methods, 539-553, 2016"), "CORE C ISoLA", "Scholar cuts the subtitle at its comma");
});

// From twenty-eight more real profiles (databases, ubiquitous computing, distributed systems, games, KR, requirements, SLAM, recommender systems).
test("a spelled-out event wins over the acronym next to it; a digit glued to a short acronym is no year; talks and abstracts are secondary tracks", () => {
  assert.equal(brief("Ninth IEEE International Symposium on Wearable Computers (ISWC'05), 164-167, 2005"), "", "the Wearable Computers symposium, not the Semantic Web conference");
  assert.equal(brief("International symposium on wearable computers (ISWC) 2010, 1-8, 2010"), "");
  assert.equal(brief("International Semantic Web Conference (ISWC), 2019"), "CCF B ISWC · CORE A ISWC", "the one that really is ISWC");
  assert.equal(brief("Proc. KR'96, 304-314, 1996"), "CCF B KR · CORE A* KR", "a two-digit year after two letters is a year");
  assert.equal(brief("IFIP WG2 9, 2000"), "", "a working group, not the graph workshop WG");
  assert.equal(brief("AAAI International Conference on Weblogs and Social Media, 2013"), "CCF B ICWSM · CORE A ICWSM", "ICWSM's first name");
  assert.equal(brief("Proc. ACM Program. Lang. 6 (POPL), 1-29, 2022"), "CCF A POPL · CORE A* POPL", "a journal's abbreviated name before its track is not a spelled-out event");
  assert.equal(brief("ACM SIGGRAPH 2011 Talks, 1-1, 2011"), "");
  assert.equal(brief("ACM SIGGRAPH 98 Conference abstracts and applications, 282, 1998"), "");
  assert.equal(brief("Proceedings 1999 IEEE Symposium on Information Visualization (InfoVis' 99 …, 1999"), "", "the parenthesis names InfoVis; IVBI only begins the same way");
  assert.equal(brief("Proceedings of the 33rd international conference on Machine learning (ICML …, 2016"), "CCF A ICML · CORE A* ICML");
});

test("HCI International is not the journal HCI; a colloquium is not a conference that begins alike; IV is spelled both ways", () => {
  assert.equal(brief("HCI International 1, 5-10, 2001"), "", "the conference series, not the journal");
  assert.equal(brief("Proceedings of the 13th Colloquium for Information Systems Security …, 2009"), "", "CISSE, not ICISSP");
  assert.equal(brief("Proceedings of the 5th International Conference on Information Visualization …, 2001"), "CORE C IV", "not Information Visualization in Biomedical Informatics");
  assert.equal(brief("Information Visualization, 2007. IV'07. 11th International Conference, 631-636, 2007"), "CORE C IV");
});

test("a bare two-digit number after a two-letter acronym is not a year", () => {
  assert.equal(brief("DS 75-4: Proceedings of the 19th International Conference on Engineering Design, 2013"), "", "a Design Society report series");
  assert.equal(brief("KR'96, 304-314, 1996"), "CCF B KR · CORE A* KR", "an apostrophe makes it a year");
  assert.equal(brief("KR 2018, 2018"), "CCF B KR · CORE A* KR");
});

test("ACM's special interest groups are sponsors, not names: 'ACM SIGPLAN International Conference on Functional …' is ICFP", () => {
  assert.equal(brief("Proceedings of the 15th ACM SIGPLAN international conference on Functional …, 2010"), "CCF B ICFP · CORE A ICFP");
  assert.equal(brief("International Conference on Functional Programming, 117-128, 2010"), "CCF B ICFP · CORE A ICFP", "CCF's row spells it 'Function Programming'");
  assert.equal(brief("Proceedings of the 32nd ACM SIGPLAN International Conference on Compiler …, 2023"), "CCF B CC · CORE B CC");
  assert.equal(brief("Proceedings of the seventh ACM SIGACT-SIGMOD-SIGART symposium on Principles …, 1988"), "CCF B PODS · CORE A* PODS");
  assert.equal(brief("Proceedings of the 2024 ACM SIGPLAN International Symposium on Memory …, 2024"), "CORE C ISMM");
});

test("an acronym two venues share counts only with its name: ACM's SAC is not Selected Areas in Cryptography; 'USENIX ATC' is not the trusted-computing ATC", () => {
  assert.equal(brief("SAC 3, 1135-1139, 2003"), "", "ACM's Symposium on Applied Computing is not ranked");
  assert.equal(brief("Selected Areas in Cryptography, 36-55, 2007"), "CCF C SAC · CORE B SAC");
  assert.equal(brief("Selected Areas in Cryptography--SAC 2015, 21st International Conference …, 2015"), "CCF C SAC · CORE B SAC");
  assert.equal(brief("USENIX ATC 7, 2007"), "CCF A ACM SIGOPS ATC · CORE A USENIX");
  assert.equal(brief("2015 USENIX Annual Technical Conference (USENIX ATC 15), 417-429, 2015"), "CCF A ACM SIGOPS ATC · CORE A USENIX");
});

test("the Autonomous Agents conference and ICMAS are AAMAS's earlier forms; UM and AH are UMAP's", () => {
  assert.equal(brief("Proceedings of the third annual conference on Autonomous Agents, 69-76, 1999"), "CCF B AAMAS · CORE A AAMAS");
  assert.equal(brief("Proceedings of the first international conference on Autonomous agents, 228-236, 1997"), "CCF B AAMAS · CORE A AAMAS");
  assert.equal(brief("International Conference on User Modeling, 178-187, 2003"), "CORE A UMAP");
});

test("names that Scholar prints with the sponsor or a former wording: ACM SIGSOFT's ISSTA, the 2004–2010 CVPR, NAACL's HLT titles, an organisation named twice", () => {
  assert.equal(brief("Proceedings of the 31st ACM SIGSOFT International Symposium on Software …, 2022"), "CCF A ISSTA · CORE A ISSTA");
  assert.equal(brief("Proceedings of the 2002 ACM SIGSOFT international symposium on Software …, 2002"), "CCF A ISSTA · CORE A ISSTA");
  // cut after "on" it could be ISSTA or the Foundations of Software Engineering: no badge
  assert.equal(brief("Proceedings of the 2016 24th ACM SIGSOFT International Symposium on …, 2016"), "");
  assert.equal(brief("2010 IEEE Computer Society Conference on Computer Vision and Pattern …, 2010"), "CCF A CVPR · CORE A* CVPR");
  assert.equal(brief("Human Language Technologies: The 2010 Annual Conference of the North …, 2010"), "CCF B NAACL · CORE A NAACL");
  assert.equal(brief("USENIX security Symposium, 11th. USENIX, 2002"), "CCF A USENIX Security · CORE A* USENIX-Security");
});

test("earlier or sponsor-carrying names: SIGCSE's Technical Symposium, SPAA, SenSys, CoNEXT, SECON, SIGdial, PODS under SIGACT-SIGMOD; 'Proceedings ASE 2000.' names the event", () => {
  assert.equal(brief("Proceedings of the 54th ACM Technical Symposium on Computer Science …, 2023"), "CORE A SIGCSE");
  assert.equal(brief("Proceedings of the seventh annual ACM symposium on Parallel algorithms and …, 1995"), "CCF B SPAA · CORE B SPAA");
  assert.equal(brief("Proceedings of the 6th ACM conference on Embedded network sensor systems …, 2008"), "CCF B SenSys");
  assert.equal(brief("Proceedings of the 2008 ACM CoNEXT conference, 1-6, 2008"), "CCF B CoNEXT · CORE A CoNEXT");
  assert.equal(brief("2008 5th Annual IEEE Communications Society Conference on Sensor, Mesh and …, 2008"), "CCF B SECON · CORE B SECON");
  assert.equal(brief("Proceedings of the 18th Annual SIGdial Meeting on Discourse and Dialogue …, 2017"), "CORE B SIGdial");
  assert.equal(brief("Proceedings of the 1st ACM SIGACT-SIGMOD symposium on Principles of database …, 1982"), "CCF B PODS · CORE A* PODS");
  assert.equal(brief("Proceedings ASE 2000. Fifteenth IEEE International Conference on Automated …, 2000"), "CCF A ASE · CORE A* ASE");
  assert.equal(brief("Proceedings LCN 2001. 26th Annual IEEE Conference on Local Computer Networks …, 2001"), "CCF C LCN · CORE B LCN");
  // the proceedings' title word in front of ordinary words is nothing
  assert.equal(brief("Proceedings of Machine Learning Research 97, 1-10, 2019"), "");
});

test("a curated start keeps its own wording: RECOMB's annual 'Computational molecular biology' is not COLING's 'Computational Linguistics'; ASSETS and UbiComp's other spellings", () => {
  assert.equal(brief("Proceedings of the sixth annual international conference on Computational …, 2002"), "CCF B RECOMB · CORE B RECOMB");
  assert.equal(brief("Proceedings of the 23rd international conference on computational …, 2010"), "CCF B COLING · CORE B COLING");
  assert.equal(brief("Proceedings of the fifth international ACM conference on Assistive …, 2002"), "CCF C ASSETS · CORE A ASSETS");
  assert.equal(brief("Proc. Ubicomp 6, 2006"), "CCF A UbiComp");
});
