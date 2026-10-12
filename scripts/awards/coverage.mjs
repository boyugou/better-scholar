#!/usr/bin/env node
// The "Entries" row of data/README.md: how many awards the list holds and, per venue, the years it spans.
//
//   node scripts/awards/coverage.mjs        prints the row's text; paste it after "| Entries | "
//
// A test compares that row with the data, so the documentation cannot quietly go stale.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function coverage(entries) {
  const years = new Map();
  for (const e of entries) {
    if (!years.has(e.venue)) years.set(e.venue, new Set());
    years.get(e.venue).add(e.year);
  }
  const parts = [...years.keys()].sort().map((venue) => {
    const ys = [...years.get(venue)];
    return `${venue} ${Math.min(...ys)}–${Math.max(...ys)} (${ys.length} yr${ys.length === 1 ? "" : "s"})`;
  });
  return `${entries.length}: ${parts.join("; ")}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  console.log(coverage(JSON.parse(readFileSync(join(root, "data", "awards-2026.json"), "utf8")).entries));
}
