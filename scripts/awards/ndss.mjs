#!/usr/bin/env node
// The NDSS Symposium's own year pages (https://www.ndss-symposium.org/ndss<year>/), read for their "<year> Awards" section into
// raw award entries for scripts/awards/merge-raw.mjs: the Distinguished Paper Awards (Best Paper Awards in 2026), their
// honorable mentions (2019), the Cisco Network Security Best Paper Award (2018) and the Test of Time Awards (classic papers,
// with the year they appeared).
//
//   node scripts/awards/ndss.mjs <year> [saved-page.html] > ndss.json      (fetches the year's page when no file is given)
//   node scripts/awards/merge-raw.mjs ndss-2017.json … [--write]
//
// Under each award heading (an <h3>) a paper is a paragraph  <p><a><strong>Title</strong></a><br>Authors (Affiliation), …</p>
// (the link, the bold and the line break nest in a few orders). Poster, artifact and reviewer awards and the workshops' own
// best papers (MADWeb, PRISM) are not read.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

export function classify(heading) {
  const h = heading.replace(/\s+/g, " ").trim();
  if (/^NDSS(?: Symposium)? Test of Time Awards?$/i.test(h)) return { award: "tot", label: "Test of Time Award" };
  if (!/^(?:NDSS(?: Symposium)?\s+)?(?:(?:19|20)\d{2}\s+)?(?:Distinguished Paper|Best Paper|Cisco Network Security Best Paper)/i.test(h)) return null;
  if (/honou?rable mention/i.test(h)) return { award: "runner-up", label: "Distinguished Paper Honorable Mention" };
  if (/^(?:NDSS(?: Symposium)?\s+)?(?:(?:19|20)\d{2}\s+)?Cisco/i.test(h)) return { award: "category", label: "Cisco Network Security Best Paper" };
  if (/best paper/i.test(h)) return { award: "best", label: "Best Paper" };
  return { award: "distinguished", label: "Distinguished Paper" };
}

// names in "A (Aff), B (Aff (Dept)), C and D."
function names(s) {
  let r = s, prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,.]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

export function parse(html, { year, source }) {
  const entries = [];
  const skipped = [];
  let section = null, heading = "";
  const at = html.search(new RegExp(`<h2\\b[^>]*>\\s*${year}\\s+Awards`, "i"));
  for (const [, tag, inner] of html.slice(at < 0 ? html.length : at).matchAll(/<(h[1-4]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (/^h[1-4]$/i.test(tag)) {
      heading = text(inner);
      if (/^h[12]$/i.test(tag) && !new RegExp(`^${year}\\s+Awards`, "i").test(heading)) break;     // the next section of the page
      section = classify(heading);
      continue;
    }
    if (!section) continue;
    const cut = inner.search(/<br\s*\/?>/i);
    if (cut < 0) continue;
    let title = text(inner.slice(0, cut));
    const authorText = text(inner.slice(cut)).replace(/^\s*,\s*/, "");
    // a test-of-time paper carries the year it appeared: "2000: Title" or "Title (2008)"
    let paperYear = null;
    if (section.award === "tot") {
      const lead = /^((?:19|20)\d{2}):\s*/.exec(title), tail = /\s*\(((?:19|20)\d{2})\)\s*$/.exec(title);
      if (lead) { paperYear = parseInt(lead[1], 10); title = title.slice(lead[0].length); }
      else if (tail) { paperYear = parseInt(tail[1], 10); title = title.slice(0, tail.index); }
    }
    const authors = names(authorText);
    if (title.length >= 8 && authors.length) {
      entries.push({ venue: "NDSS", year, award: section.award, awardLabel: section.label, title, authors, track: "main", source,
        evidence: `${heading}: ${title} — ${authorText}`, ...(paperYear ? { paperYear } : {}) });
    } else skipped.push(`${year} ${heading}: not read: ${title.slice(0, 60)}`);
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const year = parseInt(process.argv[2], 10);
  const file = process.argv[3];
  if (!(year >= 2017 && year <= 2026)) { console.error("usage: ndss.mjs <year 2017–2026> [saved-page.html]"); process.exit(2); }
  const url = `https://www.ndss-symposium.org/ndss${year}/`;
  const html = file ? readFileSync(file, "utf8") : await (await fetch(url, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, { year, source: url });
  const by = {};
  for (const e of entries) by[e.awardLabel] = (by[e.awardLabel] || 0) + 1;
  console.error(`${year}: ${entries.length} entries`, JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
