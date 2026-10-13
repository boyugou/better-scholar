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
