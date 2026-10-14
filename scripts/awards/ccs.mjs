#!/usr/bin/env node
// ACM SIGSAC's own CCS award pages, read into raw award entries for scripts/awards/merge-raw.mjs:
//
//   best  https://www.sigsac.org/ccs/CCS_awards/ccs-bestpaper.html   the Best Paper Awards (2013–2021) and Distinguished Paper
//                                                                    Awards (2022–), a block per year
//   tot   https://www.sigsac.org/ccs/CCS_awards/ccs-tta.html         the Test-of-Time Awards ("Authors:" then "Title. Pages …, In
//                                                                    Proceedings of the 13th ACM Conference …, CCS 2006 …")
//
//   node scripts/awards/ccs.mjs best|tot [saved-page.html] > ccs.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs ccs.json [--write]
//
// The best-paper page was typed by hand and its blocks differ: "Authors, Title" on one line; authors on one or more lines ending in a
// comma and the title on the next; authors with affiliations in parentheses separated by semicolons; a repeated authors line.
// A line is read as authors for as long as every comma-separated piece of it is a person's name (two to five capitalised words,
// no colon, no lower-case word but a name particle), and the first piece that is not starts the title. An entry that cannot be
// read this way is skipped, never guessed.
import { readFileSync } from "node:fs";
import { lines } from "./html.mjs";

const PAGES = {
  best: "https://www.sigsac.org/ccs/CCS_awards/ccs-bestpaper.html",
  tot: "https://www.sigsac.org/ccs/CCS_awards/ccs-tta.html"
};

const PARTICLES = new Set(["van", "von", "der", "den", "de", "del", "della", "di", "da", "dos", "du", "la", "le", "ter", "ten", "bin", "ibn", "al", "el", "y"]);

// a person's name: "Jean-Baptiste Jeannin", "E. B. Quirk", "Michel Van Eeten", "Luca De Feo", "T-H. Hubert Chan" — two to four words
// (five when `max` says so: a page that separates names with semicolons runs two together once)
export function isName(s, max = 4) {
  const t = s.replace(/\s+/g, " ").trim().split(" ");
  if (t.length < 2 || t.length > max || /[:?!0-9]/.test(s)) return false;
  return t.every((w) => /^[\p{Lu}][\p{L}'’.-]*\.?$/u.test(w) || (PARTICLES.has(w) && w !== t[0]));
}

// the pieces of a list of names: "A (Aff); B, C and D" → [A, B, C, D]
function pieces(s) {
  let r = s, prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*;\s*|\s*,\s*|\s+and\s+/).map((p) => p.replace(/^and\s+/i, "").replace(/\s+/g, " ").trim()).filter(Boolean);
}

// "A, B, and C, Title" → { authors: [A, B, C], title: "Title" }; a line of names only has no title; a line with no names is all title
export function splitLine(line) {
  const max = line.includes(";") ? 6 : 4;
  // split at the commas outside parentheses ("Yanjun Wu (Institute of Software, Chinese Academy of Sciences)" is one author)
  const chunks = [];
  for (let depth = 0, from = 0, k = 0; k <= line.length; k++) {
    const c = line[k];
    if (c === "(") depth++; else if (c === ")") depth = Math.max(0, depth - 1);
    if (k === line.length || (c === "," && depth === 0 && /\s/.test(line[k + 1] || " "))) {
      chunks.push(line.slice(from, k).replace(/\s*[;]\s*/g, "; ").trim());
      from = k + 1;
    }
  }
  const authors = [];
  // a line of several pieces that does not end in a comma ends with its title, whatever the title looks like ("… and Efficient …")
  const last = chunks.length > 1 && !/,\s*$/.test(line) ? chunks.length - 1 : chunks.length;
  let i = 0;
  for (; i < last; i++) {
    const c = chunks[i].replace(/^and\s+/i, "");
    const parts = pieces(c);
    if (!parts.length || !parts.every((p) => isName(p, max))) break;
    authors.push(...parts);
  }
  return { authors, title: chunks.slice(i).join(", ").replace(/\s+/g, " ").trim() };
}

const yearHeading = (l) => /^(?:19|20)\d{2}$/.test(l) && parseInt(l, 10);

// the page as blocks, one per year heading, up to the "ACM SIGSAC Last Update" footer
function blocks(all) {
  const out = [];
  for (const l of all) {
    if (/^ACM SIGSAC Last Update/i.test(l)) break;
    const y = yearHeading(l);
    if (y) out.push({ year: y, lines: [] });
    else if (out.length) out[out.length - 1].lines.push(l);
  }
  return out;
}

export function parseBest(html, source = PAGES.best) {
  const entries = [], skipped = [];
  for (const { year, lines: ls } of blocks(lines(html).map((l) => l.normalize("NFC")))) {
    const intro = ls.find((l) => /award winners?/i.test(l)) || "";
    const distinguished = /distinguished/i.test(intro);
    const label = distinguished ? "Distinguished Paper" : "Best Paper";
    let pending = [], pendingText = [], last = null;
    const emit = (authors, authorText, title) => {
      if (authors.length && title.length >= 8) {
        entries.push({ venue: "CCS", year, award: distinguished ? "distinguished" : "best", awardLabel: label, title, authors, track: "main", source,
          evidence: `CCS ${year} ${label}: ${authorText} — ${title}` });
        last = authors.join("|");
      } else skipped.push(`${year}: not read: ${authorText} ${title}`.slice(0, 90));
    };
    for (const l of ls) {
      if (/^CCS\s+(?:19|20)\d{2}\s+Committee/i.test(l) || /^-->$/.test(l)) break;
      if (/award winners?\b|^\(?in no particular order\)?$|^<!--/i.test(l)) continue;
      const { authors, title } = splitLine(l);
      if (authors.length && !title) {                                   // names only: the start (or more) of an authors list
        if (!pending.length && authors.join("|") === last) continue;    // the page repeats a line of authors once
        pending.push(...authors); pendingText.push(l.replace(/,\s*$/, ""));
      } else if (authors.length && title) {                             // "Authors, Title" on one line (after any lines of authors)
        emit([...pending, ...authors], [...pendingText, l.slice(0, l.length - title.length).replace(/,\s*$/, "")].join(" "), title);
        pending = []; pendingText = [];
      } else if (pending.length) {                                      // the title on the line after its authors
        emit(pending, pendingText.join(" "), l);
        pending = []; pendingText = [];
      } else skipped.push(`${year}: a line that is neither authors nor a title with authors: ${l.slice(0, 70)}`);
    }
  }
  return { entries, skipped };
}

export function parseTestOfTime(html, source = PAGES.tot) {
  const entries = [], skipped = [];
  for (const { year, lines: ls } of blocks(lines(html).map((l) => l.normalize("NFC")))) {
    // the lines after the heading's sentence ("… are two papers from ACM CCS 2006 (in no particular order).") — which may run on for
    // a few lines — are the entries: "Authors:" (on one or more lines), then the title and its citation
    let at = ls.findIndex((l) => /^The test-of-time award/i.test(l));
    if (at < 0) { skipped.push(`${year}: no introduction`); continue; }
    while (at < ls.length - 1 && !/(?:as follows:|particular order\)\.|interest\.)$/.test(ls[at])) at++;
    let authorLines = [], cur = null, afterCitation = false;
    const flush = () => {
      if (!cur) return;
      const joined = cur.title.join(" ").replace(/\s+/g, " ");
      // the title ends where the citation begins ("… Pages 89-98, In Proceedings of the 13th ACM …, CCS 2006 …")
      const title = joined.replace(/\s*\.?\s*Pages\s+\d.*$/i, "").replace(/\s*\.?\s*In\s+(?:[A-Z][\w. -]+\(Ed\.\):\s*)?Proceedings.*$/i, "").replace(/\.$/, "").trim();
      const m = /\bCCS\s+((?:19|20)\d{2})\b/.exec(joined);
      const authorText = cur.authors.join(" ").replace(/\s*:\s*$/, "");
      const authors = pieces(authorText);
      if (authors.length && authors.every((a) => isName(a)) && title.length >= 8) {
        entries.push({ venue: "CCS", year, award: "tot", awardLabel: "Test of Time Award", title, authors, track: "main", source,
          evidence: `CCS ${year} Test-of-Time Award: ${authorText}: ${title}`, ...(m ? { paperYear: parseInt(m[1], 10) } : {}) });
      } else skipped.push(`${year}: not read: ${authorText.slice(0, 60)} / ${title.slice(0, 40)}`);
      cur = null;
    };
    // a citation ends with its ISBN (the number may be on the next line); whatever follows is the next entry's authors
    const endsCitation = (l) => /\bISBN:?\s*[\dX-]+\s*$/.test(l) || /^[\dX][\dX-]{8,}$/.test(l);
    for (const l of ls.slice(at + 1)) {
      if (cur && afterCitation) { flush(); afterCitation = false; }
      if (/(?<!ISBN):\s*$/.test(l)) {                               // a line ending in a colon closes a list of authors
        flush();
        cur = { authors: [...authorLines, l], title: [] };
        authorLines = [];
      } else if (cur) {
        cur.title.push(l);
        if (endsCitation(l)) afterCitation = true;
      } else authorLines.push(l);
    }
    flush();
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, file] = process.argv.slice(2);
  const parse = { best: parseBest, tot: parseTestOfTime }[kind];
  if (!parse) { console.error("usage: ccs.mjs best|tot [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "better-scholar award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, PAGES[kind]);
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
