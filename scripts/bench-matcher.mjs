// Dev tool: how fast the venue matcher is — building its index (done on every profile page) and reading a venue line (once per paper), over the real lines of
// test/fixtures/venues.expected.json. Plain Node, nothing to install. Compare a change with the commit before it: run it on both.
//   node scripts/bench-matcher.mjs [rounds]
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
const require = createRequire(import.meta.url);
const venues = require("../src/lib/venues.js"), ccf = require("../src/data/ccf.js"), core = require("../src/data/core.js"), aliases = require("../src/data/aliases.js");
const lines = Object.keys(require("../test/fixtures/venues.expected.json")).slice(0, 5000);
const rounds = +(process.argv[2] || 5);
const build = [], read = [];
for (let i = 0; i < rounds; i++) {
  let t = performance.now();
  const r = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
  build.push(performance.now() - t);
  t = performance.now();
  for (const l of lines) r.resolve(l);
  read.push((performance.now() - t) / lines.length);
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`index: ${med(build).toFixed(1)} ms (first ${build[0].toFixed(1)}) · a line: ${(med(read) * 1000).toFixed(0)} µs (${lines.length} real lines, median of ${rounds} rounds)`);
