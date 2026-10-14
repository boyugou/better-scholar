#!/usr/bin/env node
// The USENIX Test of Time Awards page (https://www.usenix.org/conferences/test-of-time-awards), read into raw award entries for
// scripts/awards/merge-raw.mjs: a block per year, each entry
//
//   USENIX Security '25                         the conference and the award year
//   Comprehensive Experimental Analyses of …    the title
//   Stephen Checkoway, Damon McCoy, … and …     the authors (they may wrap onto a second line)
//   [For the invention of …]                    sometimes a citation, not read
//   Published in the Proceedings of the 20th USENIX Security Symposium, August 2011     → the paper's year
//
//   node scripts/awards/usenix-tot.mjs [saved-page.html] > usenix-tot.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs usenix-tot.json [--write]
//
// An entry whose authors do not read as a list of names is reported and skipped, never guessed.
import { readFileSync } from "node:fs";
import { lines } from "./html.mjs";

const URL_ = "https://www.usenix.org/conferences/test-of-time-awards";
const VENUES = { "USENIX Security": "USENIX Security", NSDI: "NSDI", FAST: "FAST", OSDI: "OSDI", "USENIX ATC": "USENIX ATC", ATC: "USENIX ATC", LISA: "LISA", SOUPS: "SOUPS", WOOT: "WOOT" };

// "A, B, C and D" — the names, in order
function names(s) {
  return s.replace(/\s+/g, " ").split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/^[\s,]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}
const isName = (n) => { const t = n.split(" "); return t.length >= 2 && t.length <= 5 && !/[:?!0-9]/.test(n) && t.every((w) => /^[\p{Lu}][\p{L}'’.-]*\.?$/u.test(w) || /^(?:van|von|der|den|de|del|di|da|la|le|bin|al|el|ter)$/.test(w)); };

export function parse(html, source = URL_) {
  const entries = [], skipped = [];
  const ls = lines(html).map((l) => l.normalize("NFC"));
  let year = null;
  for (let i = 0; i < ls.length; i++) {
    const y = /^((?:19|20)\d{2})$/.exec(ls[i]);
    if (y) { year = parseInt(y[1], 10); continue; }
    const m = /^(USENIX Security|USENIX ATC|NSDI|FAST|OSDI|ATC|LISA|SOUPS|WOOT) ?['’](\d{2})$/.exec(ls[i]);
    if (!m || !year) continue;
    let j = i + 1;
    while (j < ls.length && !/^Published in\b/i.test(ls[j]) && !/^(?:19|20)\d{2}$/.test(ls[j]) && j - i < 12) j++;
    if (!/^Published in\b/i.test(ls[j] || "")) { skipped.push(`${year} ${m[0]}: no "Published in" line`); continue; }
    const body = ls.slice(i + 1, j).filter((l) => !/^For the /i.test(l));
    const title = (body[0] || "").trim(), authorText = body.slice(1).join(" ").trim();
    const authors = names(authorText);
    const paper = /\b((?:19|20)\d{2})\s*$/.exec(ls[j]);
    if (title.length >= 8 && authors.length && authors.every(isName)) {
      entries.push({ venue: VENUES[m[1]], year, award: "tot", awardLabel: "Test of Time Award", title, authors, track: "main", source,
        evidence: `${m[0]} Test of Time Award: ${title} — ${authorText} (${ls[j]})`, ...(paper ? { paperYear: parseInt(paper[1], 10) } : {}) });
    } else skipped.push(`${year} ${m[0]}: not read: ${title.slice(0, 50)} / ${authorText.slice(0, 40)}`);
    i = j;
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const html = file ? readFileSync(file, "utf8") : await (await fetch(URL_, { headers: { "user-agent": "better-scholar award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, URL_);
  const by = {};
  for (const e of entries) by[e.venue] = (by[e.venue] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
