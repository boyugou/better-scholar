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

test("a review of the duplicates, 2026-10-29: the published, ranked entry that shows the owner stays; a conference paper and its journal version are two papers; the first author as the roles read it", () => {
  const t = "Masked Autoencoders Are Scalable Vision Learners";
  // the arXiv copy is cited more, but the CVPR paper stays (and shows the total)
  const cvpr = { ...e(t, "K He, X Chen, S Xie, Y Li, P Dollár, R Girshick", 900), year: 2022, venues: ["cvpr"], found: true };
  const arxiv = { ...e(t, "K He, X Chen, S Xie, Y Li, P Dollár, R Girshick", 1200), year: 2021, venues: [], preprint: true, found: true };
  let p = dup.plan([arxiv, cvpr]);
  assert.deepEqual(p.keep, [false, true]);
  assert.deepEqual(p.citations, [1200, 2100]);
  // of two copies, the one whose author list shows the owner stays
  p = dup.plan([{ ...e(t, "K He, X Chen, S Xie, …", 50), year: 2022, venues: ["cvpr"], found: false }, { ...e(t, "K He, X Chen, S Xie, Y Li, P Dollár, R Girshick", 40), year: 2022, venues: ["cvpr"], found: true }]);
  assert.deepEqual(p.keep, [false, true]);
  // Faster R-CNN: NeurIPS 2015 and TPAMI 2016 are two publications; so are entries years apart
  const frcnn = "Faster R-CNN: Towards real-time object detection with region proposal networks";
  assert.deepEqual(dup.plan([{ ...e(frcnn, "S Ren, K He, R Girshick, J Sun", 70000), year: 2016, venues: ["tpami"] }, { ...e(frcnn, "S Ren, K He, R Girshick, J Sun", 50000), year: 2015, venues: ["neurips"] }]).keep, [true, true]);
  assert.deepEqual(dup.plan([{ ...e("MapReduce: simplified data processing on large clusters", "J Dean, S Ghemawat", 10), year: 2004 }, { ...e("MapReduce: simplified data processing on large clusters", "J Dean, S Ghemawat", 9), year: 2008 }]).keep, [true, true]);
  // a preprint is a copy of either; two entries without a venue the lists know, a year apart, are one
  assert.deepEqual(dup.plan([{ ...e(frcnn, "S Ren, K He", 1), year: 2015, preprint: true }, { ...e(frcnn, "S Ren, K He", 2), year: 2016, venues: ["tpami"] }]).keep, [false, true]);
  assert.deepEqual(dup.plan([{ ...e(t, "K He", 1), year: 2021 }, { ...e(t, "K He", 2), year: 2022 }]).keep, [false, true]);
  // the first author: "J Smith and B Lee" is Smith's, "张伟，李明" 张伟's, "J Smith Jr" Smith's
  assert.equal(dup.key("A fairly long shared title here", "J Smith and B Lee"), dup.key("A fairly long shared title here", "J Smith, B Lee"));
  assert.notEqual(dup.key("A fairly long shared title here", "张伟，李明"), dup.key("A fairly long shared title here", "李明"));
  assert.equal(dup.key("A fairly long shared title here", "J Smith Jr, B Lee"), dup.key("A fairly long shared title here", "John Smith"));
});
