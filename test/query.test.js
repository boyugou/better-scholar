"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const query = require("../src/lib/query.js");
const analysis = require("../src/lib/analysis.js");

// a row of the page's list: what the page read ({ raw }), what the analysis made of it ({ a }), the citations counted ({ shown })
const paper = {
  raw: {
    title: "Deep Residual Learning for Image Recognition",
    authorsText: "K He, X Zhang, S Ren, J Sun",
    venueText: "Proceedings of the IEEE conference on computer vision and pattern recognition, 2016",
    citations: 180000,
    year: 2016
  },
  a: {
    status: "found", role: "first", year: 2016,
    venue: {
      ccf: { tier: "A", abbr: "CVPR", name: "IEEE Conference on Computer Vision and Pattern Recognition" },
      core: { rank: "A*", abbr: "CVPR", name: "IEEE Conference on Computer Vision and Pattern Recognition" }
    },
    marks: [{ kind: "best", group: "award", label: "Best Paper Award", text: "CVPR 2016 Best Paper Award" }]
  },
  shown: 180000
};
const talk = { ...paper, a: { ...paper.a, role: "last", marks: [{ kind: "spotlight", group: "spotlight", label: "Spotlight", text: "" }], venue: { ccf: null, core: { rank: "B", abbr: "ABC", name: "A B C" } } }, shown: 12 };
const test_ = (q, row = paper) => analysis.queryMatcher(q).test(row);

test("parse: words, operators, and what an operator with a wrong value does", () => {
  assert.deepEqual(query.parse("deep Learning"), { terms: [{ kind: "text", text: "deep" }, { kind: "text", text: "learning" }], errors: [] });
  assert.deepEqual(query.parse("  cites:>100  year:2020 ").terms, [{ kind: "cites", op: ">", n: 100 }, { kind: "year", op: "=", n: 2020 }]);
  assert.deepEqual(query.parse("cites:>=5 cites:<=9 cites:<1 cites:=3").terms.map((t) => t.op + t.n), [">=5", "<=9", "<1", "=3"]);
  assert.deepEqual(query.parse("CCF:A core:A* role:Cofirst has:AWARD").terms, [{ kind: "ccf", value: "a" }, { kind: "core", value: "a*" }, { kind: "role", value: "cofirst" }, { kind: "has", value: "award" }]);
  // not an operator: a word like any other
  assert.deepEqual(query.parse("http://x.org foo:bar >100 :x").terms.map((t) => t.kind + ":" + t.text), ["text:http://x.org", "text:foo:bar", "text:>100", "text::x"]);
  // an operator with a value it does not take matches nothing and says why
  const bad = query.parse("ccf:x cites:lots role:fir year:20x has:");
  assert.deepEqual(bad.terms.map((t) => t.kind), ["never", "never", "never", "never", "never"]);
  assert.equal(bad.errors.length, 5);
  assert.match(bad.errors[0], /^ccf:x — the venue's CCF rank: a, b or c$/);
  for (const empty of ["", "   ", null, undefined]) assert.deepEqual(query.parse(empty), { terms: [], errors: [] });
});

test("the operators' table: each example and suggestion is a valid term, and says what it does", () => {
  assert.equal(new Set(query.OPERATORS.map((o) => o.name)).size, query.OPERATORS.length);
  for (const o of query.OPERATORS) {
    assert.ok(o.doc.length > 20 && o.example.startsWith(o.name + ":"), o.name);
    for (const ex of [o.example, ...o.suggest]) {
      const r = query.parse(ex);
      assert.deepEqual([r.errors, r.terms.map((t) => t.kind)], [[], [o.name]], ex);
    }
  }
});

test("the common suggestions are suggestions of the operators", () => {
  const all = new Set(query.OPERATORS.flatMap((o) => o.suggest));
  for (const op of query.POPULAR) assert.ok(all.has(op), op);
  assert.equal(new Set(query.POPULAR).size, query.POPULAR.length);
});

test("matching: empty queries match all rows; words are all needed and look into every field", () => {
  for (const q of ["", "   ", null, undefined]) assert.equal(test_(q), true);
  for (const q of ["residual", "He", "CVPR", "Computer Vision", "2016", "first", "best paper", "recognition cvpr", "He CVPR 2016", "residual CVPR Best"]) assert.equal(test_(q), true, q);
  for (const q of ["Kaiming", "He NeurIPS", "residual 2024", "2015", "last"]) assert.equal(test_(q), false, q);
  assert.equal(test_("spotlight", talk), true, "the marks are looked into");
  assert.equal(test_("abc", talk), true, "so is the other list's venue name");
});

test("matching: citations and years compare with an operator; a number alone is a word", () => {
  for (const q of ["cites:>1000", "cites:>=180000", "cites:<200000", "cites:<=180000", "cites:180000", "year:>2010", "year:>=2016", "year:2016", "year:<2020"]) assert.equal(test_(q), true, q);
  for (const q of ["cites:>180000", "cites:<100", "cites:5", "year:>2016", "year:<2015", "year:2017"]) assert.equal(test_(q), false, q);
  assert.equal(test_(">1000"), false, "no shorthand: '>1000' is a word, and no title has it");
  assert.equal(test_("cites:>2000"), true, "a citation count that looks like a year is a count");
  assert.equal(test_("year:>1999", { ...paper, a: { ...paper.a, year: null } }), false, "no year: not after any");
});

test("matching: ranks, roles, awards and talks", () => {
  for (const q of ["ccf:a", "core:a*", "role:first", "has:award"]) assert.equal(test_(q), true, q);
  for (const q of ["ccf:b", "core:a", "role:last", "role:middle", "has:talk"]) assert.equal(test_(q), false, q);
  assert.equal(test_("ccf:a", talk), false, "no CCF rank");
  assert.equal(test_("core:b role:last has:talk", talk), true);
  assert.equal(test_("has:award", talk), false);
  assert.equal(test_("ccf:a role:first cites:>1000 year:>2015 has:award CVPR"), true);
  assert.equal(test_("ccf:a role:first cites:>200000"), false);
  assert.equal(test_("ccf:a role:last cites:>1000"), false);
});

test("matching: only the marks the settings leave on count; an operator that does not parse finds nothing", () => {
  const off = analysis.queryMatcher("has:award", () => []);
  assert.equal(off.test(paper), false);
  assert.equal(analysis.queryMatcher("best", () => []).test(paper), false, "nor does a word match a mark that is switched off");
  const bad = analysis.queryMatcher("ccf:x cvpr");
  assert.equal(bad.test(paper), false);
  assert.equal(bad.errors.length, 1);
  assert.deepEqual([analysis.queryMatcher("").empty, analysis.queryMatcher("a").empty], [true, false]);
});

test("a hostile query is read quickly and cannot be made to run long", () => {
  const t0 = Date.now();
  for (const q of ["a".repeat(100000), "ccf:".repeat(20000), "cites:>".repeat(20000), " ".repeat(100000) + "x", "(".repeat(50000), "\u0000".repeat(20000)]) {
    const m = analysis.queryMatcher(q);
    m.test(paper);
  }
  assert.ok(Date.now() - t0 < 2000, "took " + (Date.now() - t0) + " ms");
  assert.equal(query.parse("a ".repeat(100000)).terms.length < 4100, true, "the query is cut at 8000 characters");
});

test("a ranking that is switched off is not searched", () => {
  assert.equal(analysis.queryMatcher("ccf:a", undefined, { ccf: false, core: true }).test(paper), false);
  assert.equal(analysis.queryMatcher("core:a*", undefined, { ccf: false, core: true }).test(paper), true);
  assert.equal(analysis.queryMatcher("CVPR", undefined, { ccf: false, core: false }).test(paper), true, "the venue's text is not a rank");
});

test("matching: type: the kind of venue the rank lists say it is; a venue without a rank has none; a list that is off does not tell it", () => {
  const conf = { ...paper, a: { ...paper.a, venue: { ccf: { kind: "C", tier: "A", abbr: "CVPR", name: "CVPR" }, core: { kind: "C", rank: "A*", abbr: "CVPR", name: "CVPR" } } } };
  const jour = { ...paper, a: { ...paper.a, venue: { ccf: { kind: "J", tier: "A", abbr: "TPAMI", name: "IEEE Transactions on Pattern Analysis and Machine Intelligence" }, core: null } } };
  const none = { ...paper, a: { ...paper.a, venue: {} } };
  assert.deepEqual(["type:conference", "type:journal"].map((q) => test_(q, conf)), [true, false]);
  assert.deepEqual(["type:conference", "type:journal"].map((q) => test_(q, jour)), [false, true]);
  assert.deepEqual(["type:conference", "type:journal"].map((q) => test_(q, none)), [false, false]);
  assert.equal(analysis.queryMatcher("type:journal", () => [], { ccf: false, core: true }).test(jour), false, "CCF is off: its kind is not searched either");
  const bad = analysis.queryMatcher("type:book");
  assert.deepEqual([bad.test(conf), bad.errors.length], [false, 1]);
});
