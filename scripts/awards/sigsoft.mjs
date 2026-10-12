#!/usr/bin/env node
// Read ACM SIGSOFT's own Distinguished Paper Award list (https://www2.sigsoft.org/awards/distinguishedpaper/) into raw award
// entries for scripts/awards/merge-raw.mjs: the distinguished papers of ICSE, FSE (ESEC/FSE), ASE, ISSTA, MSR, MODELS, ICPC … since 2008.
//
//   node scripts/awards/sigsoft.mjs [saved-page.html] > sigsoft.json       (fetches the page when no file is given)
//
// Under "Winners", an <h3> per conference-year ending in "(ASE 2025)" and a <ul> of <li>Author, Author: Title</li>.
import { readFileSync } from "node:fs";

const URL_PAGE = "https://www2.sigsoft.org/awards/distinguishedpaper/";
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s) => s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (m, hex, dec, name) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(parseInt(dec, 10)) : NAMED[name.toLowerCase()] || m);
const text = (html) => decode(html.replace(/<[^>]+>/g, "")).replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

// "… (ASE 2025)" → { venue: "ASE", year: 2025 };  "… (ESEC/FSE 2017)" → { venue: "ESEC/FSE", year: 2017 }
export function sectionOf(heading) {
  const m = /\(([^()]+?)\s+((?:19|20)\d{2})\)\s*$/.exec(heading.trim());
  return m ? { venue: m[1].trim(), year: parseInt(m[2], 10) } : null;
}

const splitAuthors = (s) => s.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((a) => a.trim()).filter(Boolean);

export function parse(html) {
  const entries = [];
  const start = html.search(/<h2[^>]*>\s*Winners\s*<\/h2>/i);
  const body = start >= 0 ? html.slice(start) : html;
  const heads = [...body.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => ({ label: text(m[1]), at: m.index, end: m.index + m[0].length }));
  heads.forEach((h, i) => {
    const sec = sectionOf(h.label);
    if (!sec) return;
    const part = body.slice(h.end, i + 1 < heads.length ? heads[i + 1].at : body.length);
    for (const [, li] of part.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const line = text(li);
      // author names have no colon, so the first colon ends the author list (titles may contain more)
      const cut = line.indexOf(":");
      if (cut < 3) continue;
      const authors = splitAuthors(line.slice(0, cut));
      const title = line.slice(cut + 1).trim();
      if (!authors.length || title.length < 8) continue;
      // Older entries read "Authors. Title: Subtitle" and would be cut at the wrong colon: a name is a few words and has no
      // sentence in it, so anything else in the author part means this line is not in the "Authors: Title" form — skip it.
      if (authors.some((a) => a.split(" ").length > 5 || /[.?!]\s+\S/.test(a) && !/^(?:[A-Z]\.\s*)+\S+$/.test(a))) continue;
      entries.push({
        venue: sec.venue, year: sec.year, award: "distinguished", awardLabel: "ACM SIGSOFT Distinguished Paper", title, authors, track: "main", source: URL_PAGE,
        evidence: `${h.label}: ${line}`.slice(0, 400)
      });
    }
  });
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const html = file ? readFileSync(file, "utf8") : await (await fetch(URL_PAGE, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const entries = parse(html);
  const by = {};
  for (const e of entries) by[e.venue] = (by[e.venue] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
