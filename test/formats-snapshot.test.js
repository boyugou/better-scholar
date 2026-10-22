"use strict";
// A reviewed snapshot of how the reference styles read every real venue line: the GB/T 7714 line of an invented paper at each of the 22,744 lines
// of the venue corpus, with the type the rank lists give it (as the page does). It holds the decisions all four styles share — the type code
// ([J] [C] [P] [D] [R] [M] [Z]), the name, the volume, the issue and the pages — so that a change to formats.js shows its exact effect on real lines.
// A change is reviewed like the venue snapshot: read the diff, then `npm run test:update`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const formats = require("../src/lib/formats.js");
const venues = require("../src/lib/venues.js");

const FIX = path.join(__dirname, "fixtures");
const KIND = { C: "conference", J: "journal" };

test("the reference styles read the 22,744 real venue lines as the reviewed snapshot says", () => {
  const resolver = venues.createResolver({ ccf: require("../src/data/ccf.js").venues, core: require("../src/data/core.js").venues, aliases: require("../src/data/aliases.js") });
  const lines = Object.keys(JSON.parse(fs.readFileSync(path.join(FIX, "venues.expected.json"), "utf8")));
  const actual = {};
  for (const line of lines) {
    const v = resolver.resolve(line);
    const year = Number((/,\s*((?:19|20)\d{2})$/.exec(line) || [])[1]) || null;
    const type = KIND[(v.ccf && v.ccf.kind) || (v.core && v.core.kind)] || null;
    actual[line] = formats.gbt([{ title: "T", authors: "A Author", venue: line, year, type }]).replace(/^\[1\] AUTHOR A\. T/, "");
  }
  const file = path.join(FIX, "formats.expected.json");
  if (process.env.UPDATE_SNAPSHOTS) {
    fs.writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(actual).sort(([a], [b]) => a.localeCompare(b))), null, 1) + "\n");
    return;
  }
  assert.ok(fs.existsSync(file), "test/fixtures/formats.expected.json is missing — restore it from git (or review the output and run `npm run test:update`)");
  const expected = JSON.parse(fs.readFileSync(file, "utf8"));
  const diffs = [];
  for (const line of Object.keys(actual)) {
    if (!(line in expected)) diffs.push(`new     ${JSON.stringify(line)} -> ${actual[line]}`);
    else if (expected[line] !== actual[line]) diffs.push(`changed ${JSON.stringify(line)}\n          was: ${expected[line]}\n          now: ${actual[line]}`);
  }
  for (const line of Object.keys(expected)) if (!(line in actual)) diffs.push(`gone    ${JSON.stringify(line)}`);
  assert.equal(diffs.length, 0, "reference-style readings changed (review, then run `npm run test:update`):\n" + diffs.slice(0, 40).join("\n"));
});
