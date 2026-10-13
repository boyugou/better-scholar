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

test("IFAAMAS and SIGecom pages: three-line papers under 'YYYY:', title / authors / venue under a year heading", async () => {
  const { parseAamas, parseEcTot } = await import("../scripts/awards/tot.mjs");
  const a = parseAamas(`<p>Previous winners of the award have been:</p><p>2023:</p><p>Cal Claus, Dan Boutilier (1998)</p><p>The dynamics of reinforcement learning in cooperative multiagent systems</p><p>Proceedings of the Fifteenth National Conference on Artificial Intelligence - AAAI-98, pages 746-752</p>
<p>2019:</p><p>Bernstein, D. S., Zilberstein, S., &amp; Immerman, N. (2000, June)</p><p>The complexity of decentralized control of Markov decision processes</p><p>Proceedings of the Sixteenth Conference, pages 32-37</p>
<p>2020:</p><p>A. Procaccia and M. Tennenholtz (2009)</p><p>Approximate mechanism design without money</p><p>Proceedings of the 10th ACM Conference on Electronic Commerce, pages 177-186</p>`);
  assert.deepEqual(a.entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2023/1998 The dynamics of reinforcement learning in cooperative multiagent systems | Cal Claus; Dan Boutilier",
    "2020/2009 Approximate mechanism design without money | A. Procaccia; M. Tennenholtz"
  ]);
  assert.equal(a.skipped.length, 1);
  const e = parseEcTot(`<p>Test of Time Award Winners</p><p>2023</p><p>Marriage, honesty, and stability</p><p>Nia Immorlica and Mo Mahdian</p><p>Proceedings of the 16th Annual ACM-SIAM Symposium on Discrete Algorithms (SODA), 2005, pp. 53–62.</p>
<p>Unbalanced random matching markets</p><p>Ida Ashlagi, Yo Kanoria, Jay Leshno</p><p>Proceedings of the 14th ACM Conference on Electronic Commerce (EC), 2013, pp. 27–28.</p><p>"… for explaining an apparent gap."</p>
<p>2018</p><p>Position Auctions</p><p>Hal R. Varian</p><p>International Journal of Industrial Organization 25(6), 2007, pp. 1163–1178</p>`);
  assert.deepEqual(e.entries.map((x) => `${x.year} ${x.title} | ${x.authors.join("; ")}`), [
    "2023 Marriage, honesty, and stability | Nia Immorlica; Mo Mahdian",
    "2023 Unbalanced random matching markets | Ida Ashlagi; Yo Kanoria; Jay Leshno",
    "2018 Position Auctions | Hal R. Varian"
  ]);
  assert.deepEqual(e.skipped, []);
});

test("SIGPLAN's other awards: the ASPLOS Most Influential Paper rows (a year, the award line, authors, title with or without ', ASPLOS YYYY')", async () => {
  const { parseAsplosMip } = await import("../scripts/awards/tot.mjs");
  const html = `<p>2022</p><p>ASPLOS Most Influential Paper Award:</p><p>Shan Lu, Soyeon Park, and Yuanyuan Zhou</p><p>Learning from mistakes: a comprehensive study, ASPLOS 2008</p>
<p>2019</p><p>ASPLOS Most Influential Paper Award:</p><p>Emery D. Berger and Paul R. Wilson</p><p>Hoard: A Scalable Memory Allocator for Multithreaded Applications</p>
<p>2024</p><p>John Vlissides Award:</p><p>Noam Zilberstein, Cornell University</p>`;
  const { entries, skipped } = parseAsplosMip(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear || "-"} ${e.title} | ${e.authors.join("; ")}`), [
    "2022/2008 Learning from mistakes: a comprehensive study | Shan Lu; Soyeon Park; Yuanyuan Zhou",
    "2019/- Hoard: A Scalable Memory Allocator for Multithreaded Applications | Emery D. Berger; Paul R. Wilson"
  ]);
  assert.deepEqual(skipped, []);
});

test("IACR Test of Time page: a year heading, 'From Crypto 2010', a lead paragraph per paper; commented blocks are ignored; 'te Riele' is a name", async () => {
  const { parseIacrTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h2> 2026 </h2><!-- <h4> From Asiacrypt 2011 </h4> <p class="lead mb-0"> G </p> -->
<h4> From Eurocrypt 2011 </h4><p class="lead mb-0"> <a href="x">Semi-homomorphic Encryption and Multiparty Computation</a> by Rik Bendlin, Ivo Damgård, and Sal Zakarias </p><p> For pioneering … </p>
<h2> 2025 </h2><h4> From Crypto 2010 </h4><p class="lead mb-0"> <a href="y">Factorization of a 768-bit RSA modulus</a> by Thor Kleinjung, Joppe W. Bos, and Herman te Riele </p><p>For the landmark …</p>`;
  const { entries, skipped } = parseIacrTot(html);
  assert.deepEqual(entries.map((e) => `${e.venue} ${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "EUROCRYPT 2026/2011 Semi-homomorphic Encryption and Multiparty Computation | Rik Bendlin; Ivo Damgård; Sal Zakarias",
    "CRYPTO 2025/2010 Factorization of a 768-bit RSA modulus | Thor Kleinjung; Joppe W. Bos; Herman te Riele"
  ]);
  assert.deepEqual(skipped, []);
});

test("TCC Test of Time page: a heading per year, a paragraph per paper (links around the title and the names, affiliations in parentheses)", async () => {
  const { parseTccTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h4 class="mt-4 mb-1"> 2016 </h4><div><p> <a href="x">Calibrating Noise to Sensitivity in Private Data Analysis</a> by <a href="y">Cynthia Dwork</a> (Microsoft Research), <a>Frank McSherry</a>, and <a>Adam Smith</a> (Penn State)</i>. This paper was published in TCC 2006. The award is given for introducing … </p></div>
<h4 class="mt-4 mb-1">2015</h4><p class="mb-5"> <a href="z">Physically Observable Cryptography</a> by <a>Silvio Micali</a> (MIT) and <a>Leonid Reyzin</a> (Boston University). This paper was published in TCC 2004. The award is given for pioneering … </p>
<h2> Award committee members </h2><h4> Mihir Bellare </h4>`;
  const { entries, skipped } = parseTccTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2016/2006 Calibrating Noise to Sensitivity in Private Data Analysis | Cynthia Dwork; Frank McSherry; Adam Smith",
    "2015/2004 Physically Observable Cryptography | Silvio Micali; Leonid Reyzin"
  ]);
  assert.deepEqual(skipped, []);
});

test("SIGMOBILE Test-of-Time page: Authors. \"Title,\" Venue Year. — a title over two lines is joined, the 2018 'Surname, Given' rows are turned round, an unreadable one is skipped", async () => {
  const { parseSigmobileTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h3>2026 Paper Awardees</h3><p>Kay Jain, Jo Padhye, and Lil Qiu. "Impact of Interference on Multi-hop Wireless Network Performance," ACM MobiCom 2003.</p><p>What is the maximum achievable capacity of a wireless network? Although …</p>
<h3>2019 Paper Awardees</h3><p>Pat Mohan, Venkata N. Padmanabhan, and Ram Ramjee. "Nericell: Rich Monitoring of Road and Traffic Conditions using</p><p>Mobile Smartphones," ACM SenSys, 2008.</p>
<h3>2018 Paper Awardees</h3><p>Bianchi, Giuseppe. "Performance Analysis of the IEEE 802.11 Distributed Coordination Function." IEEE JSAC, 2000.</p><p>Kistler, James J., and Mahadev Satyanarayanan. "Disconnected operation in the Coda file system." ACM TOCS (1992).</p><p>The 2018 Committee Of Nine. "Something not in that style at all." ACM Foo 2001.</p><h3>Selection Committee</h3><p>Ann Lee. "A Sentence of Eight Words," in the committee text.</p>`;
  const { entries, skipped } = parseSigmobileTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2026/2003 Impact of Interference on Multi-hop Wireless Network Performance | Kay Jain; Jo Padhye; Lil Qiu",
    "2019/2008 Nericell: Rich Monitoring of Road and Traffic Conditions using Mobile Smartphones | Pat Mohan; Venkata N. Padmanabhan; Ram Ramjee",
    "2018/2000 Performance Analysis of the IEEE 802.11 Distributed Coordination Function | Giuseppe Bianchi",
    "2018/1992 Disconnected operation in the Coda file system | James J Kistler; Mahadev Satyanarayanan"
  ]);
  assert.equal(skipped.length, 1);
});

test("SenSys Test of Time page: `Authors: “Title,” …` rows, and the 2022 rows `Authors (affiliations). Title (2004).` on one line or two", async () => {
  const { parseSensysTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h3>2017</h3><p>Committee: Pat Dutta (UC Berkeley), Jo Liu (chair)</p><p>Awardees:</p><p>Pei Zhang, christopher Sadler, Stephen Lyon, and Margaret Martonosi: “Hardware Design Experiences in Zebranet,”  2nd ACM Conference on Embedded Networked Sensor Systems, 2004</p><p>“For pioneering low power design of sensing devices."</p>
<h3>2022</h3><p>Ning Xu (USC, USA), Alan Broad (Crossbow, USA). Ramesh Govindan (USC, USA).</p><p>A wireless sensor network for structural monitoring (2004).</p><p>"For its impact on early sensor networks."</p>
<p>Federico Ferrari (ETH Zurich), Marco Zimmerling (ETH Zurich), Lothar Thiele (ETH Zurich). Low-Power Wireless Bus (2012).</p>`;
  const { entries, skipped } = parseSensysTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear || "-"} ${e.title} | ${e.authors.join("; ")}`), [
    "2017/- Hardware Design Experiences in Zebranet | Pei Zhang; Christopher Sadler; Stephen Lyon; Margaret Martonosi",
    "2022/2004 A wireless sensor network for structural monitoring | Ning Xu; Alan Broad; Ramesh Govindan",
    "2022/2012 Low-Power Wireless Bus | Federico Ferrari; Marco Zimmerling; Lothar Thiele"
  ]);
  assert.deepEqual(skipped, []);
});

test("PKC and CHES Test of Time pages: the TCC template, and `<b>2024:</b> <a>Title</a>, Authors, CHES 2004.` list items", async () => {
  const { parseTccTot, parseChesTot } = await import("../scripts/awards/tot.mjs");
  const pkc = parseTccTot(`<h4 class="mt-4 mb-1">2022</h4><p>Two awards were given in 2022, for papers published in PKC 2005-2006.</p>
<p><a href="x">Curve25519: New Diffie-Hellman Speed Records</a> by Daniel J. Bernstein. This paper was published in PKC 2006.</p>
<p>The <a>2021 PKC Test of Time award ceremony</a> is available on Youtube.</p><h2>Award committee &amp; rules</h2>`, "src", "PKC");
  assert.deepEqual(pkc.entries.map((e) => `${e.venue} ${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), ["PKC 2022/2006 Curve25519: New Diffie-Hellman Speed Records | Daniel J. Bernstein"]);
  const ches = parseChesTot(`<ul><li> <b>2024:</b> <a href="d"> Correlation Power Analysis with a Leakage Model</a>, Eric Brier, Christophe Clavier, and Francis Olivier, CHES 2004. </li></ul>
<ul><li> <b>2025:</b> <a href="e"> A Very Compact S-box for AES</a>, David Canright, CHES 2005. </li></ul>`);
  assert.deepEqual(ches.entries.map((e) => `${e.venue} ${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "CHES 2024/2004 Correlation Power Analysis with a Leakage Model | Eric Brier; Christophe Clavier; Francis Olivier",
    "CHES 2025/2005 A Very Compact S-box for AES | David Canright"
  ]);
});

test("HPCA Test of Time page: `2026: “Title”` then `by A; B, published at HPCA 2007.`; an honorable mention is not read", async () => {
  const { parseHpcaTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h3>Previous winners</h3><p>2026: “Evaluating MapReduce for Multi-core and Multiprocessor Systems”</p><p>by Colby Ranger; Ramanan Raghuraman; Gary Bradski; Christos Kozyrakis, published at HPCA 2007.</p>
<p>2025: “Caches and hash trees for efficient memory integrity verification.”</p><p>by Blaise Gassend; G.Edward Suh; Marten van Dijk, published at HPCA 2003.</p>
<p>2020: “A Delay Model and Speculative Architecture for Pipelined Routers”</p><p>by L.S. Peh and W.J. Dally, published at HPCA 2001.</p>
<p>“Predictive Sequential Associated Cache”, B. Calder, D. Grunwald and J. Emer, HPCA 1996, has received honorable mention.</p>`;
  const { entries, skipped } = parseHpcaTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2026/2007 Evaluating MapReduce for Multi-core and Multiprocessor Systems | Colby Ranger; Ramanan Raghuraman; Gary Bradski; Christos Kozyrakis",
    "2025/2003 Caches and hash trees for efficient memory integrity verification | Blaise Gassend; G. Edward Suh; Marten van Dijk",
    "2020/2001 A Delay Model and Speculative Architecture for Pipelined Routers | L.S. Peh; W.J. Dally"
  ]);
  assert.deepEqual(skipped, []);
});

test("IMC Test of Time page: `\"Title\" by Authors, in ACM IMC 2009.` under a year; a row whose authors do not read is skipped", async () => {
  const { parseImcTot } = await import("../scripts/awards/tot.mjs");
  const html = `<p>2023:</p><p>"Energy Consumption in Mobile Phones:A Measurement Study" by Nia Balasubramanian, Aru Balasubramanian, Arun Venkataramani, in ACM IMC 2009.</p>
<p>2022:</p><p>"Avoiding Traceroute Anomalies with Paris Traceroute" by Brice Augustin, Xavier Cuvellier, and Renata Teixeira, in IMC 2006.</p><p>"Code-Red: A Case Study on the Spread" by David Moore, Colleen Shannon, k claffy, in ACM IMW 2002.</p>`;
  const { entries, skipped } = parseImcTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2023/2009 Energy Consumption in Mobile Phones:A Measurement Study | Nia Balasubramanian; Aru Balasubramanian; Arun Venkataramani",
    "2022/2006 Avoiding Traceroute Anomalies with Paris Traceroute | Brice Augustin; Xavier Cuvellier; Renata Teixeira"
  ]);
  assert.equal(skipped.length, 1);
});

test("IEEE VIS Test-of-Time page: a paper-year heading, then label / authors / title / (Awarded at: VIS 2025) / DOI; a row without 'Awarded at' is skipped", async () => {
  const { parseVisTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h1>IEEE VIS Test-of-Time Awards</h1><h2>2015</h2><p>10-Years InfoVis Test-of-Time Award</p><p>Kay Wongsuphasawat, Dom Moritz, Jeff Heer</p><p>Voyager: Exploratory Analysis via Faceted Browsing</p><p>(Awarded at: VIS 2025)</p><p>10.1109/TVCG.2015.2467191</p>
<p>10-Years VAST Test-of-Time Award</p><p>Stef van den Elzen, Danny Holten, Jarke J. van Wijk</p><p>Reducing Snapshots to Points: A Visual Analytics Approach</p><p>(Awarded at: VIS 2025)</p><p>10.1109/TVCG.2015.2468078</p>
<h2>1992</h2><p>25-Years VIS Test-of-Time Award</p><p>Thi Delmarcelle, Lam Hesselink</p><p>Visualization of second order tensor fields and matrix data</p><p>10.1109/VISUAL.1992.235193</p>`;
  const { entries, skipped } = parseVisTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.awardLabel} ${e.title} | ${e.authors.join("; ")}`), [
    "2025/2015 10-Year InfoVis Test of Time Award Voyager: Exploratory Analysis via Faceted Browsing | Kay Wongsuphasawat; Dom Moritz; Jeff Heer",
    "2025/2015 10-Year VAST Test of Time Award Reducing Snapshots to Points: A Visual Analytics Approach | Stef van den Elzen; Danny Holten; Jarke J. van Wijk"
  ]);
  assert.equal(skipped.length, 1);
});

test("ICDE Influential Paper Awards page: 'ICDE 2026' headings, authors / title lines, 'Authors: Title' over two lines, a row without separators is skipped", async () => {
  const { parseIcdeInfluential } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>ICDE Influential Paper Awards</h2><h3>ICDE 2021</h3><p>Alf Kemper, Tom Neumann</p><p>HyPer: A hybrid OLTP&amp;OLAP main memory database system based on virtual memory snapshots. ICDE 2011</p>
<h3>ICDE 2017</h3><p>Ash Machanavajjhala, Joe Gehrke, Dan Kifer and Muthu Venkitasubramaniam</p><p>l-Diversity: Privacy Beyond k-Anonymity. ICDE 2006.</p><p>Citation: L-diversity is method for sharing sensitive data.</p>
<h3>ICDE 2013</h3><p>Alon Y. Halevy Zachary G. Ives Dan Suciu Igor Tatarinov</p><p>Schema Mediation in Peer Data Management Systems. ICDE 2003</p><p>Sam Melnik, Hec Garcia-Molina, Erh Rahm: Similarity Flooding</p><p>A Versatile Graph Matching Algorithm and its Application to Schema Matching. ICDE 2002</p><h2>Award Selection Process</h2>`;
  const { entries, skipped } = parseIcdeInfluential(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2021/2011 HyPer: A hybrid OLTP&OLAP main memory database system based on virtual memory snapshots | Alf Kemper; Tom Neumann",
    "2017/2006 l-Diversity: Privacy Beyond k-Anonymity | Ash Machanavajjhala; Joe Gehrke; Dan Kifer; Muthu Venkitasubramaniam",
    "2013/2002 Similarity Flooding: A Versatile Graph Matching Algorithm and its Application to Schema Matching | Sam Melnik; Hec Garcia-Molina; Erh Rahm"
  ]);
  assert.equal(skipped.length, 1);
});

test("ISMAR past-symposia page: per symposium an Awards block of label / title / Recipients lines (and the 2025 and 2019 variants)", async () => {
  const { parseIsmarAwards } = await import("../scripts/awards/tot.mjs");
  const html = `<p>ISMAR 2025 - Daejeon, South Korea</p><p>Awards</p><p>Best Paper Award</p><p>Recipients: Negotiated User-to-Group Teleportations in Social VR — Wen-Tong Shu, Yi-Jun Li, and Miao Wang</p>
<p>Best Paper Awards Honorable Mention</p><p>Recipients: Exploring and Modeling the Effects of Eye-Tracking Accuracy — Xuning Hu and Yuxin Shen</p><p>Best Poster Award</p><p>Recipients: A Poster About Something — Pat Poster</p>
<p>ISMAR 2023 - Australia, Sydney</p><p>Awards</p><p>ISMAR 2023 Career Impact Award</p><p>Recipient: Kato, Hirokazo</p><p>ISMAR Paper Impact Award</p><p>Experiences with handheld augmented reality. In 2007 IEEE International Symposium on Mixed and Augmented Reality (pp. 3-18). IEEE.</p><p>Recipients: Schmalstieg, D., and Wagner, D.</p>
<p>ISMAR 2019 - Beijing, China</p><p>Awards</p><p>Best Impact Paper Award</p><p>Recipients: Henderson, S. J., and Feiner, S.</p><p>for the paper "Evaluating the benefits of augmented reality for task localization in maintenance of an armored personnel carrier turret."</p>`;
  const { entries, skipped } = parseIsmarAwards(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2025 best Negotiated User-to-Group Teleportations in Social VR | Wen-Tong Shu; Yi-Jun Li; Miao Wang",
    "2025 runner-up Exploring and Modeling the Effects of Eye-Tracking Accuracy | Xuning Hu; Yuxin Shen",
    "2023 tot Experiences with handheld augmented reality | D. Schmalstieg; D. Wagner",
    "2019 tot Evaluating the benefits of augmented reality for task localization in maintenance of an armored personnel carrier turret | S. J. Henderson; S. Feiner"
  ]);
  assert.deepEqual(skipped, []);
});

test("ICSE Most Influential Paper page: a year line, then wrapped free text 'Authors: Title, ICSE-37, 2015'; 'No award.' is left out; Latin Extended-A entities are decoded", async () => {
  const { parseIcseMip } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>RECIPIENTS AND TITLE OF THE MOST INFLUENTIAL PAPER AWARD</h2><p>2025</p><p>Li Li, Alexandre Bartel, Tegawendé F. Bissyandé,</p><p>Jacques Klein, Yves Le Traon: IccTA:</p><p>Detecting Inter-Component Privacy Leaks in Android Apps ICSE-37, 2015</p>
<p>2013</p><p>Davor &Ccaron;ubrani&cacute; and Gail C. Murphy: Hipikat: Recommending</p><p>Pertinent Software Development Artifacts, ICSE-25, 2003</p><p>2006</p><p>No Award.</p>
<p>1997</p><p>Manny Lehman: Process Models, Process Programs, Programming Support, ICSE-9,</p><p>1987.</p><p>Lee Osterweil: Software Processes are Software Too, ICSE-9, 1987.</p>`;
  const { entries, skipped } = parseIcseMip(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2025/2015 IccTA: Detecting Inter-Component Privacy Leaks in Android Apps | Li Li; Alexandre Bartel; Tegawendé F. Bissyandé; Jacques Klein; Yves Le Traon",
    "2013/2003 Hipikat: Recommending Pertinent Software Development Artifacts | Davor Čubranić; Gail C. Murphy",
    "1997/1987 Process Models, Process Programs, Programming Support | Manny Lehman",
    "1997/1987 Software Processes are Software Too | Lee Osterweil"
  ]);
  assert.deepEqual(skipped, []);
});

test("LICS Test-of-Time page: a heading per year, per paper the authors as links and the title in bold; 'C.-H.' is an initial", async () => {
  const { parseLicsTot } = await import("../scripts/awards/tot.mjs");
  const html = `<ul><li><h3>LICS Test-of-Time Award Winner in 2026</h3><p>All papers from LICS 2006 were considered for the 2026 LICS Test-of-Time Award.</p>
<div><i><a href="a">C.-H. Luke Ong</a><a></a></i><br><b>On model-checking trees generated by higher-order recursion schemes</b><a></a><a class="infolink">More Information...</a></div><p>This paper established …</p>
<div><i><a href="b">Nir Piterman</a><a></a></i><br><b>From Nondeterministic Büchi and Streett Automata to Deterministic Parity Automata</b></div></li>
<li><h3>LICS Test-of-Time Award Winner in 2025</h3><div><i><a>Joël Ouaknine</a><a>James Worrell</a></i><br><b>On the Decidability of Metric Temporal Logic</b></div></li></ul>`;
  const { entries, skipped } = parseLicsTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2026/2006 On model-checking trees generated by higher-order recursion schemes | C.-H. Luke Ong",
    "2026/2006 From Nondeterministic Büchi and Streett Automata to Deterministic Parity Automata | Nir Piterman",
    "2025/undefined On the Decidability of Metric Temporal Logic | Joël Ouaknine; James Worrell"
  ]);
  assert.deepEqual(skipped, []);
});

test("LICS Distinguished Papers page: a heading '<a>LICS 2026</a>, Place', per paper the authors as links and the title in bold", async () => {
  const { parseLicsDistinguished } = await import("../scripts/awards/tot.mjs");
  const html = `<h3><a href="2026/index.html">LICS 2026</a>, Lisbon, Portugal </h3><div><i><a>Shaull Almagor</a><a></a> <a>Guy Arbel</a></i><br><b>A Complexity Bound for Determinisation of Min-Plus Weighted Automata</b><a class="infolink">More Information...</a></div>
<div><i><a>Romain P&eacute;choux</a></i><br><b>Quantum Control and General Recursion Beyond the Unitary Case</b></div><h3><a href="2025/index.html">LICS 2025</a>, Singapore</h3><div><i><a>Jamie Tucker-Foltz</a></i><br><b>Inapproximability of Unique Games in Fixed-Point Logic with Counting</b></div>`;
  const { entries, skipped } = parseLicsDistinguished(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2026 distinguished A Complexity Bound for Determinisation of Min-Plus Weighted Automata | Shaull Almagor; Guy Arbel",
    "2026 distinguished Quantum Control and General Recursion Beyond the Unitary Case | Romain Péchoux",
    "2025 distinguished Inapproximability of Unique Games in Fixed-Point Logic with Counting | Jamie Tucker-Foltz"
  ]);
  assert.deepEqual(skipped, []);
});

test("AAAI Classic Paper page: a year heading, per paper '<em>Classic Paper Recipients:</em> <strong>Authors</strong><br>Title presented at …'; a row of two papers is skipped", async () => {
  const { parseAaaiClassic } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>Past Recipients</h2><h3>2025</h3><ul><li><em>Classic Paper Recipients:</em> <strong>Tom Mitchell, Andrew Carlson, and Estevam Hruschka</strong><br>Toward an Architecture for Never-Ending Language Learning</li></ul>
<h3>2022</h3><ul><li><em>Classic Paper Award Recipients:</em> <strong>Michael Montemerlo, Sebastian Thrun</strong><br>Winning the DARPA Grand Challenge with an AI Robot presented at the Twenty-First National Conference</li>
<li><em>Classic Paper Honorable Mention Recipients:</em> <strong>Rada Mihalcea, Courtney Corley, and Carlo Strapparava</strong><br>Corpus-Based and Knowledge-Based Measures of Text Semantic Similarity presented at the Twenty-First</li></ul>
<h3>2011</h3><ul><li><em>Classic Paper Award Corecipients:</em> <strong>Hector Levesque, David Mitchell, and Bart Selman</strong><br>for their two papers Hard and Easy Distribution of SAT Problems and A New Method</li></ul>`;
  const { entries, skipped } = parseAaaiClassic(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2025 tot Toward an Architecture for Never-Ending Language Learning | Tom Mitchell; Andrew Carlson; Estevam Hruschka",
    "2022 tot Winning the DARPA Grand Challenge with an AI Robot | Michael Montemerlo; Sebastian Thrun",
    "2022 runner-up Corpus-Based and Knowledge-Based Measures of Text Semantic Similarity | Rada Mihalcea; Courtney Corley; Carlo Strapparava"
  ]);
  assert.equal(skipped.length, 1);
});

test("ICAPS awards page: 'ICAPS Influential Paper Award 2026', lines 'WinnerAuthors. Title. (ICAPS 2013)', honorable mentions; initials do not end the authors", async () => {
  const { parseIcapsInfluential } = await import("../scripts/awards/tot.mjs");
  const html = `<h3>ICAPS Influential Paper Award 2017</h3><p>WinnerMaxim Likhachev, David I. Ferguson, Geoffrey J. Gordon, Anthony Stentz, Sebastian Thrun. Anytime Dynamic A*: An Anytime, Replanning Algorithm. (ICAPS 2005)Computing paths for robots</p>
<p>Honorable MentionsRonen Brafman and Joerg Hoffmann. Conformant Planning via Heuristic Forward Search: A New Approach. (ICAPS 2004)This work adapted</p><p>Marco Pistore, Paolo Traverso, Piergiorgio Bertoli. Automated Composition of Web Services by Planning in Asynchronous Domains. (ICAPS 2005)This paper provides</p>
<h3>ICAPS Best Dissertation Award 2017</h3><p>WinnerThomas Keller for his dissertation Anytime Optimal MDP Planning.</p><p>Awards committee: Scott Sanner (chair)</p>
<h3>ICAPS Influential Paper Award 2015</h3><p>There is no paper award this year due to lack of nominations.</p>`;
  const { entries, skipped } = parseIcapsInfluential(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2017 tot Anytime Dynamic A*: An Anytime, Replanning Algorithm | Maxim Likhachev; David I. Ferguson; Geoffrey J. Gordon; Anthony Stentz; Sebastian Thrun",
    "2017 runner-up Conformant Planning via Heuristic Forward Search: A New Approach | Ronen Brafman; Joerg Hoffmann",
    "2017 runner-up Automated Composition of Web Services by Planning in Asynchronous Domains | Marco Pistore; Paolo Traverso; Piergiorgio Bertoli"
  ]);
  assert.deepEqual(skipped, []);
});

test("SWSA Ten-Year Award page: year, 'ISWC 2013' and 'Authors. “Title”' rows; a title on the line after its authors is joined", async () => {
  const { parseSwsaTenYear } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>Awardees</h2><p>2025</p><p>ISWC2015</p><p>Yavor Nenov, Robert Piro, Boris Motik, Ian Horrocks, Zhe Wu, Jay Banerjee. “RDFox: A Highly-Scalable RDF Store”</p>
<p>2020</p><p>ISWC 2010</p><p>Harry Halpin, Patrick J. Hayes, Henry S. Thompson. “When owl:sameAs Isn’t the Same: An Analysis of Identity in Linked Data”</p>
<p>2011</p><p>SWWS 2001</p><p>Anupriya Ankolekar, Mark H. Burstein, Honglei Zeng.</p><p>“DAML-S: Semantic Markup for Web Services”</p><p>© Semantic Web Science Association.</p>`;
  const { entries, skipped } = parseSwsaTenYear(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2025/2015 RDFox: A Highly-Scalable RDF Store | Yavor Nenov; Robert Piro; Boris Motik; Ian Horrocks; Zhe Wu; Jay Banerjee",
    "2020/2010 When owl:sameAs Isn’t the Same: An Analysis of Identity in Linked Data | Harry Halpin; Patrick J. Hayes; Henry S. Thompson",
    "2011/2001 DAML-S: Semantic Markup for Web Services | Anupriya Ankolekar; Mark H. Burstein; Honglei Zeng"
  ]);
  assert.deepEqual(skipped, []);
});

test("SIGMM Test of Time page: '2025 Awards' blocks, three-line and one-line citations, 'Winner:' / 'Honorable Mention:' prefixes, honorable mentions as runners-up", async () => {
  const { parseSigmmTot } = await import("../scripts/awards/tot.mjs");
  const html = `<p>PREVIOUS YEARS</p><p>2025 Awards</p><p>Overall Winner and Winner in the Category “MM Content Analysis, Retrieval, Query”</p><p>Andrea Vedaldi and Karel Lenc.</p><p>Matconvnet: Convolutional neural networks for matlab.</p><p>In Proceedings of the 23rd ACM International Conference on Multimedia, MM ’15, 2015.</p>
<p>Honorable Mentions:</p><p>In the category “MM Security and Privacy”</p><p>Vojtech Holub and Jessica Fridrich.</p><p>Digital image steganography using universal distortion.</p><p>In Proceedings of the First ACM Workshop, IH&amp;MMSec ’13, 2013.</p><p>Selection Committee:</p><p>Ralf Steinmetz</p>
<p>2023 Awards</p><p>Overall Winner</p><p>Damian Borth, Rongrong Ji, and Shih-Fu Chang. Large-scale visual sentiment ontology and detectors using adjective noun pairs. In Proceedings of the 21st ACM International Conference on Multimedia, 2013.</p><p>Honorable Mentions:</p><p>Florian Eyben and Bjoern Schuller. Recent developments in opensmile, the munich open-source multimedia feature extractor. In Proceedings of the 21st ACM, 2013.</p>
<p>2020 Awards</p><p>Winner: Andrea Vedaldi and Brian Fulkerson. Vlfeat: An open and portable library of computer vision algorithms. In Proceedings of the 18th ACM International Conference on Multimedia, MM '10, 2010.</p>`;
  const { entries, skipped } = parseSigmmTot(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2025 tot Matconvnet: Convolutional neural networks for matlab | Andrea Vedaldi; Karel Lenc",
    "2025 runner-up Digital image steganography using universal distortion | Vojtech Holub; Jessica Fridrich",
    "2023 tot Large-scale visual sentiment ontology and detectors using adjective noun pairs | Damian Borth; Rongrong Ji; Shih-Fu Chang",
    "2023 runner-up Recent developments in opensmile, the munich open-source multimedia feature extractor | Florian Eyben; Bjoern Schuller",
    "2020 tot Vlfeat: An open and portable library of computer vision algorithms | Andrea Vedaldi; Brian Fulkerson"
  ]);
  assert.deepEqual(skipped, []);
});

test("SIGWEB Engelbart and SIGDA Newton pages: year / authors / title (and “Title,” venue year); a doubled author line is read once", async () => {
  const { parseHtEngelbart, parseSigdaNewton } = await import("../scripts/awards/tot.mjs");
  const ht = parseHtEngelbart(`<h2>Hypertext Douglas Engelbart Best Paper Award</h2><p>2025</p><p>Alessio Antonini, Lucia Lupi, and Sam Brooker.</p><p>Literary Hypertext, AI, and Google's New Web: An Aesthetics Discussion</p>
<p>2018</p><p>Lemei Zhang, Peng Liu and Jon Atle Gulla.Lemei Zhang, Peng Liu and Jon Atle Gulla.</p><p>A Deep Joint Network for Session-based News Recommendations with Contextual Augmentation.</p>
<p>2007</p><p>m. c. schraefel</p><p>What is an Analogue for the Semantic Web and Why is Having One Important?</p><p>Join Us</p>`);
  assert.deepEqual(ht.entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2025 best Literary Hypertext, AI, and Google's New Web: An Aesthetics Discussion | Alessio Antonini; Lucia Lupi; Sam Brooker",
    "2018 best A Deep Joint Network for Session-based News Recommendations with Contextual Augmentation | Lemei Zhang; Peng Liu; Jon Atle Gulla"
  ]);
  assert.equal(ht.skipped.length, 1);
  const nw = parseSigdaNewton(`<h3>Past Awardees</h3><p>2017</p><p>Matthew W. Moskewicz, Conor F. Madigan, Ying Zhao, Lintao Zhang, and Sharad Malik</p><p>“Chaff: Engineering an Efficient SAT Solver,” in the proceedings of the 38st Design Automation Conference, 2001.</p>
<p>2010</p><p>Randal Bryant</p><p>“Graph-based algorithms for Boolean function manipulation” IEEE Transactions on Computers, Aug., 1986.</p>`);
  assert.deepEqual(nw.entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2017/2001 Chaff: Engineering an Efficient SAT Solver | Matthew W. Moskewicz; Conor F. Madigan; Ying Zhao; Lintao Zhang; Sharad Malik",
    "2010/1986 Graph-based algorithms for Boolean function manipulation | Randal Bryant"
  ]);
  assert.deepEqual(nw.skipped, []);
});

test("SIGSPATIAL award page: 10-Year Impact and Best Paper lists (quoted titles with the authors run together, an unquoted title, a runner-up year); the other awards are not read", async () => {
  const { parseSigspatial } = await import("../scripts/awards/tot.mjs");
  const html = `<h3>10-Year Impact Award</h3><p>This annual award is given to a regular paper published at our main conference 10 years ago.</p><p>2025</p><p>“GeoSpark: A Cluster Computing Framework for Processing Large-Scale Spatial Data”</p><p>Jia Yu (Arizona State University)</p><p>Mohamed Sarwat (Arizona State University)</p>
<p>2024</p><p>“Local Persistent Homology Based Distance Between Maps”</p><p>Mahmuda Ahmed (The University of Texas at San Antonio)Carola Wenk (Tulane University)</p><p>2020 Honorable Mention</p><p>“T-Drive: Driving Directions Based on Taxi Trajectories”Jing Yuan (USTC, Hefei)Yu Zheng (Microsoft Research Asia)</p>
<h3>Best Paper Award</h3><p>2025</p><p>XXLTraffic: Expanding and Extremely Long Traffic forecasting beyond test adaptation</p><p>Du Yin (University of New South Wales Sydney)</p><p>Flora Salim (University of New South Wales Sydney)</p>
<h3>Best Vision Paper Award</h3><p>2025</p><p>“Lory: Location-aware Data Discovery from Data Lakes”</p><p>El Kindi Rezig (University of Utah)</p><h3>Other Awards</h3>`;
  const { entries, skipped } = parseSigspatial(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2025 tot GeoSpark: A Cluster Computing Framework for Processing Large-Scale Spatial Data | Jia Yu; Mohamed Sarwat",
    "2024 tot Local Persistent Homology Based Distance Between Maps | Mahmuda Ahmed; Carola Wenk",
    "2020 runner-up T-Drive: Driving Directions Based on Taxi Trajectories | Jing Yuan; Yu Zheng",
    "2025 best XXLTraffic: Expanding and Extremely Long Traffic forecasting beyond test adaptation | Du Yin; Flora Salim"
  ]);
  assert.deepEqual(skipped, []);
});

test("SIGWEB DocEng page: the same template as Hypertext, the award named in the menu and again as the heading", async () => {
  const { parseDocengBest } = await import("../scripts/awards/tot.mjs");
  const html = `<ul><li>SIGWEB DocEng Best Paper Award</li><li>Join us</li></ul><h2>SIGWEB DocEng Best Paper Award</h2><p>Presented annually at DocEng.</p>
<p>2024</p><p>Jean-Luc Bloechle, Jean Hennebert, Christophe Gisler.</p><p>ZigZag: A Robust Adaptive Approach to Non-Uniformly Illuminated Document Image Binarization.</p>
<p>2023</p><p>Curtis Wigington.</p><p>Multi-Task CTC for Joint Handwriting Recognition and Character Bounding Box Prediction.</p><p>Join Us</p>`;
  const { entries, skipped } = parseDocengBest(html);
  assert.deepEqual(entries.map((e) => `${e.venue} ${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "DocEng 2024 best ZigZag: A Robust Adaptive Approach to Non-Uniformly Illuminated Document Image Binarization | Jean-Luc Bloechle; Jean Hennebert; Christophe Gisler",
    "DocEng 2023 best Multi-Task CTC for Joint Handwriting Recognition and Character Bounding Box Prediction | Curtis Wigington"
  ]);
  assert.deepEqual(skipped, []);
});

test("SIGCSE Test of Time page: a 'Title (2025)' line and an ACM citation line 'Authors. 2006. Title. In …'", async () => {
  const { parseSigcseTot } = await import("../scripts/awards/tot.mjs");
  const html = `<p>Below is the list of the 5 SIGCSE papers that have received the Test of Time Award.</p><p>Methods and Tools for Exploring Novice Compilation Behaviour (2025)</p><p>Matthew C. Jadud. 2006. Methods and tools for exploring novice compilation behaviour. In Proceedings of the second international workshop on Computing education research (ICER '06). ACM, 73–84.</p>
<p>Evaluating a new exam question: Parsons problems (2024)</p><p>Paul Denny, Andrew Luxton-Reilly, and Beth Simon. 2008. Evaluating a new exam question: Parsons problems. In Proceedings of the Fourth international Workshop.</p>
<p>The incredible shrinking pipeline (2021)</p><p>Tracy Camp. 1997. The incredible shrinking pipeline. Communications of the ACM. 40, 10 (Oct. 1997), 103–110.</p>`;
  const { entries, skipped } = parseSigcseTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title} | ${e.authors.join("; ")}`), [
    "2025/2006 Methods and Tools for Exploring Novice Compilation Behaviour | Matthew C. Jadud",
    "2024/2008 Evaluating a new exam question: Parsons problems | Paul Denny; Andrew Luxton-Reilly; Beth Simon",
    "2021/1997 The incredible shrinking pipeline | Tracy Camp"
  ]);
  assert.deepEqual(skipped, []);
});

test("ICWSM awards page: Test of Time and Best Paper sections, title / authors pairs, wrapped Test of Time rows, outstanding papers and runners-up", async () => {
  const { parseIcwsmAwards } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>Adamic-Glance Distinguished Young Researcher Award</h2><p>2021 Winner</p><p>Tanushree (Tanu) Mitra</p>
<h2>Test of Time Award</h2><p>2021</p><p>Political Polarization on Twitter</p><p>Michael Connover, Jacob Ratkiewicz, Matthew Francisco,</p><p>Bruno Gonçalves, Filippo Menczer, Alessandro Flammini;</p><p>ICWSM 2011</p>
<p>2018</p><p>Personality Impressions Based on Facebook Profiles</p><p>Samuel D. Gosling, Sam Gaddis, Simine Vazire;</p><p>ICWSM 2007</p><p>Runner Up</p><p>Wikipedian Self-Governance in Action: Motivating the Policy Lens</p><p>Ivan Beschastnikh, Travis Kriplean, DavidW. McDonald</p>
<h2>Best Paper Award</h2><p>2021</p><p>Political Polarization in Online News Consumption</p><p>Kiran Garimella, Tim Smith, Rebecca Weiss, Robert West</p><p>Outstanding Papers</p><p>The Effect of Moderation on Online Mental Health Conversations</p><p>David Wadden, Tal August, Qisheng Li, Tim Althoff</p>`;
  const { entries, skipped } = parseIcwsmAwards(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear || "-"} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2021/2011 tot Political Polarization on Twitter | Michael Connover; Jacob Ratkiewicz; Matthew Francisco; Bruno Gonçalves; Filippo Menczer; Alessandro Flammini",
    "2018/2007 tot Personality Impressions Based on Facebook Profiles | Samuel D. Gosling; Sam Gaddis; Simine Vazire",
    "2018/- runner-up Wikipedian Self-Governance in Action: Motivating the Policy Lens | Ivan Beschastnikh; Travis Kriplean; David W. McDonald",
    "2021/- best Political Polarization in Online News Consumption | Kiran Garimella; Tim Smith; Rebecca Weiss; Robert West",
    "2021/- outstanding The Effect of Moderation on Online Mental Health Conversations | David Wadden; Tal August; Qisheng Li; Tim Althoff"
  ]);
  assert.deepEqual(skipped, []);
});

test("ETAPS Test of Time page: one 'The YYYY ETAPS Test of Time Award went to … for their VENUE YYYY paper Title' sentence per year", async () => {
  const { parseEtapsTot } = await import("../scripts/awards/tot.mjs");
  const html = `<h3>2026</h3><p>The 2026 ETAPS Test of Time Award went to T. Knapik, D. Niwinski and P. Urzyczyn for their FoSSaCS 2002 paper Higher-Order Pushdown Trees Are Easy</p><p>This paper opened up higher-order model checking.</p>
<h3>2020</h3><p>The 2020 ETAPS Test of Time Award went to Geoffrey Smith for his FoSSaCS 2009 paper On the Foundations of Quantitative Information Flow.</p>
<h3>2019</h3><p>The 2019 ETAPS Test of Time Award went to Kohei Honda (posthumously), Vasco T. Vasconcelos, Makoto Kubo for their ESOP 1998 paper Language primitives and type discipline for structured communication-based programming</p>`;
  const { entries, skipped } = parseEtapsTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.venue} ${e.title} | ${e.authors.join("; ")}`), [
    "2026/2002 FoSSaCS Higher-Order Pushdown Trees Are Easy | T. Knapik; D. Niwinski; P. Urzyczyn",
    "2020/2009 FoSSaCS On the Foundations of Quantitative Information Flow | Geoffrey Smith",
    "2019/1998 ESOP Language primitives and type discipline for structured communication-based programming | Kohei Honda; Vasco T. Vasconcelos; Makoto Kubo"
  ]);
  assert.deepEqual(skipped, []);
});

test("ETAPS best paper page: category sections per year, wrapped records ending in the conference tag, nominations left out", async () => {
  const { parseEtapsBest } = await import("../scripts/awards/tot.mjs");
  const html = `<h3>2022</h3><p>moreless</p><h4>EATCS Best Paper Award</h4>
<p>Emmanuel Hainry, Bruce Kapron, Jean-Yves Marion and Romain Péchoux. Complete and tractable machine-independent</p><p>characterizations of second-order polytime. FoSSaCS 2022</p>
<h4>Award Nominations</h4><p>Christel Baier, Florian Funke, Jakob Piribauer and Robin Ziemek. On probability-raising causality in Markov</p><p>decision</p><p>processes. FoSSaCS 2022</p>
<h4>SCP Best Tool Paper Award</h4><p>Haniel Barbosa, Clark Barrett, Martin Brain and</p><p>Yoni Zohar. cvc5: A Versatile and Industrial-Strength SMT Solver. TACAS 2022</p>
<h3>2013</h3><p>moreless</p><h4>Springer’s Best Student Paper Award</h4><p>Robbert Krebbers, Freek Wiedijk. Separation logic for non-local control flow and block scope variables. FoSSaCS</p><p>2013</p><p>Shin-ya Katsumata, Tetsuya Sato. Preorders on monads and coalgebraic simulations. FoSSaCS 2013</p>
<h3>2024</h3><p>moreless</p><h4>EAPLS Best Paper Award</h4><p>Hannah Mertens, Joost-Pieter Katoen, Tim Quatmann and Tobias Winkler. Accurately Computing Expected Visiting Times and Stationary Distributions in Markov Chains</p>
<h4>Best Tool Paper Award</h4><p>Raphaël Monat, Aymeric Fromherz, and Denis Merigoux. Formalizing Date Arithmetic and Statically Detecting</p><p>Ambiguities for the Law</p>`;
  const { entries, skipped } = parseEtapsBest(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.venue} ${e.award} ${e.title} | ${e.authors.length}`), [
    "2022 FoSSaCS best Complete and tractable machine-independent characterizations of second-order polytime | 4",
    "2022 TACAS best cvc5: A Versatile and Industrial-Strength SMT Solver | 4",
    "2013 FoSSaCS student Separation logic for non-local control flow and block scope variables | 2",
    "2013 FoSSaCS student Preorders on monads and coalgebraic simulations | 2",
    "2024 ETAPS best Accurately Computing Expected Visiting Times and Stationary Distributions in Markov Chains | 4",
    "2024 ETAPS best Formalizing Date Arithmetic and Statically Detecting Ambiguities for the Law | 3"
  ]);
  assert.deepEqual(skipped, []);
});

test("IEEE RAS award pages: 'Winners of this Award', a year line, authors / “title” line pairs (several per year), ranks, student markers, nicknames; pre-1990 rows left out", async () => {
  const { parseRas, RAS } = await import("../scripts/awards/tot.mjs");
  const html = `<p>Eligibility: all papers.</p><p>Winners of this Award</p><p>2025</p><p>Zi Cong Guo, James Richard Forbes, and Timothy Barfoot</p><p>“Marginalizing and Conditioning Gaussians Onto Linear Approximations of Smooth Manifolds”</p><p>For constructing a general approach.</p>
<p>Yuheng Qiu, Yutian Chen and Sebastian Scherer</p><p>“MAC-VO: Metrics-Aware Covariance for Learning-Based Stereo Visual Odometry”</p><p>2011</p><p>Award Not Presented</p>
<p>2008</p><p>1st Place: Chiwoo Park (Student Author), Yu Ding, Eunshin Byon</p><p>“Collaborative Data Reduction for Energy Efficient Wireless Sensor Networks”</p>
<p>2004</p><p>K. “Gopal” Gopalakrishnan, Ken Goldberg</p><p>“D-Space and Deform Closure: A Framework for Holding Objects”</p>
<p>1988</p><p>Old Author, Other Author</p><p>“Adaptive Load-Sharing Force Control for Two-Arm Manipulators”</p><p>Follow us</p>`;
  const { entries, skipped } = parseRas(html, RAS["ras-icra-student"], "https://example.org/");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.venue} ${e.award} [${e.awardLabel}] ${e.title.slice(0, 24)} | ${e.authors.join("; ")}`), [
    "2025 ICRA student [ICRA Best Student Paper Award] Marginalizing and Condit | Zi Cong Guo; James Richard Forbes; Timothy Barfoot",
    "2025 ICRA student [ICRA Best Student Paper Award] MAC-VO: Metrics-Aware Co | Yuheng Qiu; Yutian Chen; Sebastian Scherer",
    "2008 ICRA student [ICRA Best Student Paper Award (place 1)] Collaborative Data Reduc | Chiwoo Park; Yu Ding; Eunshin Byon",
    "2004 ICRA student [ICRA Best Student Paper Award] D-Space and Deform Closu | K. Gopalakrishnan; Ken Goldberg"
  ]);
  assert.deepEqual(skipped, []);
});

test("SIGEVO Impact Award page: title line, authors line (names written 'Surname I.' or 'Surname, I.,', with or without GECCO'14 on the line), citation lines; two awards in one year", async () => {
  const { parseGeccoImpact } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>2024 SIGEVO Impact Award</h2><p>Multiple regression genetic programming</p><p>Arnaldo I., Krawiec K., O'Reilly U.-M., GECCO'14, pp. 879-886</p>
<h2>2021 SIGEVO Impact Award</h2><p>Evolving a diversity of creatures through novelty search and local competition.</p><p>Lehman, J., Stanley, K.O. GECCO'11, pp. 211-218.</p>
<h2>2016 SIGEVO Impact Award</h2><p>Two awards have been awarded in 2016:</p><p>Reference point based multi-objective optimization using evolutionary algorithms.</p><p>Kalyanmoy Deb, and J. Sundar.</p><p>In: Mike Catolico (Eds), Proceedings of the 8th annual conference on Genetic and evolutionary computation, pp 635-642, ACM, 2006.</p>
<p>Search-based determination of refactorings for improving the class structure of object-oriented systems.</p><p>Olaf Seng, Johannes Stammel, and David Burkhart.</p><p>In: Mike Catolico (Eds), Proceedings, pp 1909-1916, ACM, 2006.</p><p>Log in</p>`;
  const { entries, skipped } = parseGeccoImpact(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.title.slice(0, 10)} | ${e.authors.join("; ")}`), [
    "2024 Multiple r | I. Arnaldo; K. Krawiec; U.-M. O'Reilly",
    "2021 Evolving a | J. Lehman; K.O. Stanley",
    "2016 Reference  | Kalyanmoy Deb; J. Sundar",
    "2016 Search-bas | Olaf Seng; Johannes Stammel; David Burkhart"
  ]);
  assert.deepEqual(skipped, []);
});

test("SIGKDD award pages: category lines with track headings and affiliations, the 2014 prose lead-ins, a quoted multi-paper heading, and the three Test of Time layouts", async () => {
  const { parseKddBest, parseKddTot } = await import("../scripts/awards/tot.mjs");
  const best = `<p>Awards</p><p>Best Paper Award</p><p>Rising Star Award</p><p>2018 SIGKDD Best Paper Award Winners</p><p>ACM SIGKDD is pleased to announce the winners.</p><p>Research Track</p><p>BEST PAPER AWARD</p><p>Adversarial Attacks on Neural Networks for Graph Data</p><p>Daniel Zügner (Technical University of Munich); Amir Akbarnejad (Technical University of Munich)</p>
<p>BEST STUDENT PAPER AWARD RUNNER-UP</p><p>XiaoIce Band: A Melody and Arrangement Generation Framework</p><p>Hongyuan Zhu (USTC);Qi Liu (USTC)</p><p>Applied Data Science Track</p><p>BEST PAPER AWARD</p><p>Winner</p><p>Real-time Personalization using Embeddings</p><p>Mihajlo Grbovic, Airbnb; Haibin Cheng, Airbnb</p><p>Tags</p>`;
  const r = parseKddBest(best);
  assert.deepEqual(r.entries.map((e) => `${e.year} ${e.award} [${e.awardLabel}] ${e.title.slice(0, 11)} | ${e.authors.join("; ")}`), [
    "2018 best [Best Paper (Research Track)] Adversarial | Daniel Zügner; Amir Akbarnejad",
    "2018 runner-up [Best Student Paper Runner-up (Research Track)] XiaoIce Ban | Hongyuan Zhu; Qi Liu",
    "2018 best [Best Paper (Applied Data Science Track)] Real-time P | Mihajlo Grbovic; Haibin Cheng"
  ]);
  const prose = `<p>2014 SIGKDD Best Paper Award Winners</p><p>ACM SIGKDD is pleased to announce the winners.</p><p>The overall best research track paper award goes to the paper:</p><p>Reducing the Sampling Complexity of Topic Models</p><p>Aaron Q Li, Carnegie Mellon University; Amr Ahmed, Google Inc.</p><p>The runner up to the best research track paper is:</p><p>Efficient SimRank Computation via Linearization</p><p>Takanori Maehara, National Institute of Informatics; Mitsuru Kusumoto, Preferred Infrastructure, Inc</p><p>Tags</p>`;
  assert.deepEqual(parseKddBest(prose).entries.map((e) => `${e.award} ${e.authors[0]}`), ["best Aaron Q Li", "runner-up Takanori Maehara"]);
  const quoted = `<p>2015 SIGKDD Best Paper Award Winners</p><p>ACM SIGKDD is pleased to announce the winners.</p><p>Best Student Paper Award</p><p>“Who supported Obama in 2012? Ecological inference”</p><p>Beth Flaxman, Yu-Xiang Wang, Alex Smola</p><p>“Edge-Weighted Personalized pageRank: Breaking a Barrier”</p><p>Wenlei Xie, David Bindel</p><p>Tags</p>`;
  assert.deepEqual(parseKddBest(quoted).entries.map((e) => `${e.award} ${e.authors[0]}`), ["student Beth Flaxman", "student Wenlei Xie"]);
  const tot1 = `<p>2015 KDD Test of Time Award Winners</p><p>Thorsten Joachims</p><p>Optimizing Search Engines using Clickthrough Data, KDD 2002</p><p>The paper introduced the problem.</p><p>Pedro Domingos and Geoff Hulten</p><p>Mining High-Speed Data Streams, KDD 2000</p>`;
  assert.deepEqual(parseKddTot(tot1).entries.map((e) => `${e.paperYear} ${e.authors.join("+")} ${e.title}`), ["2002 Thorsten Joachims Optimizing Search Engines using Clickthrough Data", "2000 Pedro Domingos+Geoff Hulten Mining High-Speed Data Streams"]);
  const tot2 = `<p>2014 SIKDD Test of Time Award Winners</p><p>A Density-Based Algorithm for Discovering Clusters [KDD 1996]</p><p>Martin Ester, Hans-Peter Kriegel, Joerg Sander, Xiaowei Xu</p>`;
  assert.deepEqual(parseKddTot(tot2).entries.map((e) => `${e.paperYear} ${e.authors.length}`), ["1996 4"]);
  const tot3 = `<p>2023 SIGKDD Test of Time Award Winners</p><p>SIGKDD Test of Time Award for Research</p><p>Chris Thornton ,Frank Hutter, Holger H. Hoos: Auto-WEKA: Combined Selection and Hyperparameter Optimization</p><p>SIGKDD Test of Time Award for Applied Data Science</p><p>Hugh Brendan McMahan, Gary Holt: Ad Click Prediction: A View From the Trenches. KDD 2013: 1222-1230.</p>`;
  assert.deepEqual(parseKddTot(tot3).entries.map((e) => `${e.awardLabel} | ${e.authors[0]} | ${e.title.slice(0, 14)}`), ["Test of Time Award for Research | Chris Thornton | Auto-WEKA: Com", "Test of Time Award for Applied Data Science | Hugh Brendan McMahan | Ad Click Predi"]);
});

test("SIGCOMM Test of Time page: quoted titles with 'by', surname-first author lists, the older 'Title, Authors, Proc.' lines; the 2006 batch is left out", async () => {
  const { parseSigcommTot } = await import("../scripts/awards/tot.mjs");
  const html = `<p>The past recipients of the ACM SIGCOMM Test of Time Paper Award are:</p><p>2025:</p><p>"Congestion control for large-scale RDMA deployments" by Zhu, Y., Eran, H., Zhang, M. ACM SIGCOMM Computer Communication Review, 45(4), 2015.</p><p>For DCQCN.</p><p>The 2025 Test of Time Award Committee members were: Mark Allman.</p>
<p>2022:</p><p>"Network Traffic Characteristics of Data Centers in the Wild" by Theophilus Benson, Aditya Akella, and David A. Maltz, in ACM SIGCOMM 2010.</p>
<p>2012:</p><p>Tussle in cyberspace: defining tomorrow's internet, David Clark, Karen Sollins, John Wroclawski and Bob Braden, Proc. ACM SIGCOMM 2002.</p><p>2010:</p><p>An analysis of BGP convergence properties, by Tim Griffin and Gordon Wilfong. SIGCOMM 1999.</p>
<p>2006:</p><p>Congestion Avoidance and Control, V. Jacobson (Proc. SIGCOMM '88)</p><p>acm sigcomm</p>`;
  const { entries, skipped } = parseSigcommTot(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title.slice(0, 12)} | ${e.authors.join("; ")}`), [
    "2025/2015 Congestion c | Y. Zhu; H. Eran; M. Zhang",
    "2022/2010 Network Traf | Theophilus Benson; Aditya Akella; David A. Maltz",
    "2012/2002 Tussle in cy | David Clark; Karen Sollins; John Wroclawski; Bob Braden",
    "2010/1999 An analysis  | Tim Griffin; Gordon Wilfong"
  ]);
  assert.deepEqual(skipped, []);
});

test("virtual sites: ICML 2026 links the test-of-time paper's title to its award page; ICML 2022 lists the test-of-time papers in the row's abstract block under <h4> headings", async () => {
  const { parseAwardsPage } = await load();
  const y26 = `<table><tr><td><div>Test of Time Award</div></td><td><div class="displaycards touchup-date" id="event-67269">
<div style="margin-bottom: 8px;"><a href="/virtual/2026/test-of-time/67269" style="font-size: 1.05em;">Asynchronous Methods for Deep Reinforcement Learning</a></div>
<div style="color: #666;">Test Of Time</div><div style="color: #555;">Volodymyr Mnih ⋅ Adria Puigdomenech Badia ⋅ Mehdi Mirza ⋅ Alex Graves</div></div></td></tr></table>`;
  const a = parseAwardsPage(y26, { venue: "ICML", year: 2026, host: "icml.cc" });
  assert.deepEqual(a.entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["tot Asynchronous Methods for Deep Reinforcement Learning | Volodymyr Mnih; Adria Puigdomenech Badia; Mehdi Mirza; Alex Graves"]);
  assert.deepEqual(a.skipped, []);
  const y22 = `<table><tr><td><div>Test of Time Award</div></td><td><div class="displaycards touchup-date" id="event-20803">
<div style="width:80%;margin:auto;"><a class="small-title" href="/virtual/2022/award/20803">Test of Time Award</a></div><div class="author-str"></div>
<div class="collapse"><div class="abstract-display"><p>&nbsp;</p><h4>Test of Time Award:</h4><p><strong>Poisoning Attacks Against Support Vector Machines</strong></p><p><I>Battista Biggio, Blaine Nelson, Pavel Laskov:</I></p><hr />
<h4>Test of Time Honorable Mention:</h4><p><strong>Building high-level features using large scale unsupervised learning</strong></p><p><i>Quoc Le, Marc'Aurelio Ranzato, Andrew Ng</i></p>
<p><strong>On causal and anticausal learning</strong></p><p><I>Bernhard Schölkopf, Dominik Janzing,
Kun Zhang, Joris Mooij</i></p></div></div></div></td></tr></table>`;
  const b = parseAwardsPage(y22, { venue: "ICML", year: 2022, host: "icml.cc" });
  assert.deepEqual(b.entries.map((e) => `${e.award} [${e.awardLabel}] ${e.title.slice(0, 20)} | ${e.authors.join("; ")}`), [
    "tot [Test of Time Award] Poisoning Attacks Ag | Battista Biggio; Blaine Nelson; Pavel Laskov",
    "runner-up [Test of Time Honorable Mention] Building high-level  | Quoc Le; Marc'Aurelio Ranzato; Andrew Ng",
    "runner-up [Test of Time Honorable Mention] On causal and antica | Bernhard Schölkopf; Dominik Janzing; Kun Zhang; Joris Mooij"
  ]);
});

test("NeurIPS blog posts: 'The awarded papers are:' with title / authors lines (2024), and the sentence naming one test-of-time paper (2022)", async () => {
  const { parseNeuripsBlogTot } = await import("../scripts/awards/tot.mjs");
  const y24 = `<p>This year, we are making an exception to award two Test of Time papers. The awarded papers are:</p><p>Generative Adversarial Nets</p><p>Ian Goodfellow, Jean Pouget-Abadie, Mehdi Mirza, Bing Xu, Yoshua Bengio</p><p>Sequence to Sequence Learning with Neural Networks</p><p>Ilya Sutskever, Oriol Vinyals, Quoc V. Le</p><p>The Generative Adversarial Nets paper has been cited more than 85,000 times as of this blog post.</p>`;
  const a = parseNeuripsBlogTot(y24, "https://blog.neurips.cc/2024/11/27/announcing/");
  assert.deepEqual(a.entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2024 Generative Adversarial Nets | Ian Goodfellow; Jean Pouget-Abadie; Mehdi Mirza; Bing Xu; Yoshua Bengio", "2024 Sequence to Sequence Learning with Neural Networks | Ilya Sutskever; Oriol Vinyals; Quoc V. Le"]);
  const y22 = `<h3>Test of Time Award</h3><p>This year, following the usual practice, we chose a NeurIPS paper from 10 years ago, and “ImageNet Classification with Deep Convolutional Neural Networks” by Alex Krizhevsky, Ilya Sutskever, and Geoffrey Hinton, aka “AlexNet paper” was unanimously selected by the committee.</p>`;
  const b = parseNeuripsBlogTot(y22, "https://blog.neurips.cc/2022/11/21/announcing/");
  assert.deepEqual(b.entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2022 ImageNet Classification with Deep Convolutional Neural Networks | Alex Krizhevsky; Ilya Sutskever; Geoffrey Hinton"]);
  assert.deepEqual([...a.skipped, ...b.skipped], []);
});

test("NIPS 2018 conference book: the Test of Time line names the authors, the next line the paper; the overview row (time first) is not read as a second one", async () => {
  const { parseNipsBookTot } = await import("../scripts/awards/tot.mjs");
  const text = `Test Of Time Award:\n9:40 - 10:05 AM Leon Bottou, Olivier Bousquet\nThe Tradeoffs of Large-Scale\nLearning (2007)\n=====PAGE 10=====\nTest Of Time Award: Leon Bottou, Olivier Bousquet\nThe Tradeoffs of Large-Scale Learning\nCoffee break`;
  const { entries, skipped } = parseNipsBookTot(text);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2018 The Tradeoffs of Large-Scale Learning | Leon Bottou; Olivier Bousquet"]);
  assert.deepEqual(skipped, []);
});

test("a conference virtual site's test-of-time page: the title from <title>, the authors from the line after the paper's heading", async () => {
  const { parseVirtualTotDetail } = await import("../scripts/awards/tot.mjs");
  const html = `<html><head><title>ICML Test Of Time Bayesian Learning via Stochastic Gradient Langevin Dynamics</title></head><body><nav>Test of Time Award</nav>
<h3>Bayesian Learning via Stochastic Gradient Langevin Dynamics</h3><div>Yee Teh ⋅ Max Welling</div><p>Abstract</p></body></html>`;
  const { entries, skipped } = parseVirtualTotDetail(html, "https://icml.cc/virtual/2021/test-of-time/11808");
  assert.deepEqual(entries.map((e) => `${e.venue} ${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), ["ICML 2021 tot Bayesian Learning via Stochastic Gradient Langevin Dynamics | Yee Teh; Max Welling"]);
  assert.deepEqual(skipped, []);
});

test("DAC Most Influential Paper page: a heading per year, the title in quotation marks (a decade prefix in 2023), 'by Authors, 14th DAC, 1977.'", async () => {
  const { parseDacMip } = await import("../scripts/awards/tot.mjs");
  const html = `<h2>Past Winners</h2><h3>2025 DAC Most Influential Paper (MIP) Award Winner</h3><p>“Chisel: Constructing Hardware in a Scala Embedded Language”</p><p>by J. Bachrach, H. Vo), B. Richards, K. Asanovic. 2012.</p>
<h3>2023 DAC Most Influential Paper (MIP) Award Winners</h3><p>1970s "A logic design structure for LSI testability"</p><p>by E.B. Eichelberger, T.W. Williams, 14th DAC, 1977.</p><p>1960s "Sketch pad a man-machine graphical communication system"</p><p>by Ivan E. Sutherland, 1964.</p><p>View Profile</p>`;
  const { entries, skipped } = parseDacMip(html);
  assert.deepEqual(entries.map((e) => `${e.year}/${e.paperYear} ${e.title.slice(0, 10)} | ${e.authors.join("; ")}`), [
    "2025/2012 Chisel: Co | J. Bachrach; H. Vo; B. Richards; K. Asanovic",
    "2023/1977 A logic de | E.B. Eichelberger; T.W. Williams",
    "2023/1964 Sketch pad | Ivan E. Sutherland"
  ]);
  assert.deepEqual(skipped, []);
});

test("UbiComp / ISWC awards page: IMWUT distinguished papers (title / authors pairs) and the 10-Year Impact Award with its runner-up; posters, demos and student awards are left out", async () => {
  const { parseUbicompAwards } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 35 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const html = `${filler}<h1>Awards</h1><h2>IMWUT Distinguished Paper Awards</h2><p>MITES: Design and Deployment of a General-Purpose Sensing Infrastructure for Buildings.</p><p>Sudershan Boovaraghavan, Chen Chen, and Yuvraj Agarwal.</p>
<h2>UbiComp 10-Year Impact Award</h2><p>Winner</p><p>StudentLife: assessing mental health, academic performance and behavioral trends of college students using smartphones</p><p>Rui Wang, Fanglin Chen and Andrew T. Campbell</p><p>Runner Up</p><p>InterruptMe: designing intelligent prompting mechanisms for pervasive applications.</p><p>Veljko Pejovic and Mirco Musolesi</p>
<h2>Gaetano Borriello Outstanding Student Award</h2><p>Winner</p><p>Anandghan Waghmare, University of Washington</p><h2>Best Poster Awards</h2><p>Gaze2Prompt: Turning Eye-Tracking Data into Visual Prompts</p><p>Jae Young Choi (KAIST); Seon Gyeom Kim (KAIST)</p>`;
  const { entries, skipped } = parseUbicompAwards(html, "https://ubicomp.org/ubicomp-iswc-2024/awards/");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title.slice(0, 12)} | ${e.authors.join("; ")}`), [
    "2024 distinguished MITES: Desig | Sudershan Boovaraghavan; Chen Chen; Yuvraj Agarwal",
    "2024 tot StudentLife: | Rui Wang; Fanglin Chen; Andrew T. Campbell",
    "2024 runner-up InterruptMe: | Veljko Pejovic; Mirco Musolesi"
  ]);
  assert.deepEqual(skipped, []);
});

test("ICDM best papers page: 'by Authors' (also 'by' alone and wrapped), authors-first years, a title on the heading line, runner-up context and 2007's categories; 2008's titles that start on the category line and 2009's run-together paragraphs", async () => {
  const { parseIcdmBest } = await import("../scripts/awards/tot.mjs");
  const html = `<p>IEEE ICDM Best Paper Awards</p><p>IEEE ICDM 2024 Best Paper Awards:</p><p>Best Paper Award</p><p>Scalable Graph Classification via Random Walk Fingerprints</p><p>by</p><p>Peiyan Li,Honglian Wang and Christian Bohm</p>
<p>Best Student Paper Runner-Up</p><p>Traffic Pattern Sharing for Federated Traffic Flow Prediction</p><p>by Hang Zhou, Wentao Yu, Sheng Wan</p><p>IEEE ICDM 2013 Best Paper Awards:</p><p>Best Paper Award</p><p>Nicholas Jing Yuan, Yingzi Wang, and Guang-Zhong Sun,</p><p>Reconstructing Individual Mobility from Smart Card Transactions</p>
<p>IEEE ICDM '07 Best Paper Awards:</p><p>Theoretical/Algorithms Category:</p><p>Disk Aware Discord Discovery: Finding Unusual Time Series</p><p>by Dragomir Yankov, Eamonn Keogh</p><p>Best Paper Runner-Up Awards:</p><p>Applications Category:</p><p>Improving Text Classification by Using Encyclopedia Knowledge,</p><p>by Pu Wang, Jian Hu</p>
<p>IEEE ICDM 2005 Best Paper Award: Mining Minimal Distinguishing Subsequence Patterns with Gap Constraints</p><p>by Xiaonan Ji, James Bailey, and Guozhu Dong</p>
<p>IEEE ICDM 2012 Best Paper Awards:</p><p>Best Paper Award</p><p>Scalable Coordinate Descent Approaches to Parallel Matrix Factorization</p><p>Hsiang-Fu Yu, Cho-Jui Hsieh, Si Si, and Inderjit Dhillon</p>
<p>IEEE ICDM 2008 Best Paper Awards:</p><p>Best Theoretical/Algorithms Paper Award:</p><p>“Scalable Tensor Decomposition for Multi-Aspect Data Mining”,</p><p>by Tamara Kolda and Jimeng Sun</p><p>Best Application Paper Award: “Interpreting</p><p>PET Scans by Structured Data: A Case</p><p>Study in Dementia Research”, by Andreas Hapfelmeier and Stefan Kramer</p>
<p>IEEE ICDM 2009 Best Paper Awards:</p><p>Best Paper Awards:</p><p>Best Theoretical/Algorithms Paper Award: Deepak</p><p>Agarwal, Bee-Chung Chen, and Pradheep Elango, Explore/Exploit Schemes</p><p>for Web Content Optimization</p><p>Best Application Paper Award: Nikos Pelekis,</p><p>Ioannis Kopanakis, and Yannis Theodoridis, Clustering Trajectories of Moving Objects in an Uncertain</p><p>World</p>`;
  const { entries, skipped } = parseIcdmBest(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} [${e.awardLabel}] ${e.title.slice(0, 14)} | ${e.authors.join("; ")}`), [
    "2009 best [Best Theoretical/Algorithms Paper Award] Explore/Exploi | Deepak Agarwal; Bee-Chung Chen; Pradheep Elango",
    "2009 category [Best Application Paper Award] Clustering Tra | Nikos Pelekis; Ioannis Kopanakis; Yannis Theodoridis",
    "2024 best [Best Paper Award] Scalable Graph | Peiyan Li; Honglian Wang; Christian Bohm",
    "2024 runner-up [Best Student Paper Runner-Up] Traffic Patter | Hang Zhou; Wentao Yu; Sheng Wan",
    "2013 best [Best Paper Award] Reconstructing | Nicholas Jing Yuan; Yingzi Wang; Guang-Zhong Sun",
    "2007 best [Best Paper (Theoretical/Algorithms)] Disk Aware Dis | Dragomir Yankov; Eamonn Keogh",
    "2007 runner-up [Best Paper Runner-up (Applications)] Improving Text | Pu Wang; Jian Hu",
    "2005 best [Best Paper Award] Mining Minimal | Xiaonan Ji; James Bailey; Guozhu Dong",
    "2012 best [Best Paper Award] Scalable Coord | Hsiang-Fu Yu; Cho-Jui Hsieh; Si Si; Inderjit Dhillon",
    "2008 best [Best Theoretical/Algorithms Paper Award] Scalable Tenso | Tamara Kolda; Jimeng Sun",
    "2008 category [Best Application Paper Award] Interpreting P | Andreas Hapfelmeier; Stefan Kramer"
  ]);
  assert.ok(skipped.length <= 1, "what cannot be read is reported, not guessed");
});

test("ACM SIGGRAPH blog posts: Best Papers / Honorable Mentions / Test-of-Time Awards, a title, an abstract line, the authors (with affiliations in 2022; initials with a full stop are no sentence end); the posts that follow are not read", async () => {
  const { parseSiggraphAwards } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 45 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const html = `${filler}<h1>SIGGRAPH 2022 Technical Papers Awards: Best Papers and Honorable Mentions</h1><h2>Best Papers</h2>
<p>CLIPasso: Semantically Aware Object Sketching</p><p>We present CLIPasso, a method for sketching objects at different levels of abstraction. We define a sketch as a set of strokes and use a differentiable rasterizer to optimize.</p>
<p>Yael Vinker, Tel Aviv University, École Polytechnique Fédérale de Lausanne; Ehsan Pajouheshgar, École Polytechnique Fédérale de Lausanne; Jessica Y. Bo, École Polytechnique Fédérale de Lausanne, ETH; Ariel Shamir, Reichman University</p>
<h2>Honorable Mentions</h2><p>Solid Knitting</p><p>Yuichi Hirose, Mark Gillespie, James McCann</p>
<h2>Test-of-Time Awards</h2><p>ACM SIGGRAPH is proud to announce the 2022 Test-of-Time Award papers.</p>
<p>Embree: A Kernel Framework for Efficient CPU Ray Tracing (2014)</p><p>This paper introduces the Embree system and describes in detail what it takes to build a professional-grade modular ray tracing framework. It achieved state-of-the-art performance.</p><p>Ingo Wald, Sven Woop, Gregory S. Johnson, Manfred Ernst</p>
<p>Register for SIGGRAPH 2022, taking place in August.</p><p>Related Posts</p><p>Some Other Post</p><p>Ada Lovelace, Charles Babbage</p>`;
  const { entries } = parseSiggraphAwards(html, "https://blog.siggraph.org/2022/x/");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.paperYear || "-"} ${e.title.slice(0, 8)} | ${e.authors.join("; ")}`), [
    "2022 best - CLIPasso | Yael Vinker; Ehsan Pajouheshgar; Jessica Y. Bo; Ariel Shamir",
    "2022 runner-up - Solid Kn | Yuichi Hirose; Mark Gillespie; James McCann",
    "2022 tot 2014 Embree:  | Ingo Wald; Sven Woop; Gregory S. Johnson; Manfred Ernst"
  ]);
});

test("SIGMOBILE's MobiCom page: a best paper list and a best student paper list, 'YYYYTitle' lines (the year runs into the title) and authors with bracketed affiliations", async () => {
  const { parseMobicomBest } = await import("../scripts/awards/tot.mjs");
  const html = `<p>Past Recipients of the Mobicom Best Paper Award</p><p>Past Recipients of the MobiCom Best Student Paper Awards</p><h3>Past Recipients of the Mobicom Best Paper Award</h3>
<p>2011E-MiLi: Energy-Minimizing Idle Listening in Wireless Networks</p><p>Xinyu Zhang (University of Michigan-Ann Arbor, USA) and Kang G. Shin (University of Michigan-Ann Arbor, USA)</p>
<p>2010The κ factor: inferring protocol performance using inter-link reception correlation,</p><p>Kannan Srinivasan (Stanford University), Mayank Jain (Stanford University), Phil Levis (Stanford University)</p>
<h3>Past Recipients of the MobiCom Best Student Paper Awards</h3><p>2007Crossing Over the Bounded Domain: From Exponential to Power-law Inter-meeting Time in MANET</p><p>Han Cai and Do Young Eun (North Carolina State University)</p><p>Nomination Process</p>`;
  const { entries, skipped } = parseMobicomBest(html);
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title.slice(0, 10)} | ${e.authors.join("; ")}`), [
    "2011 best E-MiLi: En | Xinyu Zhang; Kang G. Shin",
    "2010 best The κ fact | Kannan Srinivasan; Mayank Jain; Phil Levis",
    "2007 student Crossing O | Han Cai; Do Young Eun"
  ]);
  assert.deepEqual(skipped, []);
});

test("The Web Conference awards page: 'Best Paper Award', the title, authors with their affiliations on the next line (2022) or as superscript numbers on one line (2024)", async () => {
  const { parseWwwBest } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 25 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const y22 = `${filler}<h2>Best Paper Award</h2><p>Rewiring what-to-watch-next Recommendations to Reduce Radicalization Pathways</p><p>Web and Society Track</p><p>Francesco Fabbri</p><p>Universitat Pompeu Fabra</p><p>Yanhao Wang</p><p>East China Normal University</p><p>Francesco Bonchi</p><p>Fondazione ISI</p><p>Best Paper Award Committee</p><p>Elena Ferrari</p>`;
  const a = parseWwwBest(y22, "https://www2022.thewebconf.org/awards");
  assert.deepEqual(a.entries.map((e) => `${e.year} ${e.title.slice(0, 20)} | ${e.authors.join("; ")}`), ["2022 Rewiring what-to-wat | Francesco Fabbri; Yanhao Wang; Francesco Bonchi"]);
  const y24 = `${filler}<h2>Best Paper Award</h2><p>Mechanism Design for Large Language Models</p><p>Paul Dütting1, Vahab Mirrokni1, Renato Paes Leme1, Haifeng Xu1,2,  Song Zuo1</p><p>(1Google Research, 2University of Chicago)</p><p>2024 Seoul Test of Time Award</p>`;
  const b = parseWwwBest(y24, "https://www2024.thewebconf.org/program/awards");
  assert.deepEqual(b.entries.map((e) => `${e.year} ${e.title.slice(0, 20)} | ${e.authors.join("; ")}`), ["2024 Mechanism Design for | Paul Dütting; Vahab Mirrokni; Renato Paes Leme; Haifeng Xu; Song Zuo"]);
});

test("SC awards page: best paper, best student paper and reproducibility lines `“Title”, Authors; affiliations` and the test-of-time line `Authors, “Title” SC05: …`; posters and the cluster competition are not paper awards", async () => {
  const { parseScAwards } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 35 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const html = `${filler}<h3>Test of Time Award</h3><p>William Allcock, John Bresnahan, Ian Foster, “The Globus Striped GridFTP Framework and Server” SC05: Proceedings of the 2005 ACM/IEEE Conference on Supercomputing, p. 55</p>
<h3>Best Paper Award</h3><p>“ORBIT-2: Scaling Exascale Vision Foundation Models”, Xiao Wang, Jong-Youl Choi, Fan Ming, Oak Ridge National Laboratory (ORNL); Ashwin M Aji, Advanced Micro Devices, Inc. (AMD); Mohamed Wahib, RIKEN</p>
<h3>Best Student Paper Award</h3><p>“X-MoE: Enabling Scalable Training for Emerging Mixture-of-Experts Architectures”, Yueming Yuan, University of Illinois Urbana-Champaign; Ahan Gupta, University of Illinois</p>
<h3>Best Research Poster Award</h3><p>“Time-stepping Hamiltonian Simulation for Solving Nonlinear PDEs”, Sangwon Kim, RIKEN</p>`;
  const { entries, skipped } = parseScAwards(html, "https://sc25.supercomputing.org/program/awards/");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.paperYear || "-"} ${e.title.slice(0, 10)} | ${e.authors.join("; ")}`), [
    "2025 tot 2005 The Globus | William Allcock; John Bresnahan; Ian Foster",
    "2025 best - ORBIT-2: S | Xiao Wang; Jong-Youl Choi; Fan Ming; Ashwin M Aji; Mohamed Wahib",
    "2025 student - X-MoE: Ena | Yueming Yuan; Ahan Gupta"
  ]);
  assert.deepEqual(skipped, []);
});

test("a MobiCom year's awards page: best paper, best community paper and best artifact papers with their authors; video, poster and reviewer awards are left out", async () => {
  const { parseMobicomYear } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 30 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const html = `<title>MobiCom 2025: The 31st Annual International Conference on Mobile Computing and Networking</title>${filler}<h2>Best Paper Award</h2><p>AquaScan: A Sonar-based Underwater Sensing System for Human Activity Monitoring</p><p>Haozheng Hou, Bowen Zheng, Sitong Cheng (The Chinese University of Hong Kong)</p>
<h2>Best Community Paper Award</h2><p>5G-MAP: Demystifying the Performance Implications of Cloud-Based 5G Core Deployments</p><p>Tolga Atalay (Virginia Tech), Dragoslav Stojadinovic (Kryptowire LLC), Haining Wang (Virginia Tech)</p>
<h2>Best Artifact Reviewer Award</h2><p>Siyang Jiang (The Chinese University of Hong Kong)</p><h2>Best Poster Award</h2><p>Poster: Vibration-Tolerant Doppler Disambiguation Algorithm</p><p>Skanda Harisha (University of Michigan)</p>`;
  const { entries, skipped } = parseMobicomYear(html, "https://www.sigmobile.org/mobicom/2025/awards.html");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title.slice(0, 8)} | ${e.authors.join("; ")}`), [
    "2025 best AquaScan | Haozheng Hou; Bowen Zheng; Sitong Cheng",
    "2025 category 5G-MAP:  | Tolga Atalay; Dragoslav Stojadinovic; Haining Wang"
  ]);
  assert.deepEqual(skipped, []);
});

test("MobiCom's main page of a year (2019–2024): a wrapped title, authors with brackets, an abstract line; a record whose title or authors look contaminated (a bracket in the title, an award word) is dropped, never guessed", async () => {
  const { parseMobicomYear } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 20 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const html = `<title>MobiCom 2023: The 29th Annual International Conference on Mobile Computing and Networking</title>${filler}<h2>Best Paper Awards</h2>
<p>AgriTera: Accurate Non-Invasive Fruit Ripeness Sensing</p><p>via Sub-Terahertz Wireless Signals</p><p>Sayed Saad Afzal (MIT), Atsutse Kludze, Subhajit Karmakar (Princeton University), Ranveer Chandra (Microsoft)</p><p>The abstract of the paper runs on for a long while so that it is plainly a paragraph and not a title or an author line at all, which is what the reader must see.</p>
<h2>Best Paper Award Runner-up</h2><p>NeRF2: Neural Radio-Frequency Radiance</p><p>Fields</p><p>Xiaopeng Zhao, Zhenlin An (The Hong Kong Polytechnic University)</p>
<h2>Best Community Paper Award</h2><p>Some Wrapped Title Without Authors</p><p>University of Technology), Guoliang Xing (The Chinese University of Hong Kong)</p><p>News</p>`;
  const { entries } = parseMobicomYear(html, "https://www.sigmobile.org/mobicom/2023/");
  assert.deepEqual(entries.map((e) => `${e.award} ${e.title.slice(0, 12)} | ${e.authors.join("; ")}`), [
    "best AgriTera: Ac | Sayed Saad Afzal; Atsutse Kludze; Subhajit Karmakar; Ranveer Chandra",
    "runner-up NeRF2: Neura | Xiaopeng Zhao; Zhenlin An"
  ]);
});

test("SIGSOFT distinguished papers: 'Authors, Main title: Subtitle' keeps the main title (CUTE: …, Seeking the Ground Truth: …), a nickname in brackets is no hindrance, a second paper's authors after the title are not read", async () => {
  const { parse } = await import("../scripts/awards/sigsoft.mjs");
  const html = `<h2 id=winners>Winners</h2><h3>Foundations of Software Engineering (FSE 2012)</h3><ul>
<li>Bradley Cossette and Robert Walker, Seeking the Ground Truth: A Retroactive Study on the Evolution of Libraries</li>
<li>Koushik Sen, Darko Marinov, and Gul Agha, CUTE: A Concolic Unit Testing Engine for C</li>
<li>Xiwei (Sherry) Xu, Liming Zhu: Hard to Read and Understand Pythonic Idioms? DeIdiom</li>
<li>Ann Lee, Bo Chen: Policy Testing with Fuzz (Replicability Study). Paul-Antoine Le Tolguenec, Emmanuel Rachelson, and Yann Pequignot: Another Paper</li></ul>`;
  assert.deepEqual(parse(html).map((e) => `${e.title} | ${e.authors.join("; ")}`), [
    "Seeking the Ground Truth: A Retroactive Study on the Evolution of Libraries | Bradley Cossette; Robert Walker",
    "CUTE: A Concolic Unit Testing Engine for C | Koushik Sen; Darko Marinov; Gul Agha",
    "Hard to Read and Understand Pythonic Idioms? DeIdiom | Xiwei (Sherry) Xu; Liming Zhu"
  ]);
});

test("MobiCom 2018's keynotes-and-awards page: 'Best Paper Award Winner: Title by Authors (Affiliation), …' on one line, the community paper award too", async () => {
  const { parseMobicomYear } = await import("../scripts/awards/tot.mjs");
  const html = `<h1>MobiCom 2018: The 24th Annual International Conference on Mobile Computing and Networking</h1><p>Best Paper Award Winner: SkyCore: Moving Core to the Edge for Untethered and Reliable UAV-based LTE networks by Mehrdad Moradi (University of Michigan), Karthik Sundaresan, Eugene Chai, Sampath Rangarajan (NEC Labs), and Z. Morley Mao (University of Michigan)</p>
<p>Best Community Paper Award Winner: One Billion Apples' Secret Sauce: Recipe for the Apple Wireless Direct Link Ad hoc Protocol by Milan Stute (Technische Universität Darmstadt), David Kreitschmann, and Matthias Hollick</p>`;
  const { entries, skipped } = parseMobicomYear(html, "https://www.sigmobile.org/mobicom/2018/keynotes.php");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title.slice(0, 8)} | ${e.authors.join("; ")}`), [
    "2018 best SkyCore: | Mehrdad Moradi; Karthik Sundaresan; Eugene Chai; Sampath Rangarajan; Z. Morley Mao",
    "2018 category One Bill | Milan Stute; David Kreitschmann; Matthias Hollick"
  ]);
  assert.deepEqual(skipped, []);
});

test("a SIGMOBILE newsletter's report on MobiCom 2017: 'Best paper: Title. Authors (Affiliation); …' and 'Best community paper: …'; video and demo awards are left out", async () => {
  const { parseMobicomYear } = await import("../scripts/awards/tot.mjs");
  const html = `<h1>Newsletter of October 2017</h1><p>ACM MobiCom 2017 was wrapped up last week in Snowbird, Utah.</p><p>We celebrated the following paper awards in this year’s program.</p>
<p>Best paper: WEBee: Physical-Layer Cross-Technology Communication via Emulation. Zhijun Li (University of Minnesota); Tian He (University of Minnesota).</p>
<p>Best community paper: The Tick Programmable Low-Latency SDR System. Haoyang Wu, Tao Wang (Peking University), Zengwen Yuan (University of California, Los Angeles), Songwu Lu (UCLA).</p>
<p>Best video: TinyLink: A Holistic System for Rapid Development of IoT Applications. Gaoyang Guan, Wei Dong (Zhejiang University).</p>`;
  const { entries } = parseMobicomYear(html, "https://www.sigmobile.org/grav/publications/quarterly-newsletters/201710");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title.slice(0, 8)} | ${e.authors.join("; ")}`), [
    "2017 best WEBee: P | Zhijun Li; Tian He",
    "2017 category The Tick | Haoyang Wu; Tao Wang; Zengwen Yuan; Songwu Lu"
  ]);
});

test("MobiCom 2014's front page: 'Best Paper' then 'Authors, Title (Winner)' / '(Runner-up)'; the best presentation lines after it are not best papers", async () => {
  const { parseMobicomYear } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 12 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const html = `<h1>MobiCom 2014: The 20th Annual International Conference on Mobile Computing and Networking</h1>${filler}<p>Awards</p><p>Best Paper</p>
<p>Lei Yang, Yekui Chen, Xiang-Yang Li, Chaowei Xiao, Mo Li, and Yunhao Liu, Tagoram: Real-Time Tracking of Mobile RFID Tags to High Precision Using COTS Devices (Winner)</p>
<p>Pengyu Zhang, Pan Hu, Vijay Pasikanti, and Deepak Ganesan, EkhoNet: High Speed Ultra Low-power Backscatter for Next Generation Sensors (Runner-up)</p>
<p>Best Presentation</p><p>Jon Gjengset, Enabling Phased Array Signal Processing on Commodity WiFi Access Points (Winner)</p>`;
  const { entries } = parseMobicomYear(html, "https://www.sigmobile.org/mobicom/2014/index.html");
  assert.deepEqual(entries.map((e) => `${e.year} ${e.award} ${e.title.slice(0, 8)} | ${e.authors.join("; ")}`), [
    "2014 best Tagoram: | Lei Yang; Yekui Chen; Xiang-Yang Li; Chaowei Xiao; Mo Li; Yunhao Liu",
    "2014 runner-up EkhoNet: | Pengyu Zhang; Pan Hu; Vijay Pasikanti; Deepak Ganesan"
  ]);
});

test("a MobiSys year's program page: 'Best Paper' / 'Best Paper Runner Up' then title and authors lines (2013), the quoted line form of 2011, the journal special section and the poster / demo awards are left out", async () => {
  const { parseMobisysYear } = await import("../scripts/awards/tot.mjs");
  const filler = Array.from({ length: 12 }, (_, i) => `<p>Menu ${i}</p>`).join("");
  const y13 = `<h1>MobiSys 2013 - The 11th International Conference on Mobile Systems, Applications and Services</h1>${filler}<p>Program</p><p>Awards</p><p>Best Paper</p>
<p>Energy Characterization and Optimization of Image Sensing Toward Continuous Mobile Vision</p><p>Robert LiKamWa (Rice University), Bodhi Priyantha, Matthai Philipose (Microsoft Research Redmond), Paramvir Bahl (Microsoft Research Redmond)</p>
<p>Best Paper Runner Up</p><p>AMC: Verifying User Interface Properties for Vehicular Applications</p><p>Kyungmin Lee, Jason Flinn (University of Michigan), T.J. Giuli (Ford Motor Company)</p>
<p>Best Poster</p><p>Instrumenting Thailand's Coastline: Mobile Devices</p><p>Michael Nekrasov (University of California Santa Barbara)</p>`;
  const a = parseMobisysYear(y13, "https://www.sigmobile.org/mobisys/2013/program.php");
  assert.deepEqual(a.entries.map((e) => `${e.year} ${e.award} ${e.title.slice(0, 10)} | ${e.authors.join("; ")}`), [
    "2013 best Energy Cha | Robert LiKamWa; Bodhi Priyantha; Matthai Philipose; Paramvir Bahl",
    "2013 runner-up AMC: Verif | Kyungmin Lee; Jason Flinn; T.J. Giuli"
  ]);
  const y11 = `<h1>MobiSys 2011: The 9th Annual International Conference on Mobile Systems, Applications, and Services</h1><p>Best Paper -  "SignalGuru: Leveraging Mobile Phones for Collaborative Traffic Signal Schedule Advisory" by Emmanouil Koukoumidis, Li-Shiuan Peh and Margaret Martonosi.</p><p>Best Paper -  "Chameleon: A Color-Adaptive Web Browser for Mobile OLED Displays" by Mian Dong and L. Zhong.</p><p>Best Poster -  "You Driving? Talk to You Later" by Hon Lung Chu</p>`;
  assert.deepEqual(parseMobisysYear(y11, "https://www.sigmobile.org/mobisys/2011/").entries.map((e) => `${e.year} ${e.title.slice(0, 8)} | ${e.authors.join("; ")}`), [
    "2011 SignalGu | Emmanouil Koukoumidis; Li-Shiuan Peh; Margaret Martonosi",
    "2011 Chameleo | Mian Dong; L. Zhong"
  ]);
});

test("an ASPLOS year's page: title and authors lines (affiliations in brackets or not), 'Title, Authors.' lines, influential papers with their year; honorable mentions and artifact awards are left out", async () => {
  const { parseAsplosYear } = await import("../scripts/awards/tot.mjs");
  const h = `<h2>Best Paper Awards</h2><p>Fast Thing For Systems</p><p>Ann Lee (MIT); Bo Chan (CMU)</p><h2>Best Paper Honorable Mentions</h2><p>Only A Title Here</p><h2>Influential Paper Awards</h2><p>An old idea that lasted for years, Cy Dunn, Di Eng, ASPLOS 1999.</p><h2>Distinguished Artifact Awards</h2><p>Artifact Paper Title, Ed Fox and Flo Gray.</p>`;
  assert.deepEqual(parseAsplosYear(h, "https://www.asplos-conference.org/asplos2022/").entries.map((e) => `${e.year} ${e.award} ${e.paperYear || ""} ${e.title} | ${e.authors.join("; ")}`), [
    "2022 best  Fast Thing For Systems | Ann Lee; Bo Chan",
    "2022 tot 1999 An old idea that lasted for years | Cy Dunn; Di Eng"
  ]);
});

test("ASPLOS 2019 and 2020 pages: a title over two lines then the authors; 'by Authors (Affiliation)' under a quoted title; the influential paper is left out", async () => {
  const { parseAsplosYear } = await import("../scripts/awards/tot.mjs");
  const h19 = `<p>Announcing our Best Paper Winners:</p><p>A Long Title That Wraps Over</p><p>Two Lines Of Text</p><p>Ann Lee, Bo Chan, Cy Dunn</p><p>ASPLOS Influential Paper Winner:</p>`;
  assert.deepEqual(parseAsplosYear(h19, "https://www.asplos-conference.org/asplos2019/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["A Long Title That Wraps Over Two Lines Of Text | Ann Lee; Bo Chan; Cy Dunn"]);
  const h20 = `<p>Best Paper Award:“A Quoted Title For Systems”,</p><p>by Ann Lee (MIT) and Bo Chan (CMU)</p><p>Virtual ASPLOS Logistics</p>`;
  assert.deepEqual(parseAsplosYear(h20, "https://www.asplos-conference.org/asplos2020/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["A Quoted Title For Systems | Ann Lee; Bo Chan"]);
});

test("SIGCOMM program page: 'Best Paper:' and 'Best Student Paper:' titles, authors from the paper's own entry (affiliations in brackets, a lower-case name kept); honorable mentions left out", async () => {
  const { parseSigcommProgram } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Awards</p><p>Best Paper:A Good Systems Paper Title</p><p>Best Student Paper:A Student Systems Paper</p><p>Honorable mentions:Some Other Systems Paper</p><p>A Good Systems Paper Title Research Track</p><p>Ann Lee, Bo Chan (MIT); kc Dunn (UCSD)</p><p>Abstract: x</p><p>A Student Systems Paper Research Track</p><p>Cy Fox (CMU)</p>`;
  assert.deepEqual(parseSigcommProgram(h, "https://conferences.sigcomm.org/sigcomm/2024/program/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "best A Good Systems Paper Title | Ann Lee; Bo Chan; kc Dunn",
    "student A Student Systems Paper | Cy Fox"
  ]);
});

test("COLT awards page: 'Family, Given; …' and 'Given Family; …' author lines, the 2021 'Title, by …' line form, student and runner-up headings", async () => {
  const { parseColtAwards } = await import("../scripts/awards/tot.mjs");
  const a = `<p>COLT 2024 - Paper Awards</p><p>Best papers</p><p>A Good Learning Theory Result</p><p>Lee, Ann; Chan, Bo</p><p>Best student paper</p><p>A Student Learning Result</p><p>Dunn, Cy</p><p>Menu</p>`;
  assert.deepEqual(parseColtAwards(a, "https://learningtheory.org/colt2024/awards.html").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best A Good Learning Theory Result | Ann Lee; Bo Chan", "student A Student Learning Result | Cy Dunn"]);
  const b = `<p>COLT 2021 - Paper Awards</p><p>Best papers runners-up</p><p>An Online Learning Result, by Fox, Ed; Gray, Flo</p><p>Menu</p>`;
  assert.deepEqual(parseColtAwards(b, "https://learningtheory.org/colt2021/awards.html").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["runner-up An Online Learning Result | Ed Fox; Flo Gray"]);
});

test("CoRL awards page: winners' titles and plain author lines under the award headings; the finalist list is left out", async () => {
  const { parseCorlAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Awards</p><p>"Outstanding Paper Award" Winners for CoRL 2024</p><p>A Robot Learning Paper Title</p><p>Ann Lee, Bo Chan, Cy Dunn</p><p>"Outstanding Paper Award" Finalists for CoRL 2024</p><p>A Finalist Paper Title</p><p>Ed Fox, Flo Gray</p><p>Report abuse</p>`;
  assert.deepEqual(parseCorlAwards(h, "https://2024.corl.org/program/awards").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["outstanding A Robot Learning Paper Title | Ann Lee; Bo Chan; Cy Dunn"]);
});

test("RSS awards page: winners under their headings with 'A, B, and C' author lines, the finalists are left out", async () => {
  const { parseRssAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Congratulations to the following people!</p><p>Best Paper Award</p><p>A Robot Systems Paper Title</p><p>Ann Lee, Bo Chan, and Cy Dunn</p><p>Best Student Paper Award</p><p>A Student Robot Paper</p><p>Ed Fox; Flo Gray</p><p>Best Student Paper Finalists</p><p>A Finalist Paper Title</p><p>Gil Hart</p>`;
  assert.deepEqual(parseRssAwards(h, "https://roboticsconference.org/2022/program/awards/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best A Robot Systems Paper Title | Ann Lee; Bo Chan; Cy Dunn", "student A Student Robot Paper | Ed Fox; Flo Gray"]);
});

test("RSS 2025 awards page: a 'Winner:' line after the winning finalist; the other finalists are left out", async () => {
  const { parseRssAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Awards</p><p>Outstanding Paper Award Finalists</p><p>A First Finalist Paper</p><p>Ann Lee, Bo Chan</p><p>Winner: Outstanding Paper Award</p><p>A Second Finalist Paper</p><p>Cy Dunn, Ed Fox</p><p>Award Committee</p>`;
  assert.deepEqual(parseRssAwards(h, "https://roboticsconference.org/2025/program/awards/").entries.map((e) => `${e.awardLabel} ${e.title} | ${e.authors.join("; ")}`), ["Outstanding Paper Award A First Finalist Paper | Ann Lee; Bo Chan"]);
});

test("SOSP program page: a title followed by 'Best Paper Award' and its authors with affiliations; talks without the line are left out; 2024's 'Best Paper Award: Title' line takes its authors from the accepted-papers list", async () => {
  const { parseSospProgram } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Paper</p><p>A Kernel Systems Paper Title</p><p>Best Paper Award</p><p>Ann Lee (MIT), Bo Chan (CMU)</p><p>Paper</p><p>Another Systems Paper Title</p><p>Cy Dunn (UCSD)</p>`;
  assert.deepEqual(parseSospProgram(h, "https://sosp2023.mpi-sws.org/program.html").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2023 A Kernel Systems Paper Title | Ann Lee; Bo Chan"]);
  const f = `<p>Best Paper Award: A Log Systems Paper Title</p><p>A Log Systems Paper Title</p><p>Ed Fox (UIUC), Flo Gray (UIUC)</p>`;
  assert.deepEqual(parseSospProgram(f, "https://www.sigops.org/s/conferences/sosp/2024/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2024 A Log Systems Paper Title | Ed Fox; Flo Gray"]);
});

test("RecSys best-paper page: 'by Authors (label)' under year headings; student and runner-up labels; honorable mentions and demos left out", async () => {
  const { parseRecsysBest } = await import("../scripts/awards/tot.mjs");
  const h = `<p>RecSys Best Paper Awards</p><p>2024</p><p>A Good Recommender Paper Title</p><p>by Ann Lee, Bo Chan and Cy Dunn (Best Full Paper)</p><p>A Student Recommender Paper</p><p>by Ed Fox (Best Student Paper)</p><p>An Honoured Recommender Paper</p><p>by Flo Gray (Honorable Mention)</p><p>2023</p><p>A Runner Up Recommender Paper</p><p>by Gil Hart (Best Short Paper Runner-Up)</p>`;
  assert.deepEqual(parseRecsysBest(h, "https://recsys.acm.org/best-papers/").entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "2024 best A Good Recommender Paper Title | Ann Lee; Bo Chan; Cy Dunn",
    "2024 student A Student Recommender Paper | Ed Fox",
    "2023 runner-up A Runner Up Recommender Paper | Gil Hart"
  ]);
});

test("AISTATS awards page: the prose 'goes to A and B for their paper Title.' (affiliations in brackets), 'Congratulations to …' under a heading; honorable mentions are left out", async () => {
  const { parseAistatsAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Test of Time Award</p><p>The AISTATS 2025 Test of Time Award goes to Ann Lee (MIT) and</p><p>Bo Chan (CMU) for their paper A Test Of Time Paper Title.</p><p>Congratulations!</p><p>Best Paper</p><p>The AISTATS 2025 Best Paper Award goes to Cy Dunn for their paper A Best Paper Title Here.</p><p>The paper was chosen out of 500.</p><p>Best Student Paper</p><p>Congratulations to Ed Fox, Flo Gray, and Gil Hart for their paper A Student Paper Title Here.</p><p>Honorable Mentions</p>`;
  assert.deepEqual(parseAistatsAwards(h, "https://aistats.org/aistats2025/awards.html").entries.map((e) => `${e.award} ${e.paperYear || ""} ${e.title} | ${e.authors.join("; ")}`), [
    "tot 2015 A Test Of Time Paper Title | Ann Lee; Bo Chan", "best  A Best Paper Title Here | Cy Dunn", "student  A Student Paper Title Here | Ed Fox; Flo Gray; Gil Hart"
  ]);
});

test("UAI awards page: 'Best Paper Award: Title, by authors' lines (2023) and a heading then title and authors lines (2025)", async () => {
  const { parseUaiAwards } = await import("../scripts/awards/tot.mjs");
  assert.deepEqual(parseUaiAwards("<p>Best Paper Award: A Graph Paper Title Here, by Ann Lee and Bo Chan</p>", "https://auai.org/uai2023/awards").entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), ["2023 best A Graph Paper Title Here | Ann Lee; Bo Chan"]);
  assert.deepEqual(parseUaiAwards("<p>Best Student Paper Award:</p><p>A Student Langevin Paper</p><p>Cy Dunn, Ed Fox</p><p>[OpenReview]</p>", "https://auai.org/uai2025/best_papers").entries.map((e) => `${e.year} ${e.award} ${e.title} | ${e.authors.join("; ")}`), ["2025 student A Student Langevin Paper | Cy Dunn; Ed Fox"]);
});

test("ICASSP best-paper page: headings with title and authors' line pairs (quotation marks around the title kept out); a line with affiliations among the names is not read", async () => {
  const { parseIcasspAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Best Paper Awards</p><p>The following papers were at the top of all submitted papers in each category.</p><p>Best Paper Award</p><p>“A Federated Learning Paper Title”</p><p>Ann Lee, Bo Chan</p><p>Conference Best Paper Award for Industry</p><p>“An Industry Paper Title Here”</p><p>Cy Dunn, Meta, Ed Fox, INRIA</p><p>Best Student Paper Awards</p><p>A Student Audio Paper Title</p><p>Flo Gray, Gil Hart</p><p>Home</p>`;
  assert.deepEqual(parseIcasspAwards(h, "https://2024.ieeeicassp.org/awards/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best A Federated Learning Paper Title | Ann Lee; Bo Chan", "student A Student Audio Paper Title | Flo Gray; Gil Hart"]);
});

test("COLING best-paper page: headings, then title and authors' line pairs with 'Presentation' lines between; the table of contents is not read", async () => {
  const { parseColingAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Best Long Paper AwardsA Table Of Contents Title</p><p>Best Long Paper Awards</p><p>A Long Paper About Languages</p><p>Ann Lee and Bo Chan</p><p>Presentation</p><p>Outstanding Paper Awards</p><p>An Outstanding Paper Title</p><p>Cy Dunn, Ed Fox and Flo Gray</p><p>Share on</p>`;
  assert.deepEqual(parseColingAwards(h, "https://coling2025.org/program/best_papers/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best A Long Paper About Languages | Ann Lee; Bo Chan", "outstanding An Outstanding Paper Title | Cy Dunn; Ed Fox; Flo Gray"]);
});

test("Interspeech best-paper page: only the shortlisted papers marked WINNERS are read", async () => {
  const { parseInterspeechBest } = await import("../scripts/awards/tot.mjs");
  const h = `<p>1. Ann Lee, Bo Chan & Cy Dunn – WINNERS</p><p>A Speech Recognition Paper Title</p><p>2. Ed Fox, Flo Gray</p><p>A Shortlisted Only Paper Title</p>`;
  assert.deepEqual(parseInterspeechBest(h, "https://interspeech2024.org/best-paper-award-2024/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["A Speech Recognition Paper Title | Ann Lee; Bo Chan; Cy Dunn"]);
});

test("ECML PKDD awards page: 'Title, by A, B and C.' under the award headings", async () => {
  const { parseEcmlAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Test of Time</p><p>An Old Learning Paper Title, by Ann Lee, Bo Chan.</p><p>Best Student Paper Research Track</p><p>A Fair Graph Paper Title, by Cy Dunn, Ed Fox and Flo Gray.</p><p>Twitter</p>`;
  assert.deepEqual(parseEcmlAwards(h, "https://ecmlpkdd.org/2025/awards/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["tot An Old Learning Paper Title | Ann Lee; Bo Chan", "student A Fair Graph Paper Title | Cy Dunn; Ed Fox; Flo Gray"]);
});

test("INFOCOM awards page: title first or authors first (the first line decides), affiliations in brackets, authors over two lines; demo and poster awards left out", async () => {
  const { parseInfocomBest } = await import("../scripts/awards/tot.mjs");
  const a = `<p>2025 IEEE INFOCOM Best Paper Awards</p><p>A network paper about switching in wireless meshes</p><p>Ann Lee (MIT, USA); Bo Chan (CMU, USA)</p><p>2025 IEEE INFOCOM Best Demo Award</p><p>A Demo Title Here</p><p>Cy Dunn (UCSD, USA)</p>`;
  assert.deepEqual(parseInfocomBest(a, "https://infocom2025.ieee-infocom.org/awards").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2025 A network paper about switching in wireless meshes | Ann Lee; Bo Chan"]);
  const b = `<p>2024 IEEE INFOCOM Best Paper Awards</p><p>Ed Fox (NCSU, USA); Flo Gray (NCSU, USA)</p><p>Hybrid Zone: A Wireless Gesture Paper</p><p>Gil Hart and Hal Ito (Columbia University, USA),</p><p>Ivy Jones (Columbia University, USA)</p><p>Scheduling stochastic traffic in multi-hop networks</p><p>2024 IEEE INFOCOM Best Demo Award</p>`;
  assert.deepEqual(parseInfocomBest(b, "https://infocom2024.ieee-infocom.org/awards").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Hybrid Zone: A Wireless Gesture Paper | Ed Fox; Flo Gray", "Scheduling stochastic traffic in multi-hop networks | Gil Hart; Hal Ito; Ivy Jones"]);
});

test("Euro S&P awards page: title and authors with affiliations (over one line or several); runners-up are their own kind; finalists and reviewers left out", async () => {
  const { parseEurospAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Distinguished Paper Award</p><p>Bad design smells in benchmark datasets</p><p>Ann Lee</p><p>(University of Edinburgh),</p><p>Bo Chan</p><p>(DistriNet, KU Leuven)</p><p>Distinguished Paper Award Runners-Up</p><p>Memory tagging on commodity processors</p><p>Cy Dunn (Graz), Ed Fox (Graz)</p><p>Distinguished Paper Award Finalists</p><p>A finalist only paper title</p><p>Flo Gray (MIT)</p>`;
  assert.deepEqual(parseEurospAwards(h, "https://www.ieee-security.org/TC/EuroSP2024/accepted_and_awards.html").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["distinguished Bad design smells in benchmark datasets | Ann Lee; Bo Chan", "runner-up Memory tagging on commodity processors | Cy Dunn; Ed Fox"]);
});

test("WSDM front pages: the 2018 headings with wrapped titles and authors, the 2019 quoted 'Title, by …' prose with a test of time paper and its year, the 2021 numbered titles with runners-up", async () => {
  const { parseWsdmYear } = await import("../scripts/awards/tot.mjs");
  const a = `<p>Best Paper Award</p><p>Index compression using byte-aligned coding and two-dimensional</p><p>Contexts</p><p>Ann Lee and Bo Chan</p><p>Test of Time Paper Award</p><p>Finding high-quality content in social media</p><p>Cy Dunn, Ed Fox and</p><p>Flo</p><p>Gray</p><p>Best Senior Program Committee Award</p>`;
  assert.deepEqual(parseWsdmYear(a, "https://www.wsdm-conference.org/2018/").entries.map((e) => `${e.award} ${e.paperYear || ""} ${e.title} | ${e.authors.join("; ")}`), ["best  Index compression using byte-aligned coding and two-dimensional Contexts | Ann Lee; Bo Chan", "tot 2008 Finding high-quality content in social media | Cy Dunn; Ed Fox; Flo Gray"]);
  const b = `<p>WSDM 2019 Best Paper Award Recipient:</p><p>"Slice: scalable linear classifiers on many labels", by Gil Hart,</p><p>Hal Ito, and Ivy Jones.</p><p>WSDM 2019 Test of Time Award Recipient:</p><p>"Opinion spam and analysis in reviews", Kay Lowe and Lee Moss, WSDM 2008.</p><p>Best Industry Day Presentation:</p>`;
  assert.deepEqual(parseWsdmYear(b, "https://www.wsdm-conference.org/2019/").entries.map((e) => `${e.award} ${e.paperYear || ""} ${e.title} | ${e.authors.join("; ")}`), ["best  Slice: scalable linear classifiers on many labels | Gil Hart; Hal Ito; Ivy Jones", "tot 2008 Opinion spam and analysis in reviews | Kay Lowe; Lee Moss"]);
  const c = `<p>WSDM 2021 Best Paper Award Recipient</p><p>38: Unifying online and counterfactual ranking</p><p>Ned Ong (University of Amsterdam), Pam Quinn (Delhaize).</p><p>WSDM 2021 Best Paper Award Runner-Up</p><p>337: Controlled experiments and surrogate metrics</p><p>Rae Sims, Sol Tate (LinkedIn Corporation)</p><p>WSDM 2021 Sponsors & Supporters</p>`;
  assert.deepEqual(parseWsdmYear(c, "https://www.wsdm-conference.org/2021/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best Unifying online and counterfactual ranking | Ned Ong; Pam Quinn", "runner-up Controlled experiments and surrogate metrics | Rae Sims; Sol Tate"]);
});

test("PPoPP front page: titles and authors with bracketed affiliations under 'Best Paper(s)', up to the next heading", async () => {
  const { parsePpoppYear } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Best Papers</p><p>A parallel programming result on locks</p><p>Ann Lee (MIT), Bo Chan and Cy Dunn (CMU)</p><p>Best Artifact</p><p>An artifact paper title here</p><p>Ed Fox (UCSD)</p>`;
  assert.deepEqual(parsePpoppYear(h, "https://ppopp22.sigplan.org/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2022 A parallel programming result on locks | Ann Lee; Bo Chan; Cy Dunn"]);
});

test("CIKM best-paper page: 'best paper' / 'runner up' marks before a title ending in a dash, one authors' line per author; unmarked nominations left out", async () => {
  const { parseCikmNominations } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Full Papers</p><p>best paper A graph network for prescribing detection &dash;</p><p>Ann Lee (CWRU, USA),</p><p>Bo Chan (Auburn, USA)</p><p>runner up Knowledge graph embeddings compared &dash;</p><p>Cy Dunn (Peking University, China)</p><p>A merely nominated paper title here &dash;</p><p>Ed Fox (MIT, USA)</p>`;
  assert.deepEqual(parseCikmNominations(h, "https://www.cikm2021.org/programme/best-paper-nominations").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best A graph network for prescribing detection | Ann Lee; Bo Chan", "runner-up Knowledge graph embeddings compared | Cy Dunn"]);
});

test("IPDPS front page: the title and authors under 'IPDPS <year> Best Paper Award' (a sentence line between, 'Authors:' prefix or bracketed affiliations with semicolons); the candidates and other awards are left out", async () => {
  const { parseIpdpsBest } = await import("../scripts/awards/tot.mjs");
  const h = `<p>IPDPS 2024 Best Paper Award</p><p>The IPDPS 2024 Best Paper Award was presented to the authors of:</p><p>Performance portable flow solutions with Galerkin methods</p><p>Ann Lee (Warwick); Bo Chan (IBM); Cy Dunn (Warwick)</p><p>See Best Paper Candidates here</p><p>IPDPS 2024 Open Source Contribution Award</p>`;
  assert.deepEqual(parseIpdpsBest(h, "https://www.ipdps.org/ipdps2024/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2024 Performance portable flow solutions with Galerkin methods | Ann Lee; Bo Chan; Cy Dunn"]);
  const g = `<p>IPDPS 2023 Best Paper Award</p><p>A transformer boosted for variable-length inputs</p><p>Authors: Ed Fox, Flo Gray and Gil Hart</p>`;
  assert.deepEqual(parseIpdpsBest(g, "https://www.ipdps.org/ipdps2023/").entries.map((e) => e.authors.join("; ")), ["Ed Fox; Flo Gray; Gil Hart"]);
});

test("ICS front page: 'BEST PAPER AWARD' and '… RUNNER-UP' headings with a title and an authors' line whose bracket may wrap", async () => {
  const { parseIcsAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>BEST PAPER AWARD</p><p>Nearest neighbour search with non-Euclidean distances on GPUs</p><p>Ann Lee, Bo Chan (Purdue University)</p><p>BEST PAPER AWARD RUNNER-UP</p><p>Shared virtual memory design and performance implications</p><p>Cy Dunn (Clemson University); Ed Fox (Lawrence Livermore National Lab); Flo Gray (Clemson</p><p>University)</p>`;
  assert.deepEqual(parseIcsAwards(h, "https://ics2024.github.io/").entries.map((e) => `${e.award} ${e.authors.join("; ")}`), ["best Ann Lee; Bo Chan", "runner-up Cy Dunn; Ed Fox; Flo Gray"]);
});

test("ECIR best-papers page: label line, authors' line, title, per award; honorable mentions are left out", async () => {
  const { parseEcirAwards } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Best Papers Award</p><p>Best Demo</p><p>Ann Lee, Bo Chan and Cy Dunn</p><p>A retrieval and ranking demo for case reports</p><p>Best Short Paper, Honorable Mention</p><p>Ed Fox</p><p>An honoured short paper about retrieval</p><p>Best Short Student Paper</p><p>Flo Gray and Gil Hart</p><p>Scalability of sparse retrieval algorithms</p><p>Best Papers Committee</p>`;
  assert.deepEqual(parseEcirAwards(h, "https://ecir2025.eu/best-papers-award/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["category A retrieval and ranking demo for case reports | Ann Lee; Bo Chan; Cy Dunn", "student Scalability of sparse retrieval algorithms | Flo Gray; Gil Hart"]);
});

test("FOCS best-paper page: titles with 'Authors:' lines under the best paper and Machtey headings; a nickname bracket is dropped", async () => {
  const { parseFocsBest } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Best Paper Award co-winners</p><p>Explicit lossless vertex expanders</p><p>Authors: Ann Lee, Bo Chan, and Cy Dunn</p><p>Machtey Award for Best Student Paper co-winners</p><p>Obfuscation of unitary quantum programs</p><p>Authors: Ed (Eddie) Fox and Flo Gray</p><p>Privacy Policy</p>`;
  assert.deepEqual(parseFocsBest(h, "https://focs.computer.org/2025/best-paper-awards/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best Explicit lossless vertex expanders | Ann Lee; Bo Chan; Cy Dunn", "student Obfuscation of unitary quantum programs | Ed Fox; Flo Gray"]);
});

test("CCC program page: winners tagged under the title, inline after it, or by a heading above it; a wrapped title is joined; untagged talks are left out", async () => {
  const { parseCccProgram } = await import("../scripts/awards/tot.mjs");
  const h = `<p>14:00</p><p>Switching graph matrix norm</p><p>Bounds: from random graphs to regular ones (paper, talk)</p><p>(winner - Best student paper award)</p><p>Jeff Xu</p><p>14:30</p><p>An ordinary talk about complexity (paper, talk)</p><p>Ann Lee, Bo Chan</p><p>15:00</p><p>Derandomization from time-space tradeoffs (co-winner Best student paper)</p><p>Cy Dunn</p><p>16:00</p><p>Best paper award</p><p>On the complexity of branching proofs</p><p>Ed Fox and Flo Gray</p>`;
  assert.deepEqual(parseCccProgram(h, "https://www.computationalcomplexity.org/Archive/2022/program.html").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), [
    "student Switching graph matrix norm Bounds: from random graphs to regular ones | Jeff Xu",
    "student Derandomization from time-space tradeoffs | Cy Dunn",
    "best On the complexity of branching proofs | Ed Fox; Flo Gray"
  ]);
});

test("MobiSys program pages from their HTML: 2020's best paper list item with its authors span, 2021's 'Best Paper!' badges; honourable mentions are left out", async () => {
  const { parseMobisysHtml } = await import("../scripts/awards/tot.mjs");
  const a = `<h3><b>Best Paper Award</b><br></h3><ul class="papers"><li><span>A Fingerprint Biometrics System For Phones</span> <ul><li> <span class="authors">Ann Lee <span class="affl">(Buffalo, SUNY)</span>, Bo Chan <span class="affl">(UCLA)</span></span></li></ul></li></ul><h3><b>Honourable Mentions</b></h3><ul class="papers"><li><span>An Honoured Millimeter Wave Platform</span> <ul><li> <span class="authors">Cy Dunn <span class="affl">(IMDEA)</span></span></li></ul></li></ul>`;
  assert.deepEqual(parseMobisysHtml(a, "https://www.sigmobile.org/mobisys/2020/program/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2020 A Fingerprint Biometrics System For Phones | Ann Lee; Bo Chan"]);
  const b = `<li><p><span class="badge"> <strong>Best Paper!</strong> </span> <span class="new"> <a href="https://doi.org/10.1145/3458864.3468161">Learning-based DVFS for Mobile Devices</a> </span> <br><em>Ed Fox (KAIST); Flo Gray (SNU); Gil Hart (Colorado)</em>`;
  assert.deepEqual(parseMobisysHtml(b, "https://www.sigmobile.org/mobisys/2021/program.html").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2021 Learning-based DVFS for Mobile Devices | Ed Fox; Flo Gray; Gil Hart"]);
});

test("MobiSys 2023's program page: a red 'Best Paper Award!' line before the bold title and the authors; a page titled with another year is refused", async () => {
  const { parseMobisysHtml } = await import("../scripts/awards/tot.mjs");
  const h = `<title>ACM MobiSys 2023 • Program</title><ul><li> <strong style="color: #ee4042">Best Paper Award!</strong> <p><strong>A Mobile ToF System for Sensing in the Dark</strong> <br><em>Ann Lee, Bo Chan and Cy Dunn (CUHK); Ed Fox (Michigan)</em></p></li></ul>`;
  assert.deepEqual(parseMobisysHtml(h, "https://www.sigmobile.org/mobisys/2023/program.html").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2023 A Mobile ToF System for Sensing in the Dark | Ann Lee; Bo Chan; Cy Dunn; Ed Fox"]);
  assert.equal(parseMobisysHtml(h, "https://www.sigmobile.org/mobisys/2022/program.html").entries.length, 0);
});

test("MobiSys badge pages: only the papers whose DOI carries the page year's proceedings prefix count; a page of another year's papers is refused", async () => {
  const { parseMobisysHtml } = await import("../scripts/awards/tot.mjs");
  const badge = (doi, t, a) => `<li><p><span class="badge"> <strong>Best Paper!</strong> </span> <span class="new"> <a href="https://doi.org/${doi}">${t}</a> </span> <br><em>${a}</em> <a href="https://doi.org/${doi}">Paper</a></p></li>`;
  const filler = Array.from({ length: 5 }, (_, i) => `<a href="https://doi.org/10.1145/3498361.35${i}0001">p</a>`).join("");
  const h = `<title>ACM MobiSys 2022 • Full Program</title>${badge("10.1145/3458864.3468161", "An older year's thermal throttling paper", "Ann Lee (KAIST)")}${badge("10.1145/3498361.3539775", "Acoustic spatial sensing for micro-robot navigation", "Bo Chan, Cy Dunn (Maryland)")}${filler}`;
  assert.deepEqual(parseMobisysHtml(h, "https://www.sigmobile.org/mobisys/2022/program.html").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Acoustic spatial sensing for micro-robot navigation | Bo Chan; Cy Dunn"]);
  assert.equal(parseMobisysHtml(h.replace("2022", "2024"), "https://www.sigmobile.org/mobisys/2024/program.html").entries.length, 0);
});

test("MobiSys 2015's program page: the plural heading 'Best Papers' under Awards", async () => {
  const { parseMobisysYear } = await import("../scripts/awards/tot.mjs");
  const lead = Array.from({ length: 12 }, (_, i) => `<p>Menu item ${i}</p>`).join("");
  const h = `<p>MobiSys 2015 - The 13th International Conference</p>${lead}<p>Awards</p><p>Best Papers</p><p>Accelerating mobile applications through replication</p><p>Ann Lee, Bo Chan (University of Michigan)</p><p>Speculation for low-latency mobile cloud gaming</p><p>Cy Dunn, Ed Fox (Microsoft Research)</p><p>Best Poster</p>`;
  assert.deepEqual(parseMobisysYear(h, "https://www.sigmobile.org/mobisys/2015/program.php").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2015 Accelerating mobile applications through replication | Ann Lee; Bo Chan", "2015 Speculation for low-latency mobile cloud gaming | Cy Dunn; Ed Fox"]);
});

test("SenSys year pages: title and authors with brackets under 'Best Paper Award' and the runner-up heading (2024), the quoted 'Best paper:' form with initials (2021); honorable mentions left out", async () => {
  const { parseSensysYear } = await import("../scripts/awards/tot.mjs");
  const a = `<title>Program</title><p>SenSys 2024</p><p>Best Paper Award</p><p>A processor-sharing architecture for deployments</p><p>Ann Lee (UESTC), Bo Chan (UESTC)</p><p>Best Paper Runner-up Award</p><p>Bandwidth-conserving telepresence via semantic communication</p><p>Cy Dunn (GMU), Ed Fox (UMass)</p><p>Best Paper Honorable Mentions</p><p>An honoured authentication paper title</p><p>Flo Gray (Clemson)</p>`;
  assert.deepEqual(parseSensysYear(a, "https://sensys.acm.org/2024/program/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best A processor-sharing architecture for deployments | Ann Lee; Bo Chan", "runner-up Bandwidth-conserving telepresence via semantic communication | Cy Dunn; Ed Fox"]);
  const b = `<title>ACM SenSys 2021</title><p>Conference in Coimbra</p><p>Best paper:</p><p>"Ultra-low SNR LoRa communication with neural demodulation" -</p><p>C. Li, H. Guo, S. Tong</p><p>Best Presentation at the PhD Forum</p>`;
  assert.deepEqual(parseSensysYear(b, "https://sensys.acm.org/2021/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Ultra-low SNR LoRa communication with neural demodulation | C. Li; H. Guo; S. Tong"]);
});

test("ISCA front page: quoted 'Title by Authors' lines (the page's 'y' typo too) or a title ending ' by' over an authors' line; honorable mentions left out. MICRO: authors, then for \"Title\", over several lines", async () => {
  const { parseIscaBest, parseMicroBest } = await import("../scripts/awards/tot.mjs");
  const a = `<p>2025 ISCA Best Paper Award</p><p>"Precise exceptions in relaxed architectures" by Ann Lee, Bo Chan</p><p>"A hardware dataflow co-exploration design" y Cy Dunn, Ed Fox</p><p>2025 ISCA Best Paper Honorable Mentions</p><p>"An honoured cache paper title" by Flo Gray</p>`;
  assert.deepEqual(parseIscaBest(a, "https://iscaconf.org/isca2025/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Precise exceptions in relaxed architectures | Ann Lee; Bo Chan", "A hardware dataflow co-exploration design | Cy Dunn; Ed Fox"]);
  const b = `<p>2024 ISCA Best Paper Award</p><p>Eliminating load execution for performance by</p><p>R. Bera, A. Ranganathan, O. Mutlu</p><p>2024 ISCA Distinguished Artifact Award</p>`;
  assert.deepEqual(parseIscaBest(b, "https://iscaconf.org/isca2024/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Eliminating load execution for performance | R. Bera; A. Ranganathan; O. Mutlu"]);
  const m = `<p>MICRO 2022: Home</p><p>Best Paper Awards</p><p>Gil Hart, Hal Ito,</p><p>and Ivy Jones, for "Profile-guided branch</p><p>elimination for data centers"</p><p>The other best paper nominees (as noted)</p>`;
  assert.deepEqual(parseMicroBest(m, "https://www.microarch.org/micro55/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2022 Profile-guided branch elimination for data centers | Gil Hart; Hal Ito; Ivy Jones"]);
});

test("HRI awards pages: 2025's 'Best paper: “Title“, Authors.' lines under track headings (honorable mentions left out), 2022's 'Best Paper Award' heading over a title and authors", async () => {
  const { parseHriAwards } = await import("../scripts/awards/tot.mjs");
  const a = `<p>Full Papers</p><p>Design</p><p>Best paper: “Attending to the labour of human-robot collaboration“, Ann Lee, Bo Chan.</p><p>Honorable mention: “An honoured design paper title“, Cy Dunn.</p><p>Demonstrations</p><p>Best paper: “Roleplaying human-robot collaborations through puppets“, Ed Fox, Flo Gray.</p><p>Full Papers Outstanding Reviewers</p>`;
  assert.deepEqual(parseHriAwards(a, "https://humanrobotinteraction.org/2025/awards/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best Attending to the labour of human-robot collaboration | Ann Lee; Bo Chan", "category Roleplaying human-robot collaborations through puppets | Ed Fox; Flo Gray"]);
  const b = `<p>Full Papers</p><p>Design:</p><p>Best Paper Award</p><p>Machine-like behaviors for robot navigation in elevators</p><p>Gil Hart, Hal Ito</p><p>Honorable Mention</p><p>An honoured cognitively assistive paper</p><p>Ivy Jones</p>`;
  assert.deepEqual(parseHriAwards(b, "https://humanrobotinteraction.org/2022/awards/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Machine-like behaviors for robot navigation in elevators | Gil Hart; Hal Ito"]);
});

test("IMC program pages: the award on its own line under the title, or written after it; the page must be titled with the year; a lower-case name is kept", async () => {
  const { parseImcProgram } = await import("../scripts/awards/tot.mjs");
  const a = `<title>ACM IMC 2022 - Program</title><p>Sessions</p><p>Measurement of implied identity in ad delivery  long    video</p><p>Distinguished Paper Award</p><p>Ann Lee (Northeastern), Bo Chan (Northeastern)</p><p>Abstract</p>`;
  assert.deepEqual(parseImcProgram(a, "https://conferences.sigcomm.org/imc/2022/program/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["distinguished Measurement of implied identity in ad delivery | Ann Lee; Bo Chan"]);
  const b = `<title>ACM IMC 2021 - Schedule</title><p>Sessions</p><p>Follow the scent: defeating prefix rotation privacy  Best Paper Award (video)</p><p>Cy Dunn (CMAND); Ed Fox (NPS); kc claffy (CAIDA)</p>`;
  assert.deepEqual(parseImcProgram(b, "https://conferences.sigcomm.org/imc/2021/schedule/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Follow the scent: defeating prefix rotation privacy | Cy Dunn; Ed Fox; kc claffy"]);
  assert.equal(parseImcProgram(a, "https://conferences.sigcomm.org/imc/2024/program/").entries.length, 0);
});

test("MODELS awards track page: best and SIGSOFT distinguished papers with 'A, B and C' authors; ten year influential papers and reviewers left out. JCDL awards page: quoted titles under the award headings", async () => {
  const { parseModelsAwards, parseJcdlAwards } = await import("../scripts/awards/tot.mjs");
  const m = `<p>MODELS 2025 - Awards</p><p>MODELS 25 Awards</p><p>MODELS - The 2025 ten year most influential paper award</p><p>Quick fixing of transformations</p><p>J. Sanchez, E. Guerra and J. de Lara</p><p>Best Foundation Paper</p><p>(sponsored by Springer)</p><p>Hand written code preservation in model transformation</p><p>Ann Lee, Bo Chan and Cy Dunn</p><p>ACM SIGSOFT Distinguished Paper Awards</p><p>Behavioral model correctness evaluation with language models</p><p>Ed Fox and Flo Gray</p><p>Best Reviewer Awards</p>`;
  assert.deepEqual(parseModelsAwards(m, "https://conf.researchr.org/track/models-2025/models-2025-awards").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best Hand written code preservation in model transformation | Ann Lee; Bo Chan; Cy Dunn", "distinguished Behavioral model correctness evaluation with language models | Ed Fox; Flo Gray"]);
  const j = `<p>Vannevar Bush Best Paper Award</p><p>“How a tortured conference becomes a series”</p><p>Gil Hart, Hal Ito</p><p>Best Short Paper Award</p><p>“What lies beneath: visual question datasets”</p><p>Ivy Jones</p>`;
  assert.deepEqual(parseJcdlAwards(j, "https://2025.jcdl.org/awards/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best How a tortured conference becomes a series | Gil Hart; Hal Ito", "category What lies beneath: visual question datasets | Ivy Jones"]);
});

test("GECCO best-paper page: a heading per track (group) and the winning paper's title and authors under it; the menu of tracks above and the footer below are not papers; the page must be titled with the year", async () => {
  const { parseGeccoBest } = await import("../scripts/awards/tot.mjs");
  const h = `<title>GECCO 2024 | Best Paper Awards</title><p>Best Paper Awards</p><p>CS + L4EC Tracks</p><p>ECOM Track</p><p>CS + L4EC Tracks</p><p>Quality with just enough diversity in evolutionary policy search</p><p>Ann Lee (Toulouse), Bo Chan (Imperial College)</p><p>ECOM Track</p><p>Letting a large neighborhood search for dial-a-ride fly</p><p>Cy Dunn (Vienna), Ed Fox (Vienna)</p><p>About</p><p>GECCO is sponsored by SIGEVO</p>`;
  assert.deepEqual(parseGeccoBest(h, "https://gecco-2024.sigevo.org/Best-Paper-Awards").entries.map((e) => `${e.awardLabel} | ${e.title} | ${e.authors.join("; ")}`), ["Best Paper Award (CS + L4EC) | Quality with just enough diversity in evolutionary policy search | Ann Lee; Bo Chan", "Best Paper Award (ECOM) | Letting a large neighborhood search for dial-a-ride fly | Cy Dunn; Ed Fox"]);
  assert.equal(parseGeccoBest(h, "https://gecco-2023.sigevo.org/Best-Paper-Awards").entries.length, 0);
});

test("BMVC award pages: 2022's headings over title and bracketed authors (semicolons, a bracket continued on its own line), 2025's prose 'awarded to … for their paper “Title”'; honourable mentions left out", async () => {
  const { parseBmvcAwards } = await import("../scripts/awards/tot.mjs");
  const a = `<p>Best Paper Award</p><p>Unlocking deep models for transparent object tracking</p><p>Ann Lee (Ljubljana); Bo Chan (CTU Prague)</p><p>Best Paper Award Honourable Mention</p><p>Volumetric relightable faces for rendering</p><p>Cy Dunn (MPI)</p><p>Best Student Paper Award</p><p>Event based non-rigid reconstruction from contours</p><p>Ed Fox (MPI); Flo Gray (TU Munich)</p><p>Sponsors</p>`;
  assert.deepEqual(parseBmvcAwards(a, "https://bmvc2022.org/programme/paper-awards/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best Unlocking deep models for transparent object tracking | Ann Lee; Bo Chan", "student Event based non-rigid reconstruction from contours | Ed Fox; Flo Gray"]);
  const b = `<p>The Best Paper Award was awarded to</p><p>Gil Hart, Hal Ito, Ivy Jones</p><p>for their paper "Guiding a diffusion model with itself using sliding windows".</p><p>The Best Presentation Award was awarded to</p><p>Kay Lowe</p><p>for their paper "Atomizer: generalizing to unseen modalities".</p>`;
  assert.deepEqual(parseBmvcAwards(b, "https://bmvc2025.bmva.org/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2025 Guiding a diffusion model with itself using sliding windows | Gil Hart; Hal Ito; Ivy Jones"]);
});

test("VRST home page: title and authors lines under 'Best Paper', up to the honorable mentions; only 2024 and 2025 are read", async () => {
  const { parseVrstBest } = await import("../scripts/awards/tot.mjs");
  const h = `<title>VRST 2024</title><p>General Chairs</p><p>Awards</p><p>Best Paper</p><p>An in-situ experiment of mixed reality applications in education</p><p>Ann Lee, Bo Chan, Cy Dunn</p><p>Best Paper – Honorable Mention</p><p>An honoured motion tracking evaluation</p><p>Ed Fox</p>`;
  assert.deepEqual(parseVrstBest(h, "https://vrst.acm.org/vrst2024/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["An in-situ experiment of mixed reality applications in education | Ann Lee; Bo Chan; Cy Dunn"]);
  assert.equal(parseVrstBest(h, "https://vrst.acm.org/vrst2023/").entries.length, 0);
});

test("VRST 2023's tie (authors before each title) and 2022's quoted two-line title with its authors below", async () => {
  const { parseVrstBest } = await import("../scripts/awards/tot.mjs");
  const a = `<title>VRST 2023</title><p>Awards:</p><p>Best Papers (tie):</p><p>Ann Lee and Bo Chan</p><p>Stay vigilant: the threat of a replication crisis in locomotion research</p><p>Cy Dunn, Ed Fox and Flo Gray</p><p>Intuitive interfaces for real-time magnification in augmented reality</p><p>Best Poster (Expert Voters):</p><p>Gil Hart</p><p>A detectability of hand offset study</p>`;
  assert.deepEqual(parseVrstBest(a, "https://vrst.acm.org/vrst2023/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Stay vigilant: the threat of a replication crisis in locomotion research | Ann Lee; Bo Chan", "Intuitive interfaces for real-time magnification in augmented reality | Cy Dunn; Ed Fox; Flo Gray"]);
  const b = `<title>VRST 2022</title><p>AWARDS</p><p>Best paper award</p><p>"Walk this beam: impact of different balance</p><p>assistance strategies on performance in VR"</p><p>Ivy Jones, Kay Lowe</p><p>Abstract</p><p>Honorable Mention Award</p>`;
  assert.deepEqual(parseVrstBest(b, "https://vrst.acm.org/vrst2022/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Walk this beam: impact of different balance assistance strategies on performance in VR | Ivy Jones; Kay Lowe"]);
});

test("ASSETS home page: a title over lines, then one author per line (affiliate asterisk, 'Dr', the institution line left out); SUI: authors above the title", async () => {
  const { parseAssetsSuiAwards } = await import("../scripts/awards/tot.mjs");
  const a = `<p>ASSETS 2025 Awards</p><p>Best Paper</p><p>Alternative approaches to access among disabled workers in</p><p>the digital economy of the future</p><p>Ann Lee</p><p>Bo Chan*</p><p>Dr Cy Dunn</p><p>Northeastern University</p><p>Best Student Paper</p><p>Bridging cross neurotype communication differences with generative tools</p><p>Ed Fox</p><p>Flo Gray</p><p>Tufts University</p><p>SIGACCESS ASSETS Paper Impact Award</p>`;
  assert.deepEqual(parseAssetsSuiAwards(a, "https://assets25.sigaccess.org/").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best Alternative approaches to access among disabled workers in the digital economy of the future | Ann Lee; Bo Chan; Cy Dunn", "student Bridging cross neurotype communication differences with generative tools | Ed Fox; Flo Gray"]);
  const b = `<p>SUI 2024 Paper Awards</p><p>Best Paper Award</p><p>Gil Hart, Hal Ito, and Ivy Jones</p><p>Augmenting virtual spatial interfaces with physics-based visual motion cues</p><p>Best Paper Honorable Mention Award</p><p>Kay Lowe</p><p>An honoured handray guiding study</p>`;
  assert.deepEqual(parseAssetsSuiAwards(b, "https://sui.acm.org/2024/").entries.map((e) => `${e.venue} ${e.title} | ${e.authors.join("; ")}`), ["SUI Augmenting virtual spatial interfaces with physics-based visual motion cues | Gil Hart; Hal Ito; Ivy Jones"]);
});

test("AutomotiveUI: the best paper's title from the front page, its authors from the proceedings page's lines under that title; honorable mentions left out", async () => {
  const { parseAutoUiBest } = await import("../scripts/awards/tot.mjs");
  const h = `<p>News</p><p>Congrats to the authors receiving the Best Paper Award!</p><p>🏆 What characterizes situations in situation awareness findings from a human-centered study</p><p>Congrats to the authors receiving Honorable Mentions!</p><p>🎉 Driven to distraction while mind wandering during a city drive</p><p>SESSION: Session 5</p><p>What characterizes situations in situation awareness findings from a human-centered study</p><p>Ann Lee</p><p>Bo Chan</p><p>Another session paper title about conditionally automated cars</p><p>Cy Dunn</p>`;
  assert.deepEqual(parseAutoUiBest(h, "https://www.auto-ui.org/24/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2024 What characterizes situations in situation awareness findings from a human-centered study | Ann Lee; Bo Chan"]);
});

test("ACM Multimedia: 2025's 'Best Paper' heading, a quoted title and 'Authors:'; 2023's 'Best Paper Award Presented to: … for the paper titled: …'; the honorable mention is left out", async () => {
  const { parseAcmmmAwards } = await import("../scripts/awards/tot.mjs");
  const a = `<p>Best Paper</p><p>“Open-vocabulary 3D affordance understanding via functional text enhancement”</p><p>Authors: Ann Lee, Bo Chan, Cy Dunn</p><p>Best Student Paper</p><p>“Building an embodied evolving agent paradigm”</p><p>Authors: Ed Fox, Flo Gray</p><p>Best Open-Source Software</p>`;
  assert.deepEqual(parseAcmmmAwards(a, "https://2025.acmmm.org/awards").entries.map((e) => `${e.award} ${e.title} | ${e.authors.join("; ")}`), ["best Open-vocabulary 3D affordance understanding via functional text enhancement | Ann Lee; Bo Chan; Cy Dunn", "student Building an embodied evolving agent paradigm | Ed Fox; Flo Gray"]);
  const b = `<p>Best Paper Award Presented to:  Gil Hart, Hal Ito, Ivy Jones</p><p>for the paper titled:</p><p>Combinatorial-dependence audio-queried transformer for segmentation</p><p>Honorable Mention Award Presented to:  Kay Lowe</p><p>for the paper titled:</p><p>Proposal-free refinement for temporal action detection</p>`;
  assert.deepEqual(parseAcmmmAwards(b, "https://2023.acmmm.org/").entries.map((e) => `${e.year} ${e.title} | ${e.authors.join("; ")}`), ["2023 Combinatorial-dependence audio-queried transformer for segmentation | Gil Hart; Hal Ito; Ivy Jones"]);
});

test("IEEE VR awards page: the second 'Best Papers' heading, a title, 'Name,' and 'Affiliation;' lines up to 'Abstract'; the honorable mentions are left out; an over-long list is refused", async () => {
  const { parseIeeeVrBest } = await import("../scripts/awards/tot.mjs");
  const h = `<p>Best Papers</p><p>Honorable Mentions</p><p>Best Papers</p><p>A large-scale dataset for virtual reality motion sickness research (Journal: P1422)</p><p>Ann Lee,</p><p>University of Auckland;</p><p>Bo Chan,</p><p>National University of Singapore</p><p>Abstract</p><p>This paper introduces a dataset.</p><p>Best Papers - Honorable Mentions</p><p>An honoured dual-modal speech keyword spotting paper (Journal: P1317)</p><p>Cy Dunn,</p><p>Beihang University</p><p>Abstract</p>`;
  assert.deepEqual(parseIeeeVrBest(h, "https://ieeevr.org/2024/awards/conference-awards/").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["A large-scale dataset for virtual reality motion sickness research | Ann Lee; Bo Chan"]);
});

test("ICC best paper pages: 2025's heading, title and authors with brackets; 2024's capitals heading, title, plain authors; 2022's capitals heading and a quoted 'Title,” by authors' line; the committee above is not read", async () => {
  const { parseIccBest } = await import("../scripts/awards/tot.mjs");
  const a = `<p>Best Paper Awards</p><p>ICC 2025 Best Paper Awards Committee</p><p>Chair: Ann Lee, Virginia Tech, USA</p><p>ICC 2025 BEST PAPER AWARDS RECIPIENTS</p><p>Cognitive Radio and AI-Enabled Networks</p><p>Predictive beamforming for OTFS-enabled vehicular communications</p><p>Bo Chan, Cy Dunn and Ed Fox (Nanjing University, China); Flo Gray (NTU, Singapore)</p><p>Career Fair</p>`;
  assert.deepEqual(parseIccBest(a, "https://icc2025.ieee-icc.org/program/best-paper-awards").entries.map((e) => `${e.awardLabel} | ${e.title} | ${e.authors.join("; ")}`), ["Best Paper Award (Cognitive Radio and AI-Enabled Networks) | Predictive beamforming for OTFS-enabled vehicular communications | Bo Chan; Cy Dunn; Ed Fox; Flo Gray"]);
  const b = `<p>ICC 2024 BEST PAPER AWARDS RECIPIENTS</p><p>IOT & SENSOR NETWORKS SYMPOSIUM</p><p>Pedestrian opportunistic positioning with IMU, UWB, BLE and WiFi sensors</p><p>Gil Hart, Hal Ito, and Ivy Jones</p><p>Search</p>`;
  assert.deepEqual(parseIccBest(b, "https://icc2024.ieee-icc.org/program/best-paper-awards").entries.map((e) => `${e.awardLabel} | ${e.authors.join("; ")}`), ["Best Paper Award (IOT & SENSOR NETWORKS) | Gil Hart; Hal Ito; Ivy Jones"]);
  const c = `<p>ICC 2022 Best Paper Awards Recipients</p><p>COGNITIVE RADIO & AI-ENABLED NETWORKS SYMPOSIUM</p><p>“Fine-grained service offloading in collaborative edge computing,” by Kay Lowe, Lee Moss, and Max Nye</p><p>Search</p>`;
  assert.deepEqual(parseIccBest(c, "https://icc2022.ieee-icc.org/program/best-paper-awards").entries.map((e) => `${e.title} | ${e.authors.join("; ")}`), ["Fine-grained service offloading in collaborative edge computing | Kay Lowe; Lee Moss; Max Nye"]);
});

test("WCNC best paper pages: a 'Track N' line, the title and the authors (brackets in 2023) per track; the page must be titled with the year", async () => {
  const { parseWcncBest } = await import("../scripts/awards/tot.mjs");
  const h = `<title>Best Paper Awards | IEEE Wireless Communications and Networking Conference - 2023 IEEE WCNC</title><p>Menu</p><p>Congratulations to our Best Papers Awards Winners</p><p>Track 1</p><p>Integrated sensing and communication for spoofing and jamming detection</p><p>Ann Lee (Genova, Italy); Bo Chan (Queen Mary, UK)</p><p>Track 2</p><p>Conditional generative adversarial networks for digital twin modeling</p><p>Cy Dunn and Ed Fox (Southeast University, China)</p><p>Workshops</p>`;
  assert.deepEqual(parseWcncBest(h, "https://wcnc2023.ieee-wcnc.org/program/best-paper-awards").entries.map((e) => `${e.awardLabel} | ${e.authors.join("; ")}`), ["Best Paper Award (Track 1) | Ann Lee; Bo Chan", "Best Paper Award (Track 2) | Cy Dunn; Ed Fox"]);
  assert.equal(parseWcncBest(h, "https://wcnc2024.ieee-wcnc.org/program/best-paper-awards").entries.length, 0);
});

test("GLOBECOM best paper page: several papers under one heading, a footnote mark after a name, a title printed twice; the committee above is not read", async () => {
  const { parseGlobecomBest } = await import("../scripts/awards/tot.mjs");
  const h = `<p>GLOBECOM 2022 BEST PAPER AWARDS COMMITTEE</p><p>Chairs: Ann Lee and Bo Chan</p><p>GLOBECOM 2022 BEST PAPER AWARDS RECIPIENTS</p><p>WC Symposium</p><p>Dual polarized massive MIMO with rate splitting</p><p>Cy Dunn, Ed Fox, Flo Gray</p><p>Tensor decomposition for hybrid beamforming in MIMO systems</p><p>Gil Hart, Hal Ito</p><p>SAC Track</p><p>UAV communications in integrated terrestrial networks</p><p>Ivy Jones, Kay Lowe, Max Nye♭</p><p>NGNI Symposium</p><p>An intrusion detection system for in-vehicle networksAn intrusion detection system for in-vehicle networks</p><p>Pat Quinn, Ray Shaw</p><p>Best Paper Awards</p>`;
  assert.deepEqual(parseGlobecomBest(h, "https://globecom2022.ieee-globecom.org/program/best-paper-awards").entries.map((e) => `${e.awardLabel} | ${e.title} | ${e.authors.join("; ")}`), [
    "Best Paper Award (WC) | Dual polarized massive MIMO with rate splitting | Cy Dunn; Ed Fox; Flo Gray",
    "Best Paper Award (WC) | Tensor decomposition for hybrid beamforming in MIMO systems | Gil Hart; Hal Ito",
    "Best Paper Award (SAC Track) | UAV communications in integrated terrestrial networks | Ivy Jones; Kay Lowe; Max Nye",
    "Best Paper Award (NGNI) | An intrusion detection system for in-vehicle networks | Pat Quinn; Ray Shaw"
  ]);
});
