"use strict";
// A real 2026 profile, read in its owner's own Chrome (test/fixtures/profiles/gou-osu.json): co-first stars, author lists cut with "...",
// levels written in the venue field, Findings and demo tracks, a journal and a preprint. The expected values below were worked out by eye from
// the author lines and the venue strings, and they equal what the panel showed on the live page (First 1, Co-first 2, Second 1, Other 7, 2 hidden).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const analysis = require("../src/lib/analysis.js");
const venues = require("../src/lib/venues.js");
const metrics = require("../src/lib/metrics.js");
const ccf = require("../src/data/ccf.js");
const core = require("../src/data/core.js");
const aliases = require("../src/data/aliases.js");

const profile = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "profiles", "gou-osu.json"), "utf8"));
const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases, strict: true });
const owner = { name: profile.owner, alternates: [] };
const rows = profile.rows.map(([authorsText, venueText, title]) => ({ title, authorsText, venueText, year: parseInt(/(\d{4})\D*$/.exec(venueText)[1], 10) }));
const analysed = rows.map((raw) => analysis.analyzeRow(raw, { owner, resolver }));

test("roles: stars make a co-first group, a cut list never gives the last place, a name past the cut is hidden", () => {
  const role = (a) => (a.status === "found" ? a.role : a.status);
  assert.deepEqual(analysed.map(role), [
    "second", "first", "middle", "middle", "cofirst", "hidden", "middle", "middle", "cofirst", "middle", "hidden", "middle", "middle"
  ]);
});

test("venues: what is ranked, what is a secondary track, what no list has", () => {
  const brief = (a) => [a.venue.ccf && "CCF " + a.venue.ccf.tier, a.venue.core && "CORE " + a.venue.core.rank].filter(Boolean).join(" · ");
  const top = "CCF A · CORE A*";
  assert.deepEqual(analysed.map(brief), [
    top, top, "", "", top, top,                // ICML, ICLR (Oral), COLM and TMLR (on no list), NeurIPS Datasets and Benchmarks Track, ICML
    "", "", "",                                // ACL and NAACL Findings, EMNLP System Demonstrations: secondary tracks are not ranked
    top, top, "CCF B · CORE A*", ""            // ICLR (Oral), NeurIPS, EMNLP (Oral), arXiv
  ]);
});

test("the role × rank table of the live page, from the same rows", () => {
  const papers = analysed.map((a, i) => ({ status: a.status, role: a.role, venue: a.venue, citations: 1, year: rows[i].year, highlighted: true }));
  const s = metrics.summarize(papers, "ccf");
  const cell = (role) => Object.fromEntries(["A", "B", "C", "none", "total"].map((k) => [k, s.rows.find((r) => r.role === role)[k]]));
  assert.deepEqual(cell("first"), { A: 1, B: 0, C: 0, none: 0, total: 1 });
  assert.deepEqual(cell("cofirst"), { A: 1, B: 0, C: 0, none: 1, total: 2 });
  assert.deepEqual(cell("second"), { A: 1, B: 0, C: 0, none: 0, total: 1 });
  assert.deepEqual(cell("last"), { A: 0, B: 0, C: 0, none: 0, total: 0 });
  assert.deepEqual(cell("middle"), { A: 1, B: 1, C: 0, none: 5, total: 7 });
  assert.deepEqual(s.totals, { A: 4, B: 1, C: 0, none: 6, total: 11 });
  assert.equal(s.hidden, 2);
  assert.equal(s.absent, 0);
});

test("talk levels the authors wrote in the venue field: three Orals, nothing else", () => {
  assert.deepEqual(analysed.map((a) => a.marks.map((m) => m.kind).join("+")), ["", "oral", "", "", "", "", "", "", "", "oral", "", "oral", ""]);
});
