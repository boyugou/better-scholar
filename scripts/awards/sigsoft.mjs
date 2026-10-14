#!/usr/bin/env node
// Read ACM SIGSOFT's own Distinguished Paper Award list (https://www2.sigsoft.org/awards/distinguishedpaper/) into raw award
// entries for scripts/awards/merge-raw.mjs: the distinguished papers of ICSE, FSE (ESEC/FSE), ASE, ISSTA, MSR, MODELS, ICPC … since 2008.
//
//   node scripts/awards/sigsoft.mjs [saved-page.html] > sigsoft.json       (fetches the page when no file is given)
//
// Under "Winners", an <h3> per conference-year ending in "(ASE 2025)" and a <ul> of <li>Author, Author: Title</li>.
import { readFileSync } from "node:fs";
import { isPerson } from "./people.mjs";
import { text } from "./html.mjs";

const URL_PAGE = "https://www2.sigsoft.org/awards/distinguishedpaper/";

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
      // "Authors, Main title: Subtitle" (the first colon is then inside the title): the names are the leading entries that are names (a nickname in brackets, "Xiwei (Sherry) Xu", is no hindrance); the first that is not starts the title
      const pieces = line.slice(0, cut).split(/(\s*,\s*(?:and\s+)?|\s+and\s+)/);
      const plain = (x) => x.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      let k = 0;
      while (k < pieces.length && (k % 2 === 1 || isPerson(plain(pieces[k])))) k++;
      if (k < pieces.length && k % 2 === 1) k--;                                                  // (stopped on a separator)
      const titleLead = k < pieces.length ? pieces.slice(k).join("").replace(/^[\s,]+/, "").replace(/^and\s+/, "") : "";
      const names = pieces.slice(0, k).filter((_, i) => i % 2 === 0).map((x) => x.trim());
      if (titleLead && /[.?!]\s+\S/.test(titleLead)) continue;                                   // ("Authors. Title: Subtitle": the old format, skipped as before)
      const authors = titleLead && names.length ? names : splitAuthors(line.slice(0, cut));
      const title = (titleLead && names.length ? titleLead + ": " : "") + line.slice(cut + 1).trim();
      if (!authors.length || title.length < 8) continue;
      if (/\)\.\s+(?:\S+\s+){1,3}\S+,/.test(title) || /^\p{Lu}\p{Lu}\p{Ll}+\s*:/u.test(title)) continue;      // (a second paper's authors after the title, or a lead that is a mistyped name: reported by its absence, not guessed)
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
  const html = file ? readFileSync(file, "utf8") : await (await fetch(URL_PAGE, { headers: { "user-agent": "better-scholar award reader (reads one public page)" } })).text();
  const entries = parse(html);
  const by = {};
  for (const e of entries) by[e.venue] = (by[e.venue] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
