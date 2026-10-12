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
