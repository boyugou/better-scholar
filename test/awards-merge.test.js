"use strict";
// scripts/awards/merge-raw.mjs is the gate between extracted award rows and the bundled list: it must refuse rows
// it cannot verify. Run it in dry-run mode (no --write) on a temporary file and read its report.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const MERGE = path.join(__dirname, "..", "scripts", "awards", "merge-raw.mjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "awards-merge-"));
const good = {
  venue: "ICML", year: 2022, award: "outstanding", awardLabel: "Outstanding Paper",
  title: "A Synthetic Verified Paper", authors: ["Ann Lee", "Bo Chen"],
  source: "https://icml.cc/virtual/2022/awards_detail", evidence: "A Synthetic Verified Paper — Outstanding Paper"
};
const bad = [
  { ...good, title: "Another Paper Title Here", evidence: "a different sentence entirely" },          // evidence lacks the title
  { ...good, title: "Third Paper Title Here", source: "https://en.wikipedia.org/wiki/Award", evidence: "Third Paper Title Here" }, // not an official source
  { ...good, title: "Fourth Paper Title Here", source: "http://icml.cc/x", evidence: "Fourth Paper Title Here" },            // not https
  { ...good, title: "Fifth Paper Title Here", award: "lifetime-achievement", evidence: "Fifth Paper Title Here" },            // unknown kind
  { ...good, title: "Sixth Paper Title Here", year: 1850, evidence: "Sixth Paper Title Here" },                              // impossible year
  { ...good, title: "Seventh Paper Title Here", authors: [], evidence: "Seventh Paper Title Here" }                         // no authors
];
const file = path.join(dir, "raw.json");
fs.writeFileSync(file, JSON.stringify({ entries: [good, ...bad] }));

test("merge-raw keeps the verifiable row and reports each refused row with its reason", () => {
  const r = spawnSync(process.execPath, [MERGE, file], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 new\)|\(1 new\)/, r.stdout);
  assert.match(r.stdout, /6 rejected/, r.stdout);
  for (const why of ["evidence does not contain the title", "source not allowed", "award kind", "year", "authors"]) {
    assert.match(r.stdout, new RegExp(why), `reason mentioned: ${why}`);
  }
});

test("merge-raw without --write leaves the bundled list untouched", () => {
  const before = fs.readFileSync(path.join(__dirname, "..", "data", "awards-2026.json"), "utf8");
  spawnSync(process.execPath, [MERGE, file], { encoding: "utf8" });
  assert.equal(fs.readFileSync(path.join(__dirname, "..", "data", "awards-2026.json"), "utf8"), before);
});
