"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const marks = require("../src/lib/marks.js");

const FIX = path.join(__dirname, "fixtures");
const kinds = (fields, opts) => marks.detect(fields, opts).map((m) => m.kind);
const venue = (v) => kinds({ venue: v });
const title = (t) => kinds({ title: t });

test("venue text: what authors really append to a venue", () => {
  assert.deepEqual(venue("ICLR 2023 (Spotlight)"), ["spotlight"]);
  assert.deepEqual(venue("Advances in Neural Information Processing Systems 36 (NeurIPS 2023), Oral"), ["oral"]);
  assert.deepEqual(venue("NeurIPS 2022 Oral"), ["oral"]);
  assert.deepEqual(venue("NeurIPS Spotlight"), ["spotlight"]);
  assert.deepEqual(venue("International Conference on Machine Learning, 2020 (Outstanding Paper Award)"), ["outstanding"]);
  assert.deepEqual(venue("CVPR 2016 Best Paper Award"), ["best"]);
  assert.deepEqual(venue("IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2023 Highlight"), ["highlight"]);
  assert.deepEqual(venue("ICSE 2020 ACM SIGSOFT Distinguished Paper Award"), ["distinguished"]);
  assert.deepEqual(venue("SOSP 2017 Best Student Paper"), ["best-student"]);
  assert.deepEqual(venue("ISCA 2019 Test of Time Award"), ["tot"]);
  assert.deepEqual(venue("ICML 2021 Long Oral"), ["oral"]);
  assert.deepEqual(venue("ICLR 2022 notable-top-5%"), ["oral"]);
  assert.deepEqual(venue("ICLR 2023 notable top 25%"), ["spotlight"]);
  assert.deepEqual(venue("NeurIPS 2023 Oral (Top 1%)"), ["oral"]);
  assert.deepEqual(venue("ICLR 2024 – Oral"), ["oral"]);
  assert.deepEqual(venue("ICLR 2024 Spotlight"), ["spotlight"], "no-break space, as in Scholar's DOM");
  assert.deepEqual(venue("NeurIPS 2023 Oral, Best Paper Award"), ["best", "oral"], "most notable first");
});

test("honours below a win are labelled for what they are", () => {
  assert.deepEqual(venue("ACL 2022 Best Paper Award Nominee"), ["finalist"]);
  assert.deepEqual(venue("CVPR 2018 Best Paper Award Candidate"), ["finalist"]);
  assert.deepEqual(venue("CHI 2021, Honorable Mention"), ["runner-up"]);
  assert.deepEqual(venue("CHI 2021 Best Paper Honourable Mention"), ["runner-up"]);
  assert.deepEqual(venue("EMNLP 2020 Best Paper Runner-up"), ["runner-up"]);
  assert.deepEqual(venue("NeurIPS 2022 Outstanding Paper Honorable Mention"), ["runner-up"]);
  assert.deepEqual(venue("KDD 2019 Second Best Paper"), ["runner-up"]);
  assert.equal(marks.detect({ venue: "EMNLP 2020 Best Paper Runner-up" })[0].label, "Best paper runner-up");
  assert.equal(marks.detect({ venue: "CHI 2021 Honorable Mention" })[0].label, "Honorable mention");
  assert.equal(marks.detect({ venue: "ACL 2021 Best Short Paper" })[0].label, "Best short paper");
  assert.deepEqual(marks.detect({ venue: "ACL 2021 Best Paper" }).map((m) => m.group), ["award"]);
  assert.deepEqual(marks.detect({ venue: "ACL 2022 Best Paper Nominee" }).map((m) => m.group), ["finalist"], "a finalist is shown, not counted as an award");
});

test("title text: only a trailing or leading marker, never an ordinary word", () => {
  assert.deepEqual(title("Learning to Rank with Noisy Labels (Oral)"), ["oral"]);
  assert.deepEqual(title("Learning to Rank with Noisy Labels [Spotlight]"), ["spotlight"]);
  assert.deepEqual(title("Learning to Rank (ICLR 2023 Spotlight)"), ["spotlight"]);
  assert.deepEqual(title("Learning to Rank (NeurIPS Oral, Best Paper)"), ["best", "oral"]);
  assert.deepEqual(title("Learning to Rank (Best Paper Award)"), ["best"]);
  assert.deepEqual(title("Learning to Rank - Best Paper Award"), ["best"]);
  assert.deepEqual(title("Learning to Rank – Oral Presentation"), ["oral"]);
  assert.deepEqual(title("[Oral] Learning to Rank with Noisy Labels"), ["oral"]);
  assert.deepEqual(title("Learning to Rank（Oral）"), ["oral"], "full-width brackets");
  assert.deepEqual(title("Learning to Rank (Oral) "), ["oral"]);
  // not markers
  assert.deepEqual(title("Oral Cancer Detection Using Deep Learning"), []);
  assert.deepEqual(title("Spotlight on Education: A Survey"), []);
  assert.deepEqual(title("Video Highlight Detection with Pairwise Deep Ranking"), []);
  assert.deepEqual(title("Do Best Paper Awards Predict Citations?"), []);
  assert.deepEqual(title("Learning to Highlight (Oral Histories)"), []);
  assert.deepEqual(title("Oral Health Outcomes (A Spotlight Study)"), []);
  assert.deepEqual(title("Outstanding Paper Detection: A Benchmark"), []);
  assert.deepEqual(title("The Oral Tradition - An Overview"), []);
  assert.deepEqual(title("Non-oral Delivery of Insulin"), []);
});

test("venue text: words that merely contain a marker stay unmarked", () => {
  for (const v of [
    "Journal of Oral Rehabilitation 45 (3), 200-210, 2018",
    "Oral Oncology 55, 12-19, 2016",
    "International journal of oral and maxillofacial surgery 47 (4), 433-441, 2018",
    "Oral Surgery, Oral Medicine, Oral Pathology, Oral Radiology 120 (1), 2015",
    "JAMA Oral Health 12, 2020",
    "Annals of Oral Biology, 2019",
    "Research Highlights, Nature Reviews, 2020",
    "Nature Spotlight 12, 2019",
    "Highlights of Astronomy 15, 2010",
    "Proceedings of the 12th Spotlight on Learning Workshop, 2019",
    "Best practices in oral history, 2012"
  ]) assert.deepEqual(venue(v), [], v);
});

test("a venue word list lets Interspeech-style names qualify a talk marker", () => {
  assert.deepEqual(kinds({ venue: "Interspeech Oral" }), []);
  assert.deepEqual(kinds({ venue: "Interspeech Oral" }, { venueWord: (w) => w === "interspeech" }), ["oral"]);
  assert.deepEqual(kinds({ title: "Speech Models (Interspeech 2022 Oral)" }, { venueWord: (w) => w === "interspeech" }), ["oral"]);
  assert.deepEqual(kinds({ title: "Speech Models (Interspeech 2022 Oral)" }), [], "unknown lower-case venue words are not trusted");
});

test("detect returns the author's own text for tooltips and counts papers once per group", () => {
  const [m] = marks.detect({ venue: "ICLR 2023 (Spotlight Presentation)" });
  assert.equal(m.text, "Spotlight Presentation");
  assert.equal(m.field, "venue");
  assert.equal(m.label, "Spotlight");
  assert.equal(marks.detect({ title: "X (Oral)" })[0].field, "title");
  const papers = [
    { marks: marks.detect({ venue: "NeurIPS 2023 Oral, Best Paper Award" }) },
    { marks: marks.detect({ venue: "CVPR 2016 Best Paper Award" }) },
    { marks: marks.detect({ venue: "ICLR 2022 Spotlight" }) },
    { marks: [] }, {}
  ];
  assert.deepEqual(marks.summarize(papers), { award: 2, oral: 1, spotlight: 1 });
  assert.ok(marks.inGroup(papers[0], "oral") && marks.inGroup(papers[0], "award") && !marks.inGroup(papers[1], "oral"));
});

test("no real venue string in the corpora is ever marked", () => {
  const strings = [];
  for (const f of ["hinton", "kaiming-he", "ion-stoica"]) {
    for (const r of JSON.parse(fs.readFileSync(path.join(FIX, "profiles", f + ".json"), "utf8")).rows) strings.push(r[1]);
  }
  const extra = JSON.parse(fs.readFileSync(path.join(FIX, "venues.json"), "utf8"));
  for (const [k, v] of Object.entries(extra)) if (!k.startsWith("_")) strings.push(...v);
  assert.ok(strings.length > 400);
  const hits = strings.map((s) => [s, marks.detect({ venue: s })]).filter(([, m]) => m.length);
  assert.deepEqual(hits.map(([s, m]) => s + " -> " + m.map((x) => x.kind)), []);
});

test("analyzeRow carries the marks, from the list text and from a resolved paper page", () => {
  const analysis = require("../src/lib/analysis.js");
  const venues = require("../src/lib/venues.js");
  const ccf = require("../src/data/ccf.js");
  const core = require("../src/data/core.js");
  const aliases = require("../src/data/aliases.js");
  const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
  const owner = { name: "Jane Doe", alternates: [] };
  const raw = { title: "Fast Things (Oral)", authorsText: "J Doe, A Smith", venueText: "NeurIPS 2022 Spotlight, 2022", year: 2022 };
  const a = analysis.analyzeRow(raw, { owner, resolver });
  assert.deepEqual(a.marks.map((m) => m.kind + ":" + m.field), ["oral:title", "spotlight:venue"]);
  // the list text lost it to truncation; the paper's own page still has it
  const trunc = { title: "Fast Things", authorsText: "J Doe, A Smith, ...", venueText: "Advances in neural information processing systems 35 (NeurIPS …, 2022", year: 2022 };
  assert.deepEqual(analysis.analyzeRow(trunc, { owner, resolver }).marks, []);
  const b = analysis.analyzeRow(trunc, { owner, resolver, resolved: { authors: "J Doe, A Smith, B Lee", venue: "NeurIPS 2022 (Spotlight)" } });
  assert.deepEqual(b.marks.map((m) => m.kind), ["spotlight"]);
  // an ordinary row has none, and a row without a title field still works
  assert.deepEqual(analysis.analyzeRow({ authorsText: "J Doe", venueText: "Nature 521, 2015" }, { owner, resolver }).marks, []);
});
