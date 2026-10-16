"use strict";
// Hostile and odd input must never throw or stall the page: Scholar text is user-editable, and every
// string here goes through regular expressions that run on each paper of a profile.
const test = require("node:test");
const assert = require("node:assert/strict");
const { slowdown } = require("./helpers/speed.js");
const names = require("../src/lib/names.js");
const venues = require("../src/lib/venues.js");
const marks = require("../src/lib/marks.js");
const awards = require("../src/lib/awards.js");
const analysis = require("../src/lib/analysis.js");
const metrics = require("../src/lib/metrics.js");
const ccf = require("../src/data/ccf.js");
const core = require("../src/data/core.js");
const aliases = require("../src/data/aliases.js");

const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
const index = awards.createIndex([[awards.titleKey("A Known Paper"), "doe", "ICML", 2020, "best", ""]]);
const owner = { name: "Jane Doe", alternates: [] };

// a seeded generator, so a failure is reproducible
let seed = 20261011;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (list) => list[Math.floor(rnd() * list.length)];

const adversarial = {
  "empty": "",
  "spaces": " ".repeat(20000) + "x",
  "commas": "a,".repeat(8000),
  "open parens": "(".repeat(5000),
  "open parens + words": "( word ".repeat(2500),
  "close parens": ")".repeat(5000),
  "brackets": "[".repeat(4000) + "]".repeat(4000),
  "ellipses": "…".repeat(3000),
  "dots": ".".repeat(6000),
  "digits": "1".repeat(8000),
  "page ranges": "12-34, ".repeat(3000),
  "volume tails": "Journal 1 (2), 3-4, ".repeat(1500),
  "hyphens": "A-".repeat(6000),
  "long word": "Conference".repeat(2000),
  "long acronym": "ABCDEFGHIJ".repeat(2000),
  "proceedings": "Proceedings of the ".repeat(2000),
  "sig chain": "SIGMOD-".repeat(3000) + "SIGACT",
  "year tails": "Venue, 2001, 2002, 2003, ".repeat(2000),
  "mixed scripts": "会议 Конференция مؤتمر 学会 ".repeat(1500),
  "controls": "\u0000\u0001\u0008\u000b\u001f‮​﻿".repeat(2000),
  "emoji": "🎓📄🏆".repeat(3000),
  "lone surrogates": "𐀀\ud800".repeat(1500),
  "nbsp soup": "a ".repeat(8000),
  "marker soup": "(Oral) [Spotlight] - Best Paper Award ".repeat(1500),
  "award words": "best paper ".repeat(4000),
  "quotes": "\"'".repeat(5000),
  // patterns added for NeurIPS tracks, PMLR tails, organisation prefixes and spelled-out ordinals
  "datasets and benchmarks": "NeurIPS " + "Datasets and Benchmarks Track ".repeat(3000),
  "unclosed track paren": "NeurIPS (" + "Datasets ".repeat(5000),
  "round soup": "NeurIPS Datasets and Benchmarks Track (Round " + "1 ".repeat(5000),
  "pmlr soup": "International Conference on Machine Learning, " + "PMLR 1:2-3, ".repeat(3000),
  "pmlr then spaces": "ICML, PMLR" + " ".repeat(20000) + "x",
  "organisation chain": "IEEE/".repeat(5000) + "ACM CCS 2023",
  "tens words": "thirty-eight ".repeat(5000) + "Conference on Neural Information Processing Systems",
  "track words": "Track on ".repeat(5000) + "Datasets and Benchmarks"
};

test("no adversarial string throws, and each is handled quickly by every library", () => {
  const slow = [], factor = slowdown();
  for (const [label, s] of Object.entries(adversarial)) {
    const t0 = process.hrtime.bigint();
    assert.doesNotThrow(() => resolver.resolve(s), "venues.resolve: " + label);
    assert.doesNotThrow(() => venues.prepare(s), "venues.prepare: " + label);
    assert.doesNotThrow(() => marks.detect({ title: s, venue: s }), "marks.detect: " + label);
    assert.doesNotThrow(() => awards.titleKey(s), "awards.titleKey: " + label);
    assert.doesNotThrow(() => index.lookup({ title: s, authorsText: s }), "awards.lookup: " + label);
    assert.doesNotThrow(() => names.parseAuthors(s), "names.parseAuthors: " + label);
    assert.doesNotThrow(() => names.classifyRow(s, owner), "names.classifyRow: " + label);
    assert.doesNotThrow(() => analysis.analyzeRow({ title: s, authorsText: s, venueText: s }, { owner, resolver, awards: index }), "analyzeRow: " + label);
    assert.doesNotThrow(() => names.suggestVariants([s, s], owner), "names.suggestVariants: " + label);
    assert.doesNotThrow(() => names.isShoutedInitials(s, owner.name), "names.isShoutedInitials: " + label);
    assert.doesNotThrow(() => names.leadingGroup(names.parseAuthors(s).tokens), "names.leadingGroup: " + label);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > 3000 * factor) slow.push(`${label}: ${Math.round(ms)} ms`);   // catastrophic backtracking is seconds to minutes, not tens of ms
  }
  assert.deepEqual(slow, [], "inputs that stall the page");
});

test("the year chart takes any year: far-past and far-future years are counted, never drawn, and cost no more than the window", () => {
  const years = [NaN, Infinity, -Infinity, 1e308, -1e308, -1e9, -5, 0, 1, "2020", null, undefined, 2.5, 2099, 1e15, 2020, 2021];
  const rows = years.map((y) => ({ year: y, role: "first", highlighted: true }));
  rows.push({ year: 2019, role: "middle", highlighted: true }, { year: 2018, role: "first", highlighted: false });   // (not counted: a middle author, not highlighted)
  const before = JSON.stringify(rows);
  const t0 = Date.now();
  const out = metrics.yearBars(rows, { now: 2026 });
  assert.ok(Date.now() - t0 < 2000 * slowdown(), `took ${Date.now() - t0} ms`);
  assert.equal(JSON.stringify(rows), before, "the rows are not changed");
  assert.deepEqual(out.bars.map((b) => [b.year, b.total]), [[2020, 1], [2021, 1]], "only the real years inside the window are drawn");
  assert.equal(out.older, 5, "the far past is counted as older, not drawn");
  const lone = metrics.yearBars([{ year: -1e9, role: "first", highlighted: true }], { now: 2026 });
  assert.deepEqual([lone.bars.length, lone.older], [1, 0], "a profile of one far-past paper draws that one bar (the panel shows a chart from two bars)");
});

test("a profile-sized batch of hostile rows stays fast", () => {
  const t0 = Date.now();
  const rows = Object.values(adversarial);
  for (let i = 0; i < 3; i++) for (const s of rows) resolver.resolve(s + i);
  assert.ok(Date.now() - t0 < 10000 * slowdown(), `took ${Date.now() - t0} ms`);
});

test("seeded random Scholar-like strings never throw", () => {
  const vocab = ["Proceedings", "of", "the", "IEEE", "ACM", "Conference", "on", "Computer", "Vision", "and", "Pattern", "Recognition", "Transactions", "Journal",
    "Symposium", "Workshop", "International", "Annual", "Joint", "SIGMOD", "SIGPLAN-SIGACT", "(CVPR)", "(OSDI", "2019", "'19", "12", "(3)", "1-10", "pp.", "…", "...", ",", ";", ":", "-", "–",
    "Oral", "Spotlight", "(Best Paper Award)", "[Highlight]", "arXiv", "preprint", "Ccs", "NDSS", "IEEE/ACM", "ACM/IEEE", "Trans.", "J.", "Findings", "Extended", "Abstracts", " ", "&", "é", "ß", "ł"];
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 24);
    const s = Array.from({ length: n }, () => pick(vocab)).join(pick([" ", " ", " ", ", ", "", "  "]));
    const a = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => pick(["J Doe", "A Smith", "B Lee", "…", "...", "K He", "Jane Doe†", "李明", "S. Chen"])).join(", ");
    assert.doesNotThrow(() => analysis.analyzeRow({ title: s, authorsText: a, venueText: s }, { owner, resolver, awards: index }), JSON.stringify(s));
  }
});

test("results are deterministic and never mutate shared state between calls", () => {
  const s = "Proceedings of the 2018 CHI Conference on Human Factors in Computing Systems …, 2018";
  const first = JSON.stringify(new venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases }).resolve(s));
  for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(resolver.resolve(s)), first);
  const m = marks.detect({ venue: "NeurIPS 2023 Oral" });
  assert.equal(JSON.stringify(marks.detect({ venue: "NeurIPS 2023 Oral" })), JSON.stringify(m));
  assert.equal(JSON.stringify(marks.detect({ venue: "NeurIPS 2023 Oral" })), JSON.stringify(m), "the shared /g regexes are reset between calls");
});

test("a hostile profile name — a long run of white space or brackets, as an owner can put in the header — is read at once", () => {
  const row = "J Smith, Jane Doe, K Lee, " + "A B, ".repeat(100);
  const t0 = Date.now();
  for (const name of ["Jane " + "﻿".repeat(5000) + "Doe", "(".repeat(5000), "[".repeat(5000), "Jane ".repeat(2000) + "PhD", " ".repeat(20000) + "Jane Doe"]) {
    const hostile = { name, alternates: [] };
    assert.doesNotThrow(() => names.classifyRow(row, hostile), name.slice(0, 12));
    assert.doesNotThrow(() => names.suggestVariants([row, row], hostile), name.slice(0, 12));
    assert.doesNotThrow(() => names.isShoutedInitials("JA DOE", name), name.slice(0, 12));
  }
  assert.ok(Date.now() - t0 < 1500 * slowdown(), `took ${Date.now() - t0} ms`);
  assert.equal(names.classifyRow("J Smith, Jane Doe", { name: "Jane ﻿﻿Doe", alternates: [] }).role, "last", "and the name it prints is still the owner's");
});

test("the author lists of a large collaboration (thousands of authors in a paper) are read in a few seconds for a hundred papers", () => {
  const authors = Array.from({ length: 3000 }, (_, i) => `${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + (i % 7))} Surname${i}`).join(", ");
  const spellings = { name: "Jane Doe", alternates: ["Doe Jane", "J Doe"] };
  const t0 = Date.now();
  for (let r = 0; r < 100; r++) names.classifyRow(authors, spellings);
  names.suggestVariants(Array(100).fill(authors), spellings);
  assert.ok(Date.now() - t0 < 4000 * slowdown(), `took ${Date.now() - t0} ms`);
});

test("a very long venue or title is cut before the scans that would be quadratic in it", () => {
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) {
    venues.prepare(",".repeat(20000) + " Nature");
    venues.prepare("-".repeat(20000) + " Nature");
    marks.detect({ venue: "oral ".repeat(4000), title: "best paper award ".repeat(2000) });
  }
  assert.ok(Date.now() - t0 < 1000 * slowdown(), `took ${Date.now() - t0} ms`);
});

test("hostile titles, authors, venues and addresses go through every export format without a way out of its syntax", () => {
  const formats = require("../src/lib/formats.js");
  let s = 4242;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const pick = (a) => a[Math.floor(r() * a.length)];
  const ATOMS = ["<script>alert(1)</script>", "</td><td>", "\"onmouseover=\"x\"", "'", "<b>", "&amp;", "&#60;", "=HYPERLINK(\"u\",\"x\")", "+1", "-1", "@SUM(A1)", "\t", "\n", "\r\n", "‮", "\u0000", "{", "}", "\\", "%", "$", "#", "_", "^", "~", "javascript:alert(1)",
    "https://evil.example/?a=b&c=d", "[x](http://y)", "`", "*", "|", "<img src=x onerror=alert(1)>", "]]>", "--!>", "<!--", "J Smith", "Jane Doe", "…"];
  const junk = () => Array.from({ length: Math.floor(r() * 5) }, () => pick(ATOMS)).join(pick(["", " ", ", "]));
  const paper = () => ({ id: junk(), title: junk(), authors: pick([junk(), "A B, Jane Doe, C D", "=cmd|' /C calc'!A0, Jane Doe"]), me: pick(["", "Jane Doe", junk()]), venue: junk(), year: pick([2020, null, "<x>"]), citations: pick([0, 5, "1e3"]),
    role: pick(["first", "last", "middle", null]), status: pick(["found", "hidden", "absent"]), highlighted: true, type: pick([null, "conference", "journal"]),
    rank: { ccf: pick([null, { tier: "A", name: junk() }]), core: pick([null, { rank: "A*", name: junk() }]) }, marks: [junk()], url: pick(["", "https://scholar.google.com/x?a=1&b=2", "javascript:alert(1)", junk(), "https://x.org/{a}}\\"]) });
  const labels = { year: "Year", title: "Title", authors: "Authors", role: "Role", venue: "Venue", ccf: "CCF", core: "CORE", awards: "Awards", citations: "Cited", hidden: "Hidden", roles: { first: "First", cofirst: "Co", second: "Second", last: "Last", middle: "Other" } };
  // what is left of a piece of HTML when its own tags (the table's, the paragraph's, an http link) are taken out must have no tag-like character: every text was escaped
  const ownTags = /<\/?(?:table|thead|tbody|tr|th|td|caption|p|b|i)(?: border="1" cellspacing="0" cellpadding="4"| style="margin:0 0 0\.6em 0\.5in;text-indent:-0\.5in")?>|<a href="https?:\/\/[^"<>]*">|<\/a>/g;
  for (let i = 0; i < 300; i++) {
    const ps = Array.from({ length: 1 + Math.floor(r() * 4) }, paper);
    const summary = metrics.summarize(ps.map((p) => ({ ...p, venue: p.rank, venueText: p.venue })), "ccf");
    for (const html of [formats.papersHtml(ps, { labels, markMe: true, ccfOn: true, coreOn: true }), formats.apaHtml(ps), formats.summaryHtml(summary, { scope: junk(), notes: [junk()] })]) {
      const rest = html.replace(ownTags, "");
      const at = rest.search(/[<>]/);
      assert.ok(at < 0, "a tag-like character got out: " + JSON.stringify(rest.slice(Math.max(0, at - 40), at + 40)) + " in " + JSON.stringify(html.slice(0, 300)));
    }
    for (const line of formats.papersTsv(ps, { labels }).split("\n").slice(1)) for (const cell of line.split("\t")) {
      const c = cell.replace(/^"/, "");
      assert.ok(!/^[=+\-@]/.test(c) || /^[+-]?\d+(?:[.,]\d+)?$/.test(c), "a formula cell: " + cell.slice(0, 40));
    }
    const bib = formats.bibtex(ps, {});
    let depth = 0;
    for (const ch of bib) { if (ch === "{") depth++; if (ch === "}") depth--; assert.ok(depth >= 0, "BibTeX closes more than it opens: " + bib.slice(0, 160)); }
    assert.equal(depth, 0, "BibTeX braces are balanced");
    assert.equal((bib.match(/^@/gm) || []).length, ps.length, "one entry for each paper, whatever a title says");
    for (const f of [() => formats.papersCsv(ps, { labels }), () => formats.markdown(ps, {}), () => formats.apa(ps), () => formats.json({ owner: junk(), papers: ps }), () => formats.summaryText(summary, { owner: junk(), scope: junk(), notes: [junk()] }), () => formats.summaryTsv(summary, { scope: junk() })]) assert.doesNotThrow(f);
  }
});
