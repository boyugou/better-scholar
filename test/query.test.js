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
  assert.deepEqual(query.parse("deep Learning"), { terms: [{ kind: "text", text: "deep" }, { kind: "text", text: "learning" }], errors: [], problems: [] });
  assert.deepEqual(query.parse("  cites:>100  year:2020 ").terms, [{ kind: "cites", op: ">", n: 100 }, { kind: "year", op: "=", n: 2020 }]);
  assert.deepEqual(query.parse("cites:>=5 cites:<=9 cites:<1 cites:=3").terms.map((t) => t.op + t.n), [">=5", "<=9", "<1", "=3"]);
  assert.deepEqual(query.parse("CCF:A core:A* role:Cofirst has:AWARD").terms, [{ kind: "ccf", values: ["a"] }, { kind: "core", values: ["a*"] }, { kind: "role", values: ["cofirst"] }, { kind: "has", values: ["award"] }]);
  // not an operator: a word like any other
  assert.deepEqual(query.parse("http://x.org foo:bar >100 :x").terms.map((t) => t.kind + ":" + t.text), ["text:http://x.org", "text:foo:bar", "text:>100", "text::x"]);
  // an operator with a value it does not take matches nothing and says why
  const bad = query.parse("ccf:x cites:lots role:fir year:20x has:");
  assert.deepEqual(bad.terms.map((t) => t.kind), ["never", "never", "never", "never", "never"]);
  assert.equal(bad.errors.length, 5);
  assert.match(bad.errors[0], /^ccf:x — the venue's CCF rank: a, b or c$/);
  for (const empty of ["", "   ", null, undefined]) assert.deepEqual(query.parse(empty), { terms: [], errors: [], problems: [] });
});

test("the operators' table: each example and suggestion is a valid term, and says what it does", () => {
  assert.equal(new Set(query.OPERATORS.map((o) => o.name)).size, query.OPERATORS.length);
  for (const o of query.OPERATORS) {
    assert.ok(o.doc.length > 20 && o.example.startsWith(o.name + ":"), o.name);
    for (const ex of [o.example, ...o.suggest]) {
      const r = query.parse(ex);
      assert.deepEqual([r.errors, r.terms.map((t) => (o.field ? t.kind + ":" + t.field : t.kind))], [[], [o.field ? "text:" + o.name : o.name]], ex);
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

test("matching: type: with the real resolver — a venue only CORE ranks is a conference; with CCF off the kind still comes from CORE; a CCF journal is a journal", () => {
  const venues = require("../src/lib/venues.js"), ccf = require("../src/data/ccf.js"), core = require("../src/data/core.js"), aliases = require("../src/data/aliases.js");
  const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
  const row = (venueText) => ({ raw: { title: "t", authorsText: "A B", venueText, citations: 1, year: 2020 }, a: { status: "found", role: "first", year: 2020, venue: resolver.resolve(venueText), marks: [] }, shown: 1 });
  const lrec = row("International Conference on Language Resources and Evaluation, 2020");
  assert.ok(lrec.a.venue.core && !lrec.a.venue.ccf, "LREC is on CORE's list only");
  assert.equal(analysis.queryMatcher("type:conference").test(lrec), true, "a venue only CORE ranks is a conference");
  assert.equal(analysis.queryMatcher("type:journal").test(lrec), false);
  const cvpr = row("Proceedings of the IEEE conference on computer vision and pattern recognition, 2016");
  assert.equal(analysis.queryMatcher("type:conference", () => [], { ccf: false, core: true }).test(cvpr), true, "CCF is off: CORE says conference");
  const tpami = row("IEEE Transactions on Pattern Analysis and Machine Intelligence 33 (5), 867-880, 2011");
  assert.equal(analysis.queryMatcher("type:journal").test(tpami), true);
  assert.equal(analysis.queryMatcher("type:journal", () => [], { ccf: false, core: true }).test(tpami), false, "CCF is off and CORE has no journals: no kind");
});

test("age: how old a paper is in years, this year being 0: age:<5 is the last five years and stays true as the years go by", () => {
  assert.deepEqual(query.parse("age:<5").terms, [{ kind: "age", op: "<", n: 5 }]);
  const parsed = query.parse("age:<5");
  const at = (year, now) => query.matches(parsed, { text: [], year, citations: 0, role: "", ccf: null, core: null, type: null, award: false, talk: false }, now);
  assert.deepEqual([2026, 2025, 2022, 2021, 2020].map((y) => at(y, 2026)), [true, true, true, false, false], "this year and the four before it");
  assert.deepEqual([2031, 2030, 2027, 2026].map((y) => at(y, 2031)), [true, true, true, false], "five years later the same query is five years later");
  assert.equal(at(2030, 2026), true, "a paper dated after this year is not old");
  assert.equal(at(null, 2026), false, "no year, no age");
  assert.deepEqual([query.parse("age:0").terms, query.parse("age:>=10").terms], [[{ kind: "age", op: "=", n: 0 }], [{ kind: "age", op: ">=", n: 10 }]]);
  assert.equal(query.parse("age:old").errors.length, 1, "a value that is no number says so");
  // through the page's own matcher, with the real clock
  const thisYear = new Date().getFullYear();
  assert.equal(analysis.queryMatcher("age:<5").test({ ...paper, a: { ...paper.a, year: thisYear - 4 } }), true);
  assert.equal(analysis.queryMatcher("age:<5").test({ ...paper, a: { ...paper.a, year: thisYear - 5 } }), false);
});

test("the matcher keeps a row's answer while its analysis and its citations are the same, and asks again when either changes", () => {
  const m = analysis.queryMatcher("cites:>100 year:>=2010");
  const row = { raw: paper.raw, a: paper.a, shown: 50 };
  assert.equal(m.test(row), false);
  assert.equal(m.test(row), false, "asked twice: the same");
  row.shown = 500;
  assert.equal(m.test(row), true, "the citations are another number now (a merge of duplicates)");
  row.a = { ...paper.a, year: 2001 };
  assert.equal(m.test(row), false, "a new analysis of the row (another year)");
  const lower = analysis.queryMatcher("residual learning");
  assert.equal(lower.test({ raw: { ...paper.raw }, a: paper.a, shown: 1 }), true, "the text is read in lower case once for each row, and found in any case");
  assert.equal(lower.test({ raw: { ...paper.raw, title: "Attention" }, a: paper.a, shown: 1 }), false, "another row, another text");
});

test("the search finds a co-author of the whole list once it has been read, not only the names of the line the page cut", () => {
  const cut = { raw: { ...paper.raw, authorsText: "K He, X Zhang, …" }, a: { ...paper.a, fromDetail: false, tokens: [{ name: "K He" }, { name: "X Zhang" }] }, shown: 1 };
  assert.equal(analysis.queryMatcher("sun").test(cut), false, "the line the page printed has no Sun");
  const full = { raw: cut.raw, a: { ...paper.a, fromDetail: true, tokens: [{ name: "K He" }, { name: "X Zhang" }, { name: "S Ren" }, { name: "J Sun" }] }, shown: 1 };
  assert.equal(analysis.queryMatcher("sun").test(full), true, "the whole list does");
  assert.equal(analysis.queryMatcher("zhang ren").test(full), true);
  assert.equal(analysis.queryMatcher("zhang").test(cut), true, "and the cut line still finds what it has");
});

test("a comma lists values of an operator: any of them; separate words must all hold; one still typing has the values it has", () => {
  assert.deepEqual(query.parse("role:first,last ccf:a,b has:award,talk").terms, [{ kind: "role", values: ["first", "last"] }, { kind: "ccf", values: ["a", "b"] }, { kind: "has", values: ["award", "talk"] }]);
  assert.deepEqual(query.parse("role:first,").terms, [{ kind: "role", values: ["first"] }], "a trailing comma, while typing");
  assert.deepEqual(query.parse("role:first,first,Last").terms, [{ kind: "role", values: ["first", "last"] }], "the same value twice is one");
  const bad = query.parse("role:first,nope ccf: ccf:,");
  assert.deepEqual(bad.terms.map((t) => t.kind), ["never", "never", "never"], "one value it does not take, or none, and the word finds nothing");
  assert.match(bad.errors[0], /^role:first,nope — your position/);
  const row = (role, ccf, extra = {}) => ({ raw: paper.raw, a: { ...paper.a, role, venue: { ccf: ccf ? { tier: ccf } : null, core: null }, marks: [], ...extra }, shown: 1 });
  const m = (q) => analysis.queryMatcher(q);
  assert.deepEqual(["first", "last", "second", "middle"].map((r) => m("role:first,last").test(row(r, "A"))), [true, true, false, false]);
  assert.deepEqual(["A", "B", "C", null].map((t) => m("ccf:a,b").test(row("first", t))), [true, true, false, false]);
  assert.equal(m("role:first,last ccf:a").test(row("last", "B")), false, "separate words must all hold");
  assert.equal(m("role:first role:last").test(row("first", "A")), false, "nothing is both a first and a last author: two words ask for both");
  assert.equal(m("has:award,talk").test({ ...row("first", "A"), a: { ...paper.a, marks: [{ kind: "spotlight", group: "spotlight", label: "Spotlight", text: "" }] } }), true, "any of award or talk");
  assert.equal(m("type:conference,journal").test(row("first", "A", { venue: { ccf: { tier: "A", kind: "J" }, core: null } })), true);
});

test("a quick filter is one operator:value in the query; beside another of its operator it joins the word, and takes itself out of it again", () => {
  let q = "";
  const steps = [["role:first", "role:first"], ["role:last", "role:first,last"], ["ccf:a", "role:first,last ccf:a"], ["role:first", "role:last ccf:a"], ["cites:>100", "role:last ccf:a cites:>100"], ["ccf:b", "role:last ccf:a,b cites:>100"],
    ["role:last", "ccf:a,b cites:>100"], ["cites:>100", "ccf:a,b"], ["ccf:a", "ccf:b"], ["ccf:b", ""]];
  for (const [op, want] of steps) { q = query.toggleValue(q, op); assert.equal(q, want, op); }
  assert.deepEqual(["role:first,last", "ROLE:First"].map((w) => query.hasValue(w, "role:first")), [true, true]);
  assert.equal(query.hasValue("role:first,last", "role:second"), false);
  assert.equal(query.hasValue("cites:>100 foo", "cites:>100"), true);
  assert.equal(query.hasValue("cites:>1000", "cites:>100"), false, "a comparison is a word of its own: no part of it is a value");
  assert.equal(query.toggleValue("role:first role:last", "role:last"), "role:first", "two words the person typed: the one that has the value gives it up");
  assert.equal(query.toggleValue("deep role:first,", "role:last"), "deep role:first,last", "a trailing comma is not doubled");
  assert.equal(query.keepOnly("Role:First,Cofirst ccf:a,b foo cites:>100 role:last", new Set(["role:first", "role:last", "ccf:a", "cites:>100"])), "role:first ccf:a cites:>100 role:last", "with no box: the quick filters stay, the rest goes");
  assert.equal(query.keepOnly("foo bar", new Set(["role:first"])), "");
});

test("a quick filter is found in the query whatever the case it was typed in; the search finds the line the page printed and the whole list that was read", () => {
  assert.equal(query.hasValue("Age:<5 foo", "age:<5"), true);
  assert.equal(query.toggleValue("Age:<5 foo", "age:<5"), "foo", "pressed again, it goes: it is not added a second time");
  assert.equal(query.hasValue("CITES:>100", "cites:>100"), true);
  // the page prints "MF Kaashoek"; the paper's own page spells the name out
  const read = { raw: { ...paper.raw, authorsText: "I Stoica, R Morris, MF Kaashoek, …" }, a: { ...paper.a, fromDetail: true, tokens: [{ name: "Ion Stoica" }, { name: "Robert Morris" }, { name: "M Frans Kaashoek" }, { name: "Hari Balakrishnan" }] }, shown: 1 };
  assert.equal(analysis.queryMatcher("mf kaashoek").test(read), true, "the line, as the page printed it");
  assert.equal(analysis.queryMatcher("frans balakrishnan").test(read), true, "and the names of the whole list");
});

test("quick filters pressed in any order, and released again, give the query that selects what they say: any of the values of one operator, all of the others; a word typed twice is released at once", () => {
  let seed = 777;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const OPS = ["role:first", "role:last", "role:cofirst", "role:second", "ccf:a", "ccf:b", "ccf:c", "core:a*", "core:a", "has:award", "has:talk", "type:journal", "type:conference", "cites:>100", "age:<5", "year:>2020"];
  const NOW = 2026;
  const rows = Array.from({ length: 150 }, () => ({
    text: ["a paper"], year: rnd() < 0.1 ? null : 2000 + Math.floor(rnd() * 27), citations: Math.floor(rnd() * 300), role: pick(["first", "cofirst", "second", "last", "middle", ""]),
    ccf: pick([null, "a", "b", "c"]), core: pick([null, "a*", "a", "b", "c"]), type: pick([null, "conference", "journal"]), award: rnd() < 0.2, talk: rnd() < 0.2
  }));
  const holds = (op, r) => {
    const at = op.indexOf(":"), name = op.slice(0, at), v = op.slice(at + 1);
    return { role: r.role === v, ccf: r.ccf === v, core: r.core === v, type: r.type === v, has: v === "award" ? r.award : r.talk, cites: r.citations > 100, age: r.year != null && NOW - r.year < 5, year: r.year != null && r.year > 2020 }[name];
  };
  for (let i = 0; i < 400; i++) {
    let q = "";
    const pressed = new Set();
    for (let k = 0, n = 1 + Math.floor(rnd() * 9); k < n; k++) { const op = pick(OPS); q = query.toggleValue(q, op); if (!pressed.delete(op)) pressed.add(op); }
    for (const op of OPS) assert.equal(query.hasValue(q, op), pressed.has(op), `${q} / ${op}`);
    const parsed = query.parse(q);
    assert.deepEqual(parsed.errors, [], q);
    const groups = new Map();
    for (const op of pressed) { const name = op.slice(0, op.indexOf(":")); groups.set(name, [...(groups.get(name) || []), op]); }
    for (const r of rows) {
      let want = true;
      for (const [name, ops] of groups) want = want && (query.LISTED.has(name) ? ops.some((o) => holds(o, r)) : ops.every((o) => holds(o, r)));
      assert.equal(query.matches(parsed, r, NOW), want, `${q} / ${JSON.stringify(r)}`);
    }
  }
  // the same word typed twice goes with one press
  assert.equal(query.toggleValue("ccf:a  ccf:a", "ccf:a"), "");
  assert.equal(query.toggleValue("role:last foo role:First,LAST", "role:last"), "foo role:first");
  assert.equal(query.toggleValue("AGE:<5 age:<5", "age:<5"), "");
});

test("a quick filter of your own: its words go in whole and must all be there to be pressed; a built-in button that joins one leaves it unpressed", () => {
  assert.deepEqual(query.searchParts("ccf:a  Role:First,last age:<5 Transformer ccf:a"), ["ccf:a", "role:first,last", "age:<5", "transformer"], "its words, once each, in lower case");
  assert.equal(query.hasAll("", "ccf:a role:first"), false);
  assert.equal(query.hasAll("x", "   "), false, "no words: never pressed");
  // (two words of one listed operator stay two: both must hold — joined they would be "either")
  assert.equal(query.toggleAll("", "has:award has:talk"), "has:award has:talk");
  const both = query.parse(query.toggleAll("", "has:award has:talk")), only = { text: [], year: 2020, citations: 0, role: "first", ccf: null, core: null, type: null, award: true, talk: false };
  assert.equal(query.matches(both, only), false, "a paper with an award and no talk is not one of them");
  let q = query.toggleAll("", "ccf:a role:first age:<5");
  assert.equal(q, "ccf:a role:first age:<5");
  assert.equal(query.hasAll(q, "ccf:a role:first age:<5"), true);
  q = query.toggleValue(q, "role:last");                                                  // (the built-in Last joins its word: the search is no longer the filter's)
  assert.equal(q, "ccf:a role:first,last age:<5");
  assert.equal(query.hasAll(q, "ccf:a role:first age:<5"), false, "unpressed: its words no longer describe the search");
  assert.equal(query.toggleAll(q, "ccf:a role:first age:<5"), "ccf:a age:<5 role:first", "pressed again: its words, in place of the other word of their listed operator");
  assert.equal(query.toggleAll("ccf:a role:first age:<5 x", "ccf:a role:first age:<5"), "x", "pressed: its words go, the rest stays");
  assert.equal(query.toggleAll("deep learning ccf:a", "ccf:a role:first"), "deep learning ccf:a role:first", "half there: the rest is put in, nothing twice");
  assert.equal(query.toggleAll("Deep CCF:A role:first", "ccf:a role:first deep"), "", "whatever the case it was typed in");
  assert.equal(query.toggleAll("role:first", "role:first,last"), "role:first,last", "a word of two values is one word, in place of the operator's other word");
  // (a built-in button of the same operator: the last click decides, whatever the order, and no button stands pressed for a value the search does not take)
  for (const [first, then, want] of [[(s) => query.toggleValue(s, "role:first"), (s) => query.toggleAll(s, "ccf:a role:last"), "ccf:a role:last"],
    [(s) => query.toggleAll(s, "ccf:a role:last"), (s) => query.toggleValue(s, "role:first"), "ccf:a role:last,first"]]) {
    const out = then(first(""));
    assert.equal(out, want);
    const p = query.parse(out), paper = (role) => ({ text: [], year: 2020, citations: 0, role, ccf: "a", core: null, type: null, award: false, talk: false });
    for (const role of ["first", "last"]) if (query.hasValue(out, "role:" + role)) assert.equal(query.matches(p, paper(role)), true, `${out}: role:${role} is pressed, so its papers are found`);
  }
  assert.equal(query.toggleAll("role:first,last", "role:first"), "role:first", "Last is not left pressed beside a word that decides first");
  assert.equal(query.toggleAll("role:middle cites:>10", "role:first cites:>100"), "cites:>10 role:first cites:>100", "only a listed operator's words give way: a comparison is a word of its own");
  // one word in one form: the values of a listed word in any order, once each, any case
  assert.deepEqual(query.searchParts("Role:Last,first,first, CCF:A"), ["role:first,last", "ccf:a"]);
  let r = query.toggleAll("", "role:first,last");
  r = query.toggleValue(query.toggleValue(r, "role:last"), "role:last");          // (Last off and on again: the word is now written "role:first,last" or "role:last,first")
  assert.equal(query.hasAll(r, "role:first,last"), true, "the same word in another order: still pressed");
  assert.equal(query.toggleAll("role:last,first deep", "role:first,last"), "deep", "and taken out as it is");
  // has: a paper can have both, so a filter's has-word joins the others instead of replacing them
  assert.equal(query.toggleAll("has:talk deep", "has:award"), "has:talk deep has:award");
  assert.equal(query.toggleAll(query.toggleAll("", "has:award"), "has:talk"), "has:award has:talk", "two filters of has: both hold");
  // pressed twice: unpressed; pressed again: pressed — for every kind of word
  for (const w of ["ccf:a role:first", "role:first,last", "has:award has:talk", "type:journal age:<5 deep", "role:first role:last"]) {
    for (const start of ["", "role:last ccf:b", "has:talk", "Deep TYPE:conference"]) {
      const on = query.toggleAll(start, w), off = query.toggleAll(on, w);
      assert.deepEqual([query.hasAll(on, w), query.hasAll(off, w), query.hasAll(query.toggleAll(off, w), w)], [true, false, true], `${w} from "${start}"`);
    }
  }
  assert.equal(query.toggleAll("cites:>1000", "cites:>100"), "cites:>1000 cites:>100", "a comparison is its own word");
  // what stays with no search box: whole words of a filter, values of the built-in ones
  assert.equal(query.keepOnly("role:first,last has:talk foo", new Set(["role:first,last"])), "role:first,last");
  assert.equal(query.keepOnly("role:first,last has:talk", new Set(["role:first"])), "role:first");
});

test("what the search cannot read is said twice: in English for a script, and as { word, name } for the panel to say in its language", () => {
  const r = query.parse("deep ccf:d cites:abc role:first,boss");
  assert.deepEqual(r.problems, [{ word: "ccf:d", name: "ccf" }, { word: "cites:abc", name: "cites" }, { word: "role:first,boss", name: "role" }]);
  assert.equal(r.errors.length, 3);
  assert.match(r.errors[0], /^ccf:d — /, "the English, for the page calls and the agent guide");
  // (each listed operator says its values, which the panel names when one is wrong; each other one has an example)
  for (const op of query.OPERATORS) {
    if (query.LISTED.has(op.name)) assert.ok(op.values && op.values.every((v) => op.value.test(v)) && op.suggest.every((s) => op.values.includes(s.split(":")[1])), op.name);
    else assert.ok(!op.values && op.value.test(op.example.split(":")[1]), op.name);
  }
  assert.deepEqual(query.parse("ccf:a").problems, []);
});


test("a review of the search, 2026-10-29: words at the start of a word (short ones whole), accents and full width aside, lists past a space, phrases, NOT, OR, a field", () => {
  const row = (raw, a = {}) => ({ raw: { title: "", authorsText: "", venueText: "", citations: 1, year: 2020, ...raw }, a: { status: "found", role: "middle", year: 2020, venue: {}, marks: [], ...a }, shown: 1 });
  const hit = (q, r) => analysis.queryMatcher(q).test(r);
  // a short word is a whole word: "he" is the author He, not "the" or "Chen"; a longer one starts a word
  const he = row({ title: "The genome of Chen", authorsText: "X Chen, Y Shen" }), kaiming = row({ title: "Deep learning", authorsText: "K He, X Zhang" });
  assert.equal(hit("he", he), false);
  assert.equal(hit("he", kaiming), true);
  assert.equal(hit("ng", row({ title: "Learning to rank" })), false);
  assert.equal(hit("ng", row({ authorsText: "AY Ng, M Jordan" })), true);
  assert.equal(hit("learn", kaiming), true, "the start of a word");
  assert.equal(hit("earning", kaiming), false, "not its middle");
  assert.equal(hit("机器", row({ title: "深度机器学习" })), true, "a word in Chinese anywhere");
  // accents and the width of a Chinese input method's letters aside
  const dollar = row({ authorsText: "R Girshick, P Dollár" });
  assert.equal(hit("dollar", dollar), true);
  assert.equal(hit("Dollár", row({ authorsText: "P Dollar" })), true);
  assert.deepEqual(query.parse("ccf：a").terms, [{ kind: "ccf", values: ["a"] }]);
  assert.deepEqual(query.parse("ｒｏｌｅ:first，last").terms, [{ kind: "role", values: ["first", "last"] }]);
  // a listed operator's values go on past a space after the comma or the colon
  assert.deepEqual(query.parse("ccf:a, b").terms, [{ kind: "ccf", values: ["a", "b"] }]);
  assert.deepEqual(query.parse("role:first、last ccf:a،b").terms, [{ kind: "role", values: ["first", "last"] }, { kind: "ccf", values: ["a", "b"] }], "the ideographic and Arabic commas list values too");
  assert.deepEqual(query.parse("role: first, last deep").terms, [{ kind: "role", values: ["first", "last"] }, { kind: "text", text: "deep" }]);
  // a phrase, NOT, OR, and a field
  const crispr = row({ title: "A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity", authorsText: "M Jinek, K Chylinski, JA Doudna", venueText: "Science 337 (6096), 816-821, 2012" });
  const anti = row({ title: "Anti-CRISPR proteins and genome editing", authorsText: "A B, JA Doudna" });
  assert.equal(hit('"genome editing"', anti), true);
  assert.equal(hit('"editing genome"', anti), false);
  assert.equal(hit("-crispr", anti), false, "a word left out: the paper that has it is not found");
  assert.equal(hit("-crispr", crispr), true);
  assert.equal(hit("NOT crispr", anti), false);
  assert.equal(hit("-role:middle", crispr), false);
  assert.equal(hit("endonuclease OR crispr", anti), true);
  assert.equal(hit("endonuclease OR crispr", crispr), true);
  assert.equal(hit("endonuclease crispr", crispr), false, "without OR both must hold");
  assert.equal(hit("author:doudna", crispr), true);
  assert.equal(hit("title:doudna", crispr), false);
  assert.equal(hit("venue:science", crispr), true);
  assert.equal(hit("author:", crispr), true, "an empty field asks nothing (it is being typed)");
  // the paper page's own venue line, once read, is searched too (the profile's line may be cut)
  assert.equal(hit("language", row({ venueText: "Proceedings of the 2014 conference on empirical methods in natural …" }, { pageVenueText: "Proceedings of the 2014 Conference on Empirical Methods in Natural Language Processing (EMNLP)" })), true);
});

test("the quick filters read the search as the search reads it: a phrase, NOT, a minus and OR are units no button joins or presses; your own filter keeps them as typed", () => {
  // your own filter: what it puts in is the search it says, and it is then pressed
  for (const w of ["NOT survey", "-survey", "cas9 OR cas12a", "a OR b OR c", '"p q"', '"x y" "x z"', "NOT role:first", "ccf:a OR core:a*", 'role:first "deep learning" -survey']) {
    const q = query.toggleAll("", w);
    assert.deepEqual(query.parse(q).terms, query.parse(w).terms, w);
    assert.equal(query.hasAll(q, w), true, w);
    assert.equal(query.toggleAll(q, w), "", w + ": pressed again, it is taken out whole");
  }
  assert.equal(query.hasAll('"deep reinforcement learning"', '"deep learning"'), false, "a phrase is not the words of another phrase");
  assert.equal(query.hasAll("NOT survey x", "survey"), false, "a word left out is not the word");
  // a built-in button: a negated or OR'd operator is not its value, and it never joins one
  assert.equal(query.hasValue("NOT role:first", "role:first"), false);
  assert.equal(query.hasValue("-role:first", "role:first"), false);
  assert.equal(query.hasValue("role:first OR has:award", "role:first"), false);
  assert.equal(query.toggleValue("NOT role:first ccf:a", "role:first"), "NOT role:first ccf:a role:first", "the negation stays on its word");
  assert.equal(query.toggleValue("NOT role:last", "role:first"), "NOT role:last role:first");
  assert.equal(query.toggleValue("cas9 OR role:last", "role:first"), "cas9 OR role:last role:first", "an OR group is not widened");
  // the commas of the search: the ideographic, the Arabic and the full-width one, and a full-width operator
  assert.equal(query.hasValue("role:first、last", "role:last"), true);
  assert.equal(query.toggleValue("role:first、last", "role:last"), "role:first");
  assert.equal(query.hasValue("ｒｏｌｅ：ｆｉｒｓｔ", "role:first"), true);
  assert.equal(query.toggleValue("role:first, last", "role:last"), "role:first", "values past a space are one word");
  // with no search box, what stays: a negated or OR'd word goes (it is no button), your own filter stays as typed
  assert.equal(query.keepOnly("NOT role:first", new Set(["role:first"])), "");
  assert.equal(query.keepOnly("role:first OR has:award", new Set(["role:first", "has:award"])), "");
  assert.equal(query.keepOnly("cas9 OR cas12a deep", new Set(query.searchParts("cas9 OR cas12a"))), "cas9 OR cas12a");
});

test("a second read of the search, 2026-10-30: a word joined to Chinese or Japanese text, a field's quoted value, a comma before a word that is no value, full-width OR, a dangling NOT", () => {
  const hit = (q, title, authorsText = "") => analysis.queryMatcher(q).test({ raw: { title, authorsText, venueText: "", citations: 1, year: 2020 }, a: { status: "found", role: "middle", year: 2020, venue: {}, marks: [] }, shown: 1 });
  for (const [q, t] of [["bert", "基于BERT的文本分类"], ["5g", "面向5G网络的调度"], ["yolov5", "基于YOLOv5的检测"], ["gpu", "深層学習のためのGPU実装"], ["ai", "基于AI的诊断"], ["title:bert", "基于BERT的文本分类"]]) assert.equal(hit(q, t), true, q + " in " + t);
  assert.equal(hit("-bert", "基于BERT的文本分类"), false);
  assert.equal(hit("he", "the paper"), false, "a short word is still whole among Latin letters");
  assert.equal(hit('author:"GE Hinton"', "T", "A Krizhevsky, I Sutskever, GE Hinton"), true);
  assert.equal(hit('-author:"hinton"', "T", "GE Hinton"), false);
  assert.deepEqual(query.parse('title:"deep convolutional"').terms, [{ kind: "text", text: "deep convolutional", field: "title" }]);
  assert.deepEqual(query.parse("role:first, transformer").terms, [{ kind: "role", values: ["first"] }, { kind: "text", text: "transformer" }], "a word that is no value is a word");
  assert.equal(query.hasValue("role:first ＯＲ has:award", "role:first"), false, "full-width OR is OR for the buttons too");
  assert.equal(query.toggleValue("deep NOT", "role:first"), "deep role:first NOT", "a button's word goes before a NOT still waiting for its word");
});

test("a third read, 2026-10-30: a word of commas alone goes on with the operator's values", () => {
  assert.deepEqual(query.parse("role: , first").terms, [{ kind: "role", values: ["first"] }]);
});
