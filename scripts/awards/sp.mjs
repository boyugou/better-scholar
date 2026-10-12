#!/usr/bin/env node
// The IEEE Symposium on Security and Privacy's own awards pages, one per year (2016–2025), read into raw award entries for
// scripts/awards/merge-raw.mjs: the Distinguished Paper, Distinguished Practical Paper and Distinguished Student Paper awards
// (Best Paper / Best Practical Paper / Best Student Paper in 2020 and 2021).
//
//   node scripts/awards/sp.mjs <year> [saved-page.html] > sp.json      (fetches the year's page when no file is given)
//   node scripts/awards/merge-raw.mjs sp-2016.json … [--write]
//
// The pages come in three shapes: 2016 a list  <li>Distinguished Student Paper: <br> Title <br> Authors (Affiliation), …</li>;
// 2017–2022 an award heading and then  <p><strong>Title</strong><br>Authors (Affiliation), …</p>; 2023–2025 the same with
// <div class="list-group-item"><b>Title</b><br>Authors<br>(affiliations)</div>. Reviewer, poster, workshop and test-of-time awards
// are not read (test-of-time lists classic papers in yet another form). The authors are the first line after the title.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

const URLS = (y) => y <= 2022 ? `https://www.ieee-security.org/TC/SP${y}/awards.html` : y === 2023 ? "https://sp2023.ieee-security.org/program-awards.html" : `https://sp${y}.ieee-security.org/awards.html`;

// what an award heading means; null = not a paper award of the main symposium
export function classify(heading) {
  const h = heading.replace(/\s+/g, " ").trim();
  if (/workshop|reviewer|poster|test of time|artifact|community|service|mentor/i.test(h) || !/award|paper/i.test(h)) return null;
  if (/student/i.test(h)) return { award: "student", label: /distinguish/i.test(h) ? "Distinguished Student Paper" : "Best Student Paper" };
  if (/practical/i.test(h)) return /distinguish/i.test(h) ? { award: "distinguished", label: "Distinguished Practical Paper" } : { award: "category", label: "Best Practical Paper" };
  if (/distingu?ish/i.test(h)) return { award: "distinguished", label: "Distinguished Paper" };
  if (/best paper/i.test(h)) return { award: "best", label: "Best Paper" };
  return null;
}

// names in "A (Aff), B (Aff (Dept)), and C" — superscript markers and parenthesised affiliations dropped
function names(s) {
  let r = s, prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,.:]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

export function parse(html, { year, source }) {
  const entries = [];
  const skipped = [];
  const body = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, "").replace(/<sup>[^<]*<\/sup>/gi, "");
  let section = null, heading = "", pending = null, inWorkshops = false;
  const flush = () => {
    if (pending && section) {
      const authors = names(pending.authors);
      if (pending.title.length >= 8 && authors.length) {
        entries.push({ venue: "S&P", year, award: section.award, awardLabel: section.label, title: pending.title, authors, track: "main", source,
          evidence: `${heading}: ${pending.title} — ${pending.authors.trim()}` });
      } else skipped.push(`${year} ${heading}: not read: ${pending.title.slice(0, 60)}`);
    }
    pending = null;
  };
  // 2016: <li>Distinguished Practical Paper: <br> Title <br> Authors (Affiliation), …</li>
  for (const li of body.matchAll(/<li\b[^>]*>([\s\S]*?)(?=<li\b|<\/ul>)/gi)) {
    const parts = li[1].split(/<br\s*\/?>/i).map((x) => text(x)).filter(Boolean);
    const spec = parts.length >= 3 && /:\s*$/.test(parts[0]) ? classify(parts[0].replace(/:\s*$/, "").replace(/Distingushed/i, "Distinguished")) : null;
    if (spec) { heading = parts[0]; pending = { title: parts[1], authors: parts[2] }; section = spec; flush(); }
  }
  section = null; heading = "";
  // everything else, in page order: headings, bold titles (the first line after one is its authors), line breaks and block ends
  for (const m of body.matchAll(/<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>|<(strong|b)\b[^>]*>([\s\S]*?)<\/\3>|(<br\s*\/?>)|(<\/(?:p|div|li|ul|tr|td)>|<hr\b[^>]*>)|([^<]+)/gi)) {
    // an h1 / h2 opens an award section; a smaller heading ("Sponsored by …", a workshop's own award) changes it only to say "not a paper award"
    if (m[1]) {
      flush();
      const h = text(m[2]), spec = classify(h);
      if (/^h[12]$/i.test(m[1])) { heading = h; section = spec; inWorkshops = /workshop/i.test(h); }
      else if (inWorkshops || /workshop/i.test(h)) { heading = h; section = null; inWorkshops = true; }     // a workshop's own best-paper awards
      else if (spec) { heading = h; section = spec; }
    }
    else if (m[3]) { flush(); const t = text(m[4]); if (section && t && !/^sponsored by/i.test(t)) pending = { title: t, authors: "", done: false }; }
    else if (m[5]) { if (pending && pending.authors.trim()) pending.done = true; }
    else if (m[6]) flush();
    else if (m[7] && pending && !pending.done) pending.authors += " " + m[7].replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z]+;|&#\d+;/gi, (e) => text(e));
  }
  flush();
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const year = parseInt(process.argv[2], 10);
  const file = process.argv[3];
  if (!(year >= 2016 && year <= 2026)) { console.error("usage: sp.mjs <year 2016–2026> [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(URLS(year), { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, { year, source: URLS(year) });
  const by = {};
  for (const e of entries) by[e.awardLabel] = (by[e.awardLabel] || 0) + 1;
  console.error(`${year}: ${entries.length} entries`, JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
