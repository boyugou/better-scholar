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
    assert.ok(e.venue && /^[A-Za-z0-9&+./ -]+$/.test(e.venue), "venue " + where);
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

test("the documentation quotes the real size of the list: data/README.md's coverage row exactly, the other documents the count", async () => {
  const { coverage } = await import("../scripts/awards/coverage.mjs");
  const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
  assert.ok(read("data/README.md").includes(`| Entries | ${coverage(data.entries)} |`), "data/README.md's Entries row is stale: run  node scripts/awards/coverage.mjs");
  for (const [file, re] of [["README.md", /\b(\d+) paper awards/], ["docs/ROADMAP.md", /\((\d+) entries on/]]) {
    const m = re.exec(read(file));
    assert.ok(m, `${file}: no longer says how many awards the list has (pattern ${re})`);
    assert.equal(Number(m[1]), data.entries.length, `${file} says ${m[1]} awards, the list has ${data.entries.length}`);
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
  assert.deepEqual(find("Keep your distance: Land division with separation", "E Elkind, E Segal-Halevi, W Suksompong"), ["IJCAI 2021 distinguished"]);
  assert.deepEqual(find("Plurality veto: A simple voting rule achieving optimal metric distortion", "F Kizilkaya, D Kempe"), ["IJCAI 2022 distinguished"]);
  // the same title with someone else first, or a near title, is not the paper
  assert.deepEqual(find("Mask R-CNN", "A Smith, B Jones"), []);
  assert.deepEqual(find("Mask R-CNN for object detection", "K He, G Gkioxari"), []);
});

test("the bundled list: ICLR winners of the years whose awards page is empty (2021 fact sheet, 2025 and 2026 blog posts)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Adam: A method for stochastic optimization", "DP Kingma, J Ba"), ["ICLR 2025 tot"]);
  assert.deepEqual(find("Neural machine translation by jointly learning to align and translate", "D Bahdanau, K Cho, Y Bengio"), ["ICLR 2025 runner-up"]);
  assert.deepEqual(find("Unsupervised representation learning with deep convolutional generative adversarial networks", "A Radford, L Metz, S Chintala"), ["ICLR 2026 tot"]);
  assert.deepEqual(find("Safety alignment should be made more than just a few tokens deep", "X Qi, A Panda, K Lyu, X Ma, S Roy, A Beirami, P Mittal, P Henderson"), ["ICLR 2025 outstanding"]);
  assert.deepEqual(find("SAM 2: Segment anything in images and videos", "N Ravi, V Gabeur, YT Hu, R Hu, C Ryali, T Ma"), ["ICLR 2025 runner-up"]);
  assert.deepEqual(find("Transformers are inherently succinct", "P Bergsträßer, R Cotterell, AW Lin"), ["ICLR 2026 outstanding"]);
  assert.deepEqual(find("Score-based generative modeling through stochastic differential equations", "Y Song, J Sohl-Dickstein, DP Kingma, A Kumar, S Ermon, B Poole"), ["ICLR 2021 outstanding"]);
  assert.deepEqual(find("Beyond fully-connected layers with quaternions: Parameterization of hypercomplex multiplications with 1/n parameters", "A Zhang, Y Tay, S Zhang, A Chan, AT Luu"), ["ICLR 2021 outstanding"]);
  assert.deepEqual(find("Adam: A method for stochastic optimization", "A Smith, B Jones"), []);
});

test("the bundled list: NLP winners of the years the ACL Anthology lacks (EMNLP 2021, 2023, NAACL 2025 from the conferences' own pages)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Label words are anchors: An information flow perspective for understanding in-context learning", "L Wang, L Li, D Dai, D Chen, H Zhou, F Meng, J Zhou, X Sun"), ["EMNLP 2023 best"]);
  assert.deepEqual(find("Text embeddings reveal (almost) as much as text", "JX Morris, V Kuleshov, V Shmatikov, AM Rush"), ["EMNLP 2023 outstanding"]);
  assert.deepEqual(find("Visually grounded reasoning across languages and cultures", "F Liu, E Bugliarello, EM Ponti, S Reddy, N Collier, D Elliott"), ["EMNLP 2021 best"]);
  assert.deepEqual(find("CHoRaL: Collecting humor reaction labels from millions of social media users", "Z Yang, S Hooshmand, J Hirschberg"), ["EMNLP 2021 best-category"]);
  assert.deepEqual(find("The BiGGen Bench: A principled benchmark for fine-grained evaluation of language models with language models", "S Kim, J Suk, JY Cho, S Longpre"), ["NAACL 2025 best"]);
  assert.deepEqual(find("Label words are anchors: An information flow perspective for understanding in-context learning", "A Smith, B Jones"), []);
});

test("the bundled list: theory and networking winners (SIGACT's STOC pages, SIGCOMM's best-paper page)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Graph isomorphism in quasipolynomial time", "L Babai"), ["STOC 2016 best", "STOC 2026 tot"]);
  assert.deepEqual(find("Undirected ST-connectivity in log-space", "O Reingold"), ["STOC 2005 best", "STOC 2026 tot"]);
  assert.deepEqual(find("The PCP theorem via gap amplification", "I Dinur"), ["STOC 2006 best"]);
  assert.deepEqual(find("Quantum lower bounds by quantum arguments", "A Ambainis"), ["STOC 2000 best-student"]);
  assert.deepEqual(find("Fully homomorphic encryption using ideal lattices", "C Gentry"), ["STOC 2022 tot"]);
  assert.deepEqual(find("Swift: Delay is simple and effective for congestion control in the datacenter", "G Kumar, N Dukkipati, K Jang, HMG Wassel"), ["SIGCOMM 2020 best"]);
  assert.deepEqual(find("Multi-resource fair queueing for packet processing", "A Ghodsi, V Sekar, M Zaharia, I Stoica"), ["SIGCOMM 2012 best"]);
  assert.deepEqual(find("Graph isomorphism in quasipolynomial time", "A Smith, B Jones"), []);
});

test("the bundled list: security winners (IEEE S&P's own awards pages)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Towards evaluating the robustness of neural networks", "N Carlini, D Wagner"), ["S&P 2017 best-student"]);
  assert.deepEqual(find("Spectre attacks: Exploiting speculative execution", "P Kocher, J Horn, A Fogh, D Genkin, D Gruss, W Haas"), ["S&P 2019 distinguished"]);
  assert.deepEqual(find("Four attacks and a proof for Telegram", "MR Albrecht, L Mareková, KG Paterson, I Stepanovs"), ["S&P 2022 distinguished"]);
  assert.deepEqual(find("Automated whitebox fuzz testing", "P Godefroid, MY Levin, D Molnar"), ["NDSS 2022 tot"]);
  assert.deepEqual(find("Dynamic taint analysis for automatic detection, analysis, and signature generation of exploits on commodity software", "J Newsome, D Song"), ["NDSS 2020 tot"]);
  assert.deepEqual(find("Resolving the predicament of Android custom permissions", "GS Tuncay, S Demetriou, K Ganju, CA Gunter"), ["NDSS 2018 distinguished"]);
  assert.deepEqual(find("Towards evaluating the robustness of neural networks", "A Smith, B Jones"), []);
});

test("the bundled list: database winners (SIGMOD's and PODS's own best-paper pages)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Bao: Making learned query optimization practical", "R Marcus, P Negi, H Mao, N Tatbul, M Alizadeh, T Kraska"), ["SIGMOD 2021 best"]);
  assert.deepEqual(find("Wander join: Online aggregation via random walks", "F Li, B Wu, K Yi, Z Zhao"), ["SIGMOD 2016 best"]);
  assert.deepEqual(find("Implementing data cubes efficiently", "V Harinarayan, A Rajaraman, JD Ullman"), ["SIGMOD 1996 best", "SIGMOD 2006 tot"]);
  assert.deepEqual(find("Worst-case optimal join algorithms", "HQ Ngo, E Porat, C Ré, A Rudra"), ["PODS 2012 best"]);
  assert.deepEqual(find("Optimal aggregation algorithms for middleware", "R Fagin, A Lotem, M Naor"), ["PODS 2001 best"]);
  assert.deepEqual(find("Bao: Making learned query optimization practical", "A Smith, B Jones"), []);
});

test("the bundled list: SIGMOD's Test of Time Award (the page's list of 1999–2026, with and without initials)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Pregel: a system for large-scale graph processing", "G Malewicz, MH Austern, AJC Bik, JC Dehnert, I Horn, N Leiser, G Czajkowski"), ["SIGMOD 2020 tot"]);
  assert.deepEqual(find("Mining association rules between sets of items in large databases", "R Agrawal, T Imieliński, A Swami"), ["SIGMOD 2003 tot"]);
  assert.deepEqual(find("A case for redundant arrays of inexpensive disks (RAID)", "DA Patterson, G Gibson, RH Katz"), ["SIGMOD 1999 tot", "SIGOPS 2011 tot"]);
  assert.deepEqual(find("No free lunch in data privacy", "D Kifer, A Machanavajjhala"), ["SIGMOD 2021 tot"]);
  assert.deepEqual(find("Pregel: a system for large-scale graph processing", "A Smith, B Jones"), []);
});

test("the bundled list: SIGOPS's Hall of Fame Award (the page's winners, 2005–2025; the paper may be of any venue)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("The Google file system", "S Ghemawat, H Gobioff, ST Leung"), ["SIGOPS 2015 tot"]);
  assert.deepEqual(find("The Tail at Scale", "J Dean, LA Barroso"), ["SIGOPS 2025 tot"]);
  assert.deepEqual(find("seL4: formal verification of an OS kernel", "G Klein, K Elphinstone, G Heiser"), ["SIGOPS 2019 tot"]);
  assert.deepEqual(find("The Tail at Scale", "A Smith, B Jones"), []);
  // EuroSys's own Test-of-Time page
  assert.deepEqual(find("Dryad: Distributed Data-Parallel Programs from Sequential Building Blocks", "M Isard, M Budiu, Y Yu, A Birrell, D Fetterly"), ["EuroSys 2017 tot"]);
});

test("the bundled list: the Dijkstra Prize in Distributed Computing (PODC / DISC), and the PODC Influential-Paper Award it was before 2003", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Time, clocks, and the ordering of events in a distributed system", "L Lamport"), ["PODC 2000 tot", "SIGOPS 2007 tot"]);
  assert.deepEqual(find("Impossibility of distributed consensus with one faulty process", "MJ Fischer, NA Lynch, MS Paterson"), ["PODC 2001 tot"]);
  assert.deepEqual(find("Wait-free synchronization", "M Herlihy"), ["PODC/DISC 2003 tot"]);
  assert.deepEqual(find("Unreliable failure detectors for reliable distributed systems", "TD Chandra, S Toueg"), ["PODC/DISC 2010 tot"]);
  assert.deepEqual(find("What can be computed locally?", "M Naor, L Stockmeyer"), ["PODC/DISC 2025 tot"]);
  assert.deepEqual(find("Time, clocks, and the ordering of events in a distributed system", "A Smith, B Jones"), []);
});

test("the bundled list: HCI winners from SIGCHI's own conference programs (CHI, CSCW and UIST best papers, CHI honorable mentions)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Street-level algorithms: A theory at the gaps between policy and decisions", "A Alkhatib, MS Bernstein"), ["CHI 2019 best"]);
  assert.deepEqual(find("The halting problem: Video analysis of self-driving cars in traffic", "B Brown, M Broth, E Vinkhuyzen"), ["CHI 2023 best"]);
  assert.deepEqual(find("Designing human-agent collaborations: Commitment, responsiveness, and support", "N Cila"), ["CHI 2022 runner-up"]);
  assert.deepEqual(find("Textoshop: Interactions inspired by drawing software to facilitate text editing", "D Masson, YH Kim, F Chevalier"), ["CHI 2025 runner-up"]);
  assert.deepEqual(find("Between subjectivity and imposition: Power dynamics in data annotation for computer vision", "M Miceli, M Schuessler, T Yang"), ["CSCW 2020 best"]);
  assert.deepEqual(find("Generative agents: Interactive simulacra of human behavior", "JS Park, JC O'Brien, CJ Cai, MR Morris, P Liang, MS Bernstein"), ["UIST 2023 best"]);
  assert.deepEqual(find("Street-level algorithms: A theory at the gaps between policy and decisions", "A Smith, B Jones"), []);
});

test("the bundled list: SIGPLAN's Most Influential Paper Awards (POPL, PLDI, ICFP, OOPSLA)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Proof-carrying code", "GC Necula"), ["POPL 2007 tot"]);
  assert.deepEqual(find("Valgrind: a framework for heavyweight dynamic binary instrumentation", "N Nethercote, J Seward"), ["PLDI 2017 tot"]);
  assert.deepEqual(find("Quickcheck: a lightweight tool for random testing of Haskell programs", "K Claessen, J Hughes"), ["ICFP 2010 tot"]);
  assert.deepEqual(find("The DaCapo benchmarks: Java benchmarking development and analysis", "SM Blackburn, R Garner, C Hoffmann, AM Khan, KS McKinley"), ["OOPSLA 2016 tot"]);
  assert.deepEqual(find("Proof-carrying code", "A Smith, B Jones"), []);
});

test("the bundled list: SIGMETRICS's best papers, student papers and test-of-time awards", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Counter braids: a novel counter architecture for per-flow measurement", "Y Lu, A Montanari, B Prabhakar, S Dharmapurikar, A Kabbani"), ["SIGMETRICS 2008 best", "SIGMETRICS 2018 tot"]);
  assert.deepEqual(find("Network tomography on general topologies", "T Bu, N Duffield, FL Presti, D Towsley"), ["SIGMETRICS 2012 tot"]);
  assert.deepEqual(find("Workload analysis of a large-scale key-value store", "B Atikoglu, Y Xu, E Frachtenberg, S Jiang, M Paleczny"), ["SIGMETRICS 2022 tot"]);
  assert.deepEqual(find("Nudge: Stochastically improving upon FCFS", "I Grosof, K Yang, Z Scully, M Harchol-Balter"), ["SIGMETRICS 2021 best"]);
  assert.deepEqual(find("Counter braids: a novel counter architecture for per-flow measurement", "A Smith, B Jones"), []);
});

test("the bundled list: FOCS's test-of-time winners", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Cache-oblivious algorithms", "M Frigo, CE Leiserson, H Prokop, S Ramachandran"), ["FOCS 2019 tot"]);
  assert.deepEqual(find("Private information retrieval", "B Chor, O Goldreich, E Kushilevitz, M Sudan"), ["FOCS 2025 tot"]);
  assert.deepEqual(find("Cache-oblivious algorithms", "A Smith, B Jones"), []);
});

test("the bundled list: machine-learning winners from the years before the virtual sites list awards (NeurIPS 2014–2018, ICML 2017–2018)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Neural ordinary differential equations", "RTQ Chen, Y Rubanova, J Bettencourt, DK Duvenaud"), ["NeurIPS 2018 best"]);
  assert.deepEqual(find("Value iteration networks", "A Tamar, Y Wu, G Thomas, S Levine, P Abbeel"), ["NeurIPS 2016 best"]);
  assert.deepEqual(find("Random features for large-scale kernel machines", "A Rahimi, B Recht"), ["NeurIPS 2017 tot"]);
  assert.deepEqual(find("Obfuscated gradients give a false sense of security: Circumventing defenses to adversarial examples", "A Athalye, N Carlini, D Wagner"), ["ICML 2018 best"]);
  assert.deepEqual(find("Understanding black-box predictions via influence functions", "PW Koh, P Liang"), ["ICML 2017 best"]);
  assert.deepEqual(find("A unified architecture for natural language processing: Deep neural networks with multitask learning", "R Collobert, J Weston"), ["ICML 2018 tot"]);
  assert.deepEqual(find("Neural ordinary differential equations", "A Smith, B Jones"), []);
});

test("LaTeX left in an official title does not hide the paper: $\\mathcal{V}$-Usable matches Scholar's V-usable", () => {
  assert.equal(awards.titleKey("Understanding Dataset Difficulty with $\\mathcal{V}$-Usable Information"), awards.titleKey("Understanding dataset difficulty with V-usable information"));
  assert.equal(awards.titleKey("A \\textbf{Bold} Title"), awards.titleKey("A Bold Title"));
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  assert.deepEqual(idx.lookup({ title: "Understanding dataset difficulty with V-usable information", authorsText: "K Ethayarajh, Y Choi, S Swayamdipta" }).map((m) => `${m.venue} ${m.year} ${m.kind}`), ["ICML 2022 outstanding"]);
});

test("the bundled list: systems, security and IR winners (USENIX and SIGIR lists)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Triangulating Python performance issues with SCALENE", "ED Berger, S Stern, JA Pizzorno"), ["OSDI 2023 best"]);
  assert.deepEqual(find("Glaze: Protecting artists from style mimicry by {Text-to-Image} models", "S Shan, J Cryan, E Wenger, H Zheng, R Hanocka, BY Zhao"), ["USENIX Security 2023 best"]);
  assert.deepEqual(find("Scaling laws for dense retrieval", "Y Fang, J Zhan, Q Ai, J Mao, W Su, J Chen, Y Liu"), ["SIGIR 2024 best"]);
  assert.deepEqual(find("Mooncake: Trading more storage for less computation—a KVCache-centric architecture for serving LLM chatbot", "R Qin, Z Li, W He"), ["FAST 2025 best"]);
  // one paper, two awards in one year (best paper and best student paper): both are kept
  assert.deepEqual(find("Minimal test collections for retrieval evaluation", "B Carterette, J Allan, R Sitaraman"), ["SIGIR 2006 best", "SIGIR 2006 best-student"]);
  assert.deepEqual(find("Scaling laws for dense retrieval", "A Smith, B Jones"), []);
});

test("the bundled list: software-engineering winners (SIGSOFT distinguished papers)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Understanding software engineering agents: A study of thought-action-result trajectories", "I Bouzenia, M Pradel"), ["ASE 2025 distinguished"]);
  assert.deepEqual(find("Seeing is fixing: Cross-modal reasoning with multimodal LLMs for visual software issue repair", "K Huang, J Zhang, X Xie, C Chen"), ["ASE 2025 distinguished"]);
  assert.deepEqual(find("Understanding software engineering agents: A study of thought-action-result trajectories", "A Smith, B Jones"), []);
});

test("the bundled list: data-mining winners (KDD best papers)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Improving group robustness on spurious correlation via evidential alignment", "W Ye, G Zheng, A Zhang"), ["KDD 2025 best"]);
  assert.deepEqual(find("On sampled metrics for item recommendation", "W Krichene, S Rendle"), ["KDD 2020 best"]);
  assert.deepEqual(find("Network density of states", "K Dong, AR Benson, D Bindel"), ["KDD 2019 best"]);
  assert.deepEqual(find("Network density of states", "A Smith, B Jones"), []);
});

test("data/awards-2026.json: an award's kind agrees with its printed label (a runner-up is never filed as a best paper)", () => {
  const bad = [];
  for (const e of data.entries) {
    const l = e.awardLabel || "";
    const runnerUpWords = /runner|honou?rable|mention|second|nominee|finalist/i;
    if (e.award === "runner-up" && !runnerUpWords.test(l)) bad.push("runner-up without such a label: " + e.venue + " " + e.year + " " + e.title);
    if (!["runner-up", "category"].includes(e.award) && /runner|honou?rable mention/i.test(l)) bad.push("not a runner-up but labelled one: " + e.venue + " " + e.year + " " + e.title);
    if (e.award === "student" && !/student/i.test(l)) bad.push("student award without a student label: " + e.venue + " " + e.year + " " + e.title);
    if (e.award === "best" && /student/i.test(l)) bad.push("best paper with a student label: " + e.venue + " " + e.year + " " + e.title);
  }
  assert.deepEqual(bad, []);
});

test("the bundled list: security and database winners from ACM CCS's and the VLDB Endowment's own pages", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Path ORAM: An extremely simple oblivious RAM protocol", "E Stefanov, M Van Dijk, E Shi, C Fletcher, L Ren, X Yu, S Devadas"), ["CCS 2013 best"]);
  assert.deepEqual(find("Imperfect forward secrecy: How Diffie-Hellman fails in practice", "D Adrian, K Bhargavan, Z Durumeric, P Gaudry, M Green, JA Halderman"), ["CCS 2015 best"]);
  assert.deepEqual(find("DolphinAttack: Inaudible voice commands", "G Zhang, C Yan, X Ji, T Zhang, T Zhang, W Xu"), ["CCS 2017 best"]);
  assert.deepEqual(find("Large language models for code: Security hardening and adversarial testing", "J He, M Vechev"), ["CCS 2023 distinguished"]);
  assert.deepEqual(find("Control-flow integrity", "M Abadi, M Budiu, U Erlingsson, J Ligatti"), ["CCS 2015 tot"]);
  assert.deepEqual(find("Rappor: Randomized aggregatable privacy-preserving ordinal response", "Ú Erlingsson, V Pihur, A Korolova"), ["CCS 2024 tot"]);
  assert.deepEqual(find("C-Store: a column-oriented DBMS", "M Stonebraker, DJ Abadi, A Batkin, X Chen, M Cherniack"), ["VLDB 2015 tot"]);
  assert.deepEqual(find("Dremel: interactive analysis of web-scale datasets", "S Melnik, A Gubarev, JJ Long, G Romer"), ["VLDB 2020 tot"]);
  assert.deepEqual(find("Fast algorithms for mining association rules in large databases", "R Agrawal, R Srikant"), ["VLDB 2004 tot"]);
  assert.deepEqual(find("Path ORAM: An extremely simple oblivious RAM protocol", "A Smith, B Jones"), []);
});

test("the bundled list: web, architecture and microarchitecture classics (WWW's Seoul ToT, the Influential ISCA Paper Award, MICRO's Test of Time)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Item-based collaborative filtering recommendation algorithms", "B Sarwar, G Karypis, J Konstan, J Riedl"), ["WWW 2016 tot"]);
  assert.deepEqual(find("The anatomy of a large-scale hypertextual web search engine", "S Brin, L Page"), ["WWW 2015 tot"]);
  assert.deepEqual(find("LINE: Large-scale information network embedding", "J Tang, M Qu, M Wang, M Zhang, J Yan, Q Mei"), ["WWW 2026 tot"]);
  assert.deepEqual(find("Wattch: A framework for architectural-level power analysis and optimizations", "D Brooks, V Tiwari, M Martonosi"), ["ISCA 2015 tot"]);
  assert.deepEqual(find("Simultaneous multithreading: Maximizing on-chip parallelism", "DM Tullsen, SJ Eggers, HM Levy"), ["ISCA 2010 tot"]);
  assert.deepEqual(find("Trace cache: A low latency approach to high bandwidth instruction fetching", "E Rotenberg, S Bennett, JE Smith"), ["MICRO 2015 tot"]);
  assert.deepEqual(find("Item-based collaborative filtering recommendation algorithms", "A Smith, B Jones"), []);
});

test("the bundled list: USENIX's own test-of-time winners (Security, NSDI, FAST)", () => {
  const idx = awards.createIndex(require("../src/data/awards.js").items);
  const find = (title, authorsText) => idx.lookup({ title, authorsText }).map((m) => `${m.venue} ${m.year} ${m.kind}`).sort();
  assert.deepEqual(find("Tor: The second-generation onion router", "R Dingledine, N Mathewson, P Syverson"), ["USENIX Security 2014 tot"]);
  assert.deepEqual(find("Stealing machine learning models via prediction APIs", "F Tramèr, F Zhang, A Juels, MK Reiter, T Ristenpart"), ["USENIX Security 2026 tot"]);
  assert.deepEqual(find("Live migration of virtual machines", "C Clark, K Fraser, S Hand, JG Hansen, E Jul, C Limpach, I Pratt, A Warfield"), ["NSDI 2015 tot"]);
  assert.deepEqual(find("ARC: A self-tuning, low overhead replacement cache", "N Megiddo, DS Modha"), ["FAST 2014 tot"]);
  assert.deepEqual(find("Approximate frequency counts over data streams", "GS Manku, R Motwani"), ["VLDB 2012 tot"]);
});
