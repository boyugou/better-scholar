#!/usr/bin/env node
// Convert the ICORE conference-ranking export into data/core-2026.json.
//
//   curl -s -o core.csv 'https://portal.core.edu.au/conf-ranks/?search=&by=all&source=ICORE2026&sort=atitle&page=1&do=Export'
//   node scripts/core/build-core.mjs core.csv
//
// The export has no header row; columns are
//   id, title, acronym, source, rank, <Yes|No flag>, FoR1, FoR2, FoR3
// Only the letter ranks A*, A, B, C are kept (the portal also lists "National: …",
// "Unranked", "Australasian …", … which carry no international tier).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("usage: build-core.mjs <core.csv>");
  process.exit(1);
}
const raw = readFileSync(input);
const text = raw.toString("utf8");

// Minimal RFC-4180 parser (quoted fields, "" escapes, embedded commas/newlines).
function parseCsv(src) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const RANKS = new Set(["A*", "A", "B", "C"]);
const order = { "A*": 0, A: 1, B: 2, C: 3 };
const rows = parseCsv(text);
const venues = rows
  .filter((r) => r.length >= 5 && RANKS.has(r[4].trim()))
  .map((r) => ({
    acronym: r[2].trim(),
    name: r[1].trim().replace(/\s+/g, " "),
    rank: r[4].trim(),
    for: r[6] ? r[6].trim() : ""
  }))
  .sort((a, b) => order[a.rank] - order[b.rank] || a.acronym.localeCompare(b.acronym) || a.name.localeCompare(b.name));

const counts = { total: venues.length };
for (const r of Object.keys(order)) counts[r] = venues.filter((v) => v.rank === r).length;

const out = {
  meta: {
    title: "ICORE 2026 conference rankings (CORE, Australasian Computing Research and Education Association)",
    edition: "ICORE2026",
    portal: "https://portal.core.edu.au/conf-ranks/",
    exportUrl: "https://portal.core.edu.au/conf-ranks/?search=&by=all&source=ICORE2026&sort=atitle&page=1&do=Export",
    csvSha256: createHash("sha256").update(raw).digest("hex"),
    csvRows: rows.length,
    keptRanks: ["A*", "A", "B", "C"],
    counts
  },
  venues
};
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "core-2026.json");
const body = [
  "{",
  ' "meta": ' + JSON.stringify(out.meta, null, 1).replace(/\n/g, "\n "),
  ' ,"venues": [',
  ...venues.map((v, i) => "  " + JSON.stringify(v) + (i < venues.length - 1 ? "," : "")),
  " ]",
  "}"
].join("\n");
writeFileSync(dest, body + "\n");
console.log(`wrote ${dest}`, counts);
