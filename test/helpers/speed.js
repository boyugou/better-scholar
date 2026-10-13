"use strict";
// The timing tests have fixed budgets, written for an idle machine. On a busy one (another build running, a loaded CI runner) every
// operation is slower by the same factor, which says nothing about the code. `slowdown()` measures that factor with a fixed piece of
// work, so a budget can be multiplied by it: a real regression (catastrophic backtracking is seconds to minutes) still fails.
const BASELINE_MS = 12;   // what the work below takes on an idle machine of the development laptop's class

function work() {
  let x = 0;
  for (let i = 1; i < 4e6; i++) x += Math.sqrt(i) % 3;
  return x;
}

function slowdown() {
  let best = Infinity;
  for (let k = 0; k < 3; k++) {                                   // (the quickest of three: a burst of load does not count)
    const t0 = process.hrtime.bigint();
    work();
    best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6);
  }
  return Math.max(1, best / BASELINE_MS);
}

module.exports = { slowdown };
