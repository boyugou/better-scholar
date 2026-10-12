#!/usr/bin/env node
// Read the Computer Vision Foundation's own awards page (https://www.thecvf.com/?page_id=413) into raw award entries
// for scripts/awards/merge-raw.mjs: the CVPR, ICCV and ECCV best papers, best student papers and honorable mentions,
// and the Longuet-Higgins (CVPR), Helmholtz (ICCV) and Koenderink (ECCV) test-of-time prizes. The page is one HTML
// table per award — a row is the year, the quoted title and the authors ("K. He, X. Zhang, S. Ren, J. Sun").
//
//   node scripts/awards/cvf.mjs [saved-page.html] > cvf.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs cvf.json [--write]
//
// The CVF is the organisation behind these conferences and the page is its own listing, so it is an official source.
// The people awards on the same page (PAMI Young Researcher …) have no paper and are ignored.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

const URL_PAGE = "https://www.thecvf.com/?page_id=413";

// the page's headings → what the entry is
const SECTIONS = {
  "CVPR Best Paper Award": { venue: "CVPR", award: "best", awardLabel: "Best Paper" },
  "CVPR Best Student Paper Award": { venue: "CVPR", award: "student", awardLabel: "Best Student Paper" },
  "CVPR Best Paper Honorable Mention Award": { venue: "CVPR", award: "runner-up", awardLabel: "Best Paper Honorable Mention" },
  "ICCV Best Paper Award (Marr Prize)": { venue: "ICCV", award: "best", awardLabel: "Best Paper (Marr Prize)" },
  "ICCV Best Student Paper Award": { venue: "ICCV", award: "student", awardLabel: "Best Student Paper" },
  "ICCV Best Paper Honorable Mention Award": { venue: "ICCV", award: "runner-up", awardLabel: "Best Paper Honorable Mention" },
  "ECCV Best Paper Award": { venue: "ECCV", award: "best", awardLabel: "Best Paper" },
  "ECCV Best Paper Honorable Mention Award": { venue: "ECCV", award: "runner-up", awardLabel: "Best Paper Honorable Mention" },
  "Longuet-Higgins Prize": { venue: "CVPR", award: "tot", awardLabel: "Longuet-Higgins Prize" },
  "Helmholtz Prize": { venue: "ICCV", award: "tot", awardLabel: "Helmholtz Prize" },
  "Koenderink Prize": { venue: "ECCV", award: "tot", awardLabel: "Koenderink Prize" }
};


// "A, B, C" / "A, B, and C" / "A and B" / "A et al."
const splitAuthors = (s) => s.replace(/\s+et\s+al\.?\s*$/i, "").split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((a) => a.trim()).filter(Boolean);

// A title cell is “Title”, sometimes followed by what the page notes about it — “Title” (Honorable Mention) — and in one
// year two papers share a cell: “A” and “B”. What the note says decides the label (and, for a category prize, the kind).
function readCell(cell, spec) {
  const titles = [...cell.matchAll(/[“"]([^”"]+)[”"]/g)].map((m) => m[1].replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!titles.length) titles.push(cell.replace(/^[“"]\s*|\s*[”"]$/g, "").trim());
  const note = ((/\(([^()]*)\)\s*$/.exec(cell) || [])[1] || "").trim();
  let { award, awardLabel } = spec;
  if (/^honou?rable mention$/i.test(note)) { /* the section's own label */ }
  else if (/^student paper$/i.test(note)) awardLabel = "Best Student Paper Honorable Mention";
  else if (/^outstanding student paper$/i.test(note)) awardLabel = "Outstanding Student Paper";
  else if (note) { award = "category"; awardLabel = note; }                     // "Best Paper in Cognitive Vision"
  return { titles, award, awardLabel };
}

export function parse(html) {
  const entries = [];
  const heads = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => ({ name: text(m[1]), at: m.index, end: m.index + m[0].length }));
  heads.forEach((h, i) => {
    const spec = SECTIONS[h.name];
    if (!spec) return;
    const body = html.slice(h.end, i + 1 < heads.length ? heads[i + 1].at : html.length);
    const table = /<table[\s\S]*?<\/table>/i.exec(body);
    if (!table) return;
    const anchor = (/<a name="([^"]+)"/.exec(html.slice(Math.max(0, h.at - 200), h.at)) || [])[1];
    for (const row of table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => text(m[1]));
      if (cells.length < 3 || !/^(?:19|20)\d{2}$/.test(cells[0])) continue;
      const { titles, award, awardLabel } = readCell(cells[1], spec);
      const authors = splitAuthors(cells[2]);
      for (const title of titles) {
        entries.push({
          venue: spec.venue, award, awardLabel, year: parseInt(cells[0], 10), title, authors, track: "main",
          source: URL_PAGE + (anchor ? "#" + anchor : ""),
          evidence: `${h.name}: ${cells[0]} ${cells[1]} ${cells[2]}`
        });
      }
    }
  });
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const html = file ? readFileSync(file, "utf8") : await (await fetch(URL_PAGE, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const entries = parse(html);
  const by = {};
  for (const e of entries) by[`${e.venue} ${e.awardLabel}`] = (by[`${e.venue} ${e.awardLabel}`] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
