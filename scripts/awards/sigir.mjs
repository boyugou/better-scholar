#!/usr/bin/env node
// Read ACM SIGIR's own award pages (https://sigir.org/awards/…) into raw award entries for scripts/awards/merge-raw.mjs:
// SIGIR best papers, best short papers and best student papers, and the JCDL Vannevar Bush best papers the same site lists.
// Each page is one table — Year | Authors (one per line) | Citation (the title, linked) — newest first.
//
//   node scripts/awards/sigir.mjs [dir-with-saved-pages] > sigir.json     (fetches the four pages when no directory is given)
//
// A saved directory holds sigir-best.html, sigir-short.html, sigir-student.html and sigir-vb.html.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { text as clean } from "./html.mjs";

const PAGES = [
  { slug: "best-paper-awards", file: "sigir-best.html", venue: "SIGIR", award: "best", awardLabel: "Best Paper" },
  { slug: "best-short-paper-awards", file: "sigir-short.html", venue: "SIGIR", award: "category", awardLabel: "Best Short Paper" },
  { slug: "best-student-paper-awards", file: "sigir-student.html", venue: "SIGIR", award: "student", awardLabel: "Best Student Paper" },
  { slug: "vannevar-bush-best-paper-awards", file: "sigir-vb.html", venue: "JCDL", award: "best", awardLabel: "Vannevar Bush Best Paper" }
];


export function parse(html, spec, source) {
  const entries = [];
  const table = /<table[\s\S]*?<\/table>/i.exec(html);
  if (!table) return entries;
  for (const row of table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 3 || !/^(?:19|20)\d{2}$/.test(clean(cells[0]))) continue;
    const authors = cells[1].split(/<br\s*\/?>/i).map(clean).filter(Boolean);
    // the title is the link text; a note under it ("For a paper …") is not part of it
    const title = clean((/<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(cells[2]) || [null, cells[2].split(/<br\s*\/?>/i)[0]])[1]);
    if (!title || !authors.length) continue;
    entries.push({
      venue: spec.venue, year: parseInt(clean(cells[0]), 10), award: spec.award, awardLabel: spec.awardLabel, title, authors, track: "main", source,
      evidence: `${spec.awardLabel}: ${clean(cells[0])} ${title} — ${authors.join(", ")}`
    });
  }
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  const entries = [];
  for (const spec of PAGES) {
    const source = `https://sigir.org/awards/${spec.slug}/`;
    const html = dir ? readFileSync(join(dir, spec.file), "utf8")
      : await (await fetch(source, { headers: { "user-agent": "scholar-roles-and-ranks award reader (reads one public page)" } })).text();
    entries.push(...parse(html, spec, source));
    if (!dir) await new Promise((r) => setTimeout(r, 1000));
  }
  const by = {};
  for (const e of entries) by[`${e.venue} ${e.awardLabel}`] = (by[`${e.venue} ${e.awardLabel}`] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
