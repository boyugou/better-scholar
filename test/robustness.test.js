"use strict";
// Hostile and odd input must never throw or stall the page: Scholar text is user-editable, and every
// string here goes through regular expressions that run on each paper of a profile.
const test = require("node:test");
const assert = require("node:assert/strict");
const names = require("../src/lib/names.js");
const venues = require("../src/lib/venues.js");
const marks = require("../src/lib/marks.js");
const awards = require("../src/lib/awards.js");
const analysis = require("../src/lib/analysis.js");
const ccf = require("../src/data/ccf.js");
const core = require("../src/data/core.js");
const aliases = require("../src/data/aliases.js");

const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
const index = awards.createIndex([[awards.titleKey("A Known Paper"), "doe", "ICML", 2020, "best", ""]]);
const owner = { name: "Jane Doe", alternates: [] };

// a seeded generator, so a failure is reproducible
let seed = 20261011;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (list) => list[Math.floor(rnd() * list.length)];

const adversarial = {
  "empty": "",
  "spaces": " ".repeat(20000) + "x",
  "commas": "a,".repeat(8000),
  "open parens": "(".repeat(5000),
  "open parens + words": "( word ".repeat(2500),
  "close parens": ")".repeat(5000),
  "brackets": "[".repeat(4000) + "]".repeat(4000),
  "ellipses": "…".repeat(3000),
  "dots": ".".repeat(6000),
  "digits": "1".repeat(8000),
  "page ranges": "12-34, ".repeat(3000),
  "volume tails": "Journal 1 (2), 3-4, ".repeat(1500),
  "hyphens": "A-".repeat(6000),
  "long word": "Conference".repeat(2000),
  "long acronym": "ABCDEFGHIJ".repeat(2000),
  "proceedings": "Proceedings of the ".repeat(2000),
  "sig chain": "SIGMOD-".repeat(3000) + "SIGACT",
  "year tails": "Venue, 2001, 2002, 2003, ".repeat(2000),
  "mixed scripts": "会议 Конференция مؤتمر 学会 ".repeat(1500),
  "controls": "\u0000\u0001\u0008\u000b\u001f‮​﻿".repeat(2000),
  "emoji": "🎓📄🏆".repeat(3000),
  "lone surrogates": "𐀀\ud800".repeat(1500),
  "nbsp soup": "a ".repeat(8000),
  "marker soup": "(Oral) [Spotlight] - Best Paper Award ".repeat(1500),
  "award words": "best paper ".repeat(4000),
  "quotes": "\"'".repeat(5000)
};

test("no adversarial string throws, and each is handled quickly by every library", () => {
  const slow = [];
  for (const [label, s] of Object.entries(adversarial)) {
    const t0 = process.hrtime.bigint();
    assert.doesNotThrow(() => resolver.resolve(s), "venues.resolve: " + label);
    assert.doesNotThrow(() => venues.prepare(s), "venues.prepare: " + label);
    assert.doesNotThrow(() => marks.detect({ title: s, venue: s }), "marks.detect: " + label);
    assert.doesNotThrow(() => awards.titleKey(s), "awards.titleKey: " + label);
    assert.doesNotThrow(() => index.lookup({ title: s, authorsText: s }), "awards.lookup: " + label);
    assert.doesNotThrow(() => names.parseAuthors(s), "names.parseAuthors: " + label);
    assert.doesNotThrow(() => names.classifyRow(s, owner), "names.classifyRow: " + label);
    assert.doesNotThrow(() => analysis.analyzeRow({ title: s, authorsText: s, venueText: s }, { owner, resolver, awards: index }), "analyzeRow: " + label);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > 750) slow.push(`${label}: ${Math.round(ms)} ms`);
  }
  assert.deepEqual(slow, [], "inputs that stall the page");
});

test("a profile-sized batch of hostile rows stays fast", () => {
  const t0 = Date.now();
  const rows = Object.values(adversarial);
  for (let i = 0; i < 3; i++) for (const s of rows) resolver.resolve(s + i);
  assert.ok(Date.now() - t0 < 4000, `took ${Date.now() - t0} ms`);
});

test("seeded random Scholar-like strings never throw", () => {
  const vocab = ["Proceedings", "of", "the", "IEEE", "ACM", "Conference", "on", "Computer", "Vision", "and", "Pattern", "Recognition", "Transactions", "Journal",
    "Symposium", "Workshop", "International", "Annual", "Joint", "SIGMOD", "SIGPLAN-SIGACT", "(CVPR)", "(OSDI", "2019", "'19", "12", "(3)", "1-10", "pp.", "…", "...", ",", ";", ":", "-", "–",
    "Oral", "Spotlight", "(Best Paper Award)", "[Highlight]", "arXiv", "preprint", "Ccs", "NDSS", "IEEE/ACM", "ACM/IEEE", "Trans.", "J.", "Findings", "Extended", "Abstracts", " ", "&", "é", "ß", "ł"];
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 24);
    const s = Array.from({ length: n }, () => pick(vocab)).join(pick([" ", " ", " ", ", ", "", "  "]));
    const a = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => pick(["J Doe", "A Smith", "B Lee", "…", "...", "K He", "Jane Doe†", "李明", "S. Chen"])).join(", ");
    assert.doesNotThrow(() => analysis.analyzeRow({ title: s, authorsText: a, venueText: s }, { owner, resolver, awards: index }), JSON.stringify(s));
  }
});

test("results are deterministic and never mutate shared state between calls", () => {
  const s = "Proceedings of the 2018 CHI Conference on Human Factors in Computing Systems …, 2018";
  const first = JSON.stringify(new venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases }).resolve(s));
  for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(resolver.resolve(s)), first);
  const m = marks.detect({ venue: "NeurIPS 2023 Oral" });
  assert.equal(JSON.stringify(marks.detect({ venue: "NeurIPS 2023 Oral" })), JSON.stringify(m));
  assert.equal(JSON.stringify(marks.detect({ venue: "NeurIPS 2023 Oral" })), JSON.stringify(m), "the shared /g regexes are reset between calls");
});
