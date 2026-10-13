#!/usr/bin/env node
// The VLDB Endowment's own Test of Time Award pages, read into raw award entries for scripts/awards/merge-raw.mjs:
//
//   current  https://vldb.org/awards_10year.html           2012–2026: a block per year with "Award Winner(s): …" and "Paper Title: …"
//                                                          (the title often followed by its citation: "… Proc. VLDB Endow. 5(8): 716-727 (2012)")
//   archive  https://www.vldb.org/archives/10year.html     1997–2014 as a table: year | winners | title, each cell holding the award-winning
//                                                          paper and, in parentheses on the next line, the paper of the memorial talk
//
//   node scripts/awards/vldb.mjs current|archive [saved-page.html] > vldb.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs vldb.json [--write]
//
// The archive says the award is for a paper "that appeared in the VLDB conference 10 years ago", so those entries carry paperYear =
// the award year − 10. A "current" entry whose citation puts the listed paper in the award year itself is the retrospective of the
// award talk, not the award paper, and is skipped (the 2017 entry lists a 2017 article).
import { readFileSync } from "node:fs";
import { text, lines } from "./html.mjs";

const PAGES = {
  current: "https://vldb.org/awards_10year.html",
  archive: "https://www.vldb.org/archives/10year.html"
};

// "A, B and C." — the names, in order
function names(s) {
  let r = s.replace(/\.\s*$/, ""), prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

const entry = (year, label, title, authors, source, evidence, paperYear) =>
  ({ venue: "VLDB", year, award: "tot", awardLabel: label, title, authors, track: "main", source, evidence, ...(paperYear ? { paperYear } : {}) });

// "Efficiently Compiling Efficient Query Plans for Modern Hardware. Proc. VLDB Endow. 4(9): 539-550 (2011)." → the title and the year in the citation
export function splitTitle(raw) {
  const t = raw.replace(/\s+/g, " ").trim();
  const cut = /\.\s+(?:Proc\.|PVLDB|VLDB\s+\d{4}|Proceedings)/.exec(t);
  const title = (cut ? t.slice(0, cut.index) : t).replace(/\.$/, "").trim();
  const cite = cut ? t.slice(cut.index) : "";
  const y = /\((?:[A-Za-z]+\s+)?((?:19|20)\d{2})\)|\bVLDB\s+((?:19|20)\d{2})\b|\bPVLDB\b[^()]*\((?:19|20)(\d{2})\)/.exec(cite);
  return { title, paperYear: y ? parseInt(y[1] || y[2] || "20" + y[3], 10) : null };
}

export function parseCurrent(html, source = PAGES.current) {
  const entries = [], skipped = [];
  let year = null, winners = null;
  for (const l of lines(html)) {
    const y = /^((?:19|20)\d{2})$/.exec(l);
    if (y) { year = parseInt(y[1], 10); winners = null; continue; }
    if (!year) continue;
    const w = /^Award Winners?:\s*(.+)$/i.exec(l);
    if (w) { winners = w[1]; continue; }
    const t = /^Paper Title:\s*(.+)$/i.exec(l);
    if (t && winners) {
      const { title, paperYear } = splitTitle(t[1]);
      const authors = names(winners);
      if (paperYear && paperYear >= year) skipped.push(`${year}: the listed paper is from ${paperYear}, the award year: “${title.slice(0, 60)}”`);
      else if (authors.length && title.length >= 8) entries.push(entry(year, "Test of Time Award", title, authors, source, `VLDB ${year} Test of Time Award: ${winners.replace(/\.$/, "")}: ${title}`, paperYear));
      else skipped.push(`${year}: not read: ${title.slice(0, 60)}`);
      winners = null;
    }
  }
  return { entries, skipped };
}

export function parseArchive(html, source = PAGES.archive) {
  const entries = [], skipped = [];
  let year = null;
  for (const [, row] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    let cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1]);
    if (cells.length && /^\s*(?:19|20)\d{2}\s*$/.test(text(cells[0]))) { year = parseInt(text(cells[0]), 10); cells = cells.slice(1); }
    if (!year || cells.length < 2 || year >= 2014) continue;       // 2014 on is the current page's (it lists them with their citations; its 2012 block is commented out)
    // the first line of a cell is the award-winning paper; what follows <br> in parentheses belongs to the memorial talk
    const first = (c) => text(c.split(/<br\s*\/?>/i)[0]);
    const winners = first(cells[0]), title = first(cells[1]).replace(/\s+/g, " ");
    const authors = names(winners);
    if (authors.length && title.length >= 8 && !/^\(/.test(title)) entries.push(entry(year, "10-Year Award", title, authors, source, `VLDB ${year} 10-year Award: ${winners}: ${title}`, year - 10));
    else skipped.push(`${year}: not read: ${title.slice(0, 60)}`);
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, file] = process.argv.slice(2);
  const parse = { current: parseCurrent, archive: parseArchive }[kind];
  if (!parse) { console.error("usage: vldb.mjs current|archive [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "scholar-roles-and-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, PAGES[kind]);
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
