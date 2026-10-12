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
  assert.equal(decode("M&#246llenhoff and M&#xF6;ller"), "Möllenhoff and Möller", "numeric entities, with or without the semicolon");
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

test("a heading that lists several papers ('Best Paper Awards', ICLR 2019); a list of area chairs under another heading is not an award", async () => {
  const { parsePaperAwardPage } = await load();
  const html = `<h2>Best Paper Awards</h2><p>Congratulations to the winners!</p>
<p>Ordered Synthetic Neurons: Tree Structures in Recurrent Networks</p><p>Ann Lee · Bo Chen · Cy Diaz</p>
<p>A Synthetic Ticket Hypothesis: Finding Sparse Networks</p><p>Dee Park · Eli Ross</p>
<p>Based on Selection from Area Chairs:</p><p>Fay Gray, Gia Stone, Hal Wu, and Ivy Xu</p>
<h2>Outstanding Reviewers</h2><p>Jo Yan</p><p>Kai Zu</p>`;
  const { entries } = parsePaperAwardPage(html, { venue: "ICLR", year: 2019, source: "https://iclr.cc/Conferences/2019/Awards" });
  assert.deepEqual(entries.map((e) => [e.award, e.title]), [
    ["best", "Ordered Synthetic Neurons: Tree Structures in Recurrent Networks"],
    ["best", "A Synthetic Ticket Hypothesis: Finding Sparse Networks"]
  ]);
  assert.deepEqual(entries[1].authors, ["Dee Park", "Eli Ross"]);
});

test("a home page's 'Best paper:' line gets its authors from the programme entry with the same title", async () => {
  const { parseHomepageAwards, parseProgramAuthors } = await load();
  const home = `<table><tr><td>AWARD INFO</td></tr><tr><td>Best paper:</td></tr><tr><td>A Synthetic Residual Paper,</td></tr>
<tr><td>Best paper honorable mention:</td></tr><tr><td>Not In The Programme At All.</td></tr></table>`;
  const program = `<ul class="program-list"> 2 <strong>A Synthetic Residual Paper for Images. </strong><br><p>Ann Lee, Bo Chen, Cy Diaz</p></ul>`;
  assert.equal(parseProgramAuthors(program).size, 1);
  const { entries } = parseHomepageAwards(home, { venue: "CVPR", year: 2016, source: "https://cvpr2016.thecvf.com/", programHtml: program });
  assert.deepEqual(entries, [], "the title must match the programme exactly; a near title is not enough");
  const exact = program.replace("A Synthetic Residual Paper for Images.", "A Synthetic Residual Paper,");
  const { entries: got } = parseHomepageAwards(home, { venue: "CVPR", year: 2016, source: "https://cvpr2016.thecvf.com/", programHtml: exact });
  assert.deepEqual(got.map((e) => [e.award, e.title, e.authors]), [["best", "A Synthetic Residual Paper", ["Ann Lee", "Bo Chen", "Cy Diaz"]]]);
});

// The Computer Vision Foundation's awards page: one <h1> and one table per award, a row = year, “title”, authors.
// (Synthetic rows in the page's real structure, including its quirks.)
const CVF = `<p><a name="CVPRBest"></a></p><h1>CVPR Best Paper Award</h1><p>Picked by a committee.</p>
<table><tbody>
<tr><td>2024</td><td>&#8220;A Synthetic Paper on Testing&#8221;</td><td>A. Lee, B. Chen, and C. Diaz</td></tr>
<tr><td>2023</td><td>&#8220;Wrapped Title for the Synthetic
Layout Test&#8221;</td><td>D. Park et al.</td></tr>
</tbody></table>
<h1>CVPR Best Paper Honorable Mention Award</h1>
<table><tbody>
<tr><td>2024</td><td>&#8220;A Student Honorable Synthetic Paper&#8221; (Student Paper)</td><td>E. Ross, F. Gray</td></tr>
<tr><td>2011</td><td>&#8220;Plain Honorable Synthetic Paper&#8221; (Honorable Mention)</td><td>G. Stone</td></tr>
</tbody></table>
<h1>ECCV Best Paper Award</h1>
<table><tbody>
<tr><td>2002</td><td>&#8220;First Shared Synthetic Paper&#8221; and &#8220;Second Shared Synthetic Paper?&#8221;</td><td>H. Wu, I. Xu</td></tr>
<tr><td>2002</td><td>&#8220;A Category Synthetic Paper&#8221; (Best Paper in Cognitive Vision)</td><td>J. Yan</td></tr>
</tbody></table>
<h1>Longuet-Higgins Prize</h1><p>CVPR papers from ten years ago.</p>
<table><tbody><tr><td>2026</td><td>&#8220;An Old Synthetic Paper&#8221;</td><td>K. Zu, L. Mo</td></tr></tbody></table>
<h1>PAMI Young Researcher Award</h1>
<table><tbody><tr><td>2025</td><td>Somebody</td><td></td></tr></tbody></table>`;

test("CVF awards page: sections map to venue and kind, titles are unquoted and unwrapped, notes set the label, a shared cell gives two papers", async () => {
  const { parse } = await import("../scripts/awards/cvf.mjs");
  const e = parse(CVF);
  const by = (title) => e.find((x) => x.title === title);
  assert.deepEqual(by("A Synthetic Paper on Testing"), {
    venue: "CVPR", award: "best", awardLabel: "Best Paper", year: 2024, title: "A Synthetic Paper on Testing", authors: ["A. Lee", "B. Chen", "C. Diaz"], track: "main",
    source: "https://www.thecvf.com/?page_id=413#CVPRBest", evidence: "CVPR Best Paper Award: 2024 “A Synthetic Paper on Testing” A. Lee, B. Chen, and C. Diaz"
  });
  assert.equal(by("Wrapped Title for the Synthetic Layout Test").year, 2023, "a title wrapped over two lines is one title");
  assert.deepEqual(by("Wrapped Title for the Synthetic Layout Test").authors, ["D. Park"], "'et al.' is not an author");
  assert.deepEqual([by("A Student Honorable Synthetic Paper").award, by("A Student Honorable Synthetic Paper").awardLabel], ["runner-up", "Best Student Paper Honorable Mention"]);
  assert.deepEqual([by("Plain Honorable Synthetic Paper").award, by("Plain Honorable Synthetic Paper").awardLabel], ["runner-up", "Best Paper Honorable Mention"]);
  assert.deepEqual([by("First Shared Synthetic Paper").venue, by("Second Shared Synthetic Paper?").venue], ["ECCV", "ECCV"]);
  assert.deepEqual(by("First Shared Synthetic Paper").authors, ["H. Wu", "I. Xu"]);
  assert.deepEqual([by("A Category Synthetic Paper").award, by("A Category Synthetic Paper").awardLabel], ["category", "Best Paper in Cognitive Vision"]);
  assert.deepEqual([by("An Old Synthetic Paper").venue, by("An Old Synthetic Paper").award, by("An Old Synthetic Paper").awardLabel], ["CVPR", "tot", "Longuet-Higgins Prize"]);
  assert.equal(e.length, 8, "the people awards (PAMI …) have no paper and are ignored");
});

// AAAI's paper-awards page: a year (h3 or a bold <p>), an <h4> per award, one <p> per paper. Synthetic papers, the page's quirks.
const AAAI = `<h3 class="wp-block-heading"><strong>Past Recipients</strong></h3>
<p class="wp-block-paragraph"><strong>2025</strong></p>
<h4>AAAI-25 Outstanding Paper Awards</h4>
<p>These papers exemplify the highest standards.</p>
<p><strong>A Synthetic Paper About Voting<br></strong>Ann Lee, Bo Chen, and Cy Diaz</p>
<h4>AAAI-25 Outstanding Paper Award – AI for Social Alignment Track</h4>
<p><strong>A Synthetic Paper About Biodiversity</strong><br>Dee Park; Eli Ross</p>
<h4>AAAI-25 Best Poster Award</h4>
<p><strong>A Poster Only Title</strong><br>Fay Gray</p>
<h4>AAAI-25 Outstanding Student Papers</h4>
<h5>Student Abstract Program Awards</h5>
<p><strong>A Student Abstract Only Title</strong><br>Gia Stone</p>
<h3>2013</h3>
<h4>AAAI-13 Outstanding Paper Awards</h4>
<p><strong>A Synthetic Paper About Search</strong><br>Hal Wu, Ivy Xu</p>
<p><em>Honorable Mention:</em><br><strong>A Synthetic Honorable Paper</strong><br>Jo Yan and Kai Zu<br>For Outstanding Formal Analysis</p>
<h3>2024</h3>
<h4>AAAI-24 Outstanding Paper Award</h4>
<p><strong>A Synthetic Paper With Split Authors</strong></p>
<p>Lu Mo; Ned Oh</p>
<h4>Best Paper for the AI for Social Impact track at AAAI-2024</h4>
<p><strong>A Synthetic Track Paper</strong></p>
<p>Pam Quinn; Ray Sun</p>
<p><em>Honorable Mention:</em></p>
<p><strong>A Synthetic Track Honorable Paper</strong></p>
<p>Sal Tan; Uma Vu</p>
<h4>Best Student Paper for the AI for Social Impact track at AAAI-2024</h4>
<p><strong>A Synthetic Student Paper</strong></p>
<p>Vic Wei; Wen Xi</p>
<h3>2009</h3>
<h4>AAAI-09 Outstanding Paper Awards</h4>
<p><strong>A Paper Before the Cut-Off Year</strong><br>Yan Zhu (Some University)</p>
<h3>2023</h3>
<h4>AAAI Distinguished Papers</h4>
<p><em>AAAI-23 Distinguished Papers</em><br><strong>A Synthetic Distinguished Paper</strong><br>Zed Ang, Abe Bell</p>`;

test("AAAI paper awards: awards, tracks and honorable mentions map to kinds and labels; poster and student-abstract sections are not paper awards", async () => {
  const { parse } = await import("../scripts/awards/aaai.mjs");
  const { entries, skipped } = parse(AAAI);
  const by = (t) => entries.find((e) => e.title === t);
  const kind = (t) => [by(t).year, by(t).award, by(t).awardLabel];
  assert.deepEqual(kind("A Synthetic Paper About Voting"), [2025, "outstanding", "Outstanding Paper"]);
  assert.deepEqual(by("A Synthetic Paper About Voting").authors, ["Ann Lee", "Bo Chen", "Cy Diaz"]);
  assert.deepEqual(kind("A Synthetic Paper About Biodiversity"), [2025, "outstanding", "Outstanding Paper (AI for Social Alignment track)"]);
  assert.equal(by("A Poster Only Title"), undefined);
  assert.equal(by("A Student Abstract Only Title"), undefined, "an <h5> heading ends the previous section");
  assert.deepEqual(kind("A Synthetic Honorable Paper"), [2013, "runner-up", "Outstanding Paper Honorable Mention"]);
  assert.deepEqual(by("A Synthetic Honorable Paper").authors, ["Jo Yan", "Kai Zu"], "a note line after the authors is not an author");
  assert.deepEqual(by("A Synthetic Paper With Split Authors").authors, ["Lu Mo", "Ned Oh"], "authors in the next paragraph");
  assert.deepEqual(kind("A Synthetic Track Paper"), [2024, "best", "Best Paper (AI for Social Impact track)"]);
  assert.deepEqual(kind("A Synthetic Track Honorable Paper"), [2024, "runner-up", "Best Paper (AI for Social Impact track) Honorable Mention"]);
  assert.deepEqual(kind("A Synthetic Student Paper"), [2024, "student", "Best Student Paper (AI for Social Impact track)"]);
  assert.deepEqual(kind("A Synthetic Distinguished Paper"), [2023, "distinguished", "Distinguished Paper"]);
  assert.equal(by("A Paper Before the Cut-Off Year"), undefined, "years before 2010 are left out");
  assert.deepEqual(skipped, []);
});

test("AAAI Classic Paper Award: authors from the bold runs, the title without 'presented at …', honorable mentions as runner-up; the irregular years before 2012 are left out", async () => {
  const { parseClassic } = await import("../scripts/awards/aaai.mjs");
  const html = `<h3>2024</h3><ul>
<li><em>Classic Paper Recipients:</em>&nbsp;<strong>Ann Lee, Bo Chen</strong><br>A Synthetic Classic Paper<br>For introducing something synthetic.</li></ul>
<h3>2022</h3><ul>
<li><em>Classic Paper Award Recipients:</em> <strong>Cy Diaz</strong>, <strong>Dee Park, Eli Ross</strong><br>Another Synthetic Classic Paper presented at the Twenty-First National Conference on AI, held in 2006.<br>For something.</li>
<li><em>Classic Paper Honorable Mention Recipients:</em> <strong>Fay Gray and Gia Stone</strong><br>A Synthetic Honorable Classic<br></li></ul>
<h3>2011</h3><ul><li><em>Classic Paper Award Recipients:</em> <strong>Old Timer</strong><br>An Irregular Old Entry</li></ul>`;
  const { entries } = parseClassic(html);
  assert.deepEqual(entries.map((e) => [e.year, e.award, e.awardLabel, e.title, e.authors]), [
    [2024, "tot", "Classic Paper Award", "A Synthetic Classic Paper", ["Ann Lee", "Bo Chen"]],
    [2022, "tot", "Classic Paper Award", "Another Synthetic Classic Paper", ["Cy Diaz", "Dee Park", "Eli Ross"]],
    [2022, "runner-up", "Classic Paper Honorable Mention", "A Synthetic Honorable Classic", ["Fay Gray", "Gia Stone"]]
  ]);
});

test("IJCAI distinguished-paper page: <strong> title and <em> authors in the entry content", async () => {
  const { parse } = await import("../scripts/awards/ijcai.mjs");
  const html = `<nav>Distinguished Paper Awards</nav><div class="entry-content single-content">
<p class="x"><strong>A Synthetic Search Paper</strong><br><em>Ann Lee, Bo Chen, Cy S. Diaz</em></p>
<p class="x"><br><strong>A Second Synthetic Paper</strong><br><em>Dee Park; Eli Ross; Fay Gray</em></p>
</div><!-- .entry-content --><footer><p><strong>Not an entry</strong></p></footer>`;
  const e = parse(html, { year: 2023, source: "https://example.org/x/" });
  assert.deepEqual(e.map((x) => [x.venue, x.year, x.award, x.title, x.authors]), [
    ["IJCAI", 2023, "distinguished", "A Synthetic Search Paper", ["Ann Lee", "Bo Chen", "Cy S. Diaz"]],
    ["IJCAI", 2023, "distinguished", "A Second Synthetic Paper", ["Dee Park", "Eli Ross", "Fay Gray"]]
  ]);
});

// USENIX's best-papers list: an <h3> per conference-year, then a block per paper (title link, "Name, Affiliation; …").
test("USENIX best papers: conference and year from the section label, titles and first-name authors from the blocks", async () => {
  const { parse, sectionOf } = await import("../scripts/awards/usenix.mjs");
  assert.deepEqual(sectionOf("USENIX Security '25"), { venue: "USENIX Security", year: 2025 });
  assert.deepEqual(sectionOf("SOUPS 2025"), { venue: "SOUPS", year: 2025 });
  assert.deepEqual(sectionOf("OSDI '96"), { venue: "OSDI", year: 1996 });
  assert.deepEqual(sectionOf("5th Annual Tcl/Tk Workshop 1997"), { venue: "5th Annual Tcl/Tk Workshop", year: 1997 });
  assert.equal(sectionOf("Best Papers"), null);
  const block = (title, people) => `<div class="views-row views-row-1 odd">
  <div class="views-field views-field-title-1">        <span class="field-content"><a href="/x">${title}</a></span>  </div>
  <div class="views-field views-field-field-paper-people">        <div class="field-content">${people}</div>  </div>  </div>`;
  const html = `<h3><a href="/conference/usenixsecurity25">USENIX Security &#039;25</a></h3>
${block("A Synthetic Package Paper: On Hallucination", "Ann Lee, University of Nowhere; Bo Chen, Example Institute; Cy Diaz")}
${block("A Second Synthetic Paper", "Dee Park, University of Nowhere and Example Lab")}
<h3><a href="/conference/osdi23">OSDI &#039;23</a></h3>
${block("A Synthetic Systems Paper", "Eli Ross, Some University; Fay Gray, Some University")}`;
  const e = parse(html);
  assert.deepEqual(e.map((x) => [x.venue, x.year, x.award, x.awardLabel, x.title, x.authors]), [
    ["USENIX Security", 2025, "best", "USENIX Best Paper", "A Synthetic Package Paper: On Hallucination", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    ["USENIX Security", 2025, "best", "USENIX Best Paper", "A Second Synthetic Paper", ["Dee Park"]],
    ["OSDI", 2023, "best", "USENIX Best Paper", "A Synthetic Systems Paper", ["Eli Ross", "Fay Gray"]]
  ]);
});

test("SIGIR award pages: Year | Authors (one per line) | Citation, with the venue and kind of the page", async () => {
  const { parse } = await import("../scripts/awards/sigir.mjs");
  const html = `<h1>Best Paper Awards</h1><table><tbody><tr><th>Year</th><th>Authors</th><th>Citation</th></tr>
<tr><td>2025</td><td>Ann Lee<br/> Bo Chen<br/> Cy Diaz
</td><td><a href="https://dl.acm.org/doi/10.1/1">A Synthetic Retrieval Engine</a><br/>For a paper that is synthetic.</td></tr>
<tr><td>2024</td><td>Dee Park</td><td>A Title Without a Link</td></tr>
<tr><td>n/a</td><td>Nobody</td><td>Not a year row</td></tr></tbody></table>`;
  const e = parse(html, { venue: "SIGIR", award: "category", awardLabel: "Best Short Paper" }, "https://sigir.org/awards/x/");
  assert.deepEqual(e.map((x) => [x.venue, x.year, x.award, x.awardLabel, x.title, x.authors]), [
    ["SIGIR", 2025, "category", "Best Short Paper", "A Synthetic Retrieval Engine", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    ["SIGIR", 2024, "category", "Best Short Paper", "A Title Without a Link", ["Dee Park"]]
  ]);
});

test("SIGSOFT distinguished papers: conference and year from the heading's parentheses; 'Authors: Title' lines only, older formats are skipped", async () => {
  const { parse, sectionOf } = await import("../scripts/awards/sigsoft.mjs");
  assert.deepEqual(sectionOf("The IEEE/ACM International Conference on Automated Software Engineering (ASE 2025)"), { venue: "ASE", year: 2025 });
  assert.deepEqual(sectionOf("European Software Engineering Conference and Foundations of Software Engineering (ESEC/FSE 2017)"), { venue: "ESEC/FSE", year: 2017 });
  assert.equal(sectionOf("Search"), null);
  const html = `<h2 id=winners>Winners</h2>
<h3 id=a>The 47th International Conference on Software Engineering (ICSE 2025)</h3><p>Sun 16 - Thu 20 November, 2025</p><ul>
<li>Ann Lee, Bo Chen, Cy Diaz: A Synthetic Paper: With a Subtitle</li>
<li>Raoul van Doren, Dee Park: Another Synthetic Paper on Testing</li>
<li>L. Tang, J. Liu: An Initials-Style Synthetic Paper Title</li></ul>
<h3 id=b>Foundations of Software Engineering (FSE 2014)</h3><ul>
<li>Ann Lee, Bo Chen. Architecture Challenges for Internal Ecosystems: A Large-Scale Case Study</li></ul>
<h3 id=c>Search</h3><ul><li>Not: a winner entry in a heading without a year</li></ul>`;
  const e = parse(html);
  assert.deepEqual(e.map((x) => [x.venue, x.year, x.award, x.awardLabel, x.title, x.authors]), [
    ["ICSE", 2025, "distinguished", "ACM SIGSOFT Distinguished Paper", "A Synthetic Paper: With a Subtitle", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    ["ICSE", 2025, "distinguished", "ACM SIGSOFT Distinguished Paper", "Another Synthetic Paper on Testing", ["Raoul van Doren", "Dee Park"]],
    ["ICSE", 2025, "distinguished", "ACM SIGSOFT Distinguished Paper", "An Initials-Style Synthetic Paper Title", ["L. Tang", "J. Liu"]]
  ]);
});

test("the award readers' shared HTML helper: entities incl. accented letters, soft hyphens and zero-width spaces, <br> as a space", async () => {
  const { text, decode } = await import("../scripts/awards/html.mjs");
  assert.equal(decode("Z&uuml;gner &amp; TRI&Egrave;ST &#233;t&eacute; &#x4e2d; &nbsp;&unknown;"), "Zügner & TRIÈST été 中  &unknown;");
  assert.equal(text("<p>Bo&shy;chum­city​ <b>x</b><br/>y&nbsp;&nbsp;z</p>"), "Bochumcity x y z");
});

// SIGKDD's best-paper pages: <h2> track, <p><strong>AWARD</strong></p> label, then the paper (bold or linked title, authors with affiliations).
test("KDD best papers: track and award label give kind and label; bold or linked titles; affiliations dropped from the authors; a page in another form yields nothing", async () => {
  const { parse, awardOf } = await import("../scripts/awards/kdd.mjs");
  assert.deepEqual(awardOf("BEST PAPER AWARD"), { award: "best", label: "Best Paper" });
  assert.deepEqual(awardOf("BEST PAPER AWARD RUNNER-UP"), { award: "runner-up", label: "Best Paper Runner-up" });
  assert.deepEqual(awardOf("BEST STUDENT PAPER AWARD HONORABLE MENTION"), { award: "runner-up", label: "Best Student Paper Honorable Mention" });
  assert.deepEqual(awardOf("BEST STUDENT PAPER AWARD"), { award: "student", label: "Best Student Paper" });
  assert.equal(awardOf("Audience Appreciation Award"), null);
  const html = `<div class="entry-content notopmargin"><p>ACM SIGKDD is pleased to announce…</p>
<h2>Research Track</h2><p><strong>BEST PAPER AWARD</strong></p>
<p><strong>A Synthetic Graph Paper&#8203;</strong><br />\nAnn Lee (Some University);Bo Chen (Example Lab); Cy Z&uuml;ger</p>
<p><strong>BEST PAPER AWARD RUNNER-UP</strong></p>
<p><a href="https://example.org/x">A Linked Synthetic Title</a><br />\nDee Park (A University); Eli Ross (B Institute)&nbsp;</p>
<h2>Applied Data Science Track</h2><p><strong>BEST STUDENT PAPER AWARD</strong></p>
<p><strong>An Applied Synthetic Paper</strong><br />Fay Gray, Gia Stone</p>
<p><strong>Audience Appreciation Award</strong></p><p><strong>An Audience Favourite</strong><br />Hal Wu</p>
<div class="sidebar"><h4>Tags</h4><p><strong>Not a paper</strong><br />Nobody</p></div></div>`;
  const e = parse(html, 2025);
  assert.deepEqual(e.map((x) => [x.venue, x.year, x.award, x.awardLabel, x.title, x.authors]), [
    ["KDD", 2025, "best", "Best Paper", "A Synthetic Graph Paper", ["Ann Lee", "Bo Chen", "Cy Züger"]],
    ["KDD", 2025, "runner-up", "Best Paper Runner-up", "A Linked Synthetic Title", ["Dee Park", "Eli Ross"]],
    ["KDD", 2025, "student", "Best Student Paper (Applied Data Science)", "An Applied Synthetic Paper", ["Fay Gray", "Gia Stone"]]
  ]);
  assert.equal(e[0].source, "https://kdd.org/awards/view/2025-sigkdd-best-paper-award-winners");
  assert.deepEqual(parse("<div class=\"entry-content\"><p>ACM SIGKDD is pleased to announce that X is the winner of its Service Award.</p></div>", 2021), []);
});

// ICLR's own announcements (blog posts and the 2021 fact sheet) — four shapes of the same list, all synthetic here.
const ICLR_SRC = "https://blog.iclr.cc/2025/04/22/synthetic/";
const iclrPost = (title, body) => `<h1 class="post-title entry-title">${title}</h1><div class="entry-content"><div class="tb_text_wrap">${body}</div></div><!-- /.entry-content -->`;

test("ICLR blog, list items: a linked title with a full stop, <br>, the authors; Honorable Mentions get their own label; the committee line is not a paper", async () => {
  const { parseBlog } = await import("../scripts/awards/iclr.mjs");
  const html = iclrPost("Announcing the Outstanding Paper Awards", `<p>Awards Committee: Ann Lee, Bo Chen</p><h2><b>Selection Process</b></h2><p>The committee read 36 papers, and then it chose.</p>
<h2><b>Outstanding Papers</b></h2><ul>
<li><span><a href="https://openreview.net/forum?id=a">A Synthetic Paper about Testing Things.</a><br /></span><span>Cy Diaz, Dee Park, Eli van Ross.</span><span><br /></span></li>
<li><span><a href="https://openreview.net/forum?id=b">Another Synthetic Paper: With a Subtitle.</a><br /></span><span>Fay Gray, Jean-Luc Moreau, Tat-Seng Chua</span></li></ul>
<h2><b>Honorable Mentions</b></h2><ul><li><span><a href="https://openreview.net/forum?id=c">A Third Synthetic Paper on Speculation.</a><br /></span><span>Gia Stone, Hal Wu.</span></li></ul>`);
  const { entries, skipped } = parseBlog(html, { year: 2025, source: ICLR_SRC });
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.award, e.awardLabel, e.title, e.authors]), [
    ["ICLR", 2025, "outstanding", "Outstanding Paper", "A Synthetic Paper about Testing Things", ["Cy Diaz", "Dee Park", "Eli van Ross"]],
    ["ICLR", 2025, "outstanding", "Outstanding Paper", "Another Synthetic Paper: With a Subtitle", ["Fay Gray", "Jean-Luc Moreau", "Tat-Seng Chua"]],
    ["ICLR", 2025, "runner-up", "Honorable Mention", "A Third Synthetic Paper on Speculation", ["Gia Stone", "Hal Wu"]]
  ]);
  assert.ok(entries.every((e) => e.source === ICLR_SRC && e.evidence.includes(e.title)), "evidence quotes the title; source is the post");
  assert.deepEqual(skipped, []);
});

test("ICLR blog, sentences: “Title, by A, B, C” with linked names; the committee's comment under it is not read as authors", async () => {
  const { parseBlog } = await import("../scripts/awards/iclr.mjs");
  const html = iclrPost("Announcing the ICLR 2026 Outstanding Papers", `<p>Guest Post by the Committee (<a href="x">Ann Lee</a> (chair), <a href="y">Bo Chen</a>)</p>
<h3>Outstanding Papers</h3><p><a href="https://openreview.net/forum?id=a">A Synthetic Paper, with a Comma</a>, by <a href="x">Cy Diaz</a>, <a href="y">Dee Park</a>, <a href="z">Eli Ross</a></p>
<p>This theoretical work proposes a new perspective, namely, how <em>succinctly</em> it can be encoded, by Someone Else, Another One.</p>
<h3>Honorable Mention</h3><p><a href="https://openreview.net/forum?id=b">A Synthetic Honorable Paper</a>, by <a href="x">Fay Gray</a>, <a href="y">Robert M. Gower</a></p>
<h3>Selection Process</h3><p>Given the significant value, Ann Lee, Bo Chen, by Cy Diaz.</p>`);
  const { entries } = parseBlog(html, { year: 2026, source: ICLR_SRC });
  assert.deepEqual(entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["outstanding", "Outstanding Paper", "A Synthetic Paper, with a Comma", ["Cy Diaz", "Dee Park", "Eli Ross"]],
    ["runner-up", "Honorable Mention", "A Synthetic Honorable Paper", ["Fay Gray", "Robert M. Gower"]]
  ]);
});

test("ICLR blog, Test of Time: one paragraph (Title <br> Authors <br> link) under Test of Time / Runner Up headings; or, with no headings, a title paragraph and an authors paragraph", async () => {
  const { parseBlog } = await import("../scripts/awards/iclr.mjs");
  const withHeadings = iclrPost("Announcing the Test of Time Award Winners from ICLR 2015", `<p>We are honored to announce the awards, and congratulate Ann Lee.</p>
<h2><b>Test of Time</b></h2><p>A Synthetic Method for Optimization<br />Cy Diaz, Dee Ba<br /><a href="https://arxiv.org/abs/1">https://arxiv.org/abs/1</a> </p><p>As one of the most widely adopted methods, it changed how things are trained, and it is used everywhere.</p>
<h2><b>Runner Up</b></h2><p>A Synthetic Translation Paper<br />Eli Ross, Fay Gray, Gia Stone<br /><a href="https://arxiv.org/abs/2">https://arxiv.org/abs/2</a></p><p>Introducing a form of attention, this paper changed the field.</p>`);
  assert.deepEqual(parseBlog(withHeadings, { year: 2025, source: ICLR_SRC }).entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["tot", "Test of Time Award", "A Synthetic Method for Optimization", ["Cy Diaz", "Dee Ba"]],
    ["runner-up", "Test of Time Runner Up", "A Synthetic Translation Paper", ["Eli Ross", "Fay Gray", "Gia Stone"]]
  ]);
  const bare = iclrPost("Announcing the Test of Time Awards from ICLR 2016", `<p>We are honored to announce the Test of Time awards, which recognise papers.</p><p>Congratulations to the authors of the Test of Time winners!</p>
<p><a href="https://arxiv.org/abs/3"><em>A Synthetic Image Paper with Networks</em></a></p><p>Hal Wu, Ivy Xu, Jo Yan</p><p>This paper, colloquially called Synth, was one of the first demonstrations, with results, that mattered.</p>
<p><a href="https://arxiv.org/abs/4"><em>A Synthetic Control Paper</em></a></p><p>Kai Zu, Lu Mo</p><p>The award recognizes works that alter the trajectory, and this one did.</p>`);
  assert.deepEqual(parseBlog(bare, { year: 2026, source: ICLR_SRC }).entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["tot", "Test of Time Award", "A Synthetic Image Paper with Networks", ["Hal Wu", "Ivy Xu", "Jo Yan"]],
    ["tot", "Test of Time Award", "A Synthetic Control Paper", ["Kai Zu", "Lu Mo"]]
  ]);
});

test("ICLR 2021 fact sheet: a bullet per winner, wrapped over lines, “by A, B, and C”; the title printed without 'Beyond' is restored from the conference's poster page, quoted in the evidence", async () => {
  const { parseFactSheet } = await import("../scripts/awards/iclr.mjs");
  const txt = `Research Content:\n● 8 outstanding paper winners presented in 2 outstanding paper sessions\nPaper Award Winners:
● A Synthetic Paper about Learning with Things by Ann Lee, Bo Chen,
and Cy Diaz
● Fully-Connected Layers with Quaternions: Parameterization of Hypercomplex Multiplications with 1/n Parameters by Dee Park, Eli Ross, and Fay Gray
● Optimal Rates for Something under Some Regime by Gia Stone, and Hal Wu
Four of the Outstanding Paper Awards are featured in each of the Outstanding Paper sessions 1 and 2.\nLearn more about ICLR by Someone Else, Another.\n# # #`;
  const { entries, skipped } = parseFactSheet(txt, { source: "https://iclr.cc/media/Press/ICLR_2021_Fact_Sheet.pdf" });
  assert.deepEqual(entries.map((e) => [e.year, e.award, e.title, e.authors]), [
    [2021, "outstanding", "A Synthetic Paper about Learning with Things", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    [2021, "outstanding", "Beyond Fully-Connected Layers with Quaternions: Parameterization of Hypercomplex Multiplications with $1/n$ Parameters", ["Dee Park", "Eli Ross", "Fay Gray"]],
    [2021, "outstanding", "Optimal Rates for Something under Some Regime", ["Gia Stone", "Hal Wu"]]
  ]);
  assert.match(entries[1].evidence, /Fully-Connected Layers with Quaternions.*poster page \(https:\/\/iclr\.cc\/virtual\/2021\/poster\/3068\).*“Beyond Fully-Connected Layers/s, "the evidence quotes the Fact Sheet's title and the poster page's");
  assert.deepEqual(entries[1].alsoAt, ["https://iclr.cc/virtual/2021/poster/3068"], "the poster page is listed as a second source");
  assert.equal(entries[0].alsoAt, undefined);
  assert.deepEqual(skipped, []);
  assert.deepEqual(parseFactSheet("no award list here", {}).entries, []);
});

// ACL-family conference sites (scripts/awards/acl-sites.mjs): four shapes of the same list, synthetic here.
const ACL_SRC = "https://2023.example.org/program/best_papers/";
test("ACL-site reader, Jekyll lists: <li><p>Title<br><em>Authors</em></p> under Best Paper Awards and Outstanding Papers; wrapped author lines; underscores left by Markdown; a plain list of names is not a paper", async () => {
  const { parse } = await import("../scripts/awards/acl-sites.mjs");
  const html = `<nav><ul><li><a href="/x">Program</a></li></ul></nav><article class="page"><h1>Best Papers</h1><section class="page__content">
<h2 id="best-paper-awards">Best Paper Awards</h2><ul>
<li><p>A Synthetic Paper about Anchors and Words<br />
<em>Ann Lee, Bo Chen, Cy Diaz and Dee Park</em></p></li>
<li><p>A Toolkit with Underscores for Documents<br />
_Eli Ross, Fay Gray, Gia Stone _</p></li></ul>
<h2 id="outstanding-papers">Outstanding Papers</h2><ul>
<li>An Outstanding Synthetic Paper on Logic<br /> <em>Hal Wu, Ivy Xu and Jo Yan</em></li>
<li>A Paper with a Long Author List, Wrapped<br /> <em>Kai Zu, Lu Mo, Ned Oh,<br />
Pia Qi, Ray Sun</em></li></ul>
<h2>Best Demo Awards</h2><ul><li><p>A Demo System Paper Title<br /><em>Sue Tan, Tom Uy</em></p></li></ul>
<p>For the selection of the papers above, we thank our <strong>Best Paper Award committee</strong>:</p>
<p>Zed Zimmer, Some University, USA (chair)<br />Yan Xu, Other University, China</p>
</section></article>`;
  const { entries, skipped } = parse(html, { venue: "EMNLP", year: 2023, source: ACL_SRC });
  assert.deepEqual(entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["best", "Best Paper Award", "A Synthetic Paper about Anchors and Words", ["Ann Lee", "Bo Chen", "Cy Diaz", "Dee Park"]],
    ["best", "Best Paper Award", "A Toolkit with Underscores for Documents", ["Eli Ross", "Fay Gray", "Gia Stone"]],
    ["outstanding", "Outstanding Paper", "An Outstanding Synthetic Paper on Logic", ["Hal Wu", "Ivy Xu", "Jo Yan"]],
    ["outstanding", "Outstanding Paper", "A Paper with a Long Author List, Wrapped", ["Kai Zu", "Lu Mo", "Ned Oh", "Pia Qi", "Ray Sun"]]
  ]);
  assert.ok(entries.every((e) => e.venue === "EMNLP" && e.year === 2023 && e.source === ACL_SRC && e.evidence.includes(e.title)));
  assert.deepEqual(skipped, []);
});

test("ACL-site reader, blog posts: EMNLP 2021's <em>Title</em><br>Authors under Best Long / Short / Outstanding, and NAACL 2025's “Label:” in front of each item (SAC and demo awards left out, a committee list never read as a paper)", async () => {
  const { parse, classify } = await import("../scripts/awards/acl-sites.mjs");
  const blog2021 = `<article class="default blog"><section><h1>Best Paper Awards</h1><p>The Best Paper Awards aims to recognise the most outstanding papers, and so on.</p>
<h2 id="best-long-paper"><a href="#x" class="anchor before"><svg aria-hidden="true"><path d="M4 9"></path></svg></a>Best Long Paper</h2><p><em>A Synthetic Grounded Reasoning Paper</em><br>Ann Lee, Bo Chen and Cy Diaz</p>
<h2 id="best-short-paper">Best Short Paper</h2><p><em>A Synthetic Humor Paper</em><br>Dee Park, Eli Ross and Fay Gray</p>
<h2 id="outstanding-papers">Outstanding Papers</h2><p><em>A Synthetic Dialogue Paper</em><br>Gia Stone and Hal Wu  </p><p><em>A Single Author Synthetic Paper</em><br>Ivy Xu  </p>
<p>For the selection of the papers above, we thank our <strong>Best Paper Award committee</strong>:</p>
<p>Jo Yan, University of Somewhere, USA (chair)<br>Kai Zu, University of Elsewhere, China</p>
<h2 id="best-demonstration-paper">Best Demonstration Paper</h2><p><em>A Synthetic Demo Library</em></p><p>Lu Mo, Ned Oh</p></section></article>`;
  assert.deepEqual(parse(blog2021, { venue: "EMNLP", year: 2021, source: ACL_SRC }).entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["best", "Best Long Paper", "A Synthetic Grounded Reasoning Paper", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    ["category", "Best Short Paper", "A Synthetic Humor Paper", ["Dee Park", "Eli Ross", "Fay Gray"]],
    ["outstanding", "Outstanding Paper", "A Synthetic Dialogue Paper", ["Gia Stone", "Hal Wu"]],
    ["outstanding", "Outstanding Paper", "A Single Author Synthetic Paper", ["Ivy Xu"]]
  ]);
  const blog2025 = `<article class="page h-entry"><h1>Announcing the Award Winners!</h1><section class="page__content e-content"><p>Winners were selected through a blind process managed by our Best Paper Committee.</p>
<h2 id="best-paper-awards">Best Paper Awards</h2><ul>
<li><strong>Best Paper Award:</strong> <br /><em>A Synthetic Benchmark for Fine-grained Evaluation</em> \\ <br />
Ann Lee, Bo Chen, Cy Diaz <br />Ballroom A, Session I: Oral/Poster 6, Thursday May 1, 16:00-17:30</li>
<li><strong>Best Paper Runner-Up:</strong> <br /><em>A Synthetic Reliance Paper</em> <br />Dee Park, Eli Ross <br />Ballroom B, Session H: Oral/Poster 5</li>
<li><strong>Best Demo Award:</strong> <br /><em>A Synthetic Corpus Explorer Demo</em> <br />Fay Gray; Gia Stone <br />Posters</li>
<li><strong>Best Social Impact Award:</strong> <br /><em>A Synthetic Sign Language Paper</em> <br />Hal Wu <br />Online, Gather Session 1</li>
<li><strong>Best Theme Paper Runner-Up:</strong> <br /><em>A Synthetic Speech Synthesis Paper</em> <br />Ivy Xu, Jo Yan <br />Online</li></ul>
<h2 id="outstanding-papers">Outstanding Papers</h2><ul>
<li><em>An Outstanding Synthetic QA Paper</em> <br />Kai Zu, Lu Mo <br />Posters (Exhibit Hall), Session H: Oral/Poster 5, Thursday May 1, 14:00-15:30</li></ul>
<h2 id="senior-area-chair-sac-awards">Senior Area Chair (SAC) Awards</h2><ul>
<li><strong>SAC Award for Generation:</strong> <em>A Synthetic Decoding Paper</em> <br />Ned Oh, Pia Qi <br />Mesilla, Session B</li></ul></section></article>`;
  const r = parse(blog2025, { venue: "NAACL", year: 2025, source: ACL_SRC });
  assert.deepEqual(r.entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["best", "Best Paper Award", "A Synthetic Benchmark for Fine-grained Evaluation", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    ["runner-up", "Best Paper Runner-Up", "A Synthetic Reliance Paper", ["Dee Park", "Eli Ross"]],
    ["category", "Best Social Impact Award", "A Synthetic Sign Language Paper", ["Hal Wu"]],
    ["runner-up", "Best Theme Paper Runner-Up", "A Synthetic Speech Synthesis Paper", ["Ivy Xu", "Jo Yan"]],
    ["outstanding", "Outstanding Paper", "An Outstanding Synthetic QA Paper", ["Kai Zu", "Lu Mo"]]
  ]);
  // the kind rules, as the Anthology reader's
  assert.deepEqual([classify("Best Paper"), classify("Best Long Paper"), classify("Best Paper Awards")].map((c) => c.award), ["best", "best", "best"]);
  assert.deepEqual([classify("Best Special Theme Paper").award, classify("Best Resource Paper").award, classify("Best Student Paper").award, classify("Outstanding Papers").award], ["category", "category", "student", "outstanding"]);
  assert.equal(classify("People’s Choice Award"), null);
  assert.equal(classify("SAC Highlights"), null);
  assert.equal(classify("Outstanding Reviewers"), null);
  assert.equal(classify("Best Demo Award"), null);
});

// ACM SIGACT's STOC prize pages and SIGCOMM's Best Paper page — synthetic pages in the shapes the real ones use.
test("SIGACT STOC Best Paper page: a 'STOC <year>' heading, then “Title”, by Authors. (wrapped lines, initials, TeX in a title); the footer belongs to no year", async () => {
  const { parseBest } = await import("../scripts/awards/sigact.mjs");
  const html = `<h1>STOC Best Paper Award</h1><p>The Program Committee may designate up to four papers, by 2005 and so on.</p><h2>Winners</h2>
<p>STOC 2025</p><p>“A Synthetic Time and Space Paper”, by Ann Lee.</p><p>“A Paper with Several Authors”, by Bo Chen, Cy Diaz, and E. Q. Frost.</p>
<p>STOC 2024</p><p>“A Wrapped Title for the Test”, by<br>Dee Park and Eli Ross.</p><p>“Maths in $\\tilde O(n^{2})$ Titles”, by Fay Gray.</p>
<p>STOC 2003</p><p>“The Last Entry before the Footer”, by Gia Stone and Hal Wu.</p><p>&copy;&thinsp;2026 ACM SIGACT</p>`;
  const e = parseBest(html);
  assert.deepEqual(e.map((x) => [x.year, x.award, x.title, x.authors]), [
    [2025, "best", "A Synthetic Time and Space Paper", ["Ann Lee"]],
    [2025, "best", "A Paper with Several Authors", ["Bo Chen", "Cy Diaz", "E. Q. Frost"]],
    [2024, "best", "A Wrapped Title for the Test", ["Dee Park", "Eli Ross"]],
    [2024, "best", "Maths in $\\tilde O(n^{2})$ Titles", ["Fay Gray"]],
    [2003, "best", "The Last Entry before the Footer", ["Gia Stone", "Hal Wu"]]
  ]);
  assert.ok(e.every((x) => x.venue === "STOC" && x.source === "https://www.sigact.org/prizes/best_paper.html" && x.evidence.includes(x.title.slice(0, 12))));
});

test("SIGACT Test of Time page: '(30 Years)' / '(10 years)' either case, authors and title on one line or two, the paper's own year kept; the footer is not an entry", async () => {
  const { parseTestOfTime } = await import("../scripts/awards/sigact.mjs");
  const html = `<h2>Winners</h2><p>2026</p><p>(30 Years) Ann Lee, “A Synthetic Old Paper on Lattices”, 1996.</p><p>(20 Years) Bo Chen and Cy Diaz, “A Synthetic Middle-Aged Paper”, 2006.</p>
<p>2024</p><p>(30 years) A. Lee, B. Chen, and C. Diaz,<br>“Balanced Synthetic Allocations”, 1994.</p><p>(10 years) D. Park,<br>“A Synthetic Sparse Transform”, 2014.</p><p>&copy;&thinsp;2026 ACM SIGACT</p>`;
  const e = parseTestOfTime(html);
  assert.deepEqual(e.map((x) => [x.year, x.award, x.awardLabel, x.title, x.authors, x.paperYear]), [
    [2026, "tot", "Test of Time Award (30 years)", "A Synthetic Old Paper on Lattices", ["Ann Lee"], 1996],
    [2026, "tot", "Test of Time Award (20 years)", "A Synthetic Middle-Aged Paper", ["Bo Chen", "Cy Diaz"], 2006],
    [2024, "tot", "Test of Time Award (30 years)", "Balanced Synthetic Allocations", ["A. Lee", "B. Chen", "C. Diaz"], 1994],
    [2024, "tot", "Test of Time Award (10 years)", "A Synthetic Sparse Transform", ["D. Park"], 2014]
  ]);
});

test("SIGACT best student paper page: authors (with affiliations) on the line above the title, or in front of it on the same line", async () => {
  const { parseStudent } = await import("../scripts/awards/sigact.mjs");
  const html = `<h2>Winners</h2><p>2024</p><p>Ann Lee (Some University); Bo Chen (Example Lab)</p><p>“A Synthetic Student Paper on Sketching”</p>
<p>2021</p><p>Cy Diaz (Princeton University), Dee Park (Stanford University), and Eli Ross (Massachusetts Institute of Technology), “A Same-Line Synthetic Paper”.</p><p>Fay Gray (University of Oxford), “A Second Same-Line Synthetic Paper”.</p><p>&copy;&thinsp;2026 ACM SIGACT</p>`;
  const e = parseStudent(html);
  assert.deepEqual(e.map((x) => [x.year, x.award, x.title, x.authors]), [
    [2024, "student", "A Synthetic Student Paper on Sketching", ["Ann Lee", "Bo Chen"]],
    [2021, "student", "A Same-Line Synthetic Paper", ["Cy Diaz", "Dee Park", "Eli Ross"]],
    [2021, "student", "A Second Same-Line Synthetic Paper", ["Fay Gray"]]
  ]);
});

test("SIGCOMM Best Paper page: a line per winner, several winners joined by 'and', affiliations (nested too) dropped, one title without quotation marks", async () => {
  const { parse } = await import("../scripts/awards/sigcomm.mjs");
  const html = `<div><h1>Best Paper Award</h1><p>Some intro.</p><h2>Recent SIGCOMM Best Paper Award Winners</h2>
<p>2022: Ann Lee (Big Lab), Bo Chen (University of X (Department of Y)), "A Synthetic Network Paper"</p>
<p>2020: Cy Diaz, Dee Park (Instituto Superior), “First Synthetic Routing Paper” </p><p>and</p><p>Eli Ross, Fay Gray and Gia Stone (Google), “Second Synthetic Congestion Paper”</p>
<p>2012: Hal Wu, Ivy Xu, Multi-Resource Synthetic Queueing for Packets</p><p>2008: Jo Yan and Kai Zu, "A Synthetic Decoding Paper:  With a Subtitle".</p><p>acm sigcomm</p><p>2001: Not Read, "After the List Ends"</p></div>`;
  const { entries, notes } = parse(html);
  assert.deepEqual(entries.map((x) => [x.venue, x.year, x.award, x.title, x.authors]), [
    ["SIGCOMM", 2022, "best", "A Synthetic Network Paper", ["Ann Lee", "Bo Chen"]],
    ["SIGCOMM", 2020, "best", "First Synthetic Routing Paper", ["Cy Diaz", "Dee Park"]],
    ["SIGCOMM", 2020, "best", "Second Synthetic Congestion Paper", ["Eli Ross", "Fay Gray", "Gia Stone"]],
    ["SIGCOMM", 2012, "best", "Multi-Resource Synthetic Queueing for Packets", ["Hal Wu", "Ivy Xu"]],
    ["SIGCOMM", 2008, "best", "A Synthetic Decoding Paper: With a Subtitle", ["Jo Yan", "Kai Zu"]]
  ]);
  assert.equal(notes.length, 1, "the title without quotation marks is reported");
});

// IEEE S&P's own awards pages — three markups over the years, synthetic here.
test("S&P awards pages: the 2016 list, the 2017–2022 headings with <strong> titles, the 2023–2025 list-group items; workshop, reviewer and test-of-time awards are left out", async () => {
  const { parse, classify } = await import("../scripts/awards/sp.mjs");
  const src = "https://www.ieee-security.org/TC/SP2017/awards.html";
  const li = `<h1>Distinguished Papers</h1><ul>	<li>Distinguished Reviewer: <br>	Ann Lee	Some Lab		<li>Distinguished Practical Paper:  <br>	A Synthetic Practical Paper on Homes  <br>	Bo Chen (Univ A), Cy Diaz (Lab B), and Dee Park (Univ A, Ann Arbor)		<li>Distingushed Paper:  <br>	A2: A Synthetic Hardware Paper  <br>	Eli Ross, Fay Gray and Gia Stone (University of M)	</ul>`;
  assert.deepEqual(parse(li, { year: 2016, source: src }).entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["distinguished", "Distinguished Practical Paper", "A Synthetic Practical Paper on Homes", ["Bo Chen", "Cy Diaz", "Dee Park"]],
    ["distinguished", "Distinguished Paper", "A2: A Synthetic Hardware Paper", ["Eli Ross", "Fay Gray", "Gia Stone"]]
  ]);
  const headings = `<div class="container"><h1>Distinguished Paper Award</h1><h3>Sponsored by <a href="x"><img alt="G"></a></h3><hr>
<p><strong>A Synthetic Verified Paper about Protocols</strong><br>Hal Wu (INRIA), Ivy Xu (INRIA), and Jo Yan (INRIA)</p>
<h1>Distinguished Student Paper Award</h1><h3>Sponsored by <a href="y">Y</a></h3><hr>
<p><strong><em>A Synthetic Student Paper on Networks</em></strong>
Kai Zu (University of California, Berkeley) and Lu Mo (University of California, Berkeley)</p>
<h1>Distinguished Reviewer Awards</h1><p>Ned Oh (Lab)<br>Pia Qi (Lab)</p>
<h1>Workshop Awards</h1><h3>Third Synthetic Workshop on Privacy: Best Paper Award</h3><p><b>A Workshop Paper Title Here</b><br>Ray Sun (Univ)</p>
<h3>Mobile Security Technologies: Best Paper Award</h3><p><b>Another Workshop Paper Title</b><br>Sue Tan (Univ)</p>
<h1>Test of Time Award (1995-2006)</h1><p><strong>A Sense of Self for Unix Processes</strong> Tom Uy, 1996</p></div>`;
  assert.deepEqual(parse(headings, { year: 2017, source: src }).entries.map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["distinguished", "Distinguished Paper", "A Synthetic Verified Paper about Protocols", ["Hal Wu", "Ivy Xu", "Jo Yan"]],
    ["student", "Distinguished Student Paper", "A Synthetic Student Paper on Networks", ["Kai Zu", "Lu Mo"]]
  ]);
  const items = `<h1 id="distinguished-paper-awards">Distinguished Paper Awards</h1><div class="panel-group"><div class="list-group-item">
        <b>COBBL: A Synthetic Constraint Paper
        </b><br />Vic Wan<sup>1</sup>, Wes Xia<sup>1</sup>, Yui Zhao<sup>2</sup><br /><sup>1</sup>: Paderborn University, <sup>2</sup>: Institute</div>
 <div class="list-group-item"><b>Typing Synthetic Cryptography against Spectre</b><br />Zed Alpha (MPI-SP), Amy Beta (MPI-SP and IMDEA Software Institute)
 </div></div><h1>Test of Time Awards</h1><div class="list-group-item"><b>A Classic Synthetic Paper from Long Ago</b><br />Old Timer</div>`;
  assert.deepEqual(parse(items, { year: 2025, source: src }).entries.map((e) => [e.title, e.authors]), [
    ["COBBL: A Synthetic Constraint Paper", ["Vic Wan", "Wes Xia", "Yui Zhao"]],
    ["Typing Synthetic Cryptography against Spectre", ["Zed Alpha", "Amy Beta"]]
  ]);
  const best = `<h2>Best Paper Award</h2><h3>Sponsored by <a href="z">Z</a></h3><p><strong>A Synthetic Best Paper on Rowhammer</strong> Abe Cole (Univ), Bea Dunn (Univ)</p><h2>Best Practical Paper Award</h2><p><strong>An Analysis of Synthetic Pre-installed Software</strong> Cal Eden (Univ)</p>`;
  assert.deepEqual(parse(best, { year: 2020, source: src }).entries.map((e) => [e.award, e.awardLabel]), [["best", "Best Paper"], ["category", "Best Practical Paper"]]);
  assert.equal(classify("Distinguished Reviewer Awards"), null);
  assert.equal(classify("Test of Time Award (1995-2006)"), null);
});

// ACM SIGMOD's best-paper tables (SIGMOD and PODS) — synthetic rows in the shapes of the real page.
test("PODS best papers: <p><strong>year</strong><br>Authors:<br><a>Title</a></p>, more winners of the year in later paragraphs, one starting 'and'", async () => {
  const { parsePods } = await import("../scripts/awards/sigmod.mjs");
  const html = `<p>Rules of the award.</p><p><strong>Recipients of the Best Paper Award:</strong></p>
<p><strong>2024</strong><br />Ann Lee, and Bo Chen:<br /><a href="x"> A Synthetic Consistency Paper over Monoids</a></p>
<p>Cy Diaz, Dee Park, Eli Ross, and Fay Gray:       <br /><a class="external-link" href="y">A Second Synthetic Partitioning Paper</a></p>
<p><strong>2005</strong> <br />Gia Stone, Hal Wu:<br /><a href="z">On the Synthetic Complexity of Division and Joins</a></p><p>and  Ivy Xu, Jo Yan:<br /><a href="w">A Synthetic Paper on XML Exchange</a></p><p>Back to the top</p>`;
  assert.deepEqual(parsePods(html).map((e) => [e.venue, e.year, e.award, e.title, e.authors]), [
    ["PODS", 2024, "best", "A Synthetic Consistency Paper over Monoids", ["Ann Lee", "Bo Chen"]],
    ["PODS", 2024, "best", "A Second Synthetic Partitioning Paper", ["Cy Diaz", "Dee Park", "Eli Ross", "Fay Gray"]],
    ["PODS", 2005, "best", "On the Synthetic Complexity of Division and Joins", ["Gia Stone", "Hal Wu"]],
    ["PODS", 2005, "best", "A Synthetic Paper on XML Exchange", ["Ivy Xu", "Jo Yan"]]
  ]);
});

test("SIGMOD best papers table: sections with alternating Title / Authors lines, the 2021 mix, 'Title. Authors' lines and links, runner-up, wrapped authors", async () => {
  const { parseSigmod } = await import("../scripts/awards/sigmod.mjs");
  const row = (year, cell) => `<tr><td class="has-text-align-center"><strong>${year}</strong></td><td>${cell}</td></tr>`;
  const html = `<table>` +
    row("2024", `<strong>Research: Best Papers</strong><br>A Synthetic Views Paper over Graphs<br>Ann Lee and Bo Chen<strong>Honorable Mentions</strong><br>A Synthetic Reservoir Paper<br>Cy Diaz, Dee Park, and Eli Ross<br>Another Synthetic Cleaning Paper<br>Fay Gray<strong>Industry: Best Paper</strong><br>A Synthetic Cloud-Native Paper<br>Gia Stone, Hal Wu (Big Lab)<br><br><em>Source: <a href="x">https://2024.sigmod.org/sigmod_awards.shtml</a></em>`) +
    row("2021", `<strong>Data Management: Best Papers</strong><br>A Synthetic Learned Optimizer Paper.<br>Ivy Xu, Jo Yan, Kai Zu <p>A Synthetic Data Flow Paper. Lu Mo, Ned Oh, Pia Qi<strong>Data Science: Best Paper</strong><br>A Synthetic Slice Finding Paper. Ray Sun, Sue Tan</p>`) +
    row("2019", `<a class="external-link" href="http://doi.acm.org/1">A Synthetic Fairness : Repair Paper</a>. Tom Uy, Una Vo, and Vic Wan`) +
    row("2009", `A Synthetic Example Data Paper. Wes Xia, Yui Zhao<br>Zed Alpha, and Amy Beta<p>Runner-up: A Synthetic Recycling Paper. Bea Cole,<br>Cal Dunn, and Dee Eden</p>`) +
    `</table>`;
  const { entries } = parseSigmod(html);
  assert.deepEqual(entries.map((e) => [e.year, e.award, e.awardLabel, e.title, e.authors[0], e.authors.length]), [
    [2024, "best", "Best Paper", "A Synthetic Views Paper over Graphs", "Ann Lee", 2],
    [2024, "runner-up", "Best Paper Honorable Mention", "A Synthetic Reservoir Paper", "Cy Diaz", 3],
    [2024, "runner-up", "Best Paper Honorable Mention", "Another Synthetic Cleaning Paper", "Fay Gray", 1],
    [2024, "category", "Industry Track Best Paper", "A Synthetic Cloud-Native Paper", "Gia Stone", 2],
    [2021, "best", "Best Paper", "A Synthetic Learned Optimizer Paper", "Ivy Xu", 3],
    [2021, "best", "Best Paper", "A Synthetic Data Flow Paper", "Lu Mo", 3],
    [2021, "best", "Best Paper (Data Science)", "A Synthetic Slice Finding Paper", "Ray Sun", 2],
    [2019, "best", "Best Paper", "A Synthetic Fairness : Repair Paper", "Tom Uy", 3],
    [2009, "best", "Best Paper", "A Synthetic Example Data Paper", "Wes Xia", 2],
    [2009, "runner-up", "Best Paper Runner-up", "A Synthetic Recycling Paper", "Bea Cole", 1]
  ]);
  assert.ok(entries.every((e) => e.venue === "SIGMOD" && e.evidence.includes(e.title.slice(0, 10))));
});

test("SIGMOD Test of Time page: a year, then 'Title. Authors' lines (newer ones end in [award abstract]; initials too), a title with a full stop, two awards in one year, the footer not read", async () => {
  const { parseTot } = await import("../scripts/awards/sigmod.mjs");
  const html = `<p>Previous recipients of the Award are listed below. Not an entry.</p><h3>2026</h3><p>A Synthetic Elastic Warehouse. Ann Lee, Bo Chen, Cy Diaz and Dee Park <a href="x">[award abstract]</a></p>
<h3>2021</h3><p>No synthetic lunch in data privacy. E Ross, F Gray <a href="y">[award abstract]</a></p>
<h3>2006</h3><p>A Synthetic Clustering Method for Very Large Databases. Gia Stone, Hal Wu, Ivy Xu <a href="z">[award abstract]</a></p>
<p>Implementing Synthetic Cubes vs. Rollups. Jo Yan, Kai de Zu <a href="w">[award abstract]</a></p>
<h3>2005</h3><p>Synthetic Maintenance in a Warehouse (SMW). A. Beta, C. D. Gamma, and E. Delta-Eps</p>
<h3>2000</h3><p>A line whose authors are not names. lower case words only</p>
<h3>1999</h3><p>A Synthetic Higher-Order Language for Reasoning About Schemes. Fay Gray and Gil Hall</p>
<h4>ABOUT THE SITE</h4><p>This site is maintained by volunteers. We thank you for visiting! Ann Lee, Bo Chen</p>`;
  const { entries, skipped } = parseTot(html);
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.award, e.awardLabel, e.title, e.authors]), [
    ["SIGMOD", 2026, "tot", "Test of Time Award", "A Synthetic Elastic Warehouse", ["Ann Lee", "Bo Chen", "Cy Diaz", "Dee Park"]],
    ["SIGMOD", 2021, "tot", "Test of Time Award", "No synthetic lunch in data privacy", ["E Ross", "F Gray"]],
    ["SIGMOD", 2006, "tot", "Test of Time Award", "A Synthetic Clustering Method for Very Large Databases", ["Gia Stone", "Hal Wu", "Ivy Xu"]],
    ["SIGMOD", 2006, "tot", "Test of Time Award", "Implementing Synthetic Cubes vs. Rollups", ["Jo Yan", "Kai de Zu"]],
    ["SIGMOD", 2005, "tot", "Test of Time Award", "Synthetic Maintenance in a Warehouse (SMW)", ["A. Beta", "C. D. Gamma", "E. Delta-Eps"]],
    ["SIGMOD", 1999, "tot", "Test of Time Award", "A Synthetic Higher-Order Language for Reasoning About Schemes", ["Fay Gray", "Gil Hall"]]
  ]);
  assert.equal(skipped.length, 1, skipped.join("\n"));        // the line of the year 2000 whose "authors" are not names
  assert.ok(entries.every((e) => e.evidence.includes(e.title) && !("paperYear" in e)));
});

test("Dijkstra Prize page: 'Authors for “Title” in …' under a year's citation heading; two papers in a year, a wrapped citation, a starred year under the former name, dates in parentheses", async () => {
  const { parseDijkstra } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>Prize-winning papers</h2>
<h3>2026 citation</h3><p>Ann Lee, Bo Chen and Cy Diaz for “A Synthetic Verification and Approximation Paper“, which originally appeared in Proceedings of the Symposium, 2012.</p>
<h3>2025 citation</h3><p>Dee Park and Eli Ross (1948 – 2004) for “What Can Synthetic Nodes Compute Locally?” which originally appeared in STOC 1993.</p>
<h3>2023 citation</h3><p>Fay Gray, Gia Stone and Hal Wu for “A Synthetic Completeness Theorem” in Proceedings of STOC, May 1988, pages 1-10.</p>
<p>Ivy Xu for “A Synthetic Secret Sharing Protocol” in Proceedings of the 16th International Symposium on Distributed Computing (DISC), Toulouse, France, Octobe<br>2002, pages 339–353.</p>
<h3>2004 citation</h3><p>R. G. Alpha, P. A. Beta, and P. M. Gamma for “A Synthetic Distributed Spanning Algorithm” in TOPLAS 5(1):66-77, January 1983.</p>
<h3>2001 citation*</h3><p>Jo Yan and Kai Zu for “A Synthetic Impossibility of Consensus” in JACM, 1985.</p>
<h3>2000 citation*</h3><p>Not a line of an entry, and neither is the next.</p><p>A line that is not names for “A Synthetic Title That Is Read” in the Journal.</p>
<p>*The “Dijkstra Prize” was awarded under the name “PODC Influential-Paper Award” in the years 2000, 2001, and 2002.</p>
<h3>Award committee</h3><p>Lu Mo for “Not Read Because The Committee Is Not A List Of Papers” in x.</p>`;
  const { entries, skipped } = parseDijkstra(html);
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.award, e.awardLabel, e.title, e.authors]), [
    ["PODC/DISC", 2026, "tot", "Dijkstra Prize in Distributed Computing", "A Synthetic Verification and Approximation Paper", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    ["PODC/DISC", 2025, "tot", "Dijkstra Prize in Distributed Computing", "What Can Synthetic Nodes Compute Locally?", ["Dee Park", "Eli Ross"]],
    ["PODC/DISC", 2023, "tot", "Dijkstra Prize in Distributed Computing", "A Synthetic Completeness Theorem", ["Fay Gray", "Gia Stone", "Hal Wu"]],
    ["PODC/DISC", 2023, "tot", "Dijkstra Prize in Distributed Computing", "A Synthetic Secret Sharing Protocol", ["Ivy Xu"]],
    ["PODC/DISC", 2004, "tot", "Dijkstra Prize in Distributed Computing", "A Synthetic Distributed Spanning Algorithm", ["R. G. Alpha", "P. A. Beta", "P. M. Gamma"]],
    ["PODC", 2001, "tot", "PODC Influential-Paper Award", "A Synthetic Impossibility of Consensus", ["Jo Yan", "Kai Zu"]]
  ]);
  assert.equal(skipped.length, 1, skipped.join("\n"));       // the year 2000 line whose "authors" are not names
  assert.ok(entries.every((e) => e.evidence.includes(e.title) && !("paperYear" in e)));
  // with no footnote naming the former prize, a starred year is not read
  const bare = parseDijkstra(`<h3>2001 citation*</h3><p>Jo Yan and Kai Zu for “A Synthetic Impossibility of Consensus” in JACM, 1985.</p>`);
  assert.deepEqual([bare.entries.length, bare.skipped.length], [0, 1]);
});

test("SIGCHI program data: BEST_PAPER and HONORABLE_MENTION flags on the Papers track only (the type may be on the session), authors by person id, drafts and unknown flags not read", async () => {
  const { parseProgram } = await import("../scripts/awards/sigchi.mjs");
  const program = (over = {}) => ({
    conference: { id: 10999, shortName: "CHIPLAY", year: 2024, ...over.conference },
    publicationInfo: { version: 7, publicationStatus: "PUBLISHED", isDraft: false, ...over.publicationInfo },
    contentTypes: [{ id: 1, name: "Paper", displayName: "Papers" }, { id: 2, name: "Late Breaking", displayName: "Late-Breaking Work" }],
    sessions: [{ id: 50, typeId: 1 }],
    people: [{ id: 1, firstName: "Ann ", middleInitial: "J.", lastName: "Lee" }, { id: 2, firstName: "Bo", middleInitial: "", lastName: "de Chen" }, { id: 3, firstName: "Cy", lastName: "Diaz" }, { id: 4, firstName: "Madonna", lastName: "" },
      { id: 5, firstName: "Hao-Ping (Hank)", lastName: "Wu" }, { id: 6, firstName: 'Xuhai "Orson"', lastName: "Xu" }, { id: 7, firstName: "Florian ‘Floyd’", lastName: "Mueller" }, { id: 8, firstName: "Melanie Yi Ning,", lastName: "Quek" }, { id: 9, firstName: "Greg", lastName: "d'Eon" }],
    contents: [
      { id: 1, typeId: 1, title: "A Synthetic Paper about Fish &amp; Chips", award: "BEST_PAPER", authors: [{ personId: 1 }, { personId: 2 }] },
      { id: 2, sessionIds: [50], title: "A Synthetic Paper whose Type Is on its Session", award: "HONORABLE_MENTION", authors: [{ personId: 3 }] },
      { id: 3, typeId: 2, title: "A Synthetic Late-Breaking Work Paper", award: "BEST_PAPER", authors: [{ personId: 3 }] },
      { id: 4, typeId: 1, title: "A Synthetic Paper with an Unknown Flag", award: "AUDIENCE_CHOICE", authors: [{ personId: 3 }] },
      { id: 5, typeId: 1, title: "A Synthetic Paper with a Single-Name Author", award: "BEST_PAPER", authors: [{ personId: 4 }] },
      { id: 6, typeId: 1, title: "A Synthetic Paper with an Unknown Author", award: "BEST_PAPER", authors: [{ personId: 99 }] },
      { id: 7, typeId: 1, title: "A Synthetic Paper without a Flag", authors: [{ personId: 1 }] },
      { id: 8, typeId: 1, title: "A Synthetic Paper with Nicknames in its Authors", award: "HONORABLE_MENTION", authors: [{ personId: 5 }, { personId: 6 }, { personId: 7 }, { personId: 8 }, { personId: 9 }] },
      { id: 9, sessionIds: [50], title: "A Synthetic Paper whose Type Is on its Session", award: "HONORABLE_MENTION", authors: [{ personId: 3 }] }
    ],
    ...over.rest
  });
  const { entries, skipped } = parseProgram(program());
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.award, e.awardLabel, e.title, e.authors]), [
    ["CHI PLAY", 2024, "best", "Best Paper", "A Synthetic Paper about Fish & Chips", ["Ann J. Lee", "Bo de Chen"]],
    ["CHI PLAY", 2024, "runner-up", "Honorable Mention", "A Synthetic Paper whose Type Is on its Session", ["Cy Diaz"]],
    ["CHI PLAY", 2024, "runner-up", "Honorable Mention", "A Synthetic Paper with Nicknames in its Authors", ["Hao-Ping Wu", "Xuhai Xu", "Florian Mueller", "Melanie Yi Ning Quek", "Greg d'Eon"]]
  ]);                                                              // the paper listed twice (ids 2 and 9) is one entry
  assert.equal(entries[0].source, "https://files.sigchi.org/conference/cache/10999/7/program");
  assert.ok(entries.every((e) => e.evidence.includes(e.title)));
  assert.equal(skipped.length, 3, skipped.join("\n"));          // the unknown flag, the single-name author, the unknown author
  assert.deepEqual(parseProgram(program({ publicationInfo: { isDraft: true } })).entries, []);
  assert.deepEqual(parseProgram(program({ publicationInfo: { publicationStatus: "INTERNALLY_PUBLISHED" } })).entries, []);
});

test("SIGPLAN most-influential pages: authors over several source lines (and a name broken at a hyphen), '(for YYYY) Title' with and without a colon, a title that wraps, hand-typed stray quotes and commas, citations and the footer not read", async () => {
  const { parseSigplan } = await import("../scripts/awards/tot.mjs");
  const html = `<h1>Most Influential Synthetic Paper Award</h1><p>The award given in year N is for the paper of year N-10.</p><h2>Recipients</h2>
<h3>2026</h3><p>Ann Lee, Bo Chen (MIT), Cy Diaz, Dee Park, Eli Ross, Fay Gray, Pierre-
Yves Stone and
Hal Wu (Big Lab)
(for 2016): Dependent Types and Synthetic Effects in S*</p><p>Citation:</p><p>This paper introduced a thing. (for 1999) Not a heading, and 2005 is not a year line.</p>
<h3>2025</h3><p>Ivy Xu and Jo Yan
(for 2015) A Synthetic Garbage Collector with Low Overhead and
Consistent Utilization of Memory
Citation:
It was influential.</p>
<h3>2008</h3><p>Kai de Zu and Lu Mo"
(for 1998) Cayenne-like — a synthetic language with types,</p>
<h3>2007</h3><p>Not names at all, only lowercase words here
(for 1997) A Synthetic Title That Is Not Read</p>
<p>Page generated Thu, 08 Oct 2026 21:34:05 +0000</p><h3>2003</h3><p>Ned Oh
(for 1993) Never Read</p>`;
  const { entries, skipped } = parseSigplan(html, "POPL", "https://example.org/Awards/POPL/");
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.paperYear, e.award, e.awardLabel, e.title, e.authors]), [
    ["POPL", 2026, 2016, "tot", "Most Influential Paper Award", "Dependent Types and Synthetic Effects in S*", ["Ann Lee", "Bo Chen", "Cy Diaz", "Dee Park", "Eli Ross", "Fay Gray", "Pierre-Yves Stone", "Hal Wu"]],
    ["POPL", 2025, 2015, "tot", "Most Influential Paper Award", "A Synthetic Garbage Collector with Low Overhead and Consistent Utilization of Memory", ["Ivy Xu", "Jo Yan"]],
    ["POPL", 2008, 1998, "tot", "Most Influential Paper Award", "Cayenne-like — a synthetic language with types", ["Kai de Zu", "Lu Mo"]]
  ]);
  assert.equal(skipped.length, 1, skipped.join("\n"));       // the 2007 row whose "authors" are not names
  assert.ok(entries.every((e) => e.evidence.includes(e.title) && e.source === "https://example.org/Awards/POPL/"));
});

test("SIGMETRICS awards page: test-of-time rows (authors before the title or on its line, a title that wraps, a surname-first author, a paragraph that quotes words) and paper awards under category lines", async () => {
  const { parse } = await import("../scripts/awards/sigmetrics.mjs");
  const html = `<h2>The SIGMETRICS Test of Time Award</h2><p>Recognizes papers.</p><h3>Past Winners</h3>
<p>2024:</p><p>Ann Lee, Bo Chen, and Cy Diaz</p><p>"A Synthetic Measurement Study of Stores"</p><p>In Proceedings of ACM SIGMETRICS 2014.</p><p>A crawler that put "green" things next to "brown" things.</p>
<p>2018:</p><p>Dee Park, Eli Ross, and Fay Gray</p><p>"A synthetic counter architecture for per-flow measurement"</p><p>ACM SIGMETRICS Performance Evaluation Review 36.1 (2008): 121-132</p><p>This work revisits it.</p>
<p>2012:</p><p>Gia Stone, N Duffield, and D. Towsley. "Network Tomography on Synthetic Topologies." In Proceedings of ACM SIGMETRICS 2002.</p>
<p>2010:</p><p>Hal Wu and Ivy Xu.</p><p>"A Comparison of Synthetic Receiver-initiated and Sender-initiated</p><p>Adaptive Load Sharing."</p><p>In Proceedings of ACM SIGMETRICS 1985.</p><p>It provided results.</p>
<p>2017:</p><p>Zed, Kai J., Lu Mo, and Ned Oh.</p><p>"An analysis of synthetic errors in disk drives" In ACM SIGMETRICS Performance Evaluation Review, 2007.</p>
<p>Go back to top.</p><h2>Other</h2><p>Paper awards</p><p>This list is incomplete.</p>
<p>2026:</p><p>Best Paper Award:</p><p>"A Synthetic Envy Goes Long" by Pia Qi (Cornell University); Ray Sun (Northwestern University); Sue Tan (UMass; Allium).</p>
<p>Kenneth C. Sevcik Outstanding Student Paper Award:</p><p>"Synthetic Central Limit Rates" by Tom Uy, Una Vo (University of Wisconsin-Madison).</p>
<p>Best Paper Awards Runners-Up:</p><p>"A Synthetic Carbon Footprint of Flows" by Vic Wan, Wes Xia (University of Oxford).</p>
<p>2013:</p><p>Best Paper Award and the Ken Sevcik Outstanding Student Paper Award:</p><p>"Synthetic Queueing Topologies"by John Roe (MIT) and Kai Zu (MIT)</p>
<p>2011:</p><p>Kenneth C. Sevcik Outstanding Student Paper Award:</p><p>"Synthetic Network Architecture for Recovery" by Mia Ng</p><p>(Princeton University), Nat Ou (AT&T Labs), and and Orla Pe (Princeton University).</p>
<p>2001</p><p>2000</p><p>1996</p><p>Best Paper Award:</p><p>"A Synthetic Process Lifetime Distribution Paper" by Quin Ro (UCB).</p><p>"Not by anyone, so skipped for its authors" by lower case words only.</p>
<p>Follow @acmsigmetrics</p><p>2005:</p><p>Best Paper Award:</p><p>"Never Read" by Ann Lee.</p>`;
  const { entries, skipped } = parse(html, "https://example.org/awards.shtml");
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.award, e.awardLabel, e.title, e.authors]), [
    ["SIGMETRICS", 2024, "tot", "Test of Time Award", "A Synthetic Measurement Study of Stores", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    ["SIGMETRICS", 2018, "tot", "Test of Time Award", "A synthetic counter architecture for per-flow measurement", ["Dee Park", "Eli Ross", "Fay Gray"]],
    ["SIGMETRICS", 2012, "tot", "Test of Time Award", "Network Tomography on Synthetic Topologies", ["Gia Stone", "N Duffield", "D. Towsley"]],
    ["SIGMETRICS", 2010, "tot", "Test of Time Award", "A Comparison of Synthetic Receiver-initiated and Sender-initiated Adaptive Load Sharing", ["Hal Wu", "Ivy Xu"]],
    ["SIGMETRICS", 2017, "tot", "Test of Time Award", "An analysis of synthetic errors in disk drives", ["Kai J Zed", "Lu Mo", "Ned Oh"]],
    ["SIGMETRICS", 2026, "best", "Best Paper", "A Synthetic Envy Goes Long", ["Pia Qi", "Ray Sun", "Sue Tan"]],
    ["SIGMETRICS", 2026, "student", "Kenneth C. Sevcik Outstanding Student Paper Award", "Synthetic Central Limit Rates", ["Tom Uy", "Una Vo"]],
    ["SIGMETRICS", 2026, "runner-up", "Best Paper Runner-up", "A Synthetic Carbon Footprint of Flows", ["Vic Wan", "Wes Xia"]],
    ["SIGMETRICS", 2013, "student", "Ken Sevcik Outstanding Student Paper Award", "Synthetic Queueing Topologies", ["John Roe", "Kai Zu"]],
    ["SIGMETRICS", 2013, "best", "Best Paper", "Synthetic Queueing Topologies", ["John Roe", "Kai Zu"]],
    ["SIGMETRICS", 2011, "student", "Kenneth C. Sevcik Outstanding Student Paper Award", "Synthetic Network Architecture for Recovery", ["Mia Ng", "Nat Ou", "Orla Pe"]],
    ["SIGMETRICS", 1996, "best", "Best Paper", "A Synthetic Process Lifetime Distribution Paper", ["Quin Ro"]]
  ]);
  assert.equal(skipped.length, 1, skipped.join("\n"));       // the 1996 row whose authors are not names
  assert.ok(entries.every((e) => e.evidence.includes(e.title)));
});

test("FOCS test-of-time page: award-year blocks, 'NNNN award' groups, a names line ending in a colon and the title under it; a missing space after an initial; a line that is not names is skipped", async () => {
  const { parseFocs } = await import("../scripts/awards/tot.mjs");
  const html = `<p>Rules.</p><h2>Award Winners</h2><h3>At FOCS 2025:</h3><p>1995 award (citations):</p><p>Ann Lee, Bo Chen:</p><p>A Synthetic Retrieval Result</p>
<p>2005 award (citations):</p><p>Cy A.Diaz, Dee Park:</p><p>The Synthetic Games Conjecture and Cuts</p><p>Eli Ross Fay Gray Gil Hall Ivy Xu Jo Yan Kai Zu:</p><p>Names Run Together Without Commas</p>
<h3>At FOCS 2024:</h3><p>1994 award (citations):</p><p>Lu Mo:</p><p>Synthetic Algorithms for Quantum Things</p>`;
  const { entries, skipped } = parseFocs(html);
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.paperYear, e.award, e.title, e.authors]), [
    ["FOCS", 2025, 1995, "tot", "A Synthetic Retrieval Result", ["Ann Lee", "Bo Chen"]],
    ["FOCS", 2025, 2005, "tot", "The Synthetic Games Conjecture and Cuts", ["Cy A. Diaz", "Dee Park"]],
    ["FOCS", 2024, 1994, "tot", "Synthetic Algorithms for Quantum Things", ["Lu Mo"]]
  ]);
  assert.equal(skipped.length, 1, skipped.join("\n"));
});

test("IJCAI distinguished-paper pages of 2020, 2021 and 2022: list items, <strong> titles with wrapped affiliations and an Honorable Mention section, a heading per title", async () => {
  const { parse } = await import("../scripts/awards/ijcai.mjs");
  const src = "https://example.org/distinguished-papers/";
  const y2020 = `<h2 class="x">Distinguished papers</h2><ul><li>A Synthetic Explanation Paper from Reviews<br>Ann Lee, Bo W. Chen</li></ul><ul><li>A Synthetic Side-Effects Paper<br>Cy Diaz, Dee Park, Eli Ross</li></ul><p></p>
</div></div></article><div>Not content: <strong>Other Thing</strong></div>`;
  const wrap = `<div class="entry-content single-content">${y2020}`;
  assert.deepEqual(parse(wrap, { year: 2020, source: src }).map((e) => [e.year, e.award, e.title, e.authors]), [
    [2020, "distinguished", "A Synthetic Explanation Paper from Reviews", ["Ann Lee", "Bo W. Chen"]],
    [2020, "distinguished", "A Synthetic Side-Effects Paper", ["Cy Diaz", "Dee Park", "Eli Ross"]]
  ]);
  const y2021 = `<div class="entry-content clear" itemprop="text"><p><strong>A Synthetic Unsolvability Paper</strong><br>Fay Gray (Linköping University), Gia Stone (Universitat Pompeu Fabra), Hal Wu<br>(Linköping University)</p>
<p class="ec-pdf"><a href="x.pdf">PDF</a></p><p><br>O<strong>n a Synthetic Relation Between Theories</strong><br>Ivy Xu (KU Leuven), Jo Yan (Vrije Universiteit Brussel)</p>
<p><br><strong>A Synthetic Land Division Paper</strong><br>Kai Zu (University of Oxford), Lu Mo (Ariel University), Ned Oh (National<br>University of Singapore)</p>
<h2 class="wp-block-heading">Honorable Mention </h2><p><strong>A Synthetic Ontology Learning Paper</strong><br>Pia Qi (University of Bremen), Ray Sun (University of Hildesheim)</p></div><!-- .entry-content .clear -->`;
  assert.deepEqual(parse(y2021, { year: 2021, source: src }).map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["distinguished", "Distinguished Paper", "A Synthetic Unsolvability Paper", ["Fay Gray", "Gia Stone", "Hal Wu"]],
    ["distinguished", "Distinguished Paper", "On a Synthetic Relation Between Theories", ["Ivy Xu", "Jo Yan"]],
    ["distinguished", "Distinguished Paper", "A Synthetic Land Division Paper", ["Kai Zu", "Lu Mo", "Ned Oh"]],
    ["runner-up", "Distinguished Paper Honorable Mention", "A Synthetic Ontology Learning Paper", ["Pia Qi", "Ray Sun"]]
  ]);
  const y2022 = `<nav><h2>Menu item</h2></nav><main id="main"><h1 class="single-title">Distinguished Papers</h1>
<h2 class="wp-block-heading"><strong><em>A Synthetic Voting Rule Achieving Optimal Distortion</em></strong></h2>
<p>Sue Tan ( University of Southern California ) &nbsp;<br>Tom Uy ( University of Southern California )&nbsp; &nbsp;</p>
<h2 class="wp-block-heading"><strong><em>A Synthetic Proof-Number Search Paper</em></strong></h2><p>Una Vo ( Kotaicode GmbH )  <br>Vic Wan ( Bayer AG )  </p></main>`;
  assert.deepEqual(parse(y2022, { year: 2022, source: src }).map((e) => [e.title, e.authors]), [
    ["A Synthetic Voting Rule Achieving Optimal Distortion", ["Sue Tan", "Tom Uy"]],
    ["A Synthetic Proof-Number Search Paper", ["Una Vo", "Vic Wan"]]
  ]);
});

// The NDSS year pages' "<year> Awards" sections — synthetic, in the nestings of link, bold and <br> the real pages use.
test("NDSS year page: distinguished papers (link/bold/br in any nesting), honorable mentions, Cisco best paper and test-of-time with the paper's year; posters, workshops and the page's later sections are not read", async () => {
  const { parse, classify } = await import("../scripts/awards/ndss.mjs");
  const html = `<h2>2018 Programme</h2><p><a href="x"><strong>Not an Award Paper</strong></a><br>Zed Alpha (Lab)</p>
<h2 class="wp-block-heading">2019 Awards</h2>
<h3>NDSS Test of Time Awards</h3><p><strong>2000: </strong><a href="p.pdf"><strong>A Synthetic First Step Towards Detection</strong></a><br>Ann Lee, Bo Chen</p>
<p><strong><a href="q">A Synthetic Whitebox Fuzzing Paper (2008)</a><br></strong>Cy Diaz (Microsoft, Research), Dee Park (Microsoft, CSE), and Eli Ross (UC Berkley)</p>
<h3>NDSS 2019 Distinguished Paper Awards</h3>
<p><a href="y"><strong>A Synthetic Beacon Paper about Methylation</strong></a><br>Fay Gray (CISPA), Gia Stone (CISPA), and Hal Wu (UCL)</p>
<p><strong><a href="z">Synthetic Eavesdropping on Controllers<br></a></strong>Ivy Xu (George Mason University), Jo Yan (Georgia State University)</p>
<h3>NDSS 2019 Distinguished Paper Award Honorable Mentions</h3><p><a href="w"><strong>A Synthetic Oblivious Extensions Paper<br></strong></a>Kai Zu (UIUC)</p>
<h3>Cisco Network Security Best Paper Award</h3><p><a href="v"><strong>Synthetic Attack Discovery in Congestion Control</strong></a><br>Lu Mo (Purdue Univ.), Ned Oh (FIU)</p>
<h3>NDSS 2019 Distinguished Technical Poster Awards</h3><p><a href="u"><strong>A Poster Paper Title Here</strong></a><br>Pia Qi.</p>
<h3>MADWeb 2019 Best Paper</h3><p><a href="t"><strong>A Workshop Paper Title Here</strong></a><br>Ray Sun</p>
<h2>2019 Sponsors</h2><h3>Distinguished Paper Award</h3><p><a href="s"><strong>Not Read After the Awards Section</strong></a><br>Sue Tan</p>`;
  const { entries } = parse(html, { year: 2019, source: "https://www.ndss-symposium.org/ndss2019/" });
  assert.deepEqual(entries.map((e) => [e.award, e.awardLabel, e.title, e.authors, e.paperYear]), [
    ["tot", "Test of Time Award", "A Synthetic First Step Towards Detection", ["Ann Lee", "Bo Chen"], 2000],
    ["tot", "Test of Time Award", "A Synthetic Whitebox Fuzzing Paper", ["Cy Diaz", "Dee Park", "Eli Ross"], 2008],
    ["distinguished", "Distinguished Paper", "A Synthetic Beacon Paper about Methylation", ["Fay Gray", "Gia Stone", "Hal Wu"], undefined],
    ["distinguished", "Distinguished Paper", "Synthetic Eavesdropping on Controllers", ["Ivy Xu", "Jo Yan"], undefined],
    ["runner-up", "Distinguished Paper Honorable Mention", "A Synthetic Oblivious Extensions Paper", ["Kai Zu"], undefined],
    ["category", "Cisco Network Security Best Paper", "Synthetic Attack Discovery in Congestion Control", ["Lu Mo", "Ned Oh"], undefined]
  ]);
  assert.equal(classify("2026 Best Paper Award Winners").award, "best");
  assert.equal(classify("2024 Artifact Evaluation Award Winners"), null);
  assert.equal(classify("2023 Best Technical Poster Award Winner"), null);
});

// NeurIPS 2014–2018 and ICML 2017–2018 award pages (hand-typed, each year a different markup) — synthetic, in those markups.
test("old NeurIPS / ICML award pages: seven small markups, demos, reviewers and the page's footer left out", async () => {
  const { parsers } = await import("../scripts/awards/ml-archive.mjs");
  const page = (inner) => `<nav>menu <h3>Best Papers</h3></nav><!--JUst above the HTML in document-snippet.html--><div>${inner}</div></div></main><!--END BLOCK CONTENT--><footer><h4>Best paper award:</h4></footer>`;
  const src = "https://nips.cc/Conferences/2014/Awards";
  const n2014 = page(`<h2>NIPS 2014 Awards</h2><h3>Outstanding Paper Award</h3><h4> Sponsored by <span>Machine Learning Journal</span><br></h4> <a href="x" class="btn btn-primary">A Synthetic Hashing Paper for Search »</a><br><div class="relIndent">Ann Lee (Cornell University)<br> Bo Chen (Rutgers) </div> <br><br><a href="y" class="btn btn-primary">A* Synthetic Sampling »</a><br><div class="relIndent"> Cy Diaz (University of Toronto) <br> Dee Park (Microsoft Research)</div><div class="relIndent"> Eli Ross (Microsoft Research)</div> <h3>Outstanding Reviewer Awards</h3><ul><li>Fay Gray</li></ul>`);
  assert.deepEqual(parsers.neurips[2014](n2014, src).map((e) => [e.award, e.title, e.authors]), [
    ["outstanding", "A Synthetic Hashing Paper for Search", ["Ann Lee", "Bo Chen"]],
    ["outstanding", "A* Synthetic Sampling", ["Cy Diaz", "Dee Park", "Eli Ross"]]
  ]);
  const n2015 = page(`<h2>NIPS 2015 Awards</h2><h3>Outstanding Demonstration Award</h3><h4><a href="d">A Synthetic Demonstration Title »</a></h4><p><em>Gia Stone · Hal Wu</em><br></p><h3>Best papers</h3> <h4><a href="a">Competitive Synthetic Estimation: Why is It Good »</a></h4><em>Ivy Xu · Jo Yan</em> <h4><a href="b">Fast Synthetic Convergence of Learning in Games »</a></h4><em>Kai Zu · Lu Mo · Ned Oh</em> <h3>Best reviewers <span>Sponsored</span></h3> <p>Pia Qi<br>Ray Sun</p>`);
  assert.deepEqual(parsers.neurips[2015](n2015, src).map((e) => [e.award, e.title, e.authors]), [
    ["best", "Competitive Synthetic Estimation: Why is It Good", ["Ivy Xu", "Jo Yan"]],
    ["best", "Fast Synthetic Convergence of Learning in Games", ["Kai Zu", "Lu Mo", "Ned Oh"]]
  ]);
  const n2016 = page(`<h2>NIPS 2016 Awards</h2><h3>Best paper awards</h3><p><strong>Best paper award:</strong> Sue Tan, Tom Uy, Una Vo: <a href="v"><em><strong>Synthetic Value Iteration Networks</strong></em></a><br> <br> <strong>Best student paper award:</strong> Vic Wan, Wes Xia: Matrix Completion has <a href="m"><em><strong>No Synthetic Local Minimum</strong></em></a></p><p><strong>Best demonstration: </strong>Yui Zhao <a href="z"><em><strong>A Demo Title Here</strong></em></a></p>`);
  assert.deepEqual(parsers.neurips[2016](n2016, src).map((e) => [e.award, e.title, e.authors]), [
    ["best", "Synthetic Value Iteration Networks", ["Sue Tan", "Tom Uy", "Una Vo"]],
    ["student", "Matrix Completion has No Synthetic Local Minimum", ["Vic Wan", "Wes Xia"]]
  ]);
  const n2017 = page(`<h4><strong>Best paper awards:</strong></h4><ul><li>Zed Alpha, Amy Beta. <a href="x"><em>A Synthetic Subgame Solving Paper</em></a>.</li><li>Cal Dunn, Dee Eden, Fay Gray. <a href="y"><em>A Synthetic Kernel Goodness-of-Fit Test</em></a>.</li></ul><h4><strong>Test of time award:</strong> </h4><ul><li>Gia Stone, Hal Wu. Synthetic Random Features for Large-Scale Machines. NIPS 2007.</li></ul><h4>Best Demonstration</h4><ul><li><p>Ivy Xu · Jo Yan. <a href="d">A Demo Title Here</a></p></li></ul>`);
  assert.deepEqual(parsers.neurips[2017](n2017, src).map((e) => [e.award, e.title, e.authors, e.paperYear]), [
    ["best", "A Synthetic Subgame Solving Paper", ["Zed Alpha", "Amy Beta"], undefined],
    ["best", "A Synthetic Kernel Goodness-of-Fit Test", ["Cal Dunn", "Dee Eden", "Fay Gray"], undefined],
    ["tot", "Synthetic Random Features for Large-Scale Machines", ["Gia Stone", "Hal Wu"], 2007]
  ]);
  const n2018 = page(`<h3>Awards NeurIPS 2018</h3><h3 class="x">Best Papers</h3><p><em>Synthetic Non-delusional Q-learning</em><br> By: Kai Zu · Lu Mo · Ned Oh<br> <br> <em>Synthetic Neural Differential Equations</em><br> By: Pia Qi · Ray Sun</p> <br> <h3>Best Demonstration</h3><p><em>A Synthetic Robot Feeding Demonstration</em><br> By: Sue Tan · Tom Uy<br> <br></p>`);
  assert.deepEqual(parsers.neurips[2018](n2018, src).map((e) => [e.title, e.authors]), [
    ["Synthetic Non-delusional Q-learning", ["Kai Zu", "Lu Mo", "Ned Oh"]],
    ["Synthetic Neural Differential Equations", ["Pia Qi", "Ray Sun"]]
  ]);
  const i2017 = page(`<h3>ICML 2017 Awards</h3><h4><br> Test of Time Award</h4><p><strong>Combining Synthetic Online and Offline Knowledge</strong><br><em>Una Vo and Vic Wan</em><br> Remote presented</p><h4>Honorable Mentions</h4><p><strong>Pegasos: A Synthetic Sub-gradient Solver</strong><br><em>Wes Xia, Yui Zhao, Zed Alpha</em></p><h4>Best Paper Award</h4><p><strong>Understanding Synthetic Black-box Predictions</strong><br><em>Amy Beta, Cal Dunn</em></p><h4>Honorable Mentions</h4><p><strong>Lost Synthetic Relatives of the Gumbel Trick</strong><br><em>Dee Eden</em></p>`);
  assert.deepEqual(parsers.icml[2017](i2017, "https://icml.cc/Conferences/2017/Awards").map((e) => [e.award, e.awardLabel, e.title, e.authors]), [
    ["tot", "Test of Time Award", "Combining Synthetic Online and Offline Knowledge", ["Una Vo", "Vic Wan"]],
    ["runner-up", "Test of Time Honorable Mention", "Pegasos: A Synthetic Sub-gradient Solver", ["Wes Xia", "Yui Zhao", "Zed Alpha"]],
    ["best", "Best Paper", "Understanding Synthetic Black-box Predictions", ["Amy Beta", "Cal Dunn"]],
    ["runner-up", "Best Paper Honorable Mention", "Lost Synthetic Relatives of the Gumbel Trick", ["Dee Eden"]]
  ]);
  const i2018 = page(`<h3>ICML 2018 Awards</h3><h4>Best Paper Awards</h4><p><strong>Synthetic Obfuscated Gradients Give a False Sense</strong><br><em>Fay Gray, Gia Stone</em></p><h4>Best Paper Runner Up Awards</h4><p><strong>The Synthetic Mechanics of Differentiable Games</strong><br><em>Hal Wu</em></p><h4><strong>Test of Time Award</strong></h4><p><strong>A Synthetic Unified Architecture for Language Processing</strong><br><em>Ivy Xu and Jo Yan</em> (from ICML 2008)</p>`);
  const e18 = parsers.icml[2018](i2018, "https://icml.cc/Conferences/2018/Awards");
  assert.deepEqual(e18.map((e) => [e.award, e.awardLabel, e.paperYear]), [["best", "Best Paper", undefined], ["runner-up", "Best Paper Runner-up", undefined], ["tot", "Test of Time Award", 2008]]);
});

// ---- ACM CCS's and the VLDB Endowment's own award pages (synthetic pages in the markups the real ones use)

const lineHtml = (...ls) => ls.map((l) => `<p>${l}</p>`).join("\n");

test("ccs best-paper page: authors and title on one line, on two lines, with affiliations; a repeated authors line; a title made of capitalised words", async () => {
  const { parseBest } = await import("../scripts/awards/ccs.mjs");
  const html = lineHtml(
    "2023", "The Distinguished Paper Award winners for CCS 2023 are:",
    "Ann Lee, Bo Chen, and Cy Diaz, A Synthetic Title: On Testing, Trust and Time",
    "Dee Park and Eli Ross, Authenticated Synthetic Garbling and Efficient Secure Two-Party Computation",
    "2021", "The Best Paper award winners for CCS 2021 are:",
    "Fay Gray; Gia Stone (Some University); Hal Wu (Lab, City); Ivy Xu (Institute of Things, Chinese Academy of Sciences)",
    "A Synthetic Paper: With Affiliations in Parentheses",
    "2018", "The Best  Paper award winners for CCS 2018 are: (in no particular order)",
    "Jo Yan, Kai Zu,", "Another Synthetic Title For Two Lines",
    "Lu Mo and Ned Oh,", "A Title Before A Repeated Line Of Authors", "Lu Mo and Ned Oh",
    "Pia Qi, Ray Sun,", "Wes Xia,", "A Synthetic Title After Authors Over Two Lines",
    "2014", "The Best  Paper award winners for CCS 2014 are:", "Yui Zhao and J&oumlrg Alpha,", "Entities Without Their Semicolon: Jörg",
    "CCS 2014 Committee:", "Dr. Someone, Somewhere");
  const { entries } = parseBest(html);
  assert.deepEqual(entries.map((e) => [e.year, e.award, e.title, e.authors]), [
    [2023, "distinguished", "A Synthetic Title: On Testing, Trust and Time", ["Ann Lee", "Bo Chen", "Cy Diaz"]],
    [2023, "distinguished", "Authenticated Synthetic Garbling and Efficient Secure Two-Party Computation", ["Dee Park", "Eli Ross"]],
    [2021, "best", "A Synthetic Paper: With Affiliations in Parentheses", ["Fay Gray", "Gia Stone", "Hal Wu", "Ivy Xu"]],
    [2018, "best", "Another Synthetic Title For Two Lines", ["Jo Yan", "Kai Zu"]],
    [2018, "best", "A Title Before A Repeated Line Of Authors", ["Lu Mo", "Ned Oh"]],
    [2018, "best", "A Synthetic Title After Authors Over Two Lines", ["Pia Qi", "Ray Sun", "Wes Xia"]],
    [2014, "best", "Entities Without Their Semicolon: Jörg", ["Yui Zhao", "Jörg Alpha"]]
  ]);
  assert.ok(entries.every((e) => e.venue === "CCS" && e.evidence.includes(e.title) && e.source.startsWith("https://www.sigsac.org/")));
});

test("ccs test-of-time page: authors end in a colon (on one or two lines), the title is cut where the citation begins, the paper's year comes from it", async () => {
  const { parseTestOfTime } = await import("../scripts/awards/ccs.mjs");
  const html = lineHtml(
    "2023", "The test-of-time award winners for CCS 2023 are as follows:",
    "Ann Lee, Bo Chen, and Cy Diaz:", "A Synthetic Old Title: With a Colon.",
    "Pages 299-310, In Proceedings of the 20th ACM Conference on Computer and Communications Security, CCS 2013, Berlin, Germany. ACM 2013, ISBN: 978-1-4503-2477-9",
    "Dee Park, Eli Ross, Fay", "Gray, and Gia Stone:", "Another Synthetic Old Title.",
    "Pages 901-914, In Proceedings of the 20th ACM Conference on Computer and Communications Security, CCS 2013, Berlin, Germany. ACM 2013, ISBN:", "978-1-4503-2477-9",
    "2012", "The test-of-time award winners for CCS 2012 are two papers from ACM CCS 2002 (in no particular order). They were selected by",
    "a committee of PC members after careful consideration of any conflict of", "interest.",
    "Hal Wu and Ivy Xu:", "Synthetic Mimicry of Old Systems. Pages 255-264, In Vijayalakshmi Atluri (Ed.): Proceedings of the 9th ACM Conference on Computer and Communications Security, CCS 2002, Washington, DC, USA. ACM 2002, ISBN 1-58113-612-9",
    "2025", "The test-of-time award winner for CCS 2025 is as follows:", "Jo Yan, Kai Zu :", "Synthetic Privacy-Preserving Deep Learning");
  const { entries } = parseTestOfTime(html);
  assert.deepEqual(entries.map((e) => [e.year, e.title, e.authors, e.paperYear]), [
    [2023, "A Synthetic Old Title: With a Colon", ["Ann Lee", "Bo Chen", "Cy Diaz"], 2013],
    [2023, "Another Synthetic Old Title", ["Dee Park", "Eli Ross", "Fay Gray", "Gia Stone"], 2013],
    [2012, "Synthetic Mimicry of Old Systems", ["Hal Wu", "Ivy Xu"], 2002],
    [2025, "Synthetic Privacy-Preserving Deep Learning", ["Jo Yan", "Kai Zu"], undefined]
  ]);
  assert.ok(entries.every((e) => e.award === "tot" && e.evidence.includes(e.title)));
});

test("vldb test-of-time pages: winners and title lines with their citations; a same-year retrospective is not the award paper; the archive table's memorial talks are not read", async () => {
  const { parseCurrent, parseArchive, splitTitle } = await import("../scripts/awards/vldb.mjs");
  assert.deepEqual(splitTitle("Distributed Synthetic Graphlab: A framework for machine learning in the cloud. Proc. VLDB Endow. 5(8): 716-727 (2012)"), { title: "Distributed Synthetic Graphlab: A framework for machine learning in the cloud", paperYear: 2012 });
  assert.deepEqual(splitTitle("The Synthetic Casper: Location Services without Compromise. VLDB 2006: 763-774"), { title: "The Synthetic Casper: Location Services without Compromise", paperYear: 2006 });
  assert.deepEqual(splitTitle("How synthetic are query optimizers, really?"), { title: "How synthetic are query optimizers, really?", paperYear: null });
  const cur = lineHtml(
    "2023", "Award Winner: Ann Lee, Bo Chen, Cy Diaz", "Paper Title: Distributed Synthetic Graphlab: A framework for machine learning in the cloud. Proc. VLDB Endow. 5(8): 716-727 (2012)",
    "2019", "Award Winners: Dee Park, Eli Ross.", "Paper Title: A Synthetic Hybrid for Analytical Workloads. PVLDB 2(1): 922-933 (2009)",
    "Award Winners: Fay Gray and Gia Stone", "Paper Title: A Second Synthetic Hosted Data Platform. PVLDB 1(2): 1277-1288 (2008)",
    "2017", "Award Winner: Hal Wu", "Paper Title: Intelligent Synthetic Probing: Multi-Probe and Beyond. PVLDB 10(12): 2021-2024 (2017)");
  const a = parseCurrent(cur);
  assert.deepEqual(a.entries.map((e) => [e.year, e.title, e.authors, e.paperYear]), [
    [2023, "Distributed Synthetic Graphlab: A framework for machine learning in the cloud", ["Ann Lee", "Bo Chen", "Cy Diaz"], 2012],
    [2019, "A Synthetic Hybrid for Analytical Workloads", ["Dee Park", "Eli Ross"], 2009],
    [2019, "A Second Synthetic Hosted Data Platform", ["Fay Gray", "Gia Stone"], 2008]
  ]);
  assert.equal(a.skipped.length, 1, "the 2017 article is the award talk's retrospective");
  const arch = `<table><tr><td>Year</td><td>Award Winners</td><td>Paper Title</td></tr>
    <tr><td>2011</td><td><p>Ivy Xu, Jo Yan, and Kai Zu<br>(Ivy Xu and Jo Yan)</p></td><td><p>Synthetic Schema Matching With a Cupid<br>(Schema Matching, Ten Years Later)</p></td></tr>
    <tr><td rowspan="2">2002</td><td><p>Lu Mo<br>(Lu Mo)</p></td><td><p>Querying in Synthetic Mobile Environments<br>(Wireless Graffiti)</p></td></tr>
    <tr><td><p>Ned Oh and Pia Qi<br>(Pia Qi)</p></td><td><p>Performance Evaluation of a Synthetic Load
      Control Method<br>(Self-tuning Technology)</p></td></tr>
    <tr><td>2014</td><td><p>Ray Sun<br>(Ray Sun)</p></td><td><p>Listed On The Current Page Instead<br>(x)</p></td></tr></table>`;
  assert.deepEqual(parseArchive(arch).entries.map((e) => [e.year, e.awardLabel, e.title, e.authors, e.paperYear]), [
    [2011, "10-Year Award", "Synthetic Schema Matching With a Cupid", ["Ivy Xu", "Jo Yan", "Kai Zu"], 2001],
    [2002, "10-Year Award", "Querying in Synthetic Mobile Environments", ["Lu Mo"], 1992],
    [2002, "10-Year Award", "Performance Evaluation of a Synthetic Load Control Method", ["Ned Oh", "Pia Qi"], 1992]
  ]);
});

test("html: the old Latin-1 entities are read without their semicolon, the longest name first", async () => {
  const { decode } = await import("../scripts/awards/html.mjs");
  assert.equal(decode("J&oumlrg Schwenk, Noß, caf&eacute and R&Dteam, AT&T, &amp; &ouml;"), "Jörg Schwenk, Noß, café and R&Dteam, AT&T, & ö");
});

test("test-of-time lists on one page: WWW (winners over two lines, titles in quotes), ISCA ('For ISCA 2003' gives the paper's year), MICRO (a table per year)", async () => {
  const { parseWww, parseIsca, parseMicro } = await import("../scripts/awards/tot.mjs");
  const www = lineHtml(
    "The Web Conference 2017 - Seoul Test of Time Award", "(presented at The Web Conference 2017 in Perth)",
    "Winners: Ann Lee, Bo Chen, Cy Diaz, Dee Park,", "Eli Ross and Fay Gray", "for their paper \"A Synthetic Structure in the Web\".", "Read the Press Release (April 5, 2017)",
    "The Web Conference 2016 - Seoul Test of Time Award", "Winners: Dr Gia Stone, Professors Hal Wu, Ivy Xu, and Jo Yan", "for their paper \"Synthetic item-based filtering algorithms\".",
    "The Web Conference 2015 - First Seoul Test of Time Award", "Winner: Kai Zu", "for his paper \"The Synthetic Anatomy of a Search Engine\".");
  assert.deepEqual(parseWww(www).entries.map((e) => [e.venue, e.year, e.title, e.authors]), [
    ["WWW", 2017, "A Synthetic Structure in the Web", ["Ann Lee", "Bo Chen", "Cy Diaz", "Dee Park", "Eli Ross", "Fay Gray"]],
    ["WWW", 2016, "Synthetic item-based filtering algorithms", ["Gia Stone", "Hal Wu", "Ivy Xu", "Jo Yan"]],
    ["WWW", 2015, "The Synthetic Anatomy of a Search Engine", ["Kai Zu"]]
  ]);
  const isca = lineHtml(
    "Past Winners", "2024 (For ISCA 2003): Lu Mo, Ned Oh, Pia Qi, and Ray Sun", "Exploiting Synthetic Parallelism with a Polymorphous Architecture",
    "2012 (For ISCA 1997): Sue Tan, Tom Uy and Una Vo.", "“Complexity-Effective Synthetic Processors.”", "2003 (for ISCA 1988): Vic Wan and Wes Xia", "“On the synthetic properties of cache hierarchies”",
    "ACM SIGARCH");
  assert.deepEqual(parseIsca(isca).entries.map((e) => [e.year, e.paperYear, e.title, e.authors]), [
    [2024, 2003, "Exploiting Synthetic Parallelism with a Polymorphous Architecture", ["Lu Mo", "Ned Oh", "Pia Qi", "Ray Sun"]],
    [2012, 1997, "Complexity-Effective Synthetic Processors", ["Sue Tan", "Tom Uy", "Una Vo"]],
    [2003, 1988, "On the synthetic properties of cache hierarchies", ["Vic Wan", "Wes Xia"]]
  ]);
  const micro = `<h3 id="winners2025">2025</h3><table><thead><tr><th>Conference</th><th>Paper Title</th><th>Authors</th></tr></thead><tbody>
    <tr><td>MICRO 2006</td><td><a href="x">Synthetic Die Stacking Microarchitecture</a></td><td>Yui Zhao, Zed Alpha, Amy Beta</td></tr>
    <tr><td>MICRO 2007</td><td><a href="y">Optimizing Synthetic Cache Organizations with a Model</a></td><td>Cal Dunn and Dee Eden</td></tr></tbody></table>
    <h3 id="winners2024">2024</h3><table><tbody><tr><td>MICRO 2006</td><td>Utility-Based Synthetic Partitioning</td><td>Fay Gray</td></tr></tbody></table>`;
  assert.deepEqual(parseMicro(micro).entries.map((e) => [e.year, e.paperYear, e.title, e.authors]), [
    [2025, 2006, "Synthetic Die Stacking Microarchitecture", ["Yui Zhao", "Zed Alpha", "Amy Beta"]],
    [2025, 2007, "Optimizing Synthetic Cache Organizations with a Model", ["Cal Dunn", "Dee Eden"]],
    [2024, 2006, "Utility-Based Synthetic Partitioning", ["Fay Gray"]]
  ]);
});

test("usenix test-of-time page: title, wrapped authors, an optional citation line and 'Published in' (its year is the paper's); commented-out blocks and tags over a line break are not read", async () => {
  const { parse } = await import("../scripts/awards/usenix-tot.mjs");
  const html = `<h2>2025</h2>
<h3><a href="/conference/usenixsecurity25">USENIX Security '25</a></h3><div class="test">
<p class="title"><a href="/conference/x
">Comprehensive Synthetic Analyses of Attack Surfaces</a></p>
<p class="author">Ann Lee, Bo Chen, Cy Diaz, and Dee Park</p>
<p class="citation">Published in the <em>Proceedings of the 20th USENIX Security Symposium</em>, August 2011</p></div>
<h3><a href="/conference/fast25">FAST '25</a></h3><div class="test">
<p class="title"><a href="/conference/y">Efficient Synthetic Construction with Sampling</a></p>
<p class="author">Eli Ross, Fay Gray,
Gia Stone, and Hal Wu</p>
<p>For the invention of synthetic stack canaries.</p>
<p class="citation">Published in the <em>Proceedings of the Conference on File and Storage Technologies</em>, February 2015</p></div>
<!--<h3><a href="/conference/usenixsecurity20">USENIX Security '20</a></h3><div class="test">
<p class="title"><a href="/z">A Hidden Synthetic Entry in a Comment</a></p><p class="author">Ivy Xu and Jo Yan</p>
<p class="citation">Published in the <em>Proceedings of X</em>, July 1996</p></div>-->
<h2>2019</h2><h3><a href="/conference/nsdi19">NSDI '19</a></h3><div class="test"><p class="title">A Synthetic Radio Title Here</p><p class="author">Kai Zu</p><p class="citation">Published in the Proceedings of the 6th NSDI, April 2009</p></div>`;
  const { entries, skipped } = parse(html);
  assert.deepEqual(entries.map((e) => [e.venue, e.year, e.paperYear, e.title, e.authors]), [
    ["USENIX Security", 2025, 2011, "Comprehensive Synthetic Analyses of Attack Surfaces", ["Ann Lee", "Bo Chen", "Cy Diaz", "Dee Park"]],
    ["FAST", 2025, 2015, "Efficient Synthetic Construction with Sampling", ["Eli Ross", "Fay Gray", "Gia Stone", "Hal Wu"]],
    ["NSDI", 2019, 2009, "A Synthetic Radio Title Here", ["Kai Zu"]]
  ]);
  assert.deepEqual(skipped, []);
  assert.ok(entries.every((e) => e.award === "tot" && e.evidence.includes(e.title)));
});

test("SIGOPS Hall of Fame page: a heading per year, a list item per paper, the title is the first link", async () => {
  const { parseSigopsHof } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>Winners</h2>
<h2 class="x">2025</h2><ul>
<li>Jo Dean, Lu Barroso. For their paper, <a href="https://dl.acm.org/doi/1">The Tail at Scale</a>. In Communications of the ACM 2013. “Why it happens.”<br /><br /></li>
<li>Ann Chen, Bo Ziegler, and Cy Chajed. For their paper, <a href="https://dl.acm.org/doi/2">Using Crash Hoare Logic for Certifying the FSCQ File System</a>. In SOSP’15.</li></ul>
<h3>2015</h3><ul><li style="list-style-type: none;"><ul><li>David. L. Parnas. <a href="x">On the criteria to be used in decomposing systems into modules</a>. Communications of the ACM 15(12), 1972.<em> This paper …</em></li></ul></li></ul>
<h3>2022</h3><ul><li>Ann Corbett, Bo Dean, and Cy Woodford, Google, Inc. For their paper <a href="y">Spanner: Google’s Globally-Distributed Database</a>. In OSDI’12.</li></ul>
<h3>2005</h3><ul><li><a href="blog">Slow Software: The Case for High-latency</a> <span>August 2026</span></li></ul>`;
  const { entries, skipped } = parseSigopsHof(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), [
    "2025 The Tail at Scale | Jo Dean; Lu Barroso",
    "2025 Using Crash Hoare Logic for Certifying the FSCQ File System | Ann Chen; Bo Ziegler; Cy Chajed",
    "2015 On the criteria to be used in decomposing systems into modules | David L. Parnas",
    "2022 Spanner: Google’s Globally-Distributed Database | Ann Corbett; Bo Dean; Cy Woodford"
  ]);
  assert.ok(entries.every((e) => e.venue === "SIGOPS" && e.award === "tot" && e.awardLabel === "Hall of Fame Award"));
  assert.deepEqual(skipped, []);
});

test("EuroSys Test-of-Time page: the newest recipients under their heading, past ones dated, the undated one is paper year + 10", async () => {
  const { parseEurosysTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>EuroSys 2026 Test-of-Time Award Recipients</h2>
<p>Ann Cui, Bo Zhang, and Cy Ganger, for their EuroSys 2016 paper GeePS: Scalable Deep Learning on Distributed GPUs</p>
<h3>Past Recipients</h3>
<p>Dee Verma, Eli Pedrosa, and Fay Wilkes, for their EuroSys 2015 paper Large-scale cluster management at Google with Borg</p>
<p>2023: Gus Schwarzkopf, Hal Konwinski, for their EuroSys'13 paper Omega: flexible, scalable schedulers for large compute clusters</p>
<p>Contact Information: contact _at_ eurosys.org</p>`;
  const { entries, skipped } = parseEurosysTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2026/2016 GeePS: Scalable Deep Learning on Distributed GPUs | Ann Cui; Bo Zhang; Cy Ganger",
    "2025/2015 Large-scale cluster management at Google with Borg | Dee Verma; Eli Pedrosa; Fay Wilkes",
    "2023/2013 Omega: flexible, scalable schedulers for large compute clusters | Gus Schwarzkopf; Hal Konwinski"
  ]);
  assert.deepEqual(skipped, []);
});
