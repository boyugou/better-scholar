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

test("toText / toTsv", () => {
  const s = m.summarize([paper("first", "A"), paper("first", null), paper("last", "B")], "ccf");
  const text = m.toText(s, { owner: "Jane Doe", edition: "CCF 2026 (7th edition)" });
  assert.match(text, /^Jane Doe — 3 papers on Google Scholar, by authorship role and CCF rank/);
  assert.match(text, /First author: 2 \(A: 1, unranked: 1\)/);
  assert.match(text, /Last author: 1 \(B: 1\)/);
  assert.match(text, /CCF 2026 \(7th edition\)$/);
  const tsv = m.toTsv(s).split("\n");
  assert.equal(tsv[0], "Role\tA\tB\tC\tUnranked\tTotal");
  assert.equal(tsv[1], "First author\t1\t0\t0\t1\t2");
  assert.equal(tsv[tsv.length - 1], "\t1\t1\t0\t1\t3");
});

test("toText appends extra lines (the awards and talks line) before the edition", () => {
  const s = m.summarize([{ status: "found", role: "first", venue: {}, citations: 1 }], "ccf");
  const text = m.toText(s, { owner: "Jane Doe", extra: ["Awards & talks: Awards 1"], edition: "CCF 2026" });
  const lines = text.split("\n");
  assert.equal(lines[lines.length - 2], "Awards & talks: Awards 1");
  assert.equal(lines[lines.length - 1], "CCF 2026");
  assert.ok(!m.toText(s, {}).includes("Awards"));
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
  const text = m.toText(s, { owner: "A Author" });
  assert.match(text, /^A Author — 5 papers on Google Scholar, by authorship role$/m);
  assert.match(text, /^First author: 2$/m, "no empty parentheses");
  assert.equal(m.toTsv(s).split("\n")[0], "Role\tTotal");
  assert.ok(m.inSelection(paper("first", "A"), { role: "first" }, null));
});
