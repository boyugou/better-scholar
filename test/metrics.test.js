"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../src/lib/metrics.js");

const paper = (role, ccfTier, extra = {}) => ({
  status: role ? "found" : "hidden",
  role,
  venue: { ccf: ccfTier ? { tier: ccfTier } : null, core: extra.core ? { rank: extra.core } : null },
  citations: extra.citations || 0,
  year: extra.year || 2020,
  highlighted: !!role && role !== "middle",
  venueText: extra.venueText || "",
  ...extra
});

test("hIndex / i10", () => {
  assert.equal(m.hIndex([10, 8, 5, 4, 3]), 4);
  assert.equal(m.hIndex([]), 0);
  assert.equal(m.hIndex([0, 0]), 0);
  assert.equal(m.hIndex([100]), 1);
  assert.equal(m.i10Index([10, 9, 11, 100]), 3);
});

test("citationMetrics splits highlighted from all", () => {
  const rows = [paper("first", "A", { citations: 50 }), paper("middle", "B", { citations: 5 }), paper("last", null, { citations: 12 })];
  const r = m.citationMetrics(rows);
  assert.deepEqual(r.highlighted, { papers: 2, citations: 62, h: 2, i10: 2 });
  assert.deepEqual(r.all, { papers: 3, citations: 67, h: 3, i10: 2 });
});

test("summarize: role x CCF tier matrix", () => {
  const rows = [
    paper("first", "A"), paper("first", "A"), paper("first", "B"), paper("first", null),
    paper("second", "C"), paper("last", "A"), paper("middle", "A"),
    paper(null, null),                        // hidden behind a truncated author list
    { status: "absent", role: null, venue: {}, citations: 0 }
  ];
  const s = m.summarize(rows, "ccf");
  assert.deepEqual(s.columns, ["A", "B", "C", "none"]);
  const get = (role) => s.rows.find((r) => r.role === role);
  assert.deepEqual([get("first").A, get("first").B, get("first").none, get("first").total], [2, 1, 1, 4]);
  assert.deepEqual([get("second").C, get("second").total], [1, 1]);
  assert.equal(get("last").A, 1);
  assert.equal(get("middle").total, 1);
  assert.equal(s.rows.find((r) => r.role === "cofirst"), undefined, "co-first row only when non-empty");
  assert.equal(s.hidden, 1);
  assert.equal(s.absent, 1);
  assert.equal(s.totals.total, 7);
  assert.equal(s.totals.A, 4);
  assert.equal(s.papers, 9);
});

test("summarize: CORE source uses A* / A / B / C", () => {
  const rows = [paper("first", "B", { core: "A*" }), paper("first", null, { core: "A" }), paper("last", "A")];
  const s = m.summarize(rows, "core");
  assert.deepEqual(s.columns, ["A*", "A", "B", "C", "none"]);
  const first = s.rows.find((r) => r.role === "first");
  assert.deepEqual([first["A*"], first.A, first.none], [1, 1, 0]);
  assert.equal(s.rows.find((r) => r.role === "last").none, 1);
});

test("inSelection filters by role, tier and the hidden bucket", () => {
  const p = paper("first", "A");
  assert.ok(m.inSelection(p, null));
  assert.ok(m.inSelection(p, { role: "first" }));
  assert.ok(m.inSelection(p, { role: "first", tier: "A" }));
  assert.ok(!m.inSelection(p, { role: "first", tier: "B" }));
  assert.ok(!m.inSelection(p, { role: "last" }));
  assert.ok(m.inSelection(p, { tier: "A" }));
  assert.ok(m.inSelection(paper(null, null), { role: "hidden" }));
  assert.ok(!m.inSelection(paper(null, null), { role: "first" }));
});

test("unmatchedVenues lists unplaced venues, ignoring preprints and secondary tracks", () => {
  const rows = [
    paper("first", null, { venueText: "Some Obscure Journal 4 (2), 1-9" }),
    paper("first", null, { venueText: "Some Obscure Journal 4 (2), 1-9" }),
    paper("first", null, { venueText: "arXiv preprint arXiv:1234.5678" }),
    paper("first", null, { venueText: "NeurIPS Workshop on X", venue: { secondary: "workshop" } }),
    paper("first", "A", { venueText: "CVPR" })
  ];
  assert.deepEqual(m.unmatchedVenues(rows), [{ venue: "Some Obscure Journal 4 (2), 1-9", count: 2 }]);
});

test("summarize with no ranking (both rank lists switched off): roles only, no tier columns", () => {
  const rows = [paper("first", "A"), paper("first", null), paper("last", "B"), paper(null, null), { status: "absent", role: null, venue: {}, citations: 0 }];
  const s = m.summarize(rows, null);
  assert.deepEqual(s.columns, []);
  assert.equal(s.source, null);
  assert.deepEqual(s.rows.map((r) => [r.role, r.total]), [["first", 2], ["second", 0], ["last", 1]]);
  assert.equal(s.totals.total, 3);
  assert.equal(s.hidden, 1);
  assert.equal(s.absent, 1);
  assert.ok(m.inSelection(paper("first", "A"), { role: "first" }, null));
});

test("summarize keeps the rows it is told to: a count of fewer papers has the shape of the whole list", () => {
  const rows = [paper("first", "A")];
  assert.deepEqual(m.summarize(rows, "ccf").rows.map((r) => r.role), ["first", "second", "last"], "cofirst and middle only when they have papers");
  const kept = m.summarize(rows, "ccf", { keep: ["cofirst", "middle"] });
  assert.deepEqual(kept.rows.map((r) => [r.role, r.total]), [["first", 1], ["cofirst", 0], ["second", 0], ["last", 0], ["middle", 0]]);
  assert.equal(kept.totals.total, 1);
});

test("byYear: highlighted papers per year and role, every year in between, none without a year", () => {
  const r = (year, role, highlighted = true) => ({ year, role, highlighted });
  const out = m.byYear([r(2020, "first"), r(2020, "last"), r(2022, "second"), r(2022, "first", false), r(null, "first"), r(2021, "middle")]);
  assert.deepEqual(out.map((e) => [e.year, e.first, e.last, e.second, e.total]), [[2020, 1, 1, 0, 2], [2021, 0, 0, 0, 0], [2022, 0, 0, 1, 1]]);
  assert.deepEqual(m.byYear([]), []);
});

test("yearBars: the last 50 years only; a paper dated 1803 or a typo year ahead does not stretch the chart, a whole career still fits", () => {
  const r = (year, role = "first") => ({ year, role, highlighted: true });
  const out = m.yearBars([r(1803), r(1960), r(1980), r(2000), r(2025), r(2026, "last"), r(2099)], { now: 2026 });
  assert.deepEqual([out.bars[0].year, out.bars[out.bars.length - 1].year, out.bars.length], [1980, 2026, 47], "the window is 1977–2026; it starts at the first year with a paper");
  assert.equal(out.older, 2, "1803 and 1960 are not drawn, and counted");
  assert.deepEqual([1980, 2000, 2025, 2026].map((y) => out.bars.find((b) => b.year === y).total), [1, 1, 1, 1]);
  const veteran = m.yearBars([r(1981), r(2024)], { now: 2026 });              // (the real profile of a veteran: 44 years)
  assert.deepEqual([veteran.bars.length, veteran.older], [44, 0]);
  assert.ok(!out.bars.some((b) => b.year > 2027), "2099 is no year: nothing is drawn for it");
  const small = m.yearBars([r(2020), r(2022)], { now: 2026 });
  assert.deepEqual(small.bars.map((b) => b.year), [2020, 2021, 2022]);
  assert.equal(small.older, 0);
  assert.deepEqual(m.yearBars([]), { bars: [], older: 0 });
  assert.equal(m.yearBars([r(1990), r(2026)], { now: 2026, maxYears: 5 }).older, 1, "the window is a parameter");
  assert.equal(m.YEAR_BARS, 50);
});

test("topVenues: ranked venues of the highlighted papers, most papers first, ties by name, at most n", () => {
  const v = (abbr, highlighted = true) => ({ highlighted, venue: { ccf: { abbr, name: abbr + " full" } } });
  const rows = [v("ICML"), v("ICML"), v("NeurIPS"), v("ACL"), v("ACL"), v("CVPR", false), { highlighted: true, venue: {} }, { highlighted: true, venue: { core: { name: "Journal Of Things" } } }];
  assert.deepEqual(m.topVenues(rows), [
    { key: "ACL", count: 2, name: "ACL full", ccf: null, core: null },
    { key: "ICML", count: 2, name: "ICML full", ccf: null, core: null },
    { key: "Journal Of Things", count: 1, name: "Journal Of Things", ccf: null, core: null },
    { key: "NeurIPS", count: 1, name: "NeurIPS full", ccf: null, core: null }
  ]);
  assert.equal(m.topVenues(rows, 2).length, 2);
  assert.equal(m.venueKey(undefined), "");
});

test("topVenues: one short name that stands for two venues gives no name and no ranks; ranks of a list that is off are not given", () => {
  const venue = (name, ccf, core) => ({ highlighted: true, venue: { ccf: ccf ? { abbr: "ASE", name, tier: ccf } : null, core: core ? { abbr: "ASE", name, rank: core } : null } });
  // the conference ASE (CCF A, CORE A*) and the journal ASE (CCF B) share their short name
  const mixed = [venue("International Conference on Automated Software Engineering", "A", "A*"), venue("Automated Software Engineering", "B", null)];
  assert.deepEqual(m.topVenues(mixed), [{ key: "ASE", count: 2, name: "ASE", ccf: null, core: null }]);
  assert.deepEqual(m.topVenues([mixed[1], mixed[0]]), m.topVenues(mixed), "whichever comes first");
  const same = [venue("International Conference on Automated Software Engineering", "A", "A*"), venue("International Conference on Automated Software Engineering", "A", "A*")];
  assert.deepEqual(m.topVenues(same), [{ key: "ASE", count: 2, name: "International Conference on Automated Software Engineering", ccf: "A", core: "A*" }]);
  assert.deepEqual(m.topVenues(same, 6, { ccf: false, core: true }), [{ key: "ASE", count: 2, name: "International Conference on Automated Software Engineering", ccf: null, core: "A*" }]);
});

test("summarize says what the not-ranked column holds: preprints, secondary tracks of ranked venues, other venues; only papers of the table, and none by role only", () => {
  const p = (role, tier, venueText, secondary) => ({ status: "found", role, venue: { ccf: tier ? { tier } : null, core: null, secondary: secondary || null }, venueText, citations: 0 });
  const rows = [
    p("first", "A", "Advances in neural information processing systems"),
    p("first", null, "arXiv preprint arXiv:2301.00001, 2023"), p("last", null, "bioRxiv, 2022"), p("last", null, "SSRN Electronic Journal"),
    p("last", null, "Proceedings of the 2022 Workshop on X", "workshop"),
    p("second", null, "Some Journal of Things 12 (3), 45-67, 2020"), p("second", null, "A Book Chapter"),
    { status: "hidden", role: null, venue: {}, venueText: "arXiv preprint", citations: 0 },
    { status: "absent", role: null, venue: {}, venueText: "arXiv preprint", citations: 0 }
  ];
  const s = m.summarize(rows, "ccf");
  assert.deepEqual(s.unranked, { preprint: 3, secondary: 1, other: 2 }, "the papers of the table that are in its not-ranked column: a hidden or absent paper is not");
  assert.equal(s.totals.none, 6);
  assert.equal(s.unranked.preprint + s.unranked.secondary + s.unranked.other, s.totals.none, "all of them, once");
  assert.equal(m.summarize(rows, null).unranked, null, "by role only there is no such column");
  assert.deepEqual(m.summarize([], "ccf").unranked, { preprint: 0, secondary: 0, other: 0 });
});
