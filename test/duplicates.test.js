const test = require("node:test");
const assert = require("node:assert/strict");
const dup = require("../src/lib/duplicates.js");

const e = (title, authorsText, citations) => ({ title, authorsText, citations });

test("entries that differ only in capitals, punctuation and accents are one paper; the most cited stays and shows the total", () => {
  const p = dup.plan([
    e("Deep residual learning for image recognition", "K He, X Zhang, S Ren, J Sun", 100),
    e("Deep Residual Learning for Image Recognition", "Kaiming He, Xiangyu Zhang", 250),
    e("Deep residual learning for image-recognition.", "K He", 7),
    e("An unrelated paper about graph neural networks", "K He", 3)
  ]);
  assert.deepEqual(p.keep, [false, true, false, true]);
  assert.deepEqual(p.citations, [100, 357, 7, 3]);
  assert.deepEqual(p.merged, [1, 3, 1, 1]);
});

test("a tie keeps the earlier entry", () => {
  const p = dup.plan([e("A fairly long shared title here", "A Smith", 5), e("A fairly long shared title here", "A Smith", 5)]);
  assert.deepEqual(p.keep, [true, false]);
  assert.deepEqual(p.citations, [10, 5]);
});

test("a different first author is a different paper; so is a short title or a missing author line", () => {
  assert.deepEqual(dup.plan([e("A fairly long shared title here", "A Smith", 1), e("A fairly long shared title here", "B Jones", 1)]).keep, [true, true]);
  assert.deepEqual(dup.plan([e("Introduction", "A Smith", 1), e("Introduction", "A Smith", 1)]).keep, [true, true]);
  assert.deepEqual(dup.plan([e("A fairly long shared title here", "", 1), e("A fairly long shared title here", "", 1)]).keep, [true, true]);
});

test("an abbreviated first author still matches the full name", () => {
  assert.deepEqual(dup.plan([e("A fairly long shared title here", "J Smith, B Lee", 4), e("A fairly long shared title here", "John Smith, B Lee", 9)]).keep, [false, true]);
});

test("plan: on random profiles every entry is counted exactly once and the citations are conserved", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const titles = ["Deep Residual Learning for Image Recognition", "deep residual learning for image-recognition", "A Survey of Graph Neural Networks and Their Uses", "Attention Is All You Need Really", "ATTENTION IS ALL YOU NEED, REALLY!", "Short", "Another Unrelated Paper About Operating Systems"];
  const authors = ["K He, X Zhang", "Kaiming He", "A Vaswani, N Shazeer", "", "...", "L Zhu"];
  for (let round = 0; round < 200; round++) {
    const entries = Array.from({ length: 1 + Math.floor(rnd() * 30) }, () => ({ title: titles[Math.floor(rnd() * titles.length)], authorsText: authors[Math.floor(rnd() * authors.length)], citations: Math.floor(rnd() * 500) }));
    const p = dup.plan(entries);
    const total = entries.reduce((n, e) => n + e.citations, 0);
    const kept = entries.map((e, i) => (p.keep[i] ? p.citations[i] : 0)).reduce((a, b) => a + b, 0);
    assert.equal(kept, total, "the citations shown add up to the citations there are");
    assert.equal(entries.reduce((n, _, i) => n + (p.keep[i] ? p.merged[i] : 0), 0), entries.length, "every entry stands for exactly one entry that stays");
    entries.forEach((e, i) => { if (!p.keep[i]) assert.ok(p.merged[i] === 1 && p.citations[i] === e.citations, "an entry that goes is left untouched"); });
  }
});
