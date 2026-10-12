#!/usr/bin/env node
// ACM SIGMETRICS's own awards page (https://www.sigmetrics.org/awards.shtml), read into raw award entries for scripts/awards/merge-raw.mjs.
// Two lists on the one page:
//
//   Test of Time Award, "Past Winners"   "2024:" then, per paper, the authors (on the line before the title, or on its line), the title in
//                                        quotation marks (which may wrap) and "In Proceedings of ACM SIGMETRICS 2014." — then a paragraph on the paper
//   Paper awards                         "2026:" then a category line ("Best Paper Award:", "Kenneth C. Sevcik Outstanding Student Paper Award:",
//                                        "Best Paper Awards Runners-Up:") and under it lines  "Title" by Author (Affiliation), Author (Affiliation) …
//                                        (the year headings of 1997–2001 are empty and the page says the list is incomplete)
//
//   node scripts/awards/sigmetrics.mjs [saved-page.html] > sigmetrics.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs sigmetrics.json [--write]
//
// An entry whose authors do not read as a list of names (the 2017 test-of-time row writes "Bairavasundaram, Lakshmi N., …") is reported and
// skipped, never guessed.
import { readFileSync } from "node:fs";
import { lines } from "./html.mjs";
import { isPerson } from "./people.mjs";

const URL_ = "https://www.sigmetrics.org/awards.shtml";
const Q = "[\"“”]";                                                  // a quotation mark, straight or curly

// "A (Aff), B (Aff; Aff) and C." — the names, in order
function names(s) {
  let r = s.replace(/[.\s]+$/, ""), prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  const out = r.split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^(?:and\s+)+/i, "").replace(/^[\s,.;:]+|[\s,.;:]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
  // the first author written surname first ("Bairavasundaram, Lakshmi N., Garth R. Goodson, …"): a lone word, then the given names, then a full name
  if (out.length >= 3 && out[0].split(" ").length === 1 && out[1].split(" ").length <= 3 && isPerson(out[2])) out.splice(0, 2, out[1] + " " + out[0]);
  return out;
}
const cleanTitle = (t) => t.replace(/\s+/g, " ").replace(/^[\s"“”]+|[\s"“”]+$/g, "").replace(/[.,]$/, "").trim();
const yearHeading = (l) => { const m = /^((?:19|20)\d{2}):?$/.exec(l); return m ? parseInt(m[1], 10) : null; };

const entry = (year, award, label, title, authors, source, evidence) =>
  ({ venue: "SIGMETRICS", year, award, awardLabel: label, title, authors, track: "main", source, evidence });

// the kinds a category line stands for ("Best Paper Award and the Ken Sevcik Outstanding Student Paper Award:" is both)
function kindsOf(heading) {
  const h = heading.replace(/:\s*$/, "").replace(/\s*\(.*\)\s*$/, "").trim();
  if (/runners?-?up/i.test(h)) return [{ award: "runner-up", label: "Best Paper Runner-up" }];
  const out = [];
  if (/student/i.test(h)) out.push({ award: "student", label: h.replace(/^.*?(?:and the\s+)?((?:Stephen S\. Lavenberg and )?(?:Kenneth C\.|Ken) Sevcik .*)$/i, "$1").replace(/^Best Paper Award and the\s+/i, "").trim() });
  if (/^best paper/i.test(h)) out.push({ award: "best", label: "Best Paper" });
  return out;
}

export function parse(html, source = URL_) {
  const entries = [], skipped = [];
  const ls = lines(html).map((l) => l.normalize("NFC"));

  // ---- Test of Time: from "Past Winners" to "Go back to top."
  const tStart = ls.findIndex((l, i) => i > 0 && /^Past Winners$/i.test(l) && /test[ -]of[ -]time/i.test(ls.slice(Math.max(0, i - 12), i).join(" ")));
  if (tStart >= 0) {
    const tEnd = ls.findIndex((l, i) => i > tStart && /^Go back to top\.?$/i.test(l));
    const block = ls.slice(tStart + 1, tEnd < 0 ? ls.length : tEnd);
    let year = null;
    for (let i = 0; i < block.length; i++) {
      const y = yearHeading(block[i]);
      if (y) { year = y; continue; }
      if (!year) continue;
      // a title opens with a quotation mark at the start of a line or after "Authors. "; it closes with one, maybe lines later
      const open = new RegExp(`^(.*?)(?:^|\\s)${Q}(\\S.*)$`).exec(block[i]);
      if (!open) continue;
      let rest = open[2], j = i;
      while (!new RegExp(Q).test(rest) && j + 1 < block.length && j - i < 3) rest += " " + block[++j];
      const close = new RegExp(`^(.*?)${Q}`).exec(rest);
      if (!close) continue;
      const after = rest.slice(close[0].length) + " " + (block[j + 1] || "");
      if (!/^\s*[.,]?\s*(?:In|ACM|Proceedings|SIGMETRICS|Performance)\b/.test(after)) continue;   // a quotation in the paragraph about the paper, not a title
      const before = open[1].trim();
      const authorText = before || (block[i - 1] || "");
      const who = names(authorText), title = cleanTitle(close[1]);
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry(year, "tot", "Test of Time Award", title, who, source, `SIGMETRICS ${year} Test of Time Award: ${authorText.replace(/[.,\s]+$/, "")} “${title}”`));
      else skipped.push(`${year}: test of time not read: ${authorText.slice(0, 50)} / ${title.slice(0, 40)}`);
      i = j;
    }
  }

  // ---- Paper awards: from "Paper awards" to the end of the list
  const pStart = ls.findIndex((l) => /^Paper awards$/i.test(l));
  if (pStart >= 0) {
    const pEnd = ls.findIndex((l, i) => i > pStart && /^Follow @/i.test(l));
    const block = ls.slice(pStart + 1, pEnd < 0 ? ls.length : pEnd);
    let year = null, kinds = [], open = null;
    const flush = () => {
      if (!open) return;
      const who = names(open.authors);
      if (who.length && who.every(isPerson) && open.title.length >= 8) {
        for (const k of open.kinds) entries.push(entry(open.year, k.award, k.label, open.title, who, source, `SIGMETRICS ${open.year} ${k.label}: “${open.title}” by ${open.authors.replace(/[.\s]+$/, "")}`));
      } else skipped.push(`${open.year}: paper award not read: ${open.title.slice(0, 40)} / ${open.authors.slice(0, 50)}`);
      open = null;
    };
    for (const l of block) {
      const y = yearHeading(l);
      if (y) { flush(); year = y; kinds = []; continue; }
      if (!year) continue;
      if (/:\s*$/.test(l) && !new RegExp(`^${Q}`).test(l)) { flush(); kinds = kindsOf(l); continue; }
      const m = new RegExp(`^${Q}(.+?)${Q}\\s*by\\s+(.+)$`).exec(l);
      if (m) {
        flush();
        if (!kinds.length) { skipped.push(`${year}: no category for “${m[1].slice(0, 50)}”`); continue; }
        open = { year, kinds, title: cleanTitle(m[1]), authors: m[2] };
      } else if (open) open.authors += " " + l;                              // the authors run on
    }
    flush();
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const html = file ? readFileSync(file, "utf8") : await (await fetch(URL_, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, URL_);
  const by = {};
  for (const e of entries) by[e.award] = (by[e.award] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
