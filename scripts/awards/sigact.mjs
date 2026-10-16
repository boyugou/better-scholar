#!/usr/bin/env node
// ACM SIGACT's own prize pages for STOC, read into raw award entries for scripts/awards/merge-raw.mjs:
//
//   best     https://www.sigact.org/prizes/best_paper.html       STOC Best Paper Awards (a heading per conference, then
//                                                                 “Title”, by Authors.)
//   student  https://www.sigact.org/prizes/student.html          the Machtey / Danny Lewin Best Student Paper Awards
//   tot      https://sigact.org/prizes/stoc_tot.html             the STOC Test of Time Awards ((30 Years) Authors, “Title”, 1996.)
//
//   node scripts/awards/sigact.mjs best|student|tot [saved-page.html] > sigact.json     (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs sigact.json [--write]
//
// A title that is mostly mathematics ($\tilde O(mn^{8/9})$) is kept as printed; the matcher ignores TeX markup, and Scholar prints
// such titles in its own way, so those papers are found only if the two happen to agree.
import { readFileSync } from "node:fs";
import { lines } from "./html.mjs";

const PAGES = {
  best: "https://www.sigact.org/prizes/best_paper.html",
  student: "https://www.sigact.org/prizes/student.html",
  tot: "https://sigact.org/prizes/stoc_tot.html"
};

// everything after the "Winners" heading, grouped by the year that heads each block
function byYear(all, yearOf) {
  const at = all.findIndex((l) => /^Winners$/i.test(l));
  const blocks = [];
  for (const l of all.slice(at < 0 ? 0 : at + 1)) {
    if (/^©/.test(l)) break;                                    // the footer belongs to no year
    const y = yearOf(l);
    if (y) blocks.push({ year: y, lines: [] });
    else if (blocks.length) blocks[blocks.length - 1].lines.push(l);
  }
  return blocks;
}

// "A. B, C D and E F" — the names, in order (affiliations in parentheses, nested or not, are dropped)
function names(s) {
  let r = s, prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,.]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

const entry = (kind, year, title, authors, label, source, evidence, extra = {}) =>
  ({ venue: "STOC", year, award: kind, awardLabel: label, title, authors, track: "main", source, evidence, ...extra });

export function parseBest(html, source = PAGES.best) {
  const out = [];
  for (const { year, lines: ls } of byYear(lines(html), (l) => { const m = /^STOC\s+((?:19|20)\d{2})$/.exec(l); return m && parseInt(m[1], 10); })) {
    const block = ls.join(" ");
    for (const m of block.matchAll(/[“"]([^”"]+)[”"],?\s*by\s+(.+?)\.\s*(?=[“"]|$)/g)) {
      const authors = names(m[2]);
      if (authors.length) out.push(entry("best", year, m[1].trim(), authors, "Best Paper", source, `STOC ${year}: “${m[1].trim()}”, by ${m[2].trim()}.`));
    }
  }
  return out;
}

export function parseTestOfTime(html, source = PAGES.tot) {
  const out = [];
  for (const { year, lines: ls } of byYear(lines(html), (l) => /^(?:19|20)\d{2}$/.test(l) && parseInt(l, 10))) {
    const block = ls.join(" ");
    for (const m of block.matchAll(/\((\d+)\s+Years?\)\s*(.+?),\s*[“"]([^”"]+)[”"],?\s*((?:19|20)\d{2})\.?(?=\s*\(\d+\s+Years?\)|\s*$)/gi)) {
      const authors = names(m[2]);
      if (authors.length) out.push(entry("tot", year, m[3].trim(), authors, `Test of Time Award (${m[1]} years)`, source,
        `STOC ${year} Test of Time (${m[1]} Years): ${m[2].trim()}, “${m[3].trim()}”, ${m[4]}.`, { paperYear: parseInt(m[4], 10) }));
    }
  }
  return out;
}

export function parseStudent(html, source = PAGES.student) {
  const out = [];
  for (const { year, lines: ls } of byYear(lines(html), (l) => /^(?:19|20)\d{2}$/.test(l) && parseInt(l, 10))) {
    // an entry is its authors (before the title, on the same line or the line above) and the quoted title
    const block = ls.join(" ");
    let from = 0;
    for (const m of block.matchAll(/[“"]([^”"]+)[”"][.,]?/g)) {
      const authorText = block.slice(from, m.index).replace(/,\s*$/, "").trim();
      from = m.index + m[0].length;
      const authors = names(authorText);
      if (authors.length && m[1].trim().length > 8) out.push(entry("student", year, m[1].trim(), authors, "Best Student Paper", source, `STOC ${year}: ${authorText}, “${m[1].trim()}”`));
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, file] = process.argv.slice(2);
  const parse = { best: parseBest, student: parseStudent, tot: parseTestOfTime }[kind];
  if (!parse) { console.error("usage: sigact.mjs best|student|tot [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "better-scholar award reader (reads one public page)" } })).text();
  const entries = parse(html, PAGES[kind]);
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
