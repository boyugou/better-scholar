"use strict";
// Tests that kill mutants which survived the rest of the suite (an independent hand mutation run, 2026-11-12: 104 mutants over marks, awards, names,
// analysis and query; 36 survived, 8 equivalent). Each test names the mutant ("gap M7" …) and fails on it.
const test = require("node:test");
const assert = require("node:assert/strict");
const marks = require("../src/lib/marks.js");
const names = require("../src/lib/names.js");
const query = require("../src/lib/query.js");
const analysis = require("../src/lib/analysis.js");
const awards = require("../src/lib/awards.js");

// ---------------------------------------------------------------- test/marks.test.js
const kinds = (fields, opts) => marks.detect(fields, opts).map((m) => m.kind);

test("gap M12: a lower-case talk word beside a year in a title bracket is a mark ('(ICLR 2023 oral)'); alone it is the title's word", () => {
  assert.deepEqual(kinds({ title: "Learning to Reason over Graphs (ICLR 2023 oral)" }), ["oral"]);
  assert.deepEqual(kinds({ title: "Efficient Video Transformers (CVPR 2022 highlight)" }), ["highlight"]);
  assert.deepEqual(kinds({ title: "Candida infections (oral)" }), []);
});

test("gap M7: a typed best paper is cleared when any listed runner-up names its venue line's year, even if another runner-up is of another year", () => {
  const typed = marks.detect({ venue: "Proceedings on Privacy Enhancing Technologies 2014, Best Paper Award" });
  assert.deepEqual(typed.map((m) => m.kind), ["best"]);
  const merged = marks.merge(typed, [
    { kind: "runner-up", venue: "PETS", year: 2014, awardLabel: "Best Paper Runner-up" },
    { kind: "runner-up", venue: "PET Award", year: 2015, awardLabel: "PET Award Runner-up" }
  ]);
  assert.deepEqual(merged.map((m) => m.kind), ["runner-up", "runner-up"]);
});

test("gap M16: a paper the list says won is no finalist even when the list also names a runner-up of it elsewhere", () => {
  const finalist = { kind: "finalist", group: "finalist", label: "Best paper finalist", text: "Best Paper Nominee", field: "venue", source: "author" };
  const merged = marks.merge([finalist], [
    { kind: "best", venue: "UIST", year: 2019, awardLabel: "Best Paper Award" },
    { kind: "runner-up", venue: "CHI", year: 2019, awardLabel: "Honorable Mention" }
  ]);
  assert.deepEqual(merged.map((m) => m.kind), ["best", "runner-up"]);
});

// ---------------------------------------------------------------- test/names.test.js
const role = (line, name) => names.classifyRow(line, { name }).role || names.classifyRow(line, { name }).status;

test("gap N6: a mark shared with a name after the cut makes no co-first group, also when more names follow", () => {
  assert.equal(role("A Smith#, …, D Molina#, E Lee", "Alice Smith"), "first");
  assert.equal(role("A Smith#, . . ., D Molina#, E Lee, F Wu", "Alice Smith"), "first");
});

test("gap N10: a spelled-out given name beats an initial; the line is not ambiguous when one entry matches better", () => {
  // "John Smith" fits "John Quincy Smith" with every given name spelled out (2); "J Smith" only by its initial (1)
  const r = names.classifyRow("J Smith, John Smith, A Lee", { name: "John Quincy Smith" });
  assert.equal(r.index, 1);
  assert.equal(r.role, "second");
  assert.ok(!r.ambiguous);
});

test("gap N8: of two equally good entries with the same role the earliest is the owner (the tooltip's position)", () => {
  const r = names.classifyRow("X Wang*, X Wang*, P Cong", { name: "Xin Wang" });
  assert.equal(r.role, "cofirst");
  assert.equal(r.index, 0);
});

test("gap N18: a stray one-character entry is no author, so the last name stays the last author", () => {
  assert.deepEqual(names.parseAuthors("K He, X Zhang, S Ren, J Sun, -").tokens.map((t) => t.name), ["K He", "X Zhang", "S Ren", "J Sun"]);
  assert.equal(role("K He, X Zhang, S Ren, J Sun, -", "Jian Sun"), "last");
});

// ---------------------------------------------------------------- test/marks.test.js (listedOnce)
test("gap M23: two rows equally near the award (same year, neither at the award's venue nor a preprint): the earlier row keeps it", () => {
  const L = (kind, venue, year) => ({ kind, venue, year, awardLabel: "", source: "list" });
  const once = marks.listedOnce([
    { title: "Mask R-CNN", year: 2017, venue: "Proceedings of the IEEE international conference on computer vision, 2961-2969", marks: [L("best", "ICCV", 2017)] },
    { title: "Mask R-CNN", year: 2017, venue: "IEEE Transactions on Pattern Analysis and Machine Intelligence", marks: [L("best", "ICCV", 2017)] }
  ]);
  assert.deepEqual(once.map((ms) => ms.length), [1, 0]);
});

test("gap M25: a talk word followed by 'at <venue>' stands alone in a venue line", () => {
  assert.deepEqual(kinds({ venue: "Spotlight presentation at NeurIPS 2021" }), ["spotlight"]);
  assert.deepEqual(kinds({ venue: "Oral @ CVPR 2022" }), ["oral"]);
  assert.deepEqual(kinds({ venue: "Oral at the ICCV 2023 workshop" }), ["oral"]);
});

test("gap M30: a kind typed twice keeps its first sighting — the venue line, with its years — not the title's bracket", () => {
  const typed = marks.detect({ title: "Some Privacy Paper (Best Paper)", venue: "Proceedings on Privacy Enhancing Technologies 2014, Best Paper Award" });
  assert.equal(typed[0].field, "venue");
  assert.deepEqual(typed[0].years, [2014]);
  // so a list's runner-up of another year (another venue's award) does not clear it
  const merged = marks.merge(typed, [{ kind: "runner-up", venue: "PET Award", year: 2015, awardLabel: "PET Award Runner-up" }]);
  assert.deepEqual(merged.map((m) => m.kind), ["best", "runner-up"]);
});

test("gap N22: eight papers are the least that let the page turn a profile name around by itself", () => {
  const rows = Array.from({ length: 12 }, (_, i) => `J Tang, A Author${i}, B Other${i}`);
  assert.deepEqual(names.suggestVariants(rows.slice(0, 7), { name: "Tang Jie" }).auto, []);
  assert.deepEqual(names.suggestVariants(rows.slice(0, 8), { name: "Tang Jie" }).auto, [{ name: "Jie Tang", rows: 8 }]);
});

test("gap N23: a rearrangement must write at least one word out: initials alone are no spelling of the owner", () => {
  assert.ok(!names.isPermutation("D P", "David Patterson"));
  assert.ok(!names.isPermutation("J T", "Tang Jie"));
  assert.ok(names.isPermutation("J Tang", "Tang Jie"));
});

test("gap N24: a run of four capitals before the surname is a name in capitals, not four initials", () => {
  assert.equal(names.normalize("JOHN Smith"), "john smith");
  assert.equal(names.normalize("WLH Smith"), "w l h smith");
});

// ---------------------------------------------------------------- test/query.test.js (its `paper` and `test_` are these)
const paper = {
  raw: { title: "Deep Residual Learning for Image Recognition", authorsText: "K He, X Zhang, S Ren, J Sun", venueText: "Proceedings of the IEEE conference on computer vision and pattern recognition, 2016", citations: 180000, year: 2016 },
  a: { status: "found", role: "first", year: 2016, venue: { ccf: { tier: "A", abbr: "CVPR", name: "IEEE Conference on Computer Vision and Pattern Recognition" }, core: null },
    marks: [{ kind: "best", group: "award", label: "Best Paper Award", text: "CVPR 2016 Best Paper Award" }] },
  shown: 180000
};
const test_ = (q, row = paper) => analysis.queryMatcher(q).test(row);
const withA = (a) => ({ ...paper, raw: { ...paper.raw }, a: { ...paper.a, ...a } });

test("gap Q3: a paper without a year is not before or after any year", () => {
  const undated = withA({ year: null });
  assert.equal(test_("year:<2020", undated), false);
  assert.equal(test_("year:<=2020", undated), false);
});

test("gap Q5: a word of two letters is a whole word at its end too: 'he' is the author He, not Hendrycks", () => {
  const dan = { ...paper, raw: { ...paper.raw, title: "Natural Adversarial Examples", authorsText: "D Hendrycks, K Zhao, S Basart" } };
  assert.equal(test_("he", dan), false);
  assert.equal(test_("he"), true);
});

test("gap Q6: NOT and a minus leave out one word, not every word after it", () => {
  assert.equal(test_("-survey deep"), true);
  assert.equal(test_("NOT survey residual"), true);
});

test("gap Q7: an operator with a value it does not take matches nothing, also with a minus or NOT before it", () => {
  assert.equal(test_("-ccf:x"), false);
  assert.equal(test_("NOT role:fir"), false);
});

test("gap Q18: a field with no value yet, left out ('-author:' while typing), asks nothing", () => {
  assert.equal(test_("-author:"), true);
  assert.equal(test_("NOT venue:"), true);
});

test("gap Q19: a quick filter never joins its value to a word of an OR; it goes in as a word of its own", () => {
  assert.equal(query.toggleValue("role:first OR has:award", "role:last"), "role:first OR has:award role:last");
});

// ---------------------------------------------------------------- test/query.test.js / test/marks.test.js (analysis)
test("gap X5/X6: has:award counts a finalist mark, has:talk a Highlight", () => {
  assert.equal(test_("has:award", withA({ marks: [{ kind: "finalist", group: "finalist", label: "Best paper finalist", text: "Best Paper Nominee" }] })), true);
  assert.equal(test_("has:talk", withA({ marks: [{ kind: "highlight", group: "highlight", label: "Highlight", text: "CVPR 2023 Highlight" }] })), true);
});

test("gap X9: the search's answer for a row is made again when the row's marks change (an award moved to it from its duplicate)", () => {
  const row = withA({ marks: [] });
  const m = analysis.queryMatcher("has:award");
  assert.equal(m.test(row), false);
  row.a.marks = [{ kind: "best", group: "award", label: "Best paper", text: "", source: "list" }];
  assert.equal(m.test(row), true);
});

test("gap X4/X8: a role switched off highlights nothing; a row whose page was read is not read again", () => {
  assert.equal(analysis.isHighlighted({ status: "found", role: "first" }, { first: false, last: true }), false);
  assert.equal(analysis.isHighlighted({ status: "found", role: "first" }, { first: true }), true);
  assert.equal(analysis.needsDetail({ status: "hidden", fromDetail: true }), false);
  assert.equal(analysis.needsDetail({ status: "hidden", fromDetail: false }), true);
});

const stub = (map) => ({ resolve: (t) => map[t] || { ccf: null, core: null } });
const owner = { name: "Kaiming He" };
const rowOf = (venueText, resolved) => analysis.analyzeRow({ authorsText: "K He, X Zhang", venueText, title: "T", year: 2016 }, { owner, resolver: stubR, resolved: resolved && { t: "t", ...resolved } });
let stubR;

test("gap X12: saved details with a venue but no author list do not count as the full list read", () => {
  stubR = stub({});
  const a = rowOf("CVPR 2016", { venue: "IEEE Conference on Computer Vision and Pattern Recognition, 770-778" });
  assert.equal(a.fromDetail, false);
  assert.equal(a.pageVenueText, "IEEE Conference on Computer Vision and Pattern Recognition, 770-778");
});

test("gap X3/X13: the paper page's line and the person's own mappings", () => {
  const mine = { ccf: { tier: "B", abbr: "MINE", rule: "mine" }, core: null };
  // the profile line is unranked; the page's line is ranked only by a mapping of the person's own: it is used (X13)
  stubR = stub({ page: mine });
  assert.equal((rowOf("cut line …", { venue: "page" }).venue.ccf || {}).abbr, "MINE");
  // the profile line is ranked by a mapping; the lists refuse the page's line (a workshop): the page wins, unranked (X3)
  stubR = stub({ profile: mine, page: { ccf: null, core: null, secondary: null, refused: true } });
  assert.equal(rowOf("profile", { venue: "page" }).venue.ccf, null);
});

test("gap X14: analyzeRow asks the award list with the row's year: the journal version years later gets no award", () => {
  const idx = awards.createIndex([[awards.titleKey("Mask R-CNN"), awards.surnameKey("Kaiming He"), "ICCV", 2017, "best", "Marr Prize"]]);
  const ctx = { owner, resolver: stub({}), awards: idx };
  const at = (year) => analysis.analyzeRow({ authorsText: "K He, G Gkioxari, P Dollár, R Girshick", venueText: "", title: "Mask R-CNN", year }, ctx).marks.map((m) => m.kind);
  assert.deepEqual(at(2017), ["best"]);
  assert.deepEqual(at(2020), []);
});
