"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const venues = require("../src/lib/venues.js");
const ccf = require("../src/data/ccf.js");
const core = require("../src/data/core.js");
const aliases = require("../src/data/aliases.js");

const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
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
  // INFOCOM's "Joint Conference of the IEEE Computer and Communications Societies" is not CCS
  assert.equal(brief("Proceedings IEEE 24th Annual Joint Conference of the IEEE Computer and …, 2005"), "");
  // the visible words are ICSE's whole name AND the start of SEKE's: ambiguous, so no badge
  assert.equal(brief("2015 IEEE/ACM 37th IEEE international conference on software engineering 1 …, 2015"), "");
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
  assert.equal(brief("Proceedings of the 40th Annual International Symposium on Computer …, 2013"), "");
  assert.equal(brief("Proceedings of the 4th…, 2007"), "");
});

test("ties are broken by the event word, and by the organisation named in the string", () => {
  assert.equal(brief("Proceedings of the 2017 symposium on cloud computing, 445-451, 2017"), "CCF B SoCC · CORE B CLOUD", "symposium, not the JCC conference");
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
  assert.ok(ms < 4000, `resolved ${strings.length * 3} strings in ${ms} ms`);
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
