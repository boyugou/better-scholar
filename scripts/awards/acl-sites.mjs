#!/usr/bin/env node
// Paper awards as an ACL-family conference announces them on its own website — for the years the ACL Anthology's metadata
// does not record (EMNLP 2021 and 2023, NAACL 2025). The conference sites are Jekyll pages (or a Gatsby blog post for EMNLP
// 2021) in four shapes, all read here:
//   <h2>Best Paper Awards</h2><ul><li><p>Title<br><em>Authors</em></p></li> …                  (EMNLP 2023, 2024)
//   <h2>Best Paper</h2><ul><li><strong>Title</strong><br><em>Authors</em></li> …               (EMNLP 2025)
//   <h2>Best Long Paper</h2><p><em>Title</em><br>Authors</p> …                                 (EMNLP 2021 blog post)
//   <li><strong>Best Paper Award:</strong> <br><em>Title</em> \ <br>Authors <br>Session</li>   (NAACL 2025 blog post)
//
//   node scripts/awards/acl-sites.mjs <venue> <year> <page-url-or-saved.html> [--source <url>] > raw.json
//   e.g. node scripts/awards/acl-sites.mjs EMNLP 2023 https://2023.emnlp.org/program/best_papers/ > emnlp-2023.json
//   node scripts/awards/merge-raw.mjs emnlp-2023.json [--write]
//
// A heading (or a "Label:" in front of an item) says what the paper won; the same rules as the Anthology reader decide
// the kind: the plain best-paper names are `best`, "Outstanding … Paper" is `outstanding`, runner-up / honorable mention
// is `runner-up`, any other "Best …" (Short Paper, Theme Paper, Resource Paper, Social Impact) is a named category.
// Demo, SAC / area-chair, reviewer, People's Choice and "highlight" lists are not paper awards and are left out.
// EMNLP 2024 and 2025 (already in the Anthology) are parsed identically by the tests' sample pages as a cross-check.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

export function classify(name) {
  const n = name.replace(/[:：]\s*$/, "").trim();
  if (/demo|\bsac\b|senior area|area chair|reviewer|people.?s choice|highlight|committee|selection process|resource and evaluation track/i.test(n)) return null;
  const label = n.replace(/\s+/g, " ").replace(/(Paper|Award)s$/, "$1");     // "Outstanding Papers" → "Outstanding Paper"
  if (/student paper/i.test(n)) return { award: "student", label };
  if (/runner[- ]?up|honou?rable mention/i.test(n)) return { award: "runner-up", label };
  if (/outstanding/i.test(n) && /paper/i.test(n)) return { award: "outstanding", label };
  if (/^best(?: overall| long)?(?: paper)?(?: award)?s?$/i.test(n)) return { award: "best", label };
  if (/^best\b/i.test(n)) return { award: "category", label };
  return null;
}

// "A, B and C" / "A; B; C" / a list wrapped over lines. Underscores around the whole line (Markdown left in the page) are dropped.
const splitAuthors = (s) => s.replace(/^[_*\s]+|[_*\s]+$/g, "").split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((a) => a.replace(/[_*]/g, "").trim()).filter(Boolean);
// the line after a title: names, not a presentation slot ("Ballroom A, Session I: Oral/Poster 6, Thursday May 1, 16:00-17:30")
const looksLikeAuthors = (s) => s.length > 3 && s.length < 1500 && !/\d|:|\bsession\b/i.test(s);

export function parse(html, { venue, year, source }) {
  const entries = [];
  const skipped = [];
  const article = (/<article\b[\s\S]*?<\/article>/i.exec(html) || [html])[0];
  let heading = "", section = null;
  for (const [, tag, inner] of article.matchAll(/<(h[1-6]|li|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (/^h[1-6]$/i.test(tag)) { heading = text(inner); section = classify(heading); continue; }
    const lines = inner.split(/<br\s*\/?>/i).map(text).filter(Boolean);
    // prose that thanks the selection committee ends the list (its members would otherwise read as a paper and its authors)
    if (lines.length === 1 && /\bcommittee\b|\bwe thank\b|congratulat/i.test(lines[0])) { section = null; continue; }
    if (lines.length < 2) continue;
    // a paper's title or authors are emphasised (<em>, <strong>, or Markdown's _underscores_ left in the page); a plain list of names is not a paper
    if (!/<(?:em|strong|i|b)\b/i.test(inner) && !lines.some((l) => /^_.+_$/.test(l))) continue;
    // "Best Paper Award:" in front of the item names the award; otherwise the section's heading does
    const labelled = /[:：]$/.test(lines[0]) && lines[0].length < 80;
    const spec = labelled ? classify(lines[0]) : section;
    if (!spec) continue;
    const at = labelled ? 1 : 0;
    const title = (lines[at] || "").replace(/\s*\\\s*$/, "").replace(/^[_*\s]+|[_*\s]+$/g, "").trim();
    let authorsText = lines[at + 1] || "";
    for (let k = at + 2; /,$/.test(authorsText) && lines[k]; k++) authorsText += " " + lines[k];      // an author list wrapped over lines
    if (!title || title.length < 8 || !looksLikeAuthors(authorsText)) { skipped.push(`${heading}: not read: ${lines[0].slice(0, 80)}`); continue; }
    entries.push({
      venue, year, award: spec.award, awardLabel: spec.label, title, authors: splitAuthors(authorsText), track: "main", source,
      evidence: `${labelled ? lines[0] : heading}: ${title} — ${authorsText}`
    });
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const sourceFlag = args.indexOf("--source");
  const source = sourceFlag >= 0 ? args[sourceFlag + 1] : null;
  const [venue, yearText, where] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--source");
  const year = parseInt(yearText, 10);
  if (!venue || !(year >= 1990 && year <= 2026) || !where) { console.error("usage: acl-sites.mjs <venue> <year> <url-or-saved.html> [--source <url>]"); process.exit(2); }
  const isUrl = /^https:\/\//.test(where);
  if (!isUrl && !source) { console.error("a saved page needs --source <the page's url>"); process.exit(2); }
  const html = isUrl ? await (await fetch(where, { headers: { "user-agent": "better-scholar award reader (reads one public page)" } })).text() : readFileSync(where, "utf8");
  const { entries, skipped } = parse(html, { venue, year, source: source || where });
  const by = {};
  for (const e of entries) by[e.awardLabel] = (by[e.awardLabel] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
