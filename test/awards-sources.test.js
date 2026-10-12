"use strict";
// The conference awards pages are parsed by scripts/awards/parse-virtual.mjs (an ES module, loaded here with import()).
// The HTML below is synthetic but keeps the two markups the real pages use; no real paper is asserted to win anything.
const test = require("node:test");
const assert = require("node:assert/strict");
const load = () => import("../scripts/awards/parse-virtual.mjs");

const CLASSIC = `<table>
<tr><td><div>Outstanding Paper</div></td><td><div class="displaycards touchup-date" id="event-1">
  <div style="width:80%;margin:auto;"><a class="small-title" href="/virtual/2023/poster/1">A Synthetic Paper: On Testing &amp; Trust</a></div>
  <div class="type_display_name_virtual_card">In-Person Poster presentation</div>
  <div class="author-str">Ann Lee &middot; Bo Chen &middot; Cy Diaz</div>
  <div class="author-str higher"></div>
</div></td></tr>
<tr><td><div>Test of Time Award</div></td><td><div class="displaycards touchup-date" id="event-2"><div class="virtual-card">
  <a class="small-title text-underline-hover" href="/virtual/2023/test-of-time/2">Test of Time Award Talk:An Old Synthetic Paper</a></div>
  <div class="author-str">Dee Park &middot; Eli Ross</div></div></td></tr>
<tr><td><div>Outstanding Demonstration</div></td><td><div class="displaycards"><a class="small-title" href="/virtual/2019/demo/3">A Demo Only Title</a>
  <div class="author-str">Fay Gray</div></div></td></tr>
</table>`;

const INLINE = `<table>
<tr><td><div>Best Paper (DB track)</div></td><td><div class="displaycards touchup-date" id="event-4">
  <div style="margin-bottom: 8px;"><a href="/virtual/2025/poster/4" style="font-size: 1.05em;">Another Synthetic Paper for Benchmarks</a></div>
  <div style="color: #666;">Oral Poster</div>
  <div style="color: #555;">Gia Stone &middot; Hal Wu &middot; Ivy Xu</div></div></td></tr>
<tr><td><div>Outstanding Paper</div></td><td><div class="displaycards"><div style="margin-bottom: 8px;"><a href="/virtual/2025/oral/5" style="x:y;">Single Author Synthetic Work</a></div>
  <div style="color: #555;">Jo Yan ⋅ Kai Zu</div></div></td></tr>
<tr><td><div>Test of Time Award</div></td><td><div class="displaycards"><div><a href="/virtual/2025/test-of-time/6" style="x:y;">Test of Time Award</a></div>
  <div>Test Of Time</div><div style="color:#555;">Lu Mo &middot; Ned Oh</div></div></td></tr>
</table>`;

test("classic markup: awards kept with their authors; the test-of-time talk prefix is removed; demos are not paper awards", async () => {
  const { parseAwardsPage } = await load();
  const { entries, skipped } = parseAwardsPage(CLASSIC, { venue: "NeurIPS", year: 2023, host: "neurips.cc" });
  assert.deepEqual(entries.map((e) => e.award), ["outstanding", "tot"]);
  assert.equal(entries[0].title, "A Synthetic Paper: On Testing & Trust");
  assert.deepEqual(entries[0].authors, ["Ann Lee", "Bo Chen", "Cy Diaz"]);
  assert.equal(entries[1].title, "An Old Synthetic Paper");
  assert.deepEqual(entries[1].authors, ["Dee Park", "Eli Ross"]);
  assert.equal(entries[0].source, "https://neurips.cc/virtual/2023/awards_detail");
  assert.ok(entries.every((e) => e.evidence.includes(e.title)), "the evidence quotes the title");
  assert.deepEqual(skipped.map((s) => s.label), ["Outstanding Demonstration"]);
});

test("inline-style markup (NeurIPS 2025): ⋅ and · both separate authors; a test-of-time row without its paper title is skipped", async () => {
  const { parseAwardsPage } = await load();
  const { entries, skipped } = parseAwardsPage(INLINE, { venue: "NeurIPS", year: 2025, host: "neurips.cc" });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].award, "best");
  assert.equal(entries[0].track, "datasets", "a DB-track award is marked as such");
  assert.deepEqual(entries[0].authors, ["Gia Stone", "Hal Wu", "Ivy Xu"]);
  assert.deepEqual(entries[1].authors, ["Jo Yan", "Kai Zu"]);
  assert.equal(entries[1].award, "outstanding");
  assert.deepEqual(skipped.map((s) => s.why), ["no paper title on the row"]);
});

test("entities are decoded to the characters a reader sees", async () => {
  const { decode } = await load();
  assert.equal(decode("A &amp; B &middot; C &#39;x&#39; &#x2013; &hellip; &unknown;"), "A & B · C 'x' – … &unknown;");
  assert.equal(decode("  Line\n  break   here  "), "Line break here");
});

test("award labels map to the kinds the matcher understands", async () => {
  const { kindOf } = await load();
  const expect = {
    "Outstanding Paper": "outstanding", "Outstanding Paper Award": "outstanding", "Outstanding Main Track Paper": "outstanding",
    "Outstanding Paper Honorable Mention": "runner-up", "Outstanding Paper Runner Up": "runner-up", "Outstanding Paper Runner-up": "runner-up",
    "Honorable Mention": "runner-up", "Best Paper Runner-up": "runner-up", "Test of Time Honorable Mention": "runner-up",
    "Best Paper": "best", "Best Paper Award": "best", "Best Paper (DB track)": "best",
    "Best Student Paper": "student", "Distinguished Paper Award": "distinguished",
    "Test of Time Award": "tot",
    "Outstanding Position Paper": "category", "Outstanding New Directions Paper": "category",
    "Datasets and Benchmarks Award": "category", "Datasets and Benchmarks Best Paper": "category",
    "Best Demonstration Honorable Mention": null, "Outstanding Demonstration": null, "Best Poster": null,
    "Area Chair Award": null, "Reviewer Award": null, "Workshop Best Paper": null
  };
  for (const [label, kind] of Object.entries(expect)) assert.equal(kindOf(label), kind, label);
});

test("the conference's own prose awards page (ICML 2023 style): recipients are the title and author lines before each OpenReview link", async () => {
  const { parseRecipientsPage } = await load();
  const html = `<h2>Outstanding Paper Awards</h2><p>This year six papers were chosen.</p><p>The award recipients are (in order of paper ID):</p>
<p>A Synthetic Learning Paper.</p><p>Ann Lee (Lab One), Bo Chen (Lab Two) and Cy Diaz</p>
<p><a href="https://openreview.net/forum?id=abc">https://openreview.net/forum?id=abc</a></p><p>Description text.</p>
<p>Second Synthetic Paper Title</p><p>Dee Park (Somewhere)</p>
<p><a href="https://openreview.net/forum?id=def">https://openreview.net/forum?id=def</a></p>
<h2>Test of Time Award</h2><p>Old Paper Title Here</p><p>Eli Ross</p>
<p><a href="https://openreview.net/forum?id=ghi">https://openreview.net/forum?id=ghi</a></p>`;
  const { entries } = parseRecipientsPage(html, { venue: "ICML", year: 2023, source: "https://icml.cc/Conferences/2023/Awards" });
  assert.deepEqual(entries.map((e) => e.title), ["A Synthetic Learning Paper", "Second Synthetic Paper Title"], "the test-of-time section is not read");
  assert.deepEqual(entries[0].authors, ["Ann Lee", "Bo Chen", "Cy Diaz"]);
  assert.ok(entries.every((e) => e.award === "outstanding" && e.awardLabel === "Outstanding Paper Awards"));
  assert.equal(entries[0].source, "https://icml.cc/Conferences/2023/Awards");
});

test("the CVPR-style best papers listing: 'Best Paper:' then 'Paper Name:' and wrapped 'Authors:' lines; navigation is ignored", async () => {
  const { parsePaperAwardPage } = await load();
  const html = `<ul><li>Best Papers</li></ul><p>Best Paper:</p>
<p>Paper Name: A Synthetic Transformer for Geometry</p>
<p>Authors: Ann Lee, Bo Chen, Cy Diaz, Dee Park, Eli Ross, Fay Gray, Gia Stone,</p><p>Hal Wu, Ivy Xu</p>
<p>Best Paper Honorable Mention: ID: 4119</p><p>Paper Name: Another Synthetic Method for Rendering</p>
<p>Authors: Jo Yan, Kai Zu</p>
<p>Best Student Paper:</p><p>Paper Name: A Student Paper About Something</p><p>Authors: Lu Mo</p>
<p>Best Demos</p><p>Paper Name: Not an award, a demo</p><p>Authors: Ned Oh, Ora Pell</p>`;
  const { entries } = parsePaperAwardPage(html, { venue: "CVPR", year: 2025, source: "https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos" });
  assert.deepEqual(entries.map((e) => [e.award, e.awardLabel]), [["best", "Best Paper"], ["runner-up", "Best Paper Honorable Mention"], ["student", "Best Student Paper"]]);
  assert.deepEqual(entries[0].authors, ["Ann Lee", "Bo Chen", "Cy Diaz", "Dee Park", "Eli Ross", "Fay Gray", "Gia Stone", "Hal Wu", "Ivy Xu"], "a wrapped author line is joined");
  assert.equal(entries[1].title, "Another Synthetic Method for Rendering");
});

test("the ECCV-style awards page: a heading, the title, then the authors joined by ⋅; a heading without an author line is ignored", async () => {
  const { parsePaperAwardPage } = await load();
  const html = `<h3>Best Paper</h3><p>A Synthetic Minimal Vision Paper</p><p>Jeremy Klotz ⋅ Shree Nayar</p>
<h3>Best Paper Honorable Mention</h3><p>Rasterized Edge Gradients Handling Discontinuities</p><p>Stan Pid ⋅ Tom Sim ⋅ Gab Sch</p>
<h3>Best Paper</h3><p>Navigation</p><p>Overview of the site</p>`;
  const { entries } = parsePaperAwardPage(html, { venue: "ECCV", year: 2024, source: "https://eccv.ecva.net/Conferences/2024/Awards" });
  assert.deepEqual(entries.map((e) => [e.award, e.title]), [["best", "A Synthetic Minimal Vision Paper"], ["runner-up", "Rasterized Edge Gradients Handling Discontinuities"]]);
  assert.deepEqual(entries[0].authors, ["Jeremy Klotz", "Shree Nayar"]);
  assert.equal(entries[1].source, "https://eccv.ecva.net/Conferences/2024/Awards");
});

test("a test-of-time award page names its paper in the abstract block; a list row without a title keeps its award page", async () => {
  const { parseTestOfTimeDetail, parseAwardsPage } = await load();
  const detail = `<div class="abstract-section"><div class="abstract-text collapsed" id="abstractText"><div class="abstract-text-inner">
<p><a href="https://papers.example.org/paper/2015/hash/x-Abstract.html">A Synthetic Old Paper Title (Test of Time Award)</a> <em>Ann Lee, Bo Chen</em></p>
<p><strong>Paper Abstract</strong>: text</p></div></div></div>`;
  assert.deepEqual(parseTestOfTimeDetail(detail), { title: "A Synthetic Old Paper Title", authorsText: "Ann Lee, Bo Chen" });
  assert.equal(parseTestOfTimeDetail("<p>no paper here</p>"), null);
  const titled = parseAwardsPage(`<table><tr><td><div>Test of Time</div></td><td><div class="displaycards"><div class="virtual-card"><a class="small-title" href="/virtual/2019/test-of-time/9">Test of Time: An Old Paper Name</a></div><div class="author-str">Ann Lee &middot; Bo Chen</div></div></td></tr></table>`, { venue: "ICML", year: 2019, host: "icml.cc" });
  assert.equal(titled.entries[0].title, "An Old Paper Name", "the 'Test of Time:' prefix is not part of the title");
  const row = `<table><tr><td><div>Test of Time Award</div></td><td><div class="displaycards"><div><a href="/virtual/2025/test-of-time/6" style="x:y;">Test of Time Award</a></div>
<div>Test Of Time</div><div style="color:#555;">Lu Mo &middot; Ned Oh</div></div></td></tr></table>`;
  const { entries, skipped } = parseAwardsPage(row, { venue: "NeurIPS", year: 2025, host: "neurips.cc" });
  assert.equal(entries.length, 0);
  assert.equal(skipped[0].href, "/virtual/2025/test-of-time/6");
  assert.deepEqual(skipped[0].authors, ["Lu Mo", "Ned Oh"]);
});
