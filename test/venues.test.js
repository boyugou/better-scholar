"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { slowdown } = require("./helpers/speed.js");
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
  assert.equal(brief("Proceedings of the 2007 symposium on Interactive 3D graphics and games, 167-174, 2007"), "CCF B I3D · CORE B I3DG");
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
    if (a.shadow) { assert.ok(a.shadow.length && a.shadow.every((x) => /^[A-Za-z][A-Za-z0-9-]{2,14}$/.test(typeof x === "string" ? x : x.acronym)), "shadow acronyms"); continue; }   // (an unranked event: no row to point at)
    if (a.ccf) {
      const kind = a.kind || "C";
      const hit = ccf.venues.filter((v) => v.kind === kind && venues.squash(v.abbr || v.name) === venues.squash(a.ccf) && (!a.ccfTier || v.tier === a.ccfTier));
      assert.ok(hit.length, `CCF row not found for alias ${JSON.stringify(a.ccf)} (${kind})`);
    }
    if (a.core) {
      const hit = core.venues.filter((v) => venues.squash(v.acronym) === venues.squash(a.core) && (!a.coreRank || v.rank === a.coreRank));
      assert.ok(hit.length, `CORE row not found for alias ${JSON.stringify(a.core)}`);
    }
    assert.ok(a.ccf || a.core, "alias needs a target");
    assert.ok((a.names && a.names.length) || (a.former && a.former.length) || (a.exact && a.exact.length) || (a.fullOnly && a.fullOnly.length) || (a.volume && a.volume.length) || (a.uncut && a.uncut.length) || (a.starts && a.starts.length));
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
  assert.ok(ms < (1000 + 0.25 * strings.length * 3) * slowdown(), `resolved ${strings.length * 3} strings in ${ms} ms`);   // (about 0.05 ms each when alone, more when the other test files run beside it; the budget grows with the corpora)
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

test("a publisher with only a year, an ordinal or the cut is no venue (Scholar's search results print 'Advances in neural …', '2023 IEEE 39th …'): not Proceedings of the IEEE", () => {
  // read on the live search page of 2026-10-13: "2023 IEEE 39th …, 2023" was badged CCF A as the journal Proceedings of the IEEE
  for (const s of ["2023 IEEE 39th …, 2023", "2019 IEEE …", "2019 IEEE …, 2019", "IEEE 39th …", "2019 IEEE", "The 39th IEEE …", "2019 IEEE/IEEE …", "2019 ACM …", "ACM 2019", "2020 SIAM …, 2020", "2019 USENIX …"]) assert.equal(brief(s), "", s);
  // the journals that are literally titled that way still are — with their volume; a CUT "Proceedings of the IEEE …" is the start of a conference of the IEEE (CVPR, ICCV …)
  assert.equal(brief("Proceedings of the IEEE 108 (3), 2020"), "CCF A Proc. IEEE");
  assert.equal(brief("Proceedings of the IEEE …, 2016"), "");
  assert.equal(brief("Proceedings of the IEEE conference on computer vision and pattern recognition, 2016"), "CCF A CVPR · CORE A* CVPR");
  assert.equal(brief("Proceedings of the IEEE, 1-17, 2014"), "CCF A Proc. IEEE");
  // and a conference of the IEEE that says what it is is its own
  assert.equal(brief("2023 IEEE 39th International Conference on Data Engineering (ICDE), 2023"), "CCF A ICDE · CORE A* ICDE");
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
  // (the start is SC's own: no other venue says "International Conference for High Performance Computing"; 6 strings of the real profiles — aliases.js `starts`)
  assert.equal(brief("Proceedings of the international conference for high performance computing …, 2021"), sc);
  assert.equal(brief("Proceedings of the international conference on high performance computing …, 2021"), "", "no acronym, and the visible words fit several venues");
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
  assert.equal(brief("Proceedings of the 16th Conference on Autonomous Agents and MultiAgent …, 2017"), "CCF B AAMAS · CORE A AAMAS");
  assert.equal(brief("Proceedings of the 29th ACM Joint Meeting on European Software Engineering …, 2021"), "CCF A FSE · CORE A* FSE");
});

test("IEEE's High Performance symposia: a cut-off '13th IEEE International Symposium on High performance …' is HPCA or HPDC, so no badge", () => {
  assert.equal(brief("Proceedings. 13th IEEE International Symposium on High performance …, 2004"), "");
  assert.equal(brief("Proceedings of the 13th IEEE International Symposium on High Performance Distributed Computing, 2004"), "CCF A HPDC · CORE A HPDC");
  assert.equal(brief("Proceedings of the 19th ACM International Symposium on High Performance Distributed Computing, 2010"), "CCF A HPDC · CORE A HPDC");
  assert.equal(brief("2017 IEEE International Symposium on High Performance Computer Architecture (HPCA), 2017"), "CCF A HPCA · CORE A* HPCA");
});

test("a month is a whole word: 'Journal of Marketing' is not 'Journal of' (and so not the Journal of the ACM), a trailing 'Dec. 2010' still goes", () => {
  assert.equal(brief("Journal of Marketing"), "");
  assert.equal(brief("Journal of Marketing 80 (3), 1-20, 2016"), "");
  assert.equal(brief("International Journal of Marketing"), "");
  assert.equal(brief("Journal of the ACM 56 (3), Dec. 2009"), "CCF A JACM");
  assert.equal(brief("Journal of the ACM, December 2009"), "CCF A JACM");
  assert.equal(brief("SIGCOMM, Sept. 2008"), "CCF A SIGCOMM · CORE A* SIGCOMM");
});

test("a one-word string that is an English word or a journal's whole name is not the conference of that acronym unless it is written in capitals", () => {
  for (const w of ["Crisis", "Fast", "Spin", "Image", "Cluster", "Wine", "Group", "mAbs"]) assert.equal(brief(w), "", w);
  for (const w of ["FAST", "NDSS", "Ndss"]) assert.notEqual(brief(w), "", w);
  assert.equal(brief("Interact 1, 593-601, 2001"), "CCF C INTERACT · CORE B Interact");
  assert.equal(brief("date 2, 1138, 2002"), "CCF B DATE · CORE A DATE");
});

test("no shadow acronym is the abbreviation of a ranked venue (it would silence it)", () => {
  const abbr = new Set([...ccf.venues.map((v) => venues.squash(v.abbr || "")), ...core.venues.map((v) => venues.squash(v.acronym || ""))]);
  for (const a of aliases) for (const x of a.shadow || []) if (typeof x === "string") assert.ok(!abbr.has(venues.squash(x)), `${x} is a ranked venue's abbreviation (give it a "with" word)`);
});

test("an unranked event named by its own acronym gets no badge from the ranked venue whose name boils down to the same words (aliases.js `shadow`)", () => {
  for (const x of [
    "IEEE International Conference on Computer and Communications (ICCC)",   // not INFOCOM
    "International Congress on Image and Signal Processing (CISP)",          // not ICISP
    "IEEE Region 10 Symposium (TENSYMP)",                                    // not TENCON
    "International Conference on Computer and Information Technology (ICCIT)"
  ]) assert.equal(brief(x), "", x);
  // the ranked venues themselves, with and without their own acronym
  assert.equal(brief("2022 IEEE International Conference on Joint Cloud Computing (JCC), 79-88, 2022"), "");   // two real rows of the corpora: not IEEE CLOUD (CCF's own JCC is the same event, but its words boil down to CLOUD's)
  assert.equal(brief("International Conference on Computational Creativity (ICCC)"), "CORE C ICCC");
  assert.equal(brief("IEEE Region 10 Conference (TENCON)"), "CORE C Tencon");
  assert.equal(brief("IEEE Conference on Computer Communications (INFOCOM)"), "CCF A INFOCOM · CORE A* INFOCOM");
  assert.equal(brief("International Conference on Image and Signal Processing (ICISP)"), "CORE C ICISP");
});

test("a place in a parenthesis is no acronym: '(Cambridge, Mass.)' is not the IEEE MASS conference", () => {
  assert.equal(brief("Cell (Cambridge, Mass.)"), "");
  assert.equal(brief("MIT Press (Cambridge, Mass.)"), "");
  assert.equal(brief("Science (New York, N.Y.)"), "");
  assert.equal(brief("IEEE International Conference on Mobile Ad Hoc and Sensor Systems (MASS)"), "CCF C MASS · CORE B MASS");
  assert.equal(brief("MASS 2019"), "CCF C MASS · CORE B MASS");
});

test("names that only look like a venue: 'International Security', 'Journal', 'Journal of Knowledge Management', and an ICTIR that carries SIGIR's name", () => {
  // a political-science journal is not the USENIX Security Symposium; a bare "Journal" is not the Journal of the ACM
  assert.equal(brief("International Security"), "");
  assert.equal(brief("Journal"), "");
  assert.equal(brief("Journal of International Conference Proceedings"), "");
  // Emerald's Journal of Knowledge Management and De Gruyter's Journal of Intelligent Systems are not the International Journals of those names
  assert.equal(brief("Journal of Knowledge Management"), "");
  assert.equal(brief("Journal of Intelligent Systems"), "");
  assert.equal(brief("International Journal of Knowledge Management"), "CCF C IJKM");
  assert.equal(brief("Int. J. Comput. Vis."), "CCF A IJCV");
  assert.equal(brief("Intl J Human-Computer Studies"), "CCF A IJHCS");
  // the ICTIR is no SIGIR; SIGIR with its own acronym in the parenthesis still is
  assert.equal(brief("ACM SIGIR International Conference on Theory of Information Retrieval (ICTIR)"), "");
  assert.equal(brief("ACM SIGIR International Conference on Research and Development in Information Retrieval (SIGIR)"), "CCF A SIGIR · CORE A* SIGIR");
  assert.equal(brief("ACM SIGKDD International Conference on Knowledge Discovery and Data Mining (KDD)"), "CCF A SIGKDD · CORE A* KDD");
});

test("Springer's colon form: 'Series: 18th International Conference, ACR 2020, Place …' is the venue", () => {
  assert.equal(brief("Theory of Cryptography: 18th International Conference, TCC 2020, Durham, NC …, 2020"), "CCF B TCC · CORE B TCC");
  assert.equal(brief("Computer Aided Verification: 13th International Conference, CAV 2001, Paris …, 2003"), "CCF A CAV · CORE A* CAV");
  assert.equal(brief("Search-Based Software Engineering: 17th International Symposium, SSBSE 2025 …, 2026"), "CORE B SSBSE");
  // an acronym that is no conference's proves nothing
  assert.equal(brief("The Internet of Things: First International Conference, IOT 2008, Zurich …, 2008"), "");
});

test("ESEC/FSE as the lead acronym, cut off or not", () => {
  assert.equal(brief("ESEC/FSE '11 Proceedings of the 19th ACM SIGSOFT symposium and the 13th …, 2011"), "CCF A FSE · CORE A* FSE");
  assert.equal(brief("ESEC/FSE 2021 29th ACM Joint European Software Engineering Conference and …, 2021"), "CCF A FSE · CORE A* FSE");
});

test("journals, meetings and series of other fields never get a badge (physics, economics, medicine, mathematics, chemistry, neuroscience)", () => {
  const others = [
  "Physical Review Letters 118 (4), 040501, 2017",
  "Physical Review B 95 (23), 235111, 2017",
  "Physical Review X 8 (3), 031005, 2018",
  "Reviews of Modern Physics 89 (4), 041003, 2017",
  "Nature Physics 13 (5), 460-464, 2017",
  "Science 355 (6320), 52-55, 2017",
  "Journal of High Energy Physics 2019 (5), 1-45, 2019",
  "Annals of Physics 375, 1-30, 2016",
  "Annual Review of Condensed Matter Physics 9, 33-55, 2018",
  "Proceedings of the National Academy of Sciences 114 (11), 2784-2789, 2017",
  "The Quarterly Journal of Economics 134 (3), 1405-1454, 2019",
  "American Economic Review 109 (5), 1648-83, 2019",
  "Econometrica 85 (3), 693-734, 2017",
  "Journal of Political Economy 125 (6), 1873-1910, 2017",
  "The Review of Economic Studies 84 (2), 571-613, 2017",
  "Journal of Econometrics 200 (2), 203-216, 2017",
  "Journal of the American Statistical Association 112 (518), 757-768, 2017",
  "Annals of Statistics 45 (5), 2012-2042, 2017",
  "Statistics in Medicine 36 (12), 1875-1893, 2017",
  "American Journal of Epidemiology 185 (10), 1015-1024, 2017",
  "International Journal of Epidemiology 46 (2), 1-12, 2017",
  "The Lancet 389 (10082), 1885-1906, 2017",
  "New England Journal of Medicine 376, 1713-1722, 2017",
  "JAMA 317 (12), 1228-1238, 2017",
  "BMJ 356, j1, 2017",
  "Epidemiology 28 (4), 540-548, 2017",
  "Annals of Mathematics 187 (3), 1-48, 2018",
  "Journal of the American Mathematical Society 31 (2), 1-50, 2018",
  "Inventiones mathematicae 211 (3), 1-70, 2018",
  "Duke Mathematical Journal 167 (9), 1-60, 2018",
  "Geometry & Topology 22 (4), 1-80, 2018",
  "Proceedings of the London Mathematical Society 117, 1-30, 2018",
  "Advances in Mathematics 321, 1-45, 2017",
  "Communications in Mathematical Physics 358 (2), 1-35, 2018",
  "IEEE Transactions on Signal Processing 65 (12), 3124-3139, 2017",
  "IEEE Transactions on Power Systems 32 (3), 2096-2105, 2017",
  "IEEE Transactions on Industrial Electronics 64 (9), 7120-7130, 2017",
  "Neuron 94 (4), 745-757, 2017",
  "Nature Neuroscience 20 (3), 1-10, 2017",
  "Journal of Neuroscience 37 (12), 3315-3329, 2017",
  "NeuroImage 150, 1-14, 2017",
  "Cerebral Cortex 27 (3), 1-12, 2017",
  "Trends in Cognitive Sciences 21 (6), 1-12, 2017",
  "Psychological Science 28 (5), 1-10, 2017",
  "Journal of Experimental Psychology: General 146 (4), 1-20, 2017",
  "Behavioral and Brain Sciences 40, e1, 2017",
  "Cell 168 (4), 1-20, 2017",
  "Nature Communications 8 (1), 1-10, 2017",
  "Chemical Reviews 117 (3), 1-40, 2017",
  "Journal of the American Chemical Society 139 (9), 3302-3311, 2017",
  "Angewandte Chemie International Edition 56 (42), 13001-13005, 2017",
  "Physical Chemistry Chemical Physics 19 (12), 1-10, 2017",
  "Annual Meeting of the American Physical Society, 2017",
  "APS March Meeting Abstracts 2017, H1-001, 2017",
  "American Physical Society, APS March Meeting 2018, abstract id. L36.001, 2018",
  "Meeting of the American Economic Association, 2018",
  "Joint Statistical Meetings, 2017",
  "Society for Neuroscience Annual Meeting, 2017",
  "International Conference on Learning and Memory, 2017",
  "Proceedings of the International Congress of Mathematicians, 2018",
  "Conference on Quantum Information Processing (QIP), 2018",
  "International Conference on Machine Learning in Medicine, 2018",
  "Proceedings of the 12th International Conference on Public Health, 2017",
  "Annual International Conference of the IEEE Engineering in Medicine and Biology Society, 2017",
  "IEEE International Symposium on Biomedical Imaging (ISBI), 2017",
  "Medical Imaging 2017: Image Processing 10133, 2017",
  "SPIE Medical Imaging, 2017",
  "Foundations and Trends in Machine Learning 10 (3-4), 142-336, 2017",
  "Handbook of Econometrics 6, 1-50, 2017",
  "Science Advances 3 (4), e1602123, 2017",
  "eLife 6, e21226, 2017",
  "Nucleic Acids Research 45 (D1), D1-D10, 2017",
  "Genome Research 27 (2), 1-12, 2017",
  "Communications of the ACM 60 (5), 1-10, 2017",
  "Computer 50 (5), 1-10, 2017",
  "Operations Research 65 (3), 1-20, 2017",
  "Management Science 63 (4), 1-20, 2017",
  "Journal of Finance 72 (3), 1-40, 2017",
  "Review of Financial Studies 30 (4), 1-40, 2017",
  "Journal of Financial Economics 123 (2), 1-30, 2017",
  "Economic Journal 127 (601), 1-30, 2017",
  "Games and Economic Behavior 101, 1-20, 2017",
  "Theoretical Economics 12 (1), 1-30, 2017",
  "Social Networks 48, 1-12, 2017",
  "American Sociological Review 82 (2), 1-30, 2017",
  "Language 93 (1), 1-30, 2017",
  "Linguistic Inquiry 48 (2), 1-30, 2017",
  "Sensors 17 (3), 1-20, 2017",
  "Energies 10 (4), 1-20, 2017",
  "Applied Sciences 7 (2), 1-20, 2017",
  "Remote Sensing 9 (5), 1-20, 2017",
  "Environmental Science & Technology 51 (6), 1-10, 2017",
  "Geophysical Research Letters 44 (8), 1-10, 2017",
  "Journal of Geophysical Research: Solid Earth 122 (3), 1-20, 2017",
  "Monthly Notices of the Royal Astronomical Society 466 (3), 1-20, 2017",
  "The Astrophysical Journal 840 (2), 1-20, 2017",
  "Astronomy & Astrophysics 600, A1, 2017",
  "Journal of Fluid Mechanics 818, 1-30, 2017",
  "Physics of Fluids 29 (4), 1-20, 2017",
  "SIAM Review 59 (1), 1-30, 2017",
  "Combinatorica 37 (2), 1-30, 2017",
  "Journal of Combinatorial Theory, Series B 124, 1-30, 2017",
  "Mathematical Programming 161 (1-2), 1-30, 2017",
  "Automatica 77, 1-12, 2017",
  "IEEE Transactions on Automatic Control 62 (5), 1-12, 2017",
  "International Journal of Control 90 (5), 1-12, 2017",
  "Proceedings of the American Control Conference, 2017",
  "IEEE Conference on Decision and Control, 2017",
  "Annual Allerton Conference on Communication, Control, and Computing, 2017",
  "Winter Simulation Conference, 2017",
  "European Conference on Operational Research, 2017",
  "Asilomar Conference on Signals, Systems and Computers, 2017"
  ];
  for (const s of others) assert.equal(brief(s), "", s);
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
  assert.equal(brief("Data Mining, 2007. ICDM 2007. Seventh IEEE International Conference on, 292-301, 2007"), "CCF B ICDM · CORE A* ICDM");
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

test("the inverted title Scholar prints for older IEEE and ACM journals is read back: 'Computers, IEEE Transactions on' is IEEE Transactions on Computers", () => {
  // real strings of real profiles (single words and several; a line Scholar cut with an ellipsis; the volume or only the pages after it)
  assert.equal(brief("Computers, IEEE Transactions on 60 (3), 386-399, 2011"), "CCF A TC");
  assert.equal(brief("Computers, IEEE Transactions on, 1-1, 2011"), "CCF A TC");
  assert.equal(brief("Communications, IEEE Transactions on 30 (7), 1701-1719, 1982"), "CCF B TCOM");
  assert.equal(brief("Robotics, IEEE Transactions on 30 (2), 310 - 324, 2013"), "CCF B TR");
  assert.equal(brief("Pattern Analysis and Machine Intelligence, IEEE Transactions on 33 (5), 867 …, 2011"), "CCF A TPAMI");
  assert.equal(brief("Graphics, ACM Transactions on 31 (4), 1-11, 2012"), brief("ACM Transactions on Graphics 31 (4), 1-11, 2012"), "the ACM form too");
  assert.equal(brief("Selected Areas in Communications, IEEE Journal on 25 (3), 2007"), brief("IEEE Journal on Selected Areas in Communications 25 (3), 2007"));
  // only that form: nothing else is turned around
  assert.equal(brief("Smith Computers, Transactions on Something 1 (1), 2010"), "", "no IEEE or ACM in front of 'Transactions on': left as it is");
  assert.equal(brief("Proceedings of the IEEE 105 (3), 2017"), brief("Proceedings of the IEEE"), "a name that is not inverted is read as before");
});

test("'Biennial' qualifies an event like 'Annual', and IEEE Xplore's '4 pp.' is a page count, not part of the name", () => {
  assert.equal(brief("Proceedings of 5th Biennial Conference on Innovative Data Systems Research, 2011"), "CCF B CIDR · CORE A CIDR");
  assert.equal(brief("8th Biennial Conference on Innovative Data Systems Research, 2017"), brief("Conference on Innovative Data Systems Research, 2017"));
  assert.equal(brief("2006 IEEE International Symposium on Circuits and Systems, 4 pp., 2006"), "CCF B ISCAS · CORE C ISCAS");
  assert.equal(brief("2006 IEEE International Symposium on Circuits and Systems, 4 pp.-4542, 2006"), "CCF B ISCAS · CORE C ISCAS");
  assert.equal(brief("Biennial Report of the Society, 12 pp., 2006"), "", "a word that is no name is still no venue");
});

test("IEEE MultiMedia is a magazine: it does not take the rank of the symposium whose name it shortens to", () => {
  const magazine = resolver.resolve("IEEE MultiMedia 28 (2), 86-95, 2021");
  assert.deepEqual([magazine.ccf, magazine.core, magazine.kind], [null, null, "J"]);
  assert.equal(resolver.resolve("IEEE MultiMedia, 2019").core, null);
  for (const symposium of ["IEEE International Symposium on Multimedia (ISM), 2020", "International Symposium on Multimedia, 2019"]) {
    const r = resolver.resolve(symposium);
    assert.deepEqual([r.core && r.core.abbr, r.core && r.core.rank], ["ISM", "C"], symposium);
  }
});

test("white space does not matter: a venue with doubled spaces, tabs or line breaks is the same venue — a symposium of a conference with two spaces was taken for the conference", () => {
  const same = (a, b) => assert.deepEqual(resolver.resolve(a), resolver.resolve(b), JSON.stringify(a));
  same("AAAI  Fall  Symposium on Privacy and Language Technologies, 2016", "AAAI Fall Symposium on Privacy and Language Technologies, 2016");
  same("  AAAI Fall\tSymposium on Privacy and Language Technologies,\n2016 ", "AAAI Fall Symposium on Privacy and Language Technologies, 2016");
  same("(NeurIPS 2025)   NeurIPS Creative AI Track, 2025", "(NeurIPS 2025) NeurIPS Creative AI Track, 2025");
  const symposium = resolver.resolve("AAAI  Fall  Symposium on Privacy and Language Technologies, 2016");
  assert.deepEqual([symposium.ccf, symposium.core, symposium.secondary], [null, null, "fall symposium"], "no badge for a symposium");
  // the corpus, with its spaces tripled and padded: the same answer for every string of a sample
  const keys = Object.keys(JSON.parse(require("node:fs").readFileSync(require("node:path").join(__dirname, "fixtures", "venues.expected.json"), "utf8"))).filter((_, i) => i % 5 === 0);
  const fresh = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
  for (const k of keys) assert.deepEqual(fresh.resolve("  " + k.replace(/ /g, "   ") + "  "), resolver.resolve(k), k);
});

test("a venue printed another way is the same venue: a trailing comma or full stop, other dashes, apostrophes and quotation marks, invisible characters (soft hyphen, zero-width space), composed or decomposed accents, no-break spaces — never a different badge", () => {
  const T = {
    "a trailing comma": (s) => s + ",", "a trailing full stop": (s) => s + " .", "en dashes": (s) => s.replace(/-/g, "–"), "curly quotes": (s) => s.replace(/'/g, "’").replace(/"/g, "”"),
    "zero-width spaces": (s) => s.replace(/ /g, " ​"), "soft hyphens": (s) => s.replace(/([a-z]{6})/g, "$1­"), "decomposed accents": (s) => s.normalize("NFD"), "no-break spaces": (s) => s.replace(/ /g, " ")
  };
  const keys = Object.keys(JSON.parse(require("node:fs").readFileSync(require("node:path").join(__dirname, "fixtures", "venues.expected.json"), "utf8"))).filter((_, i) => i % 9 === 0);
  for (const [what, f] of Object.entries(T)) {
    const fresh = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
    for (const k of keys) assert.deepEqual(fresh.resolve(f(k)), resolver.resolve(k), `${what}: ${k}`);
  }
  // real cases: a track that a dash or an invisible character used to hide
  for (const s of ["AAAI (Late–Breaking Developments), 2013", "AAAI (Late-Breaking Developments), 2013", "(NeurIPS 2025) NeurIPS Creative AI Track, 2025", "AAAI Fall​ Symposium on Privacy and Language Technologies, 2016"]) {
    const r = resolver.resolve(s);
    assert.ok(r.secondary && !r.ccf && !r.core, s + " is a secondary track: no badge");
  }
  assert.ok(resolver.resolve("CHI‘20: ACM Conference on Human Factors in Computing, 2020").ccf, "a curly apostrophe in an event name no longer hides it");
});

test("an acronym with a page range is the event: 'AAMAS, 1-10, 2016' and 'CSCW, 1-25, 2017' are the conferences, not the journals of those names; no conference acronym is read as a journal", () => {
  for (const [s, abbr, tier] of [["AAMAS, 1-10, 2016", "AAMAS", "B"], ["AAMAS, 566-574, 2016", "AAMAS", "B"], ["CSCW, 1-25, 2017", "CSCW", "A"], ["CSCW, 10-19, 2017", "CSCW", "A"]]) {
    const r = resolver.resolve(s);
    assert.deepEqual([r.ccf && r.ccf.abbr, r.ccf && r.ccf.tier, r.ccf && r.ccf.kind], [abbr, tier, "C"], s);
  }
  // ... but the abbreviation of a journal that no conference has the acronym of is the journal's, with a page range as with a year; a number after it that is a volume or an edition is no page range
  for (const [s, want] of [["ACM DLT, 1-10, 2023", "CCF C ACM DLT"], ["TPAMI, 1-14, 2020", "CCF A TPAMI"], ["IEEE TPAMI, 10-14, 2020", "CCF A TPAMI"], ["TKDE, 1-14, 2020", "CCF A TKDE"],
    ["HCI 91, 73-87, 1991", ""], ["JMLR 49, 1-34, 2016", ""], ["DLT 2019", "CORE C DLT"]]) assert.equal(brief(s), want, s);
  // every conference of the CCF list with an acronym, in four forms: never a journal, never another venue
  const confs = ccf.venues.filter((v) => v.kind === "C" && v.abbr && /^[A-Z][A-Za-z0-9&-]{2,14}$/.test(v.abbr));
  assert.ok(confs.length > 300);
  for (const v of confs) for (const tail of [", 1-10, 2019", " 2019", ", 100-110, 2019", ", 1-12"]) {
    const r = resolver.resolve(v.abbr + tail);
    assert.ok(!r.ccf || (r.ccf.kind === "C" && (r.ccf.abbr === v.abbr || r.ccf.name === v.name)), `${v.abbr}${tail} → ${r.ccf && r.ccf.kind} ${r.ccf && r.ccf.name}`);
  }
});

test("a track at a venue is not the venue: 'Workshop' in a name the venue once had (AISTATS, EGSR, PETS, RV) does not make its workshops the venue's papers; a venue that is a workshop (HotOS, ASRU) keeps its badge", () => {
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core, r.secondary], [null, null, "workshop"], s); };
  for (const s of ["AISTATS Workshop on Causality, 2019", "International Conference on Artificial Intelligence and Statistics Workshops, 2019", "Workshop at AISTATS, 2019",
    "Eurographics Symposium on Rendering Workshops, 2019", "Runtime Verification Workshop, 2019", "PETS Workshop, 2019"]) none(s);
  // ... while the name the venue had, as printed, is the venue
  for (const [s, want] of [["International workshop on artificial intelligence and statistics, 33-40, 2005", "CCF C AISTATS · CORE A AISTATS"], ["Eurographics Workshop on Rendering Techniques, 103-114, 2001", "CCF B EGSR"],
    ["International Workshop on Privacy Enhancing Technologies, 186-206, 2004", "CORE A PETS"], ["Proceedings of the 12th IEEE Computer Security Foundations Workshop, 192-202, 1999", "CCF B CSFW · CORE A CSF"],
    ["11th USENIX Workshop on Hot Topics in Storage and File Systems (HotStorage 19), 2019", "CCF C HotStorage"], ["15th workshop on hot topics in operating systems (HotOS XV), 2015", "CCF B HotOS · CORE A HotOS"]]) assert.equal(brief(s), want, s);
  // every conference of both lists, with a track named in nine ways: a badge only from a row whose own official name holds that track word
  const names = [...ccf.venues.filter((v) => v.kind === "C").map((v) => v.name), ...core.venues.map((v) => v.name)].map((n) => n.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ").trim()).filter((n) => !venues.secondaryWord(n));          // (a name that holds a track word has said it already)
  assert.ok(names.length > 1000);
  const forms = [(n) => n + " Workshops, 2019", (n) => "Workshop at " + n + ", 2019", (n) => "Workshop on Causality at the " + n + ", 2019", (n) => n + ": Companion Volume, 2019", (n) => n + " (Demo Track), 2019",
    (n) => "Doctoral Consortium of the " + n + ", 2019", (n) => n + " Posters, 2019", (n) => "Tutorial at the " + n + ", 2019", (n) => n + " Extended Abstracts, 2019"];
  const holds = (name, word) => venues.secondaryWords(name.replace(/\([^()]*\)/g, " ")).includes(word);
  // (a venue the aliases name with the word — SLT is the "Spoken Language Technology Workshop" — may carry it)
  const aliasHolds = (badge, word) => aliases.some((a) => (a.ccf === badge.abbr || a.core === badge.abbr) && [...(a.names || []), ...(a.former || [])].some((n) => holds(n, word)));
  for (const n of names) for (const f of forms) {
    const raw = f(n), word = venues.secondaryWord(raw), r = resolver.resolve(raw);
    for (const badge of [r.ccf, r.core]) if (badge) assert.ok(holds(badge.name, word) || aliasHolds(badge, word), `${raw} → ${badge.name}: a ${word} is not the venue`);
  }
});

test("a journal's own name with a volume is that journal: a one-word title in camel or capital letters is no acronym ('GeoInformatica 12 (3)'), and two journals that boil down to the same words are told apart by the whole name ('Human-Computer Interaction 23 (1)')", () => {
  for (const [s, abbr] of [["GeoInformatica 12 (3), 123-145, 2019", "GeoInformatica"], ["GeoInformatica 23 (1), 2019", "GeoInformatica"], ["GEOINFORMATICA 23 (1), 2019", "GeoInformatica"],
    ["Human–Computer Interaction 23 (1), 47-99, 2008", "HCI"], ["Human-computer interaction 15 (4), 263-322, 2000", "HCI"], ["HUMAN–COMPUTER INTERACTION 23 (4), 406-432, 2008", "HCI"]]) {
    const r = resolver.resolve(s);
    assert.equal(r.ccf && (r.ccf.abbr || r.ccf.name), abbr, s);
  }
  // ... but the proceedings that share those words, and the bare name with no volume, are not it
  for (const s of ["Proceedings of the ACM on Human-Computer Interaction 3 (3), 1-23, 2019", "Human-Computer Interaction, 2019", "Human-Computer Interaction"]) assert.equal(resolver.resolve(s).ccf, null, s);
  // every journal of the CCF list, by its whole name with a volume, an issue, pages and a year, in the three ways Scholar writes it (the two "Proceedings of the ACM on …" journals are the
  // journal-first form of conferences: their papers are POPL's, CSCW's … and stay unranked)
  const journals = ccf.venues.filter((v) => v.kind === "J" && !/^Proceedings of the ACM on /.test(v.name));
  assert.ok(journals.length > 280);
  for (const v of journals) for (const f of [(n) => n + " 12 (3), 123-145, 2019", (n) => n.toLowerCase() + " 12 (3), 123-145, 2019", (n) => n.toUpperCase() + " 12 (3), 123-145, 2019",
    // ... and with an article number where the pages would be (ACM's "Article No.: 137", "article 75", "No. 3"; cut off at it)
    (n) => n + " 12 (3), Article No.: 45, 2020", (n) => n.toLowerCase() + " 12 (3), article 45, 2020", (n) => n + " 12 (3), Article …, 2020", (n) => n + " 12 (3), No. 45, 2020"]) {
    const raw = f(v.name), r = resolver.resolve(raw);
    assert.ok(r.ccf && r.ccf.kind === "J" && r.ccf.name === v.name, `${raw} → ${r.ccf && r.ccf.name}`);
  }
});

test("the acronym a string opens with decides between venues whose names boil down to the same words: 'AAAI'17: Proceedings of the … AAAI Conference on Artificial Intelligence' is AAAI (CCF A), not IJCAI (B)", () => {
  for (const [s, want] of [["AAAI'17: Proceedings of the Thirty-First AAAI Conference on Artificial Intelligence, 4278-4284, 2017", "CCF A AAAI · CORE A* AAAI"], ["AAAI 2019: 33rd AAAI Conference on Artificial Intelligence, 2019", "CCF A AAAI · CORE A* AAAI"],
    ["IJCAI'18: Proceedings of the 27th International Joint Conference on Artificial Intelligence, 2018", "CCF B IJCAI · CORE A* IJCAI"], ["SDM '19: Proceedings of the SIAM International Conference on Data Mining, 123-145, 2019", "CCF B SDM · CORE A SDM"],
    ["Proceedings of the 3rd ACM SIGCOMM Conference on Internet Measurement, 91-100, 2003", "CCF B IMC · CORE A IMC"], ["Tenth International AAAI Conference on Web and Social Media, 2016", "CCF B ICWSM · CORE A ICWSM"]]) assert.equal(brief(s), want, s);
  // AAAI's own forms ("AAAI-23: Thirty-Seventh AAAI Conference …": the acronym said twice is said once; "… Conference on Artificial Intelligence (AAAI-07)": the acronym in the parenthesis
  // is not IJCAI's), and ACM's journal-first title with the track in its parenthesis ("(ISSTA)" is ISSTA, no longer ICSE; "(FSE)" is the Foundations of Software Engineering, not Fast Software Encryption)
  for (const [s, want] of [["AAAI-23: Thirty-Seventh AAAI Conference on Artificial Intelligence, 2023", "CCF A AAAI · CORE A* AAAI"], ["Proceedings of the 22th Conference on Artificial Intelligence (AAAI-07), 2007", "CCF A AAAI · CORE A* AAAI"],
    ["Proceedings of the ACM on Software Engineering 2 (ISSTA), 1009-1030, 2025", "CCF A ISSTA · CORE A ISSTA"], ["Proceedings of the ACM on Software Engineering 1 (FSE), 338-358, 2024", "CCF A FSE · CORE A* FSE"],
    ["2025 USENIX Annual Technical Conference (ATC'25), 2025", "CCF A ACM SIGOPS ATC · CORE A USENIX"], ["COLING-02: Machine Translation in Asia, 2002", ""], ["DS-30: Proceedings of DESIGN 2002", ""],
    // an acronym in front of a name that says what the event is about, in words that are not the venue's ("ITS" is CORE's Intelligent Tutoring Systems; this is ACM's Interactive Tabletops and Surfaces)
    ["ITS '14: ACM International Conference on Interactive Tabletops and Surfaces, 2014", ""], ["ITS 2014: International Conference on Intelligent Tutoring Systems, 2014", "CORE B ITS"],
    // ... while a theme or a note after the name is no name
    ["Proceedings of DiGRA 2007 Conference: Situated Play, 2007", "CORE C DIGRA"], ["ACM SIGGRAPH 2022 Conference Proceedings, Article No.: 11, Pages 1–10, 2022", "CCF A SIGGRAPH · CORE A* SIGGRAPH"]]) assert.equal(brief(s), want, s);
  // a journal and a conference that are called the same ("Computational Visual Media"): the acronym in the parenthesis names the conference; the bare name is the journal's, as before
  assert.equal(brief("Computational Visual Media (CVM), 2019"), "CCF C CVM");
  assert.equal(brief("Computational Visual Media 5 (2), 123-145, 2019"), "CCF B CVMJ");
  // an abbreviation with its organisation ("USENIX ATC") is not the bare acronym ("ATC" is CORE's Advanced and Trusted Computing)
  assert.equal(brief("ATC 2019"), "CORE C ATC");
  assert.equal(brief("USENIX ATC 2019"), "CCF A ACM SIGOPS ATC · CORE A USENIX");
  // every conference of the CCF list in the forms Scholar prints it, with its acronym where it has a plain one: a badge of another venue is never the answer (a missing one is) —
  // and the same for every conference of the CORE list (the two-letter and the organisation-prefixed acronyms are the collision-prone ones: they are in)
  const same = (r, v) => !r.ccf || r.ccf.abbr === v.abbr || r.ccf.name === v.name;
  const strip = (n) => n.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ").trim();
  const plain = (a) => a && /^[A-Za-z][A-Za-z0-9&-]{1,}$/.test(a);
  const ccfConfs = ccf.venues.filter((v) => v.kind === "C");
  assert.equal(ccfConfs.length, 386);
  for (const v of ccfConfs) {
    const raws = [`Proceedings of the 12th ${strip(v.name)}, 123-145, 2019`, ...(v.abbr ? [`${strip(v.name)} (${v.abbr}), 123-145, 2019`] : []), ...(plain(v.abbr) ? [`${v.abbr} '19: Proceedings of the ${strip(v.name)}, 123-145, 2019`, `${v.abbr} 2019`] : [])];
    for (const raw of raws) { const r = resolver.resolve(raw); assert.ok(same(r, v), `${raw} → ${r.ccf && r.ccf.abbr}`); }
  }
  for (const v of core.venues) {
    const raws = [`Proceedings of the 12th ${strip(v.name)}, 123-145, 2019`, `${strip(v.name)} (${v.acronym}), 123-145, 2019`, ...(plain(v.acronym) ? [`${v.acronym} '19: Proceedings of the ${strip(v.name)}, 123-145, 2019`] : [])];
    for (const raw of raws) {
      const r = resolver.resolve(raw);
      assert.ok(!r.core || r.core.abbr === v.acronym || r.core.name === v.name, `${raw} → CORE ${r.core && r.core.abbr}`);
      // ... and the CCF list, on a CORE venue's line, names the same venue or nothing ("C&C" is not "CC")
      // (CORE's "SiggraphA" is a spelling nobody prints: "SIGGRAPH Asia" in a made-up "SiggraphA '19:" form is no case)
      assert.ok(!r.ccf || v.acronym === "SiggraphA" || venues.squash(r.ccf.abbr) === venues.squash(v.acronym) || resolver.index.sameVenue(r.ccf.abbr, v.acronym), `${raw} → CCF ${r.ccf && r.ccf.abbr}`);
    }
  }
});

test("what the resolver says about a track: `refused` only when a ranked venue was matched and withheld; the not-ranked breakdown counts secondary tracks of ranked venues, not every string with a track word", () => {
  const metrics = require("../src/lib/metrics.js");
  const r = (s) => resolver.resolve(s);
  assert.equal(r("AISTATS Workshop on Causality, 2019").refused, true);
  assert.equal(r("IEEE Communications Surveys & Tutorials 22 (3), 1909-1941, 2020").refused, false, "a journal that is on no list, whose title says Tutorials, is no track of a ranked venue");
  assert.equal(r("IEEE Communications Surveys & Tutorials 22 (3), 1909-1941, 2020").secondary, "tutorial", "... though the box can still say why it has no rank");
  assert.equal(r("The Routledge companion to digital humanities, 2019").refused, false);
  assert.equal(r("ACL 2019").refused, false);
  const paper = (text) => ({ status: "found", role: "first", venue: r(text), venueText: text, citations: 0 });
  const s = metrics.summarize(["AISTATS Workshop on Causality, 2019", "IEEE Communications Surveys & Tutorials 22 (3), 1909-1941, 2020", "A new companion to digital humanities, 2012", "Cryptology ePrint Archive, 2019", "IACR Cryptol. ePrint Arch., 2020", "CoRR abs/1512.03385, 2015", "arXiv preprint arXiv:1, 2020", "Doctoral dissertation, MIT, 2015"].map(paper), "ccf");
  assert.deepEqual(s.unranked, { preprint: 4, secondary: 1, other: 3 });
  // a string with several track words: the venue whose own name holds the first is held to the others
  for (const t of ["International Workshop on Quality of Service (IWQoS) Posters, 2019", "Proceedings of the 15th ACM Workshop on Hot Topics in Networks: Posters, 2016", "IEEE International Conference on Emerging Technologies and Factory Automation Workshops, 2019"]) {
    const x = r(t);
    assert.ok(!x.ccf && !x.core && x.secondary, t);
  }
  assert.ok(venues.secondaryWords("Workshop on X: Posters and Demos").length === 3);
  // topical workshops at a venue that was once a workshop are not its old name
  for (const t of ["AISTATS Workshop on Artificial Intelligence for Healthcare, 2019", "PETS 2019 Workshop on Privacy-Preserving Machine Learning, 2019", "EGSR 2019 Workshop on Rendering for Games, 2019"]) assert.ok(!r(t).ccf && !r(t).core, t);
  // ... and the order of the words in an old name, and a cut-off one
  assert.equal(brief("Proceedings of the 13th IEEE workshop on Computer Security Foundations (CSFW-13), 2000"), "CCF B CSFW · CORE A CSF");
  assert.equal(brief("Eurographics Rendering Workshop, 1998"), "CCF B EGSR");
  assert.equal(brief("Proceedings of the 16th ACM Workshop on Hot Topics in Storage and File …, 2024"), "CCF C HotStorage");
  // an edition printed as the last two digits of the year the line ends with is no volume ("Graphics interface 98, 43-50, 1998"); a regional edition is not the venue it is named after
  assert.equal(brief("Graphics interface 98, 43-50, 1998"), "CCF C GI · CORE B GI");
  assert.equal(brief("ECRTS 2019-31ST EUROMICRO CONFERENCE ON REAL-TIME SYSTEMS, 1-25, 2019"), "CORE B ECRTS", "a year, a dash and an ordinal are no page range");
  assert.equal(brief("USENIX Security 22, 3255-3272, 2022"), "CCF A USENIX Security · CORE A* USENIX-Security");
  assert.equal(brief("Acm siggraph asia 7 (2), 1-10, 2008"), "");
  assert.equal(brief("ACM SIGGRAPH Asia 2009 papers, 1-10, 2009"), "CORE A* SiggraphA");
  assert.equal(brief("Nature 521 (7553), 436-444, 2015"), "");
  // a cut name that ends in dots is a cut name; the text is read in linear time
  assert.equal(brief("Proceedings of the 2019 ACM SIGSAC Conference on Computer and Communications..."), "CCF A CCS · CORE A* CCS");
  const t0 = Date.now();
  resolver.resolve("Nature" + " ,".repeat(40000) + "x");
  assert.ok(Date.now() - t0 < 500, "a long run of punctuation is read in linear time");
});

test("the seventh review: a venue's whole name beats a parenthesised acronym of another (SEC'17); a cut name needs four words that are not connectives; venues that are workshops by name keep their badge; a volume and an issue make a journal's line", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  // the organisation and the name are in the string: it is USENIX Security whatever the parenthesis says (SEC is IFIP's, and an Edge Computing symposium's)
  eq("Proceedings of the 26th USENIX Conference on Security Symposium (SEC'17), 1-18, 2017", "CCF A USENIX Security · CORE A* USENIX-Security");
  // AAAI's other form, "ACRONYM-19:", vetoes a name that boils down to another venue's too
  eq("SDM-19: SIAM International Conference on Data Mining, 2019", "CCF B SDM · CORE A SDM");
  // a cut name shows its start: four words that are not "on" or "and" — not "… Workshop on Artificial Intelligence and …"
  for (const s of ["Proceedings of the 2nd International Workshop on Artificial Intelligence and …, 2019", "Proceedings of the 12th ACM Workshop on Artificial Intelligence and …, 2019"]) assert.deepEqual([resolver.resolve(s).ccf, resolver.resolve(s).core], [null, null], s);
  eq("Proceedings of the 16th ACM Workshop on Hot Topics in Storage and File …, 2024", "CCF C HotStorage");
  // "USENIX ATC" read whole, in the forms Scholar prints it; never as the bare acronym
  for (const s of ["Proceedings of USENIX ATC, 1-14, 2009", "Proc. USENIX ATC, 2009", "2009 USENIX ATC, 1-14, 2009", "usenix atc, 2009"]) eq(s, "CCF A ACM SIGOPS ATC · CORE A USENIX");
  eq("ATC 2019", "CORE C ATC");
  // CCF lists RAID under its old name, CORE under the new one: the acronym in front is the venue of both
  eq("RAID '21: Proceedings of the 24th International Symposium on Research in Attacks, Intrusions and Defenses, 2021", "CCF B RAID · CORE A RAID");
  eq("RAID '08: Proceedings of the 11th International Symposium on Recent Advances in Intrusion Detection, 2008", "CCF B RAID · CORE A RAID");
  // old names with the notes of the CORE list ("prior to 2009 was …", "…; changed 2006")
  eq("PRIMA 2005: Pacific Rim International Workshop on Multi-Agents, 2005", "CORE B PRIMA");
  // a rule that narrowed the venue's names (the cut-name rule) still sees all of them
  eq("Proceedings of the 13th IEEE workshop on Computer Security Foundations, 2000", "CCF B CSFW · CORE A CSF");
  // venues that are workshops by name, or were: the list gives the name of today
  for (const [s, want] of [["2012 IEEE Spoken Language Technology Workshop (SLT), 234-239, 2012", "CCF C SLT"], ["International Workshop on Hybrid Systems: Computation and Control, 25-53, 2005", "CCF B HSCC"],
    ["International workshop on public key cryptography, 68-87, 2009", "CCF B PKC · CORE B PKC"],
    ["International Workshop on Verification, Model Checking, and Abstract …, 2002", "CCF B VMCAI · CORE B VMCAI"], ["22nd International Workshop on Fast Software Encryption, 2015", "CCF B FSE · CORE B FSE"],
    ["International Workshop on Computer Science Logic, 1-17, 1993", "CCF C CSL · CORE B CSL"], ["International Workshop on Recent Advances in Intrusion Detection, 17-35, 2002", "CCF B RAID · CORE A RAID"]]) eq(s, want);
  // ... and a topical workshop at one of them is still a workshop
  for (const s of ["SLT 2021 Workshop on Speech for Healthcare, 2021", "PKC 2019 Workshop on Post-Quantum Standards, 2019", "ICML Workshop on Machine Learning for Music, 2019"]) assert.ok(!resolver.resolve(s).ccf && !resolver.resolve(s).core, s);
  // a volume and an issue make a journal's line: an acronym that is no journal's, buried or leading, is not an event there — but a conference's proceedings with a volume are
  for (const s of ["PLOS Biology 3 (9), e300, 2005", "PLOS ONE 10 (12), e0143055, 2015", "IEEE MICRO 15 (1), 54-64, 1995"]) assert.ok(!resolver.resolve(s).ccf && !resolver.resolve(s).core, s);
  eq("ACM TKDD 6 (1), 2012", "CCF B TKDD");
  eq("Proc. VLDB Endow. 1 (2), 1379-1390, 2008", "CCF A VLDB · CORE A* VLDB");
  eq("VLDB Endowment 8 (7), 738, 2015", "CCF A VLDB · CORE A* VLDB");
  eq("Proceedings of CIDR 8 (1), 28, 2021", "CCF B CIDR · CORE A CIDR");
  eq("CCS 21 (2021), 15-19, 2021", "CCF A CCS · CORE A* CCS");
  eq("KDD 2019 (🌟 Top-3 Most Influential Papers), 2019", "CCF A SIGKDD · CORE A* KDD");
  // "refused" counts the tracks of listed venues whatever the spelling: the string without its track words names the venue
  for (const s of ["CHI'13 Extended Abstracts on Human Factors in Computing Systems, 787-792, 2013", "CHI '13 Extended Abstracts on Human Factors in Computing Systems, 787-792, 2013", "Adjunct Proceedings of the 28th Annual ACM Symposium on User Interface Software and Technology, 2015"]) {
    const r = resolver.resolve(s);
    assert.ok(r.refused && !r.ccf && !r.core, s);
  }
  assert.equal(resolver.resolve("IEEE Communications Surveys & Tutorials 22 (3), 1909-1941, 2020").refused, false);
  // the "@" of a workshop co-located with a conference (CEUR-WS) is a track word
  assert.deepEqual([venues.secondaryWords("NLP-DBPEDIA@ ISWC"), venues.secondaryWords("OM@ ISWC 2288"), venues.secondaryWords("Nature 521")], [["workshop"], ["workshop"], []]);
});

test("the eighth review: a cut name is not a whole one; the old name is the whole name part; notes after a volume are no issue; the same venue in the other list only", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // a cut name shows only the start of the name, and other workshops share it ("Search-Based Software" is Engineering or Testing): no badge for the cut ones, unless the start says four words of its own
  for (const s of ["Proceedings of the 7th International workshop on search-based software …, 2014", "Proceedings of the Second Workshop on Natural Language Generation …, 2022", "International Workshop on Machine Learning …, 2019"]) none(s);
  eq("International Workshop on Search-Based Software Engineering, 2009", "CORE B SSBSE");
  // an old name is the name part whole — not the end of a longer one ("NIPS Workshop on Machine Learning"), not a second track in front of it
  for (const s of ["NIPS Workshop on Machine Learning, 2016", "ICML Workshop on Machine Learning for Music, 2019", "Satellite Workshop of the 2021 IEEE Spoken Language Technology Workshop (SLT), 2021", "Student Workshop, 2012 IEEE Spoken Language Technology Workshop (SLT), 2012"]) none(s);
  eq("PRIMA 2005: Pacific Rim International Workshop on Multi-Agents, 2005", "CORE B PRIMA");
  eq("Proceedings. 11th IEEE Computer Security Foundations Workshop (Cat. No …, 1998", "CCF B CSFW · CORE A CSF");
  eq("Proceedings 15th IEEE Computer Security Foundations Workshop. CSFW-15, 119-128, 2002", "CCF B CSFW · CORE A CSF");
  // where the official name says "Workshop", a workshop about something that is not the venue's own subject is another workshop
  for (const s of ["PKC 2019 Workshop on Post-Quantum Cryptography, 2019", "CHES 2019 Workshop on Hardware Security for Embedded Systems, 2019"]) none(s);
  eq("International Workshop on Practice and Theory in Public Key Cryptography, 2019", "CCF B PKC · CORE B PKC");
  eq("VizSEC 2007: Proceedings of the Workshop on Visualization for Computer …, 2008", "CORE C VizSec");
  // the names a venue had are not its wording: a conference of MSR, SLT, VMCAI is not a clash with them
  eq("2020 IEEE/ACM 17th International Conference on Mining Software Repositories, 2020", "CCF C MSR · CORE A MSR");
  eq("VMCAI-19: International Conference on Verification, Model Checking and Abstract Interpretation, 2019", "CCF B VMCAI · CORE B VMCAI");
  // a note after a number is not a volume's issue: "ASE 19 (Distinguished Paper Award)" is the 19th ASE, not a journal's line
  for (const [s, want] of [["ASE 19 (Distinguished Paper Award), 2019", "CCF A ASE · CORE A* ASE"], ["CSCW 19 (Best Paper Award), 2019", "CCF A CSCW · CORE A CSCW"], ["WWW 19 (Best Paper), 2019", "CCF A WWW · CORE A* WWW"], ["KDD 19 (Oral), 2019", "CCF A SIGKDD · CORE A* KDD"],
    ["ASE 19 (3), 2019", ""]]) eq(s, want === "" ? brief("ASE 19 (3), 2019") : want);
  // another venue that squashes to the same acronym lends no words ("C&C" is Creativity and Cognition, "CC" Compiler Construction)
  eq("C&C '22: Proceedings of the 14th Conference on Creativity and Cognition, 2022", "CORE B C&C");
  // the track count: a journal has no tracks
  assert.equal(resolver.resolve("2019 IEEE symposium series on computational intelligence (SSCI), 230-237, 2019").refused, false);
});

test("the ninth review: a renamed venue's workshops (WACV), the acronym before a former name, spelling variants of a subject, former names with a sponsor, issues like (3S), an ampersand sets two acronyms apart", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // CORE still lists WACV under the name of the IEEE Workshop on Applications of Computer Vision; it is the Winter Conference, and the workshops of it are not it
  eq("Proceedings of the IEEE/CVF Winter Conference on Applications of Computer Vision, 2023", "CORE A WACV");
  eq("Proceedings Fourth IEEE Workshop on Applications of Computer Vision. WACV'98 …, 1998", "CORE A WACV");
  for (const s of ["Proceedings of the IEEE/CVF Winter Conference on Applications of Computer Vision (WACV) Workshops, 2023", "WACV Workshops, 2019"]) none(s);
  // the venue's acronym in front of an old name, "Proceedings of the" after it, an acronym that ends in "s"
  eq("MSR '06: Proceedings of the 2006 international workshop on Mining software repositories, 2006", "CCF C MSR · CORE A MSR");
  eq("CHASE '08: Proceedings of the 2008 international workshop on Cooperative and human aspects of software engineering, 2008", "CORE B CHASE");
  eq("HotStorage '22: Proceedings of the 14th ACM Workshop on Hot Topics in Storage and File Systems, 2022", "CCF C HotStorage");
  eq("CHES 2005: International Workshop on Cryptographic Hardware and Embedded Systems, 2005", "CCF B CHES · CORE A CHES");
  // an old name printed with its sponsor, read without it, is no clash with "Conference" in the venue's wording
  eq("2015 IEEE/ACM 8th International Workshop on Cooperative and Human Aspects of Software Engineering, 2015", "CORE B CHASE");
  // spelling variants of a subject, and the older titles of PEPM and MiSE
  eq("2016 IEEE/ACM 8th International Workshop on Modeling in Software Engineering (MiSE), 2016", "CORE C MISE");
  eq("2017 IEEE/ACM 9th International Workshop on Modelling in Software Engineering (MiSE), 2017", "CORE C MISE");
  eq("PEPM '02: Proceedings of the 2002 ACM SIGPLAN workshop on Partial evaluation and semantics-based program manipulation, 2002", "CCF C PEPM · CORE C PEPM");
  // a cut subject must begin the subject of one of the venue's names, and say two words of it; one word is anybody's
  eq("Proceedings of the 13th international workshop on Network and operating …, 2003", "CCF B NOSSDAV");
  eq("Public Key Cryptography-PKC 2003: 6th International Workshop on Theory and …, 2002", "CCF B PKC");
  for (const s of ["Proceedings of the 12th Workshop on Visualization for …, 2019", "Proceedings of the 12th Workshop on Hot Topics in …, 2019"]) none(s);
  // a cut name is no whole name: the whole old name, then the cut (what follows may be a subtitle) — unless its own acronym follows the name
  none("International Workshop on Verification, Model Checking, and Abstract Interpretation …, 2019");
  eq("International Workshop on Verification, Model Checking, and Abstract Interpretation (VMCAI) …, 2019", "CCF B VMCAI · CORE B VMCAI");
  // an issue looks like one: "(3S)", "(5s)", "(3pt2)", Nature's four digits — a note, an "Oral" or a year does not
  for (const [s, want] of [["SIGMOD Rec. 43 (3S), 2014", true], ["IEEE MICRO 35 (5s), 2015", true], ["Nature 521 (7553), 436-444, 2015", true], ["Foo 12 (3pt2), 5, 2015", true], ["ASE 19 (Best Paper), 2019", false], ["CCS 21 (2021), 15-19, 2021", false], ["KDD 19 (Oral), 2019", false]]) assert.equal(venues.prepare(s).hasIssue, want, s);
  none("IEEE MICRO 35 (5s), 2015");
  // an ampersand sets two acronyms apart ("C&C" is Creativity and Cognition, "CC" Compiler Construction) — unless the lists say they are one ("S&P", "SP"; "ASP-DAC", "ASPDAC" differ by a hyphen only)
  for (const s of ["C&C 2022, 2022", "C&C '22, 2022", "C&C 2022: Creativity and Cognition, 2022"]) eq(s, "CORE B C&C");
  eq("S&P 2019, 2019", brief("S&P 2019, 2019"));
  assert.ok(/CCF A S&P/.test(brief("S&P 2019, 2019")) && /CORE A\* SP/.test(brief("S&P 2019, 2019")), brief("S&P 2019, 2019"));
  eq("ASP-DAC 2004: Asia and South Pacific Design Automation Conference 2004 (IEEE …, 2004", "CCF C ASP-DAC · CORE B ASPDAC");
});

test("the tenth review: WACV's IEEE prints, the list view's cut conference line, a generic old title, an exact acronym, an ordinal is no issue, a cut name with its own acronym", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // WACV as IEEE printed it while it was the Workshop (inverted titles, dotted ones, the cut one) is WACV; as the Winter Conference's workshops it is not, in any form
  for (const s of ["Applications of Computer Vision (WACV), 2011 IEEE Workshop on, 155-162, 2011", "Applications of Computer Vision, 2008. WACV 2008. IEEE Workshop on, 1-8, 2008", "2005 Seventh IEEE Workshops on Applications of Computer Vision …, 2005", "2013 IEEE Workshop on Applications of Computer Vision (WACV), 75-82, 2013"]) eq(s, "CORE A WACV");
  // the list view cuts the conference's line ("… Applications of Computer …") and its workshops' line alike: no badge for either; the full title tells them apart
  none("Proceedings of the IEEE/CVF winter conference on applications of computer …, 2020");
  eq("Proceedings of the IEEE/CVF Winter Conference on Applications of Computer Vision, 2023", "CORE A WACV");
  none("Proceedings of the IEEE/CVF Winter Conference on Applications of Computer Vision (WACV) Workshops, 2023");
  // a title as generic as "Workshop on Machine Learning" is every sponsor's: no alias for ICML's first decade
  for (const s of ["IEEE Workshop on Machine Learning, 1-6, 2019", "Proceedings of the Fourth International Workshop on Machine Learning, 337-352, 1987"]) none(s);
  // the exact spelling first: "CC 2019" is Compiler Construction in both lists, "C&C 2022" Creativity and Cognition
  eq("CC 2019, 2019", "CCF B CC · CORE B CC");
  eq("C&C 2022, 2022", "CORE B C&C");
  // an ordinal in parentheses is no issue; a supplement is
  for (const [s, want] of [["CCS 21 (1st), 2021", false], ["Rendering Techniques 2005 (16th)", false], ["Bioinformatics 38 (Supplement_1), i1-i2, 2022", true], ["Foo 12 (Suppl 2), 5, 2015", true], ["Foo 12 (12), 5, 2015", true]]) assert.equal(venues.prepare(s).hasIssue, want, s);
  eq("CCS 21 (1st), 2021", "CCF A CCS · CORE A* CCS");
  // a cut name with the venue's own acronym in front: two words of the old name suffice
  eq("MSR '06: Proceedings of the 2006 international workshop on Mining software …, 2006", "CCF C MSR · CORE A MSR");
  eq("CHASE '08: Proceedings of the 2008 international workshop on Cooperative and human aspects of …, 2008", "CORE B CHASE");
  none("Proceedings of the 2006 international workshop on Mining software …, 2006");
  // spelling of a subject: endings and doubled letters are no difference (DAS's "Systems", MiSE's "Modelling")
  eq("2018 13th IAPR International Workshop on Document Analysis System (DAS), 2018", brief("2018 13th IAPR International Workshop on Document Analysis Systems (DAS), 2018"));
  assert.notEqual(brief("2018 13th IAPR International Workshop on Document Analysis System (DAS), 2018"), "");
});

test("an acronym in a parenthesis after a name of its own is that venue's only if most of the name is the venue's (found with the 9,000 most-cited conferences and journals of OpenAlex)", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // other events that share an acronym with a listed one: each spelled out, in full
  for (const s of ["Innovations in Power and Advanced Computing Technologies (i-PACT)", "International Conference on Electronics, Computers and Artificial Intelligence (ECAI)",
    "International Conference on Information, Communications & Signal Processing (ICICS)", "International Conference on Information and Communication Systems (ICICS)", "International Conference on Signal Processing, Communication, Power and Embedded System (SCOPES)",
    "Advanced Solid-State Photonics (TOPS)", "International Conference on Devices, Circuits and Systems (ICDCS)", "International Conference on Computational Cybernetics (ICCC)"]) none(s);
  // the venue itself, spelled out, with abbreviations, with a location, with a sponsor, older names, joint events, a journal's track in the parenthesis
  eq("International Conference on Information and Communications Security (ICICS), 2019", brief("International Conference on Information and Communications Security (ICICS), 2019"));
  assert.notEqual(brief("International Conference on Information and Communications Security (ICICS), 2019"), "");
  eq("Proc. Conf. Des., Autom. Test Euro.(DATE), 2009", "CCF B DATE · CORE A DATE");
  eq("2019 IEEE International Conference on Robotics and Automation (ICRA), Montreal, QC, Canada", "CCF B ICRA · CORE A* ICRA");
  eq("International Conference on Machine Learning (ICML), 2019", "CCF A ICML · CORE A* ICML");
  eq("IEEE International Conference on Computational Science and Engineering (CSE) and IEEE International Conference on Embedded and Ubiquitous Computing (EUC)", "CORE C EUC");
  eq("Conference of the Asia-Pacific Chapter of the Association for Computational Linguistics and the International Joint Conference on Natural Language Processing (AACL-IJCNLP)", "CORE B IJCNLP");
  eq("Proceedings of the ACM on Human-Computer Interaction 4 (CSCW1), 1-26, 2020", "CCF A CSCW · CORE A CSCW");
  eq("International Phoenix Conference on Computers and Communications (IPCCC)", "CCF C IPCCC · CORE C IPCCC");          // (IPCCC's name before 2000)
  eq("Heterogeneous Computing Workshop (HCW)", "CORE C HCW");
  eq("International Conference on Industrial Electronics, Control and Instrumentation (IECON)", "CORE C IECON");
  eq("IEEE International Symposium on Object/Component/Service-Oriented Real-Time Distributed Computing (ISORC)", "CORE C ISORC");
  // a workshop of a renamed venue that does not say "Workshop on": WACV's workshops (the IEEE source name has no "Conference")
  none("IEEE Winter Applications of Computer Vision Workshops (WACVW)");
});

test("the same venue in the other list: what one list's wording finds brings the other list's row (found with the real profiles and the alternate titles of OpenAlex)", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // each list words the venue differently: CCF's "ACM SIGCHI Conference on …" / CORE's "Designing Interactive Systems"; CCF's old MobiHoc name; CORE's "High Performance Distributed Computing"
  eq("Proceedings of the 2016 ACM Conference on Designing Interactive Systems, 1-10, 2016", "CCF C DIS · CORE A DIS");
  eq("Proceedings of the 15th ACM international symposium on Mobile ad hoc networking and computing, 2014", "CCF B MobiHoc · CORE B MOBIHOC");
  eq("Proceedings of the 34th International Symposium on High-Performance Parallel and Distributed Computing, 2025", "CCF A HPDC · CORE A HPDC");
  eq("Proceedings of the 2022 ACM on Asia Conference on Computer and Communications Security, 2022", "CCF C AsiaCCS · CORE A AsiaCCS");
  eq("Proceedings of the 15th ACM international symposium on Mobile ad hoc …, 2014", "CCF B MobiHoc · CORE B MOBIHOC");          // (cut off too)
  // a name of one word each (MICRO, ACM MM, VIS, ICS, Middleware) is the same word; the renamed ones the alias table pairs (GLOBECOM, SIGSPATIAL, APWeb, FORTE)
  eq("Proceedings of the ACM International Conference on Supercomputing, 261-270, 2011", "CCF B ICS · CORE A ICS");
  eq("Proceedings of the 12th annual ACM international conference on Multimedia …, 2004", "CCF A ACM MM · CORE A* ACMMM");
  eq("2014 IEEE Global Communications Conference, 698-703, 2014", "CCF C GLOBECOM · CORE B GLOBECOM");
  eq("Proceedings of the 16th ACM SIGSPATIAL international conference on Advances …, 2008", "CCF C SIGSPATIAL · CORE A SIGSPATIAL");
  // two rows of one acronym that are two venues share too few words to be one: FSE is the Foundations of Software Engineering and Fast Software Encryption in both lists
  eq("Proceedings of the ACM on Software Engineering 1 (FSE), 338-358, 2024", "CCF A FSE · CORE A* FSE");
  eq("International Workshop on Fast Software Encryption, 54-72, 2008", "CCF B FSE · CORE B FSE");
  for (const [ccfAbbr, coreAcronym] of [["FSE", "FSE"]]) {
    const rows = resolver.index.partners;
    const sw = [...rows.keys()].filter((e) => e.src === "ccf" && e.abbr === ccfAbbr);
    assert.equal(sw.length, 2);
    for (const e of sw) assert.equal((rows.get(e) || []).length, 1, "each FSE row has exactly one partner: " + e.name);
    for (const [a, other] of [["CC", "Creativity and Cognition"], ["ISC", "Industrial Simulation"], ["GI", "Global Internet"]]) {          // (homonyms: one acronym, two events)
      const x = [...rows.keys()].find((e) => e.src === "ccf" && e.abbr === a);
      assert.ok(!(rows.get(x) || []).some((y) => y.name.includes(other)), a + " and " + other + " are not one venue");
    }
    assert.ok(coreAcronym);
  }
  // a track word that the second venue does not own still blocks it
  none("Proceedings of the 2016 ACM Conference on Designing Interactive Systems Companion Publication, 2016");
});

test("a series title that is the name of an event of its own names that event's acronym: 'American Control Conference - ACC'95' is not CORE's Applied Computing Conference", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  none("Proceedings of 1995 American Control Conference - ACC'95");
  // a series title says no event; an ACM title that says one says the venue's own words
  eq("Advances in Cryptology–ASIACRYPT 2009", "CCF B ASIACRYPT · CORE A ASIACRYPT");
  eq("Proceedings of the ACM SIGPLAN 2002 Conference on Programming language design and implementation - PLDI '02", "CCF A PLDI · CORE A* PLDI");
  eq("Selected Areas in Cryptography–SAC 2013", "CCF C SAC · CORE B SAC");
});

test("sponsors, typos of 'proceedings' and spellings that the lists leave out (OpenAlex alternate titles, real profiles)", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  eq("2012 10th IAPR International Workshop on Document Analysis Systems", "CORE B DAS");
  eq("2018 55th ACM/ESDA/IEEE Design Automation Conference", brief("2018 55th ACM/EDAC/IEEE Design Automation Conference"));
  assert.notEqual(brief("2018 55th ACM/ESDA/IEEE Design Automation Conference"), "");
  eq("Proceedings of the International Conference on Web Intelligence, 81-87, 2017", "CORE B WI");
  eq("2008 Ninth ACIS International Conference on Software Engineering, Artificial Intelligence, Networking, and Parallel/Distributed Computing", "CORE C SNPD");
  eq("EAI International Conference on Mobile and Ubiquitous Systems: Computing, Networking and Services", "CCF C MobiQuitous · CORE C Mobiquitous");
  eq("Procedings of the British Machine Vision Conference 2015", "CCF C BMVC · CORE A BMVC");
  eq("Proceesings of the 9th Biennial Conference on Innovative Data Systems Research, 2019", "CCF B CIDR · CORE A CIDR");
  // British and American spellings are one word in a whole name; the start of a cut name keeps the spelling it has
  eq("2014 Second IEEE Working Conference on Software Visualization, 11-19, 2014", "CORE B VISSOFT");
  eq("International Conference on Conceptual Modelling, 167-181, 2002", brief("International Conference on Conceptual Modeling, 167-181, 2002"));
  none("2014 international conference on information visualization theory and …, 2014");
});

test("names Scholar prints that the lists word differently are aliases: older, inverted, singular, with a sponsor left out (and IFIP's, HiPC's, the Phoenix conference are read whole)", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  eq("European Conference on Parallel Processing, 112-123, 2011", "CCF B Euro-Par · CORE B EuroPar");
  eq("International Conference on Parallel Processing, 100-110, 2019", "CCF B ICPP · CORE B ICPP");
  eq("European Conference on Logics in Artificial Intelligence, 116-132, 2019", "CORE B JELIA");
  eq("International Conference on Coordination Languages and Models, 160-178, 1996", "CORE C Coordination");
  eq("2011 IEEE Intelligent Vehicles Symposium (IV), 788-793, 2011", "CORE B IEEE-IV");
  eq("Proceedings Real-Time Technology and Applications Symposium, 66-75, 1995", "CCF B RTAS · CORE A RTAS");
  eq("2014 17th Euromicro Conference on Digital System Design, 293-302, 2014", "CORE C DSD");
  eq("International Conference on Passive and Active Network Measurement, 102-111, 2011", "CCF C PAM · CORE B PAM");
  eq("IFIP Conference on Human-Computer Interaction, 440-452, 2009", "CCF C INTERACT · CORE B Interact");
  none("International Conference on Human-Computer Interaction, 137-146, 2011");          // (HCI International: no IFIP, no INTERACT)
  eq("Proceedings of the international conference for high performance computing …, 2015", "CCF A SC · CORE A SC");
  eq("2010 IEEE Wireless Communication and Networking Conference, 1-6, 2010", "CCF C WCNC · CORE B WCNC");
  eq("Proceedings of the 18th International Software Product Line Conference …, 2014", "CORE B SPLC");
  eq("Proceedings of the 2020 ACM Conference on International Computing Education Research", "CORE A ICER");
  eq("2010 6th World Congress on Services, 314-317, 2010", "CORE B SERVICES");
  eq("2005 International Symposium on Empirical Software Engineering, 2005., 10 pp., 2005", "CCF B ESEM · CORE A ESEM");
  eq("Proceedings of the 2025 Conference of the Nations of the Americas Chapter of the Association for Computational Linguistics: Human Language Technologies, 2025", "CCF B NAACL · CORE A NAACL");
  eq("IEEE International Conference on Computer Design: VLSI in Computers and Processors, 2004", "CCF B ICCD · CORE C ICCD");
  eq("2009 9th IEEE/ACM International Symposium on Cluster Computing and the Grid", "CCF C CCGRID · CORE B CCGRID");
  eq("2020 20th IEEE/ACM International Symposium on Cluster, Cloud and Internet Computing", "CCF C CCGRID · CORE B CCGRID");
  eq("International Conference on Networking, Architecture, and Storage, 2017", "CCF C NAS");
  // events of the same acronym that are not listed (aliases.js `shadow`)
  none("2022 International Conference on Information Networking (ICOIN)");
  none("2009 IEEE International SOC Conference (SOCC)");
  // journals: the title without the subtitle the list adds, and the old name of a renamed journal
  eq("Computational Geometry 1 (1), 13-34, 1991", "CCF C CGTA");
  eq("Discrete & Computational Geometry 10 (1), 1-10, 1993", brief("Discrete and Computational Geometry 10 (1), 1-10, 1993"));
  assert.notEqual(brief("Computational Geometry 1 (1), 13-34, 1991"), brief("Discrete & Computational Geometry 10 (1), 1-10, 1993"));
  eq("Journal of Systems Architecture 109, 101809, 2020", "CCF B JSA");
  eq("IEEE Transactions on Neural Networks 18 (6), 1815-1825, 2007", "CCF B TNNLS");
  // a cut "Symposium on Modelling, Analysis and Simulation of …" is MASCOTS in both lists, not the conference MSWiM (CORE's own name has "Model")
  eq("IEEE International Symposium on Modelling, Analysis and Simulation of …, 2019", "CCF C MASCOTS · CORE B MASCOTS");
  eq("ACM International Conference on Modeling, Analysis and Simulation of …, 2012", "CCF C MSWiM · CORE A MSWIM");
  // ... and what is not an alias stays without a badge
  none("International Conference on High Performance Computing, 86-105, 2023");
  none("Proceedings of the 2002 ACM symposium on Applied computing, 32-36, 2002");
});

test("the eleventh review: a pick among venues of one rating is no venue to carry over; sponsors and aliases that read another venue; abbreviated words; plural event words", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // "International Conference on Data Mining" fits ICDM and SDM, which CCF ranks alike (it takes the first) and CORE ranks apart: CORE's A* is not carried over — unless the string says the acronym
  eq("Proceedings of the International Conference on Data Mining (DMIN), 2013", "CCF B ICDM");
  eq("International Conference on Data Mining, 2013", "CCF B ICDM");
  eq("Proceedings of the IEEE International Conference on Data Mining (ICDM), 2013", "CCF B ICDM · CORE A* ICDM");
  eq("SDM '19: Proceedings of the SIAM International Conference on Data Mining, 123-145, 2019", "CCF B SDM · CORE A SDM");
  // the IET and the ACIS organise conferences named after a field (IET's Image Processing, the Computer and Information Science of Kuala Lumpur): they are no sponsors to drop
  none("IET Conference on Image Processing (IPR 2012), 1-6, 2012");
  none("2012 International Conference on Computer & Information Science (ICCIS), 1-5, 2012");
  eq("3rd IET International Conference on Intelligent Environments (IE 07), 40-47, 2007", "CORE B IE");
  eq("2012 IEEE/ACIS 11th International Conference on Computer and Information Science (ICIS), 2012", "CORE C ICIS");
  eq("2008 Ninth ACIS International Conference on Software Engineering, Artificial Intelligence, Networking, and Parallel/Distributed Computing", "CORE C SNPD");
  // an alias that begins another venue's name is for whole strings only (SPLC's, SERVICES'); a title that is also a field counts for a line with a volume (a chapter of a book is no journal)
  none("Proceedings of the 5th international conference on Systems software …, 2010");
  none("2019 IEEE 12th World Conference on …, 2019");
  none("Computational geometry, 307-317, 2000");
  eq("Computational Geometry 11 (2), 69-81, 1998", "CCF C CGTA");
  // two concurrent series of one name, and a venue whose own name begins another's, are no aliases
  none("2008 7th IEEE International Conference on Cybernetic Intelligent Systems, 1-6, 2008");
  none("2015 IEEE 17th International Conference on High Performance Computing …, 2015");
  // "Annu." is "Annual"; "EG/VGTC" are EuroVis's sponsors; "Workshops" is "Workshop"
  eq("Proc. 52nd Annu. IEEE/ACM Int. Symp. Microarchitecture (MICRO), 2019", "CCF A MICRO · CORE A* MICRO");
  eq("Proc. Annu. Int. Cryptology Conf. (CRYPTO), 2019", "CCF A CRYPTO · CORE A* CRYPTO");
  eq("EG/VGTC Conference on Visualization (EuroVis '16), 2016", "CCF B EuroVis · CORE B EuroVis");
  eq("2010 19th IEEE International Workshops on Enabling Technologies: Infrastructures for Collaborative Enterprises, 30-35, 2010", "CORE C WETICE");
});


test("an acronym with its year glued on is the acronym; a workshop co-located with a venue is not the venue", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // IEEE Xplore prints "ICME2000", "SC20: …", "LAK26: …"
  eq("2000 IEEE International Conference on Multimedia and Expo. ICME2000 …, 2000", "CCF B ICME · CORE A ICME");
  eq("2020 SC20: International Conference for High Performance Computing …, 2020", "CCF A SC · CORE A SC");
  eq("Proceedings of the LAK26: 16th International Learning Analytics and …, 2026", "CORE A LAK");
  // "BEA@ACL2023", "FTL-IJCAI21": a workshop of the venue, whichever way the year is written
  none("BEA@ACL2023, 2023");
  none("BEA@ACL 2023, 2023");
  none("FTL-IJCAI21, 2021");
  assert.equal(resolver.resolve("BEA@ACL2023, 2023").secondary, "workshop");
});

test("real prints that missed a badge: a cut IEEE citation form, joint proceedings, a sponsor's typo, a glued year, a plural", () => {
  const eq = (s, want) => assert.equal(brief(s), want, s);
  const none = (s) => { const r = resolver.resolve(s); assert.deepEqual([r.ccf, r.core], [null, null], s); };
  // IEEE Xplore's "Name, YEAR. ACRONYM" form, cut on the acronym: the acronym (with or without its year) is the event's own
  eq("2003 International Symposium on Empirical Software Engineering, 2003. ISESE …, 2003", "CCF B ESEM · CORE A ESEM");
  eq("Embedded and Real-Time Computing Systems and Applications, 2009. RTCSA'09 …, 2009", "CORE B RTCSA");
  none("IEEE Global Telecommunications Conference Workshops, 2004. GlobeCom …, 2004");
  eq("25th International Conference on Software Engineering, 2003. Proceedings …, 2003", "CCF A ICSE · CORE A* ICSE");
  // joint proceedings and the digest of an EDA conference
  eq("2008 IEEE International Conference on Dependable Systems and Networks With …, 2008", "CCF B DSN · CORE A DSN");
  eq("1999 IEEE/ACM International Conference on Computer-Aided Design. Digest of …, 1999", "CCF B ICCAD · CORE A ICCAD");
  // "CFV" for the CVF; "2011IEEE" for "2011 IEEE"; "Applications" for "Application"; "… in Europe"
  eq("IEEE/CFV Conference on Computer Vision and Pattern Recognition, 2023", "CCF A CVPR · CORE A* CVPR");
  eq("2011IEEE 10th International Conference on Trust, Security and Privacy in …, 2011", "CCF C TrustCom · CORE B TrustCom");
  eq("International Conference on Smart Card Research and Advanced Applications, 22-41, 2017", "CORE C CARDIS");
  eq("Conference on Artificial Intelligence in Medicine in Europe, 152-157, 2003", "CORE B AIME");
  // CORE's SERA begins with its sponsor, ACIS, which is no sponsor to drop (it is part of ICIS's name): the print without it is an alias
  eq("International Conference on Software Engineering Research, Management and Applications, 2012", "CORE C SERA");
  eq("2012 10th ACIS International Conference on Software Engineering Research, Management and Applications (SERA 2012), 2012", "CORE C SERA");
  // a three-word journal name with an article number where the pages would be (the lines of ACM TOG, 4 real ones, had no badge: only a name of four words may be followed by words)
  eq("ACM Transactions on Graphics (Proc. of Siggraph'2022) 41 (4), Article No.: 137, 2022", "CCF A TOG");
  eq("ACM Transactions on Graphics 38 (4 : SIGGRAPH 2019), Article 28, 2019", "CCF A TOG");
  // Oxford's article numbers where the pages would be ("btac817"), the names journals had, the series of Springer after a title
  eq("Bioinformatics 39 (1), btac817, 2023", "CCF A Bioinformatics");
  eq("Briefings in bioinformatics 22 (6), bbab315, 2021", "CCF B Briefings in Bioinformatics");
  eq("Bioinformatics-Oxford 19 (2), 149-155, 2003", "CCF A Bioinformatics");
  eq("Computer networks and ISDN systems 25 (7), 761-778, 1993", "CCF B CN");
  eq("Graphical models and image processing 57 (6), 453-461, 1995", "CCF C GMOD");
  eq("IEEE Transactions on Robotics and Automation 12 (4), 532-542, 1996", "CCF B TR");
  eq("Frontiers of Computer Science in China 1 (2), 156-165, 2007", "CCF B FCS");
  eq("Selected areas in cryptography - Lecture Notes in Computer Science, 130-144, 2003", "CCF C SAC · CORE B SAC");
  eq("European Symposium on Algorithms - Lecture Notes in Computer Science, 2005", "CCF B ESA · CORE A ESA");
  none("Lecture Notes in Computer Science 1603, 117-146, 1999");
  none("Artificial Intelligence Review 23 (2), 187-205, 2005");
  // IEEE Xplore's inverted title cut among the sponsors: "Computer Vision and Pattern Recognition, 2006 IEEE Computer Society …" is the IEEE Computer Society Conference on it (a workshop says so in its title)
  eq("Computer Vision and Pattern Recognition, 2006 IEEE Computer Society …, 2006", "CCF A CVPR · CORE A* CVPR");
  eq("Computer Vision and Pattern Recognition, 1999. IEEE Computer Society …, 1999", "CCF A CVPR · CORE A* CVPR");
  eq("Data Engineering, 2008 IEEE 24th International …, 2008", "CCF A ICDE · CORE A* ICDE");
  none("Computer Vision and Pattern Recognition Workshops (CVPRW), 2017 IEEE …, 2017");
  none("Machine Learning, 2006 IEEE …, 2006");
  // "IEEE Transaction on …" (singular) is a typo owners type, not another journal
  eq("IEEE Transaction on Parallel and Distributed Systems, 2220-2232, 2015", "CCF A TPDS");
  eq("IEEE Transaction On Image Processing 22 (6), 2327-2342, 2013", "CCF A TIP");
  // the whole IEEE name HiPC had, not cut off (its cut is as much HPCC's); the realistic cut of SPLC; a string that shows only the sponsors; a periodical's line is not a conference's
  eq("2016 IEEE 23rd International Conference on High Performance Computing, 2016", "CCF C HiPC");
  none("2015 IEEE 17th International Conference on High Performance Computing …, 2015");
  eq("Proceedings of the 24th ACM Conference on Systems and Software Product …, 2020", "CORE B SPLC");
  none("Proceedings of the 23rd International Systems and Software …, 2019");
  none("Proceedings of the Twenty-Seventh IFIP/IEEE International Conference on …, 2019");
  eq("Proceedings of the Eleventh IEEE/ACM/IFIP International Conference on …, 2016", "CCF B CODES+ISSS");
  eq("SIGSPATIAL Special 12 (3), 2019", "CCF C SIGSPATIAL");
  // two lists read a cut differently: the whole name is the better reading, not the venue that merely begins with the visible words — unless the whole name's event word is not the string's
  // (SEW is a workshop, the string says symposium; SCA is a symposium, the string says conference): then neither reading is more than a guess
  none("Proceedings of the 2019 IEEE International Symposium on Software Engineering …, 2019");
  none("Proceedings of the 2019 International Conference on Computer Animation …, 2019");
  // Springer's proceedings volumes numbered in Roman: the volume and its description are no part of the name — but "Systems I: Regular Papers" is a journal's own title
  eq("Algorithmic Foundations of Robotics X: Proceedings of the Tenth Workshop on …, 2013", "CORE C WAFR");
  eq("Algorithmic Foundations of Robotics IX: Selected Contributions of the Ninth …, 2010", "CORE C WAFR");
  eq("IEEE Transactions on Circuits and Systems I: Regular Papers 51 (2), 342-353, 2004", "CCF C TCASI");
  eq("IEEE Transactions on Circuits and Systems I: Fundamental Theory and …, 1992", "CCF C TCASI");
  none("IEEE Transactions on Circuits and Systems II: Express Briefs 53 (5), 339-343, 2006");
  eq("2013 humaine association conference on affective computing and intelligent …, 2013", "CORE B ACII");
  // a sponsor's acronym beside the name of another event: ACM SIGIR's International Conference on the Theory of Information Retrieval (ICTIR) is no SIGIR — three words of subject, one of them not SIGIR's
  none("Proceedings of the 2019 ACM SIGIR International Conference on Theory of Information Retrieval, 2019");
  none("ICTIR 2019: ACM SIGIR International Conference on Theory of Information Retrieval, 2019");
  eq("Proceedings of the 42nd International ACM SIGIR Conference on Research and Development in Information Retrieval, 2019", "CCF A SIGIR · CORE A* SIGIR");
  eq("Proceedings of 1993 IEEE International Conference on Computer Design ICCD'93 …, 1993", "CCF B ICCD · CORE C ICCD");
  // a known name followed by words that go on with it is another event's name, not the venue with a subtitle (rule R5: a subtitle is set off by a colon, a dash, a comma, a full stop, a slash or a parenthesis)
  none("International Conference on Computer Graphics and Interactive Techniques in Australasia and South East Asia (GRAPHITE)");
  none("Annual International ACM SIGIR Conference on Research and Development in Information Retrieval in the Asia Pacific Region");
  none("Data mining and knowledge discovery handbook, 1049-1077, 2010");
  eq("FINANCIAL CRYPTOGRAPHY AND DATA SECURITY, FC 2018 10957, 19, 2018", "CCF C FC · CORE A FC");
  eq("IEEE Computer Society Conference on Computer Vision and Pattern Recognition/Proceedings - ", "CCF A CVPR · CORE A* CVPR");
  // a supplemental volume is no main proceedings; the Roman page numbers of the front matter are no part of the name
  none("IEEE/IFIP International Conference on Dependable Systems and Networks - Supplemental Volume (DSN-S)");
  eq("IEEE transactions on visualization and computer graphics 20 (4), vi, 2014", "CCF A TVCG");
  eq("Proceedings-Real-Time Systems Symposium 2016, ix, 2016", "CCF A RTSS · CORE A RTSS");
  // the parts of the IEEE's Systems, Man and Cybernetics journal: Part A is today's Systems, Part B today's Cybernetics
  eq("IEEE Transactions on Systems, Man, and Cybernetics-Part A: Systems and …, 2004", "CCF B TSMC");
  eq("IEEE Trans. Systems, Man, and Cybernetics, Part B: Cybernetics 35 (6), 1098-1107, 2005", "CCF B IEEE Transactions on Cybernetics");
  eq("IEEE Transactions on Systems, Man, and Cybernetics, Part B (Cybernetics) 40 …, 2009", "CCF B IEEE Transactions on Cybernetics");
  eq("IEEE Transactions on Systems, Man, and Cybernetics, Part B (Cybernetics) 40 (3), 1-9, 2010", "CCF B IEEE Transactions on Cybernetics");
  eq("IEEE Transactions on Systems, Man, and Cybernetics, Part B 40 (3), 2010", "CCF B IEEE Transactions on Cybernetics");
  none("IEEE Transactions on Systems, Man, and Cybernetics, Part C (Applications and Reviews) 40 (1), 2010");
  eq("IEEE Transactions on Systems, Man, and Cybernetics, Part A: Systems and Humans 37 (6), 2007", "CCF B TSMC");
  // the joint Web Intelligence / Intelligent Agent Technology event is WI's; the 2000 volume title is EKAW's
  eq("IEEE/WIC/ACM International Conference on Web Intelligence and Intelligent Agent Technology", "CORE B WI");
  eq("Knowledge Engineering and Knowledge Management Methods, Models, and Tools, 1-16, 2000", "CORE B EKAW");
  // a venue's name that goes on with "and" and more words, before an acronym in a parenthesis, is another event's name: IEEE's ICIP is not "Image Processing and Robotics" (a subtitle set off by a colon stays)
  none("2020 International Conference on Image Processing and Robotics (ICIP)");
  eq("2020 IEEE International Conference on Image Processing (ICIP), 2020", "CCF C ICIP · CORE B ICIP");
  eq("IEEE/ACM International Conference on Software Engineering: Software Engineering in Practice (ICSE-SEIP)", "CCF A ICSE · CORE A* ICSE");
  eq("IEEE International Symposium on Personal, Indoor and Mobile Radio Communications (PIMRC)", "CORE B PIMRC");
  // the acronym ICCC is also the Computational Cybernetics conference; the sections of SIGGRAPH that are no papers are tracks
  none("IEEE 3rd International Conference on Computational Cybernetics, 2005. ICCC 2005.");
  eq("International Conference on Computational Creativity (ICCC), 2019", "CORE C ICCC");
  none("ACM SIGGRAPH 2004 Computer animation festival on - SIGGRAPH '04");
  none("ACM SIGGRAPH 2004 Art gallery");
  none("IEEE International Symposium on Mixed and Augmented Reality - Arts, Media, and Humanities (ISMAR-AMH)");
  eq("ACM SIGGRAPH 2019 Papers", "CCF A SIGGRAPH · CORE A* SIGGRAPH");
  // a volume's title in Springer's series is a book of proceedings: never the journal of that title, and not the venue whose name the title boils down to when it names another one (ECML)
  none("Machine Learning - Lecture Notes in Computer Science, 2005");
  none("Distributed Computing - Lecture Notes in Computer Science, 2005");
  none("Pattern Recognition - Lecture Notes in Computer Science, 2005");
  none("Machine Learning: ECML 2005 - Lecture Notes in Computer Science, 2005");
  // (the host of a workshop is no other venue: the workshop's own name says it)
  eq("2009 ICSE Workshop on Modeling in Software Engineering, 1-6, 2009", "CORE C MISE");
  // an acronym that is an English word counts as the string's only in capitals ("Networking Conference (WCNC)" is WCNC); the acronym the string names for a conference of the other list, whose name stands there too, is
  // not the journal of this list that has the same words (Crossref prints the conference without its "Conference")
  eq("Networking Conference (WCNC)", "CCF C WCNC · CORE B WCNC");
  eq("IFIP Networking Conference, 2019", "CCF C Networking · CORE B Networking");
  eq("2023 International Wireless Communications and Mobile Computing (IWCMC)", "CORE B IWCMC");
  eq("Wireless Communications and Mobile Computing 2019 (3), 1-10, 2019", "CCF C WCMC");
  // the symposium's older title in the singular, and the symposium CORE calls a conference
  eq("Proceedings Second IEEE Symposium on Computer and Communications", "CCF C ISCC · CORE C ISCC");
  eq("19th International Symposium in Robot and Human Interactive Communication", "CORE B RO-MAN");
  // what publishers print: an ordinal with its hyphen written out, a space missing after "of", ACM's 2024 title of the SIGGRAPH proceedings, a volume's subtitle after the colon (not a book's: "Intelligent Data Analysis: An Introduction")
  eq("Proceedings of the TwentySecond International Conference on Principles of Knowledge Representation and Reasoning", "CCF B KR · CORE A* KR");
  eq("Proceedings of the12th ACM SIGPLAN/SIGOPS International Conference on Virtual Execution Environments", "CCF B VEE · CORE B VEE");
  eq("Special Interest Group on Computer Graphics and Interactive Techniques Conference", "CCF A SIGGRAPH · CORE A* SIGGRAPH");
  eq("Proceedings of the Special Interest Group on Computer Graphics and …, 2025", "CCF A SIGGRAPH · CORE A* SIGGRAPH");
  none("Special Interest Group on Computer Graphics and Interactive Techniques Conference Courses");
  eq("Proceedings of the 12th International Conference on Extending Database Technology: Advances in Database Technology", "CCF B EDBT · CORE B EDBT");
  none("Intelligent Data Analysis: An Introduction, 403-427, 2007");
  none("Data Mining and Knowledge Discovery: Handbook");
  // names CORE words with a typo or another last word (PIMRC, CIFEr, I3DG) and the 2024 name of VIS; the symposium on Information Visualization (1995-2006) is not in the lists
  eq("2009 IEEE 20th International Symposium on Personal, Indoor and Mobile Radio Communications", "CORE B PIMRC");
  eq("2011 IEEE Symposium on Computational Intelligence for Financial Engineering and Economics", "CORE C IEEE CIFEr");
  eq("Proceedings of the ACM SIGGRAPH Symposium on Interactive 3D Graphics and Games", "CCF B I3D · CORE B I3DG");
  eq("2024 IEEE Visualization and Visual Analytics (VIS)", "CCF A IEEE VIS · CORE A IEEE VIS");
  none("IEEE Symposium on Information Visualization, 199-206, 2004");
  eq("2009 13th international conference information visualisation, 592-597, 2009", "CORE C IV");
  // the sponsor SIGEVO is no part of FOGA's name; ACM's series form with the word before the dash cut off repeats the title
  eq("Proceedings of the 18th ACM/SIGEVO Conference on Foundations of Genetic Algorithms", "CORE A FOGA");
  eq("SIGGRAPH Asia 2018 Technical Papers on   - SIGGRAPH Asia '18", "CORE A* SiggraphA");
  none("ACM SIGGRAPH 2004 Computer animation festival on - SIGGRAPH '04");
  // an event that says "Joint" is not a venue whose names never do (Joint Cloud Computing, the Japanese Joint Symposium on Parallel Processing); the years a venue was held jointly say so in the title
  none("2020 IEEE international conference on joint cloud computing, 86-93, 2020");
  none("9th Joint Symposium on Parallel Processing, 136-198, 1997");
  none("Joint Pattern Recognition Symposium");
  eq("Proceedings IEEE Joint International Conference on Requirements Engineering …, 2002", "CCF B RE · CORE A RE");
  eq("Proceedings of the 1998 ACM SIGMETRICS joint international conference on Measurement and modeling of computer systems", "CCF B SIGMETRICS · CORE A* SIGMETRICS");
  eq("Proceedings of the joint international conference on Measurement and …, 2004", "CCF B SIGMETRICS · CORE A* SIGMETRICS");
  eq("2019 IEEE/WIC/ACM International Joint Conferences on Web Intelligence and Intelligent Agent Technologies", "CORE B WI");
  // acronyms of other events that the names of a ranked venue boil down to, and the predecessors of IPDPS
  none("2022 2nd International Conference on Artificial Intelligence (ICAI)");
  none("2020 International Conference on Artificial Intelligence and Education (ICAIE)");
  none("2021 IEEE 3rd International Conference on Circuits and Systems (ICCS)");
  eq("International Parallel Processing Symposium (IPPS)", "CCF B IPDPS · CORE A IPDPS");
  eq("International Conference on Parallel Processing (ICPP), 2019", "CCF B ICPP · CORE B ICPP");
  none("IEEE/ACM International Conference on Software Engineering: New Ideas and Emerging Results (ICSE-NIER)");
  // the state of an article after the name ("early access", "in press", "Online ahead of print") and "pp." before the pages are no part of a journal's name
  for (const tail of [", early access, 2023", ", in press, 2023", ", accepted, 2023", ", Online ahead of print", " - Early Access", ", pp. 1-18, 2023", " 45 (6), pp. 7090-7106, 2023", " (in press)"]) eq("IEEE Transactions on Pattern Analysis and Machine Intelligence" + tail, "CCF A TPAMI");
  eq("Bioinformatics, in press, 2021", "CCF A Bioinformatics");
  eq("International Symposium on Computer Architecture, Pages 1–10, 2019", "CCF A ISCA · CORE A* ISCA");
  eq("Design Automation Conference, pages 123-145, 2019", "CCF A DAC · CORE A* DAC");
  // review 13: an acronym in capitals set off after the title says the event even where the title's words are a journal's whole name (LNAI's "Machine Learning: ECML 2004")
  none("Machine learning: ECML 2004, 217-228, 2004");
  none("Data Mining and Knowledge Discovery: PAKDD 2005");
  eq("Artificial Intelligence: IJCAI 2005", "CCF B IJCAI · CORE A* IJCAI");
  eq("The VLDB Journal 12 (3), 123-145, 2019", "CCF A VLDBJ");
  // ... an unranked event of the name the string says (a journal for I3D, HPG and SCA; ACM's SAC) is no ranked venue of nearly the same words
  none("Proceedings of the ACM on Computer Graphics and Interactive Techniques 5 (1), 1-17, 2022");
  none("Proceedings of the 2010 ACM Symposium on Applied Computing …, 2010");
  none("ACM Symposium on Applied Computing X: Proceedings of the Tenth …, 2010");
  none("Annual International ACM SIGIR Conference on Research and Development in Information Retrieval in the Asia Pacific Region (SIGIR-AP)");
  // ... the name of a venue followed by words that are set off — the event word, "of", "on" are part of the name: "… Security Symposium, San Diego, California"
  eq("Network and Distributed System Security Symposium, San Diego, California", "CCF A NDSS · CORE A* NDSS");
  eq("IEEE Real-Time Systems Symposium, Lisbon, Portugal", "CCF A RTSS · CORE A RTSS");
  eq("Design, Automation and Test in Europe Conference, Grenoble, France", "CCF B DATE · CORE A DATE");
  // ... a cut whose whole-name reading has another event word than the string (a symposium for a conference) disagrees with the other list's reading of its start: neither is more than a guess
  none("Software Engineering, 2010 IEEE 32nd …, 2010");
  // ... a leading acronym of a name that ends with its event word ("… Australasian Computing Education Conference") is that event's, and a year in front of a parenthesis is no volume
  none("ACE '17: Proceedings of the Nineteenth Australasian Computing Education Conference, 31-40, 2017");
  none("2nd International Seminar on Guidance and Counseling 2019 (ISGC 2019)");
  eq("WWW '19: The World Wide Web Conference, 2019", "CCF A WWW · CORE A* WWW");
  eq("International Conference on Shape Modeling and Applications 2005 (SMI'05 …, 2005", "CCF C SMI");
  // ... an article number after an acronym is read like pages
  eq("CSCW, Article 12, 2017", "CCF A CSCW · CORE A CSCW");
  // the model checkers' SPIN is not the spin physicists'
  none("International Spin Physics Symposium (SPIN)");
  eq("International Symposium on Model Checking of Software (SPIN)", "CCF C SPIN");
  // (another event of the same words stays without)
  none("International Conference on Smart Card Research and Advanced Systems, 2017");
});
