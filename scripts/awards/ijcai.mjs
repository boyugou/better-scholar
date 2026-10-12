#!/usr/bin/env node
// Read an IJCAI conference site's "Distinguished Paper Awards" page into raw award entries for
// scripts/awards/merge-raw.mjs. The page is a list of <p><strong>Title</strong><br><em>Authors</em></p>.
//
//   node scripts/awards/ijcai.mjs <year> <page-url-or-saved.html> > ijcai.json
//   e.g. node scripts/awards/ijcai.mjs 2023 https://ijcai-23.org/distinguished-paper-awards/
//
// Only IJCAI-23's page of this shape was reachable when this was written; the other years' official pages (and the
// proceedings prefaces, which are PDFs) are not read, so IJCAI is covered for 2023 only.
import { readFileSync } from "node:fs";

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s) => s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (m, hex, dec, name) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(parseInt(dec, 10)) : NAMED[name.toLowerCase()] || m);
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

export function parse(html, { year, source }) {
  const body = (/<div class="entry-content[^"]*">([\s\S]*?)<!-- \.entry-content -->/i.exec(html) || [null, html])[1];
  const entries = [];
  for (const [, inner] of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const title = text((/<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(inner) || [])[1] || "");
    const authorsText = text((/<em[^>]*>([\s\S]*?)<\/em>/i.exec(inner) || [])[1] || "");
    if (!title || !authorsText) continue;
    entries.push({
      venue: "IJCAI", year, award: "distinguished", awardLabel: "Distinguished Paper", title,
      authors: authorsText.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((a) => a.trim()).filter(Boolean), track: "main", source,
      evidence: `Distinguished Paper Awards: ${title} — ${authorsText}`
    });
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
