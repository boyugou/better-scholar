#!/usr/bin/env node
// Dev tool: what the venue matcher makes of a line Scholar cut off. Each title of test/fixtures/real-titles.txt that carries a year and is long enough is cut where
// Scholar cuts a profile's venue line (at a word, by about 76 characters, the punctuation before the cut dropped, then " …, <year>") and read again; a cut line whose
// badge is not its whole title's is counted, by kind:
//   swap         the whole title has another venue's badge (two listed venues begin the same way)
//   track        the whole title has none, and what the cut hides holds a track word ("… Workshops", "… Companion"): only Read full lists can see it
//   other        the whole title has none: an unlisted venue whose name begins a listed one's (an anchor — aliases.js `edition` — can refuse it when the line prints an edition,
//                a `reach` word when what is visible stops before the word that tells the venue)
//   lost         (listed too) the cut line has no badge where the whole title has one
//   node scripts/measure-cut-lines.mjs            the counts
//   node scripts/measure-cut-lines.mjs --list     and the lines, by the badge they got
// (docs/ROADMAP.md quotes its counts: "Cut-off venue lines that unlisted venues share".)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const venues = require(path.join(root, "src/lib/venues.js"));
const resolver = venues.createResolver({ ccf: require(path.join(root, "src/data/ccf.js")).venues, core: require(path.join(root, "src/data/core.js")).venues, aliases: require(path.join(root, "src/data/aliases.js")) });
const brief = (s) => {
  const x = resolver.resolve(s);
  return [x && x.ccf ? `CCF ${x.ccf.tier} ${x.ccf.abbr || x.ccf.name}` : "", x && x.core ? `CORE ${x.core.rank} ${x.core.acronym || x.core.abbr || x.core.name}` : ""].filter(Boolean).join(" · ");
};
const TRACK = /\b(?:workshops?|companion|demo(?:nstration)?s?|posters?|student|doctoral|tutorials?|abstracts|industry|short papers|findings|satellite|adjunct|extended|forum|challenge|competition)\b/i;
const CUT = 77;
const counts = { cut: 0, same: 0, lost: 0, swap: 0, track: 0, other: 0 }, lines = { swap: [], track: [], other: [], lost: [] };
for (const title of fs.readFileSync(path.join(root, "test/fixtures/real-titles.txt"), "utf8").split("\n")) {
  const year = (/\b(19[5-9]\d|20[0-3]\d)\b/.exec(title) || [])[1];
  if (!year || title.length < CUT + 3) continue;
  // (the word the cut falls in is dropped — not one that ends right at it: "… Distributed Processing with" stays whole when "with" ends at the cut)
  const visible = (/\s/.test(title[CUT] || " ") ? title.slice(0, CUT) : title.slice(0, CUT).replace(/\s+\S*$/, "")).replace(/[\s,:;(–-]+$/, "");
  const line = `${visible} …, ${year}`, whole = brief(title), cut = brief(line);
  counts.cut++;
  if (!cut) { if (whole) { counts.lost++; lines.lost.push(["", whole, line]); } continue; }
  if (cut === whole) { counts.same++; continue; }
  const kind = whole ? "swap" : TRACK.test(title.slice(visible.length)) ? "track" : "other";
  counts[kind]++;
  lines[kind].push([cut, whole, line]);
}
console.log(`${counts.cut} cut lines: ${counts.same} keep the whole title's badge, ${counts.lost} lose it; a badge the whole title lacks — ${counts.swap} another listed venue's, ${counts.track} with a track word hidden, ${counts.other} otherwise`);
if (process.argv.includes("--list")) for (const kind of ["swap", "other", "track", "lost"]) {
  console.log(`\n${kind}:`);
  for (const [cut, whole, line] of lines[kind].sort((a, b) => a[0].localeCompare(b[0]))) console.log(`  ${cut.padEnd(36)} ${whole ? "(whole: " + whole + ") " : ""}${line}`);
}
