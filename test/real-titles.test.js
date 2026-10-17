"use strict";
// test/fixtures/real-titles.txt is what scripts/diff-matcher.mjs replays besides the corpus: real venue titles from Crossref and OpenAlex, one per line. The file is
// written by scripts/pull-real-titles.mjs; what it promises is checked here so that a hand edit or a bad merge shows.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fixtures = path.join(__dirname, "fixtures");
const text = fs.readFileSync(path.join(fixtures, "real-titles.txt"), "utf8");
const parts = text.split("\n");
const lines = parts.slice(0, -1);
const snapshot = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(fixtures, "venues.expected.json"), "utf8"))));

test("real-titles.txt: one title per line, sorted, each once, ending with a newline", () => {
  assert.equal(parts[parts.length - 1], "", "the file ends with a newline");
  assert.ok(lines.length > 50000, `${lines.length} titles`);
  for (let i = 0; i < lines.length; i++) {
    assert.ok(lines[i] && lines[i] === lines[i].replace(/\s+/g, " ").trim(), `line ${i + 1} is empty or has stray spaces: "${lines[i]}"`);
    if (i) assert.ok(lines[i - 1] < lines[i], `line ${i + 1} is not after line ${i}: "${lines[i - 1]}" / "${lines[i]}"`);
  }
});

test("real-titles.txt: nothing the snapshot already holds", () => {
  const twice = lines.filter((l) => snapshot.has(l));
  assert.deepEqual(twice.slice(0, 5), [], `${twice.length} lines are also in venues.expected.json`);
});
