#!/usr/bin/env node
// ACM SIGCOMM's own Best Paper Award page (https://www.sigcomm.org/awards/best-paper-award), read into raw award entries for
// scripts/awards/merge-raw.mjs. Under "Recent SIGCOMM Best Paper Award Winners" a line per winner:
//
//   2022: Author (Affiliation), Author (Affiliation), "Title"
//   2020: Authors (…), "Title" / and / Authors (…), "Title"        (several winners in a year are separated by a line "and")
//
//   node scripts/awards/sigcomm.mjs [saved-page.html] > sigcomm.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs sigcomm.json [--write]
//
// The page lists 2008–2022 (when this was written); later years are not on it. One line (2012) prints its title without quotation
// marks, after the last comma — read that way and reported.
import { readFileSync } from "node:fs";
import { lines } from "./html.mjs";

const URL_PAGE = "https://www.sigcomm.org/awards/best-paper-award";

// the names in "A (Affil), B and C (Affil (Dept))": parentheses, nested or not, are dropped
function names(s) {
  let r = s, prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,.]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

export function parse(html, source = URL_PAGE) {
  const all = lines(html);
  const at = all.findIndex((l) => /^Recent SIGCOMM Best Paper Award Winners/i.test(l));
  const entries = [];
  const notes = [];
  let year = null;
  for (const raw of all.slice(at < 0 ? all.length : at + 1)) {
    if (/^(?:acm sigcomm\b|Back to Home)/i.test(raw)) break;
    if (/^and$/i.test(raw)) continue;
    const m = /^((?:19|20)\d{2}):\s*(.*)$/.exec(raw);
    if (m) year = parseInt(m[1], 10);
    const body = (m ? m[2] : raw).trim();
    if (!year || !body) continue;
    let title, authorText;
    const q = /^(.*?)[“"]([^”"]+)[”"]\.?\s*$/.exec(body);
    if (q) { title = q[2].trim(); authorText = q[1].replace(/[\s,]+$/, ""); }
    else {
      const cut = body.lastIndexOf(", ");
      if (cut < 0) continue;
      title = body.slice(cut + 2).trim(); authorText = body.slice(0, cut);
      notes.push(`${year}: title read without quotation marks: “${title}”`);
    }
    const authors = names(authorText);
    if (!authors.length || title.split(/\s+/).length < 3) continue;
    entries.push({ venue: "SIGCOMM", year, award: "best", awardLabel: "Best Paper", title, authors, track: "main", source, evidence: `${year}: ${body}` });
  }
  return { entries, notes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const html = file ? readFileSync(file, "utf8") : await (await fetch(URL_PAGE, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, notes } = parse(html);
  console.error(entries.length + " entries");
  for (const n of notes) console.error("note:", n);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
