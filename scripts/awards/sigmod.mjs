#!/usr/bin/env node
// ACM SIGMOD's own best-paper pages, read into raw award entries for scripts/awards/merge-raw.mjs:
//
//   sigmod  https://sigmod.org/sigmod-awards/sigmod-best-paper-award/    a table, a row per year:
//             2022–2026   <strong>Research: Best Papers</strong> Title / Authors / Title / Authors … <strong>Honorable Mentions</strong> …
//                         (Industry track best paper and honorable mention too)
//             2021        three sections, an entry per line: "Title. Authors"
//             1994–2020   one entry per paragraph or line: "Title. Authors" (the title often a link)
//   pods    https://sigmod.org/pods-home/pods-best-paper-awards/         <p><strong>2024</strong><br>Authors:<br><a>Title</a></p>
//   tot     https://sigmod.org/sigmod-awards/sigmod-test-of-time-award/  the SIGMOD Test of Time Award, 1999–: a year, then a line "Title. Authors" per
//                                                                        award (the newer ones end in "[award abstract]")
//
//   node scripts/awards/sigmod.mjs sigmod|pods|tot [saved-page.html] > sigmod.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs sigmod.json [--write]
//
// The 2021 row and the older rows run entries together in places; an entry whose title cannot be told from its authors is
// reported and skipped, never guessed.
import { readFileSync } from "node:fs";
import { text, lines as pageLines } from "./html.mjs";
import { isPerson } from "./people.mjs";

const PAGES = {
  sigmod: "https://sigmod.org/sigmod-awards/sigmod-best-paper-award/",
  pods: "https://sigmod.org/pods-home/pods-best-paper-awards/",
  tot: "https://sigmod.org/sigmod-awards/sigmod-test-of-time-award/"
};

// the names in "A (Aff), B and C" — parentheses and a leading "Authors:" dropped
function names(s) {
  let r = s.replace(/^\s*Authors?:\s*/i, ""), prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,.:*]+|[\s,.:*]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

const entry = (venue, year, award, label, title, authors, source, evidence) =>
  ({ venue, year, award, awardLabel: label, title: title.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim(), authors, track: "main", source, evidence });

// ---- PODS: a paragraph per winner — the year in a <strong> on the first of the year's paragraphs
export function parsePods(html, source = PAGES.pods) {
  const out = [];
  let year = null;
  const after = html.slice(Math.max(0, html.search(/Recipients of the Best Paper Award/i)));
  for (const [, inner] of after.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const y = /<strong>\s*((?:19|20)\d{2})\s*<\/strong>/.exec(inner);
    if (y) year = parseInt(y[1], 10);
    const ls = inner.replace(/<strong>\s*(?:19|20)\d{2}\s*<\/strong>/i, "").split(/<br\s*\/?>/i).map(text).filter(Boolean);
    if (!year || ls.length < 2 || !/:\s*$/.test(ls[0].replace(/^and\s+/i, "")) && !/:\s*$/.test(ls[0])) continue;
    const authors = names(ls[0].replace(/^and\s+/i, "").replace(/:\s*$/, ""));
    const title = ls.slice(1).join(" ");
    if (authors.length && title.length >= 8) out.push(entry("PODS", year, "best", "Best Paper", title, authors, source, `${year}: ${ls[0]} ${title}`));
  }
  return out;
}

// ---- SIGMOD
function sectionKind(heading) {
  const h = heading.replace(/\s+/g, " ").trim();
  if (/honou?rable/i.test(h)) return { award: "runner-up", label: /industry/i.test(h) ? "Industry Track Honorable Mention" : "Best Paper Honorable Mention" };
  if (/industry/i.test(h)) return { award: "category", label: "Industry Track Best Paper" };
  if (/best papers?/i.test(h)) return { award: "best", label: /data science/i.test(h) ? "Best Paper (Data Science)" : "Best Paper" };
  return null;
}

export function parseSigmod(html, source = PAGES.sigmod) {
  const entries = [];
  const skipped = [];
  for (const [, row] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1]);
    if (cells.length < 2) continue;
    const ym = /^\s*(?:19|20)\d{2}/.exec(text(cells[0]));
    if (!ym) continue;
    const year = parseInt(ym[0], 10);
    const cell = cells[1].replace(/<em>\s*Source:[\s\S]*?<\/em>/i, "");
    // sections: <strong>Heading</strong> then their lines; a row without headings is one section of best papers
    const parts = cell.split(/(<strong>[\s\S]*?<\/strong>)/i);
    let kind = { award: "best", label: "Best Paper" };
    let body = parts[0], heads = [];
    const sections = [{ kind, html: parts[0] }];
    for (let i = 1; i < parts.length; i += 2) {
      const k = sectionKind(text(parts[i]));
      if (k) sections.push({ kind: k, html: parts[i + 1] || "" });
      else if (sections.length) sections[sections.length - 1].html += parts[i] + (parts[i + 1] || "");
    }
    void body; void heads;
    for (const { kind: k, html: h } of sections) {
      // entries: lines (<br>, <p>) — either alternating Title / Authors, or "Title. Authors" on one line
      const lines = h.replace(/<\/p>|<p\b[^>]*>|<br\s*\/?>/gi, "\n").split("\n").map((l) => ({ plain: text(l), link: (/<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(l) || [])[1] })).filter((l) => l.plain);
      const alternating = lines.length >= 2 && lines.every((l) => !/\.\s+[A-Z][\p{L}.'-]+(?:\s|,)/u.test(l.plain.slice(0, 120)) || l.plain.length < 140) && year >= 2022;
      if (alternating) {
        for (let i = 0; i + 1 < lines.length; i += 2) {
          const authors = names(lines[i + 1].plain);
          if (authors.length) entries.push(entry("SIGMOD", year, k.award, k.label, lines[i].plain, authors, source, `${year} ${k.label}: ${lines[i].plain} — ${lines[i + 1].plain}`));
          else skipped.push(`${year}: no authors for “${lines[i].plain.slice(0, 60)}”`);
        }
        continue;
      }
      for (let li = 0; li < lines.length; li++) {
        const l = lines[li];
        const runner = /^Runner-?up:\s*/i.test(l.plain);
        const plain = l.plain.replace(/^Runner-?up:\s*/i, "");
        let title, authorText;
        if (l.link && plain.startsWith(text(l.link))) { title = text(l.link); authorText = plain.slice(title.length).replace(/^[\s.:–-]+/, ""); }
        else { const m = /^(.{12,}?[a-z0-9)?!"”])\.\s+((?:[A-Z][\p{L}.'-]*|de|van|von|der|di)(?:\s+[\p{L}.'-]+)*(?:,|\s+and\s)?.*)$/su.exec(plain); if (m) { title = m[1]; authorText = m[2]; } }
        // a title on its own line (it ends with a full stop) and its authors on the next (the 2021 row's first entry)
        const nextLine = lines[li + 1];
        if (!title && /[a-z0-9)?!"”]\.$/.test(plain) && plain.length >= 12 && nextLine && !/[a-z0-9)?!"”]\.\s+[A-Z]/.test(nextLine.plain)) { title = plain.replace(/\.$/, ""); authorText = nextLine.plain; li++; }
        const authors = title ? names(authorText) : [];
        if (title && authors.length && /\p{L}{2}/u.test(authors[0]) && authors.length <= 40) {
          entries.push(entry("SIGMOD", year, runner ? "runner-up" : k.award, runner ? "Best Paper Runner-up" : k.label, title, authors, source, `${year}: ${plain}`));
        } else skipped.push(`${year}: not read: ${plain.slice(0, 90)}`);
      }
    }
  }
  return { entries, skipped };
}

// ---- Test of Time: a year heading, then "Title. Author, Author and Author" lines, the newer ones ending in "[award abstract]" (initials for some
// names: "D Kifer, A Machanavajjhala"; "H. Pirahesh, J. M. Hellerstein")
export function parseTot(html, source = PAGES.tot) {
  const entries = [], skipped = [];
  let year = null;
  for (const l of pageLines(html).map((x) => x.normalize("NFC"))) {
    const y = /^((?:19|20)\d{2})$/.exec(l);
    if (y) { year = parseInt(y[1], 10); continue; }
    if (/^ABOUT THE SITE$/i.test(l)) break;                          // the page's footer
    const m = year && /^(.+?)(?:\s*\[award abstract\])?\s*$/i.exec(l);
    if (!m) continue;
    // the title ends at the first ". " after which only names follow
    let done = false;
    for (const cut of [...m[1].matchAll(/\.\s+/g)]) {
      const title = m[1].slice(0, cut.index).trim(), authorText = m[1].slice(cut.index + cut[0].length).trim();
      const authors = names(authorText);
      if (title.length >= 8 && authors.length && authors.every(isPerson)) {
        entries.push(entry("SIGMOD", year, "tot", "Test of Time Award", title, authors, source, `${year} SIGMOD Test of Time Award: ${title}. ${authorText}`));
        done = true;
        break;
      }
    }
    if (!done) skipped.push(`${year}: not read: ${m[1].slice(0, 70)}`);
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, file] = process.argv.slice(2);
  if (!PAGES[kind]) { console.error("usage: sigmod.mjs sigmod|pods|tot [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "better-scholar award reader (reads one public page)" } })).text();
  const r = kind === "pods" ? { entries: parsePods(html), skipped: [] } : kind === "tot" ? parseTot(html) : parseSigmod(html);
  const by = {};
  for (const e of r.entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(r.entries.length + " entries:", JSON.stringify(by));
  for (const s of r.skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries: r.entries }, null, 1) + "\n");
}
