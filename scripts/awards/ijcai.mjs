#!/usr/bin/env node
// Read an IJCAI conference site's "Distinguished Papers" page into raw award entries for scripts/awards/merge-raw.mjs.
//
//   node scripts/awards/ijcai.mjs <year> <page-url-or-saved.html> > ijcai.json
//   e.g. node scripts/awards/ijcai.mjs 2023 https://ijcai-23.org/distinguished-paper-awards/
//        node scripts/awards/ijcai.mjs 2020 https://ijcai20.org/distinguished-papers/
//
// The conference sites are WordPress pages, one per year, in four shapes:
//   2023  <p><strong>Title</strong><br><em>Authors</em></p>
//   2020  <ul><li>Title<br>Authors</li></ul>
//   2021  <p><strong>Title</strong><br>Authors (Affiliation), … </p> (a name's affiliation may wrap over a <br>), then an
//         <h2>Honorable Mention</h2> and its papers; <p class="ec-pdf">PDF</p> links between them
//   2022  <h2><strong><em>Title</em></strong></h2><p>Author ( Affiliation )<br>Author ( Affiliation )…</p>
// The proceedings prefaces (PDFs) list finalists, or "TBA", not winners, and the 2018, 2019, 2024 and 2025 sites have no such
// page, so IJCAI is covered for 2020–2023.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

// names in "A (Aff), B (Aff (Dept)), C and D" — affiliations dropped
function names(s) {
  let r = s, prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,.]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

export function parse(html, { year, source }) {
  const entries = [];
  // the page's own content: the entry-content block, or <main>, else the whole page
  const region = (/<div class="entry-content[^"]*"[^>]*>([\s\S]*?)(?:<!-- \.entry-content[^>]*-->|<\/article>)/i.exec(html) || /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html) || [null, html])[1];
  let section = { award: "distinguished", label: "Distinguished Paper" }, pending = null;
  const add = (title, authorText) => {
    const authors = names(authorText);
    if (!title || title.length < 8 || !authors.length) return;
    entries.push({ venue: "IJCAI", year, award: section.award, awardLabel: section.label, title, authors, track: "main", source,
      evidence: `${section.label}: ${title} — ${authorText.trim()}` });
  };
  for (const [, tag, inner] of region.matchAll(/<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const lines = inner.split(/<br\s*\/?>/i).map(text).filter(Boolean);
    if (!lines.length) continue;
    if (/^h[1-6]$/i.test(tag)) {
      const h = lines.join(" ");
      if (/^honou?rable mention/i.test(h)) section = { award: "runner-up", label: "Distinguished Paper Honorable Mention" };
      else if (/^distinguished/i.test(h)) section = { award: "distinguished", label: "Distinguished Paper" };
      else pending = h;                                                               // 2022: a paper's title is its heading
      continue;
    }
    if (pending) { add(pending, lines.join(", ")); pending = null; continue; }
    if (lines.length >= 2) add(lines[0], lines.slice(1).join(" "));
  }
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [year, where] = process.argv.slice(2);
  if (!/^(?:19|20)\d{2}$/.test(year || "") || !where) { console.error("usage: ijcai.mjs <year> <url-or-saved.html>"); process.exit(2); }
  const isUrl = /^https:\/\//.test(where);
  const html = isUrl ? await (await fetch(where, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text() : readFileSync(where, "utf8");
  const entries = parse(html, { year: parseInt(year, 10), source: isUrl ? where : `https://ijcai-${year.slice(2)}.org/distinguished-paper-awards/` });
  console.error(entries.length + " entries");
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
