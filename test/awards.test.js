"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const awards = require("../src/lib/awards.js");
const marks = require("../src/lib/marks.js");
const analysis = require("../src/lib/analysis.js");
const venues = require("../src/lib/venues.js");
const ccf = require("../src/data/ccf.js");
const core = require("../src/data/core.js");
const aliases = require("../src/data/aliases.js");

const ROOT = path.join(__dirname, "..");
const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
// a tiny hand-made list in the bundled format: [titleKey, firstAuthorSurnameKey, venue, year, award, printedName]
const item = (title, first, venue, year, award, label = "") => [awards.titleKey(title), awards.surnameKey(first), venue, year, award, label];
const index = awards.createIndex([
  item("Deep Residual Learning for Image Recognition", "Kaiming He", "CVPR", 2016, "best", "Best Paper Award"),
  item("Mask R-CNN", "Kaiming He", "ICCV", 2017, "best", "Marr Prize"),
  item("Mask R-CNN", "Kaiming He", "ICCV", 2017, "student", "Best Student Paper"),
  item("Attention? Attention!", "Lilian Weng", "TEST", 2020, "outstanding"),
  item("A Paper by a Person with a Particle", "Luis von Ahn", "CHI", 2014, "distinguished"),
  item("Une Étude sur l'Œuvre de Łukasz", "Łukasz Kaiser", "ACL", 2019, "runner-up"),
  item("A Classic", "Ann Old", "ICML", 2020, "tot", "Test of Time Award")
]);

test("keys ignore case, accents and punctuation but nothing else", () => {
  assert.equal(awards.titleKey("Deep Residual Learning for Image Recognition"), "deepresiduallearningforimagerecognition");
  assert.equal(awards.titleKey("  Deep  residual learning, for image-recognition! "), "deepresiduallearningforimagerecognition");
  assert.equal(awards.titleKey("Café: Résumé & Müller"), "caferesumeandmuller");
  assert.notEqual(awards.titleKey("Deep Residual Learning"), awards.titleKey("Deep Residual Learning for Image Recognition"));
  assert.equal(awards.surnameKey("Kaiming He"), "he");
  assert.equal(awards.surnameKey("K He"), "he");
  assert.equal(awards.surnameKey("Luis von Ahn"), awards.surnameKey("L von Ahn"));
  assert.equal(awards.surnameKey("Łukasz Kaiser"), awards.surnameKey("Ł Kaiser"));
});

test("a row matches by full title and a first-author surname that is among its authors", () => {
  const hit = index.lookup({ title: "Deep residual learning for image recognition", authorsText: "K He, X Zhang, S Ren, J Sun" });
  assert.deepEqual(hit, [{ kind: "best", venue: "CVPR", year: 2016, awardLabel: "Best Paper Award" }]);
  // the same title with nobody from the award's author list is not the award paper
  assert.deepEqual(index.lookup({ title: "Deep Residual Learning for Image Recognition", authorsText: "A Smith, B Jones" }), []);
  // a near title is not the title
  assert.deepEqual(index.lookup({ title: "Deep Residual Learning for Image Recognition: A Survey", authorsText: "K He" }), []);
  assert.deepEqual(index.lookup({ title: "Deep Residual Learning", authorsText: "K He" }), []);
  // a truncated author list that still shows the first author is enough
  assert.equal(index.lookup({ title: "Mask R-CNN", authorsText: "K He, G Gkioxari, P Dollár, R Girshick" }).length, 2);
  assert.deepEqual(index.lookup({ title: "Mask R-CNN", authorsText: "K He, G Gkioxari, ..." }).map((m) => m.kind), ["best", "best-student"]);
  assert.deepEqual(index.lookup({ title: "", authorsText: "K He" }), []);
  assert.deepEqual(index.lookup({ title: "Mask R-CNN" }), []);
  assert.deepEqual(index.lookup({ title: "Attention Attention", authorsText: "L Weng" }).map((m) => m.kind), ["outstanding"]);
  assert.deepEqual(index.lookup({ title: "A Paper by a Person with a Particle", authorsText: "L von Ahn, M Blum" }).map((m) => m.kind), ["distinguished"]);
  assert.deepEqual(index.lookup({ title: "Une étude sur l'œuvre de łukasz", authorsText: "Ł Kaiser, A Other" }).map((m) => m.kind), ["runner-up"]);
  assert.deepEqual(index.lookup({ title: "A Classic", authorsText: "A Old" }).map((m) => m.kind), ["tot"]);
});

test("unknown award names are ignored rather than guessed", () => {
  const idx = awards.createIndex([item("X", "A Person", "V", 2020, "mystery")]);
  assert.deepEqual(idx.lookup({ title: "X", authorsText: "A Person" }), []);
  assert.equal(awards.createIndex(null).lookup({ title: "X", authorsText: "A Person" }).length, 0);
});

test("merge: the list wins a shared kind, keeps the author's words, and orders by prominence", () => {
  const declared = marks.detect({ venue: "CVPR 2016 Best Paper Award, Oral" });
  const listed = index.lookup({ title: "Deep Residual Learning for Image Recognition", authorsText: "K He" });
  const merged = marks.merge(declared, listed);
  assert.deepEqual(merged.map((m) => m.kind + ":" + m.source), ["best:list", "oral:author"]);
  assert.equal(merged[0].declared, "Best Paper Award");
  assert.equal(merged[0].label, "Best paper");
  assert.equal(merged[0].group, "award");
  assert.equal(merged[0].awardLabel, "Best Paper Award");
  assert.deepEqual(marks.merge([], []), []);
  assert.deepEqual(marks.merge(undefined, listed).map((m) => m.kind), ["best"]);
  assert.equal(marks.summarize([{ marks: merged }]).award, 1);
});

test("analyzeRow adds the list's awards, using a resolved page's full author list", () => {
  const owner = { name: "Kaiming He", alternates: [] };
  const raw = { title: "Deep Residual Learning for Image Recognition", authorsText: "K He, X Zhang, S Ren, ...", venueText: "Proceedings of the IEEE conference on computer vision and pattern …, 2016", year: 2016 };
  const a = analysis.analyzeRow(raw, { owner, resolver, awards: index });
  assert.deepEqual(a.marks.map((m) => m.kind + ":" + m.venue + ":" + m.year), ["best:CVPR:2016"]);
  assert.deepEqual(analysis.analyzeRow(raw, { owner, resolver }).marks, [], "without a list nothing is added");
  // the list-view author text hides the first author; the paper page has it
  const hidden = { ...raw, authorsText: "...", };
  assert.deepEqual(analysis.analyzeRow(hidden, { owner, resolver, awards: index }).marks, []);
  assert.equal(analysis.analyzeRow(hidden, { owner, resolver, awards: index, resolved: { authors: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun" } }).marks.length, 1);
});

// ---- the shipped list --------------------------------------------------------------------------
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "awards-2026.json"), "utf8"));

test("data/awards-2026.json: every entry is complete, sourced and unique", () => {
  const kinds = new Set(Object.keys(awards.KIND));
  const seen = new Set();
  for (const e of data.entries) {
    const where = `${e.venue} ${e.year} “${e.title}”`;
    assert.ok(e.venue && /^[A-Za-z0-9&+.-]+$/.test(e.venue), "venue " + where);
    assert.ok(Number.isInteger(e.year) && e.year >= 1990 && e.year <= 2026, "year " + where);
    assert.ok(kinds.has(e.award), "award kind " + where);
    assert.ok(e.title && e.title.length >= 8, "title " + where);
    assert.ok(Array.isArray(e.authors) && e.authors.length && e.authors.every((a) => typeof a === "string" && a.trim().length > 1), "authors " + where);
    assert.ok(awards.surnameKey(e.authors[0]).length >= 2, "first author surname " + where);
    assert.match(e.source, /^https:\/\/[a-z0-9.-]+\//, "source " + where);
    assert.ok(e.evidence && awards.titleKey(e.evidence).includes(awards.titleKey(e.title)), "the quoted evidence must contain the title: " + where);
    const key = [e.venue, e.year, e.award, awards.titleKey(e.title)].join("|");
    assert.ok(!seen.has(key), "duplicate " + where);
    seen.add(key);
  }
});

test("the bundled list round-trips: every entry is found by its own title and first author", () => {
  const items = data.entries.map((e) => [awards.titleKey(e.title), awards.surnameKey(e.authors[0]), e.venue, e.year, e.award, e.awardLabel || ""]);
  const idx = awards.createIndex(items);
  for (const e of data.entries) {
    const hit = idx.lookup({ title: e.title, authorsText: e.authors.join(", ") }).some((m) => m.venue === e.venue && m.year === e.year && m.kind === awards.KIND[e.award]);
    assert.ok(hit, `${e.venue} ${e.year} ${e.title}`);
  }
});

test("the bundled list: well-known CV and AI winners are found from Scholar-style author lists (CVF and AAAI lists)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  // a best paper and, ten years on, its test-of-time prize
  assert.deepEqual(find("Deep residual learning for image recognition", "K He, X Zhang, S Ren, J Sun"), ["CVPR 2016 best", "CVPR 2026 tot"]);
  assert.deepEqual(find("Mask R-CNN", "K He, G Gkioxari, P Dollár, R Girshick"), ["ICCV 2017 best"]);
  assert.deepEqual(find("Fast R-CNN", "R Girshick"), ["ICCV 2025 tot"]);
  assert.deepEqual(find("LSD-SLAM: Large-scale direct monocular SLAM", "J Engel, T Schöps, D Cremers"), ["ECCV 2024 tot"]);
  assert.deepEqual(find("BioCLIP: A vision foundation model for the tree of life", "S Stevens, J Wu, MJ Thompson, Y Su"), ["CVPR 2024 best-student"]);
  assert.deepEqual(find("Swin transformer: Hierarchical vision transformer using shifted windows", "Z Liu, Y Lin, Y Cao, H Hu"), ["ICCV 2021 best"]);
  // two papers of one cell on the CVF page, and one paper with two prizes at one conference
  assert.deepEqual(find("What energy functions can be minimized via graph cuts?", "V Kolmogorov, R Zabih"), ["ECCV 2002 best", "ECCV 2012 tot"]);
  // AAAI: outstanding / distinguished / classic, and an IJCAI distinguished paper
  assert.deepEqual(find("Misspecification in inverse reinforcement learning", "J Skalse, A Abate"), ["AAAI 2023 outstanding"]);
  assert.deepEqual(find("Informer: Beyond efficient transformer for long sequence time-series forecasting", "H Zhou, S Zhang, J Peng"), ["AAAI 2021 outstanding"]);
  assert.deepEqual(find("Maximum entropy inverse reinforcement learning", "BD Ziebart, AL Maas, JA Bagnell, AK Dey"), ["AAAI 2024 tot"]);
  assert.deepEqual(find("Levin tree search with context models", "L Orseau, M Hutter, LHS Lelis"), ["IJCAI 2023 distinguished"]);
  // the same title with someone else first, or a near title, is not the paper
  assert.deepEqual(find("Mask R-CNN", "A Smith, B Jones"), []);
  assert.deepEqual(find("Mask R-CNN for object detection", "K He, G Gkioxari"), []);
});
