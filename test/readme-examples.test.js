"use strict";
// The examples of README.md and README.zh-CN.md: each row is a venue line as Scholar prints it, the chip the README says it gets and the rule that finds
// it (or the track word that stops it). They are checked against the matcher, so that what the README shows is what the code does.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const venues = require("../src/lib/venues.js");
const ccf = require("../src/data/ccf.js");
const core = require("../src/data/core.js");
const aliases = require("../src/data/aliases.js");

const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });

// the rows of the block between <!-- examples:begin --> and <!-- examples:end -->: [the venue line, the chip, the rule cell]
function examples(file) {
  const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const block = /<!-- examples:begin -->([\s\S]*?)<!-- examples:end -->/.exec(text);
  assert.ok(block, `${file} has no examples block`);
  const lines = block[1].split("\n").filter((line) => line.startsWith("|")).slice(2);          // (the header and the |---| line)
  const rows = lines.filter((line) => /^\|\s*`/.test(line));
  assert.equal(rows.length, lines.length, `${file}: every row of the examples begins with the venue line in backticks`);
  return rows.map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

for (const file of ["README.md", "README.zh-CN.md"]) {
  test(`${file}: every example gets the chip and the rule the README says`, () => {
    const rows = examples(file);
    assert.ok(rows.length >= 5, `${file}: a handful of examples`);
    for (const [cell, chip, rule] of rows) {
      const line = cell.replace(/^`|`$/g, "");
      const r = resolver.resolve(line);
      const gets = [r.ccf && `CCF ${r.ccf.tier}`, r.core && `CORE ${r.core.rank}`].filter(Boolean).join(" · ") || "—";
      assert.equal(chip, gets, `${line}: the README says ${chip}, the matcher gives ${gets}`);
      const word = (/`([^`]+)`/.exec(rule) || [])[1] || "—";
      if (r.ccf || r.core) assert.deepEqual([...new Set([r.ccf && r.ccf.rule, r.core && r.core.rule].filter(Boolean))], [word], `${line}: the README says it is found by ${word}`);
      else if (r.secondary) {
        assert.ok([r.secondary, r.secondary + "s"].includes(word.toLowerCase()), `${line}: the track word is ${r.secondary}, the README says ${word}`);
        assert.match(rule, /track word|次要类别词/, `${line}: the README says why there is no rank (a track word)`);
      }
      else assert.equal(word, "—", `${line}: no rank and no track word, the README says ${word}`);
    }
  });
}

// the page calls' table: one row per call of lib/agent.js, each parameter named, every format of `export`, every field of a `papers` record
const agent = require("../src/lib/agent.js");
const recordFields = (s) => {          // the top-level names of the first "papers: [{ … }]" in s
  const start = s.indexOf("papers: [{") + "papers: [{".length;
  let depth = 0, flat = "";
  for (const ch of s.slice(start)) {
    if (ch === "}" && depth === 0) break;
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
    else if (depth === 0) flat += ch;
  }
  return flat.split(",").map((f) => f.trim().replace(/[?:].*$/, "")).filter(Boolean).sort();
};
for (const file of ["README.md", "README.zh-CN.md"]) {
  test(`${file}: the page calls' table names every call, parameter, export format and record field`, () => {
    const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    const row = (name) => text.split("\n").find((line) => line.startsWith("| `" + name + "` |"));
    for (const [name, m] of Object.entries(agent.METHODS)) {
      const r = row(name);
      assert.ok(r, `${file}: no row for the call ${name}`);
      for (const p of Object.keys(m.params || {})) assert.ok(r.includes("`" + p + "`"), `${file}: the ${name} row does not name its parameter ${p}`);
    }
    for (const f of agent.FORMATS) assert.ok(row("export").includes("`" + f + "`"), `${file}: the export row does not list the format ${f}`);
    assert.deepEqual(recordFields(row("papers")), recordFields(agent.METHODS.papers.result), `${file}: the fields of a papers record`);
  });
}
