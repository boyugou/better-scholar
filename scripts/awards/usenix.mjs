#!/usr/bin/env node
// Read USENIX's own "Best Papers" list (https://www.usenix.org/conferences/best-papers, 9 pages) into raw award entries for
// scripts/awards/merge-raw.mjs: the best papers of USENIX Security, OSDI, NSDI, FAST, ATC, SOUPS, LISA, WOOT, MobiSys … by year.
//
//   node scripts/awards/usenix.mjs [saved-page.html …] > usenix.json     (fetches the pages, one a second, when none is given)
//
// A section is an <h3> with the conference and year ("USENIX Security '25", "SOUPS 2025"), then one block per paper:
//   <span class="field-content"><a …>Title</a></span> … <div class="field-content">Name, Affiliation; Name, Affiliation</div>
// The page calls them all "Best Papers" (USENIX Security's distinguished papers included), so that is the label.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

const BASE = "https://www.usenix.org/conferences/best-papers";

// "USENIX Security '25" → { venue: "USENIX Security", year: 2025 };  "SOUPS 2025" → { SOUPS, 2025 };  "'93" and earlier digits read as 19xx
export function sectionOf(label) {
  const m = /^(.*?)\s*(?:['’](\d{2})|((?:19|20)\d{2}))$/.exec(label.trim());
  if (!m || !m[1]) return null;
  const year = m[3] ? parseInt(m[3], 10) : parseInt(m[2], 10) >= 70 ? 1900 + parseInt(m[2], 10) : 2000 + parseInt(m[2], 10);
  return { venue: m[1].trim(), year };
}

// "Name, Affiliation; Name, Affiliation" → ["Name", "Name"]
const authorsOf = (s) => s.split(/\s*;\s*/).map((seg) => seg.split(",")[0].trim()).filter(Boolean);

export function parse(html, { source = BASE } = {}) {
  const entries = [];
  const heads = [...html.matchAll(/<h3>\s*<a href="[^"]*">([^<]*)<\/a>\s*<\/h3>/gi)].map((m) => ({ label: text(m[1]), at: m.index, end: m.index + m[0].length }));
  heads.forEach((h, i) => {
    const sec = sectionOf(h.label);
    if (!sec) return;
    const body = html.slice(h.end, i + 1 < heads.length ? heads[i + 1].at : html.length);
    for (const row of body.split(/<div class="views-row\b/).slice(1)) {
      const title = text((/class="views-field views-field-title-1"[\s\S]*?<span class="field-content">([\s\S]*?)<\/span>/.exec(row) || [])[1] || "");
      const people = text((/views-field-field-paper-people"[\s\S]*?<div class="field-content">([\s\S]*?)<\/div>/.exec(row) || [])[1] || "");
      const authors = authorsOf(people);
      if (!title || !authors.length) continue;
      entries.push({
        venue: sec.venue, year: sec.year, award: "best", awardLabel: "USENIX Best Paper", title, authors, track: "main", source,
        evidence: `${h.label}: ${title} — ${people}`.slice(0, 400)
      });
    }
  });
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  const entries = [];
  if (files.length) for (const f of files) entries.push(...parse(readFileSync(f, "utf8")));
  else {
    for (let page = 0; page < 12; page++) {
      const html = await (await fetch(`${BASE}?page=${page}`, { headers: { "user-agent": "better-scholar award reader (reads the public best-papers list)" } })).text();
      const got = parse(html, { source: BASE });
      if (!got.length) break;
      entries.push(...got);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const venues = {};
  for (const e of entries) venues[e.venue] = (venues[e.venue] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(venues));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
