"use strict";
// The numbers of README.md and README.zh-CN.md (scripts/numbers.mjs) are counted from the code and the data: a change that moves one needs `npm run numbers`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const load = () => import(path.join(root, "scripts", "numbers.mjs"));

test("the README blocks say what the code and the data say (npm run numbers rewrites them)", async () => {
  const { numbers, withBlock } = await load();
  const n = numbers();
  for (const [file, lang] of [["README.md", "en"], ["README.zh-CN.md", "zh-CN"]]) {
    const next = withBlock(file, lang, n);
    assert.notEqual(next, null, file + " has no numbers block");
    assert.equal(next, fs.readFileSync(path.join(root, file), "utf8"), file + ": the numbers are out of date — run `npm run numbers`");
  }
});

test("the numbers are counted, whole and true to what they name", async () => {
  const { numbers, headline } = await load();
  const n = numbers(), venues = fs.readFileSync(path.join(root, "src/lib/venues.js"), "utf8");
  const prefs = require("../src/lib/prefs.js");
  assert.equal(n.settings.total, prefs.SETTINGS.length);
  assert.equal(n.settings.switches + n.settings.names + n.settings.other, n.settings.total);
  assert.equal(n.settings.names, Object.keys(prefs.NAMES).length, "every name you can give is a setting, and the other way round");
  assert.ok(n.settings.levels >= 3 && n.settings.levels <= 6 && n.settings.nodes === n.settings.total + n.settings.cards);
  assert.equal(n.languages.translated, (n.languages.total - 1) * n.languages.strings, "English is the source, not a translation");
  assert.equal(n.lists.total, 386 + 295 + 800, "the 2026 lists");
  // the venues are fewer than the rows: a venue that both lists rank is one (298 pairs), and CCF lists four journals twice
  assert.ok(n.lists.distinct <= n.lists.total - n.matching.linked && n.lists.distinct > n.lists.total / 2, `${n.lists.distinct} venues in ${n.lists.total} rows`);
  assert.equal(n.matching.stages, 5, "R1/R2, R2b, R3, R4, R5 are labelled in venues.js");
  // every guard the architecture table names exists in the matcher
  assert.ok(n.matching.guards >= 10);
  for (const g of n.matching.guardNames) assert.ok(venues.includes(g), `the guard ${g} of docs/ARCHITECTURE.md is not in lib/venues.js`);
  assert.ok(n.matching.curatedNames > 300 && n.matching.forms > 2000 && n.matching.acronyms > 1000 && n.matching.linked > 250 && n.matching.links > 40 && n.matching.links <= n.matching.linked);
  // a paper that won two awards is one paper
  assert.ok(n.award.papers > 5000 && n.award.papers + n.award.mentions <= n.award.entries && n.award.from < n.award.to);
  // the tests the README counts are the ones that run
  assert.ok(n.tests.unit >= 500 && n.tests.e2e >= 80 && n.tests.demo >= 15 && n.tests.realLines > 22000);
  assert.equal(n.dependencies, 0, "no dependencies");
  const h = headline(n);
  assert.deepEqual(h.map((x) => x[0]), ["settings", "languages", "venues", "names", "guards", "awards", "real", "tests"]);
  for (const [, text, value] of h) assert.ok(/^[\d,]+\+?$/.test(text) && value > 0, text);
});
