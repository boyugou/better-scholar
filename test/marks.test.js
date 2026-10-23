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
  // what the "Awards" count is made of: a paper counts once per kind, talk kinds are not awards
  const mk = (kind, group = "award") => ({ kind, group });
  assert.deepEqual(marks.summarizeKinds([{ marks: [mk("best"), mk("tot")] }, { marks: [mk("runner-up")] }, { marks: [mk("runner-up"), mk("runner-up"), mk("oral", "oral")] }, { marks: [] }, {}]),
    { best: 1, tot: 1, "runner-up": 2 });
  assert.deepEqual(marks.summarizeKinds([{ marks: [mk("oral", "oral")] }]), {});
  assert.ok(marks.inGroup(papers[0], "oral") && marks.inGroup(papers[0], "award") && !marks.inGroup(papers[1], "oral"));
});

test("no real venue string in the corpora is marked unless its author wrote the level", () => {
  const strings = [];
  for (const f of ["hinton", "kaiming-he", "ion-stoica"]) {
    for (const r of JSON.parse(fs.readFileSync(path.join(FIX, "profiles", f + ".json"), "utf8")).rows) strings.push(r[1]);
  }
  const extra = JSON.parse(fs.readFileSync(path.join(FIX, "venues.json"), "utf8"));
  for (const [k, v] of Object.entries(extra)) if (!k.startsWith("_")) strings.push(...v);
  assert.ok(strings.length > 400);
  const hits = strings.map((s) => [s, marks.detect({ venue: s })]).filter(([, m]) => m.length);
  // the one real string whose author put the level in the venue field, in parentheses (a profile owner's own "(spotlight)")
  assert.deepEqual(hits.map(([s, m]) => s + " -> " + m.map((x) => x.kind)), [
    "2025 International Conference on Learning Representations (spotlight), 2025 -> spotlight",
    // one real profile's own annotations in the venue field (the author wrote the level)
    "WSDM 2022 (🌟 Best Paper Nomination & Top-3 Most Cited Papers), 2022 -> finalist",
    "MM 2024 (🌟 Best Paper Honorable Mention Award), 2024 -> runner-up",
    // more real authors' own award notes written in front of the venue
    "ASE 2024 Most Influential Paper Award. 2013 IEEE/ACM International\u00a0…, 2013 -> tot",
    "HCOMP 2024 Test of Time and Impact Award. Proceedings of the AAAI Conference\u00a0…, 2013 -> tot",
    "HCOMP Best Paper Award. AAAI Conference on Human Computation and\u00a0…, 2016 -> best",
    "PIKM Best Paper Award. First Ph.D. Workshop at The Conference on Information\u00a0…, 2007 -> best",
    "Best Paper Honorable Mention: CSCW'24. Proceedings of the 28th ACM\u00a0…, 2024 -> runner-up",
    "ECIR Best Student Paper Award. Advances in Information Retrieval: 41st\u00a0…, 2019 -> best-student",
    "CIST Best Student Paper Award. 2022 Conference on Information Systems and\u00a0…, 2023 -> best-student",
    // a profile read live in its owner's Chrome on 2026-10-13: the level in parentheses after the venue, as the chip showed it
    "ICLR 2025 (Oral), 2024 -> oral",
    "ICLR 2026 (Oral), 2025 -> oral",
    "EMNLP 2026 (Oral), 2026 -> oral"
  ]);
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

test("styled letters (mathematical bold, full-width) read as plain ones, and several trailing brackets are each read", () => {
  const kinds = (title, venue) => marks.detect({ title, venue }).map((m) => m.kind).sort();
  assert.deepEqual(kinds("Some paper (Oral) (Best Paper Finalist)"), ["finalist", "oral"]);
  assert.deepEqual(kinds("Some paper (𝐎𝐫𝐚𝐥) (𝐁𝐞𝐬𝐭 𝐏𝐚𝐩𝐞𝐫 𝐅𝐢𝐧𝐚𝐥𝐢𝐬𝐭)"), ["finalist", "oral"]);
  assert.deepEqual(kinds("Some paper （ＯＲＡＬ）"), ["oral"]);
  assert.deepEqual(kinds("Some paper [Spotlight] (ICLR 2024) (Oral)"), ["oral", "spotlight"]);
  assert.deepEqual(kinds("(Oral) (Best Paper) Some paper"), ["best", "oral"]);
  // still precision-first: a bracket holding other words is no marker, nor is a word of an ordinary title
  assert.deepEqual(kinds("Oral Oncology (Review)"), []);
  assert.deepEqual(kinds("Notes on Spotlight Detection (Oral history of the lab)"), []);
});

test("talk rows: apart by default, spotlight + highlight together, or all three together; a paper counts once per row", () => {
  const P = (...groups) => ({ marks: groups.map((group) => ({ group })) });
  const papers = [P("oral"), P("spotlight"), P("highlight"), P("spotlight", "highlight"), P("award", "oral"), P()];
  assert.deepEqual(marks.rows("separate"), ["award", "oral", "spotlight", "highlight"]);
  assert.deepEqual(marks.rows("pair"), ["award", "oral", "spotlight+highlight"]);
  assert.deepEqual(marks.rows("talks"), ["award", "oral+spotlight+highlight"]);
  assert.deepEqual(marks.summarize(papers), { award: 1, oral: 2, spotlight: 2, highlight: 2 });
  assert.deepEqual(marks.summarize(papers, "pair"), { award: 1, oral: 2, "spotlight+highlight": 3 });
  assert.deepEqual(marks.summarize(papers, "talks"), { award: 1, "oral+spotlight+highlight": 5 });
  assert.ok(marks.inGroup(P("highlight"), "spotlight+highlight") && !marks.inGroup(P("oral"), "spotlight+highlight") && marks.inGroup(P("oral"), "oral+spotlight+highlight"));
});

test("a runner-up, an honorable mention or a finalist of any best paper is that, never the award itself (the nineteenth review: 358 of 7,830 official labels read as another kind)", () => {
  for (const [text, want] of [
    ["KDD 1997 Best Research Paper Runner-up", "runner-up"], ["KDD 2005 Best Student Paper Runner-up", "runner-up"], ["SIGMM 2020 Test of Time Paper Award Honorable Mention", "runner-up"],
    ["CVPR 2020 Best Paper Honorable Mentions", "runner-up"], ["CHI 2019 Honorable Mention for Best Paper", "runner-up"], ["KDD 2020 Runner-up, Best Paper Award", "runner-up"],
    ["Best Paper Awards Honorable Mention", "runner-up"], ["Best Paper (AI for Social Impact track) Honorable Mention", "runner-up"], ["Second Best Paper", "runner-up"],
    ["ICASSP 2020, Best Student Paper Finalist", "finalist"], ["CHI 2020 Nominee for the Best Paper Award", "finalist"], ["Finalist for Best Paper", "finalist"], ["Best Paper Award Finalist", "finalist"],
    ["Outstanding Student Paper", "best-student"], ["Best Student Paper Award", "best-student"], ["Best Paper Award", "best"], ["Best Short Paper", "best"], ["CVPR 2016 Best Paper Award", "best"],
    ["Outstanding Paper Award", "outstanding"], ["Distinguished Paper Award", "distinguished"], ["Test of Time Award", "tot"]
  ]) assert.deepEqual(venue(text), [want], text);
  // the bundled list's own labels, typed as an author would type them: none reads as the other side
  const awards = require("../src/lib/awards.js"), data = require("../src/data/awards.js");
  const top = new Set(["best", "best-student", "outstanding", "distinguished", "best-category", "tot"]);
  const wrong = [];
  for (const [, , v, y, a, l] of data.items) {
    const found = venue(`${v} ${y} ${l || ""}`.trim());
    if (a === "runner-up" ? found.some((k) => top.has(k)) : found.length && found.every((k) => k === "runner-up" || k === "finalist")) wrong.push(`${a}: ${l} → ${found.join("+")}`);
  }
  assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} labels read as the other side`);
  assert.ok(awards.KIND);
});

test("'Highlights' in a name is no Highlight talk; a paper the list says won is no mere finalist", () => {
  assert.deepEqual(venue("Full papers, feature articles, highlights"), []);
  assert.deepEqual(venue("Proceedings & Highlights - Emerging Tech Conference Edge Intelligence 2024"), []);
  assert.deepEqual(venue("ICLR 2020 (Highlight)"), ["highlight"]);
  assert.deepEqual(venue("CVPR 2021 Highlights Paper"), ["highlight"]);
  const declared = marks.detect({ venue: "CVPR 2016 Best Paper Award Finalist" });
  assert.deepEqual(declared.map((m) => m.kind), ["finalist"]);
  assert.deepEqual(marks.merge(declared, [{ kind: "best", venue: "CVPR", year: 2016, awardLabel: "Best Paper" }]).map((m) => m.kind), ["best"]);
  assert.deepEqual(marks.merge(declared, [{ kind: "runner-up", venue: "CVPR", year: 2016, awardLabel: "Honorable Mention" }]).map((m) => m.kind).sort(), ["finalist", "runner-up"]);
});


test("an independent review of the award fixes: a runner-up or a finalist written any way is that, a ranking is no award, the list's lesser honour wins over typed words, one award marks one row", () => {
  const kinds = (venue) => marks.detect({ title: "", venue: ["CHI 2020, " + venue] }).map((m) => m.kind).join(",");
  for (const v of ["Best Paper Award (Runner-up)", "Best Paper Award [Runner-up]", "Best Paper Award - Runner Up", "Best Paper Award – Runner-up", "Best Paper Award: Honorable Mention", "Best Paper (Honorable Mention)", "Best Paper Runners-up", "Best Paper (2nd place)"]) assert.equal(kinds(v), "runner-up", v);
  for (const v of ["Best Paper Award (Finalist)", "Best Paper (Nominee)", "Best Paper Shortlist", "Best Paper Shortlisted", "Best Paper Semi-finalist", "Best Paper Top-3 Finalist"]) assert.equal(kinds(v), "finalist", v);
  assert.equal(kinds("Best Paper Award (AI for Social Impact track)"), "best");
  assert.deepEqual(marks.detect({ title: "", venue: ["WWW 2024 (🌟 Top-1 Most Influential Paper), 2024"] }), [], "a ranking of influential papers is no test-of-time award");
  // the list says runner-up: the typed "Best Paper" does not stand beside it
  const merged = marks.merge([{ kind: "best", text: "Best Paper Award" }], [{ kind: "runner-up", venue: "ICDM", year: 2013, awardLabel: "" }]);
  assert.deepEqual(merged.map((m) => m.kind), ["runner-up"]);
  // one award of the list, one row: the earliest for test of time, the closest year for a conference award
  const L = (kind, venue, year) => ({ kind, venue, year, awardLabel: "", source: "list" });
  const once = marks.listedOnce([
    { title: "MapReduce: simplified data processing", year: 2004, marks: [L("tot", "SIGOPS", 2015)] },
    { title: "MapReduce: Simplified Data Processing", year: 2008, marks: [L("tot", "SIGOPS", 2015), { kind: "oral", source: "author" }] },
    { title: "Mask R-CNN", year: 2018, marks: [L("best", "ICCV", 2017)] },
    { title: "Mask R-CNN", year: 2017, marks: [L("best", "ICCV", 2017)] },
    { title: "Another paper", year: 2009, marks: [L("tot", "SIGOPS", 2015)] }
  ]);
  assert.deepEqual(once.map((ms) => ms.map((m) => m.kind)), [["tot"], ["oral"], [], ["best"], ["tot"]]);
});

test("a test-of-time award on the list leaves the authors' own \"Best Paper\" standing; a hidden duplicate keeps no award; one title key with the lookup", () => {
  const merged = marks.merge([{ kind: "best", text: "Best Paper Award" }], [{ kind: "tot", venue: "SIGOPS", year: 2015, awardLabel: "" }]);
  assert.deepEqual(merged.map((m) => m.kind).sort(), ["best", "tot"]);
  const L = (kind, venue, year) => ({ kind, venue, year, awardLabel: "", source: "list" });
  const once = marks.listedOnce([
    { title: "MapReduce", year: 2004, hidden: true, marks: [L("tot", "SIGOPS", 2015)] },
    { title: "MapReduce", year: 2008, marks: [L("tot", "SIGOPS", 2015)] }
  ]);
  assert.deepEqual(once.map((ms) => ms.length), [0, 1], "the row that stays holds the award");
  const fold = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  assert.deepEqual(marks.listedOnce([{ title: "Naïve Bayes", year: 2001, marks: [L("best", "X", 2001)] }, { title: "Naive Bayes", year: 2003, marks: [L("best", "X", 2001)] }], fold).map((ms) => ms.length), [1, 0]);
});

test("a hidden duplicate's award that no other row holds goes to the row that stands for it", () => {
  const L = (kind, venue, year) => ({ kind, venue, year, awardLabel: "", source: "list" });
  const once = marks.listedOnce([{ title: "A", year: 2021, marks: [] }, { title: "A", year: 2024, hidden: true, into: 0, marks: [L("best", "AAAI", 2024)] }]);
  assert.deepEqual(once.map((ms) => ms.map((m) => m.kind)), [["best"], []]);
});

test("a moved award takes the place of the kept row's own mark of the same kind, as merge does", () => {
  const kept = marks.merge([{ kind: "best", text: "Best Paper", source: "author" }], []);
  const hidden = marks.merge([], [{ kind: "best", venue: "KDD", year: 2010, awardLabel: "" }]);
  const once = marks.listedOnce([{ title: "A", year: 2012, marks: kept }, { title: "A", year: 2010, hidden: true, into: 0, marks: hidden }]);
  assert.deepEqual(once[0].map((m) => `${m.kind}/${m.source}`), ["best/list"]);
  assert.equal(once[0][0].declared, "Best Paper");
  assert.deepEqual(once[1], []);
});

test("a moved award follows merge's rules across kinds: a listed runner-up drops the typed best, a listed best drops the typed finalist", () => {
  const L = (kind) => ({ kind, venue: "KDD", year: 2010, awardLabel: "" });
  const move = (typed, listed) => marks.listedOnce([{ title: "A", year: 2012, marks: marks.merge(typed, []) }, { title: "A", year: 2010, hidden: true, into: 0, marks: marks.merge([], [L(listed)]) }])[0].map((m) => `${m.kind}/${m.source}`);
  assert.deepEqual(move([{ kind: "best", text: "Best Paper", source: "author" }], "runner-up"), ["runner-up/list"]);
  assert.deepEqual(move([{ kind: "finalist", text: "Best Paper Finalist", source: "author" }], "best"), ["best/list"]);
});
