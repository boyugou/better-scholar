#!/usr/bin/env node
// Read ACM SIGKDD's own best-paper pages (https://kdd.org/awards/view/<year>-sigkdd-best-paper-award-winners) into raw award
// entries for scripts/awards/merge-raw.mjs: KDD's best papers, runners-up, honorable mentions and best student papers of the
// Research, Applied Data Science and Dataset & Benchmark tracks.
//
//   node scripts/awards/kdd.mjs 2014-2026 [dir-with-saved-pages] > kdd.json     (fetches one page a second when no directory is given)
//
// A page is: <h2>Research Track</h2>, then for each award <p><strong>BEST PAPER AWARD</strong></p> and
// <p><strong>Title</strong><br />Author (Affiliation); Author …</p> — or, in 2018 and 2020, the title as a link. A year whose
// page is not in that form yields nothing (2014 and 2015 are laid out differently; 2021 and 2026 have no such page) — nothing is
// guessed. The audience award is not a paper award and is skipped.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";
import { join } from "node:path";


const TRACK = { "research track": "", "applied data science track": " (Applied Data Science)", "dataset and benchmark track": " (Dataset and Benchmark)" };

// "BEST STUDENT PAPER AWARD RUNNER-UP" → { award: "runner-up", label: "Best Student Paper Runner-up" }
export function awardOf(label) {
  const l = label.trim().toUpperCase();
  if (!/^BEST (?:STUDENT )?PAPER AWARD\b/.test(l)) return null;
  const student = /STUDENT/.test(l);
  const base = student ? "Best Student Paper" : "Best Paper";
  if (/HONORABLE MENTION/.test(l)) return { award: "runner-up", label: `${base} Honorable Mention` };
  if (/RUNNER-?UP/.test(l)) return { award: "runner-up", label: `${base} Runner-up` };
  return { award: student ? "student" : "best", label: base };
}

// "Name (Affiliation); Name (Affiliation)" and "Name, Name, and Name" — affiliations are dropped, then names split on ; , and
const splitAuthors = (s) => s.replace(/\s*\([^()]*\)?/g, "").replace(/\s+et\s+al\.?\s*$/i, "").split(/\s*[;,]\s*(?:and\s+)?|\s+and\s*(?=[A-Z])/).map((a) => a.trim()).filter(Boolean);

export function parse(html, year) {
  const source = `https://kdd.org/awards/view/${year}-sigkdd-best-paper-award-winners`;
  const entries = [];
  const start = html.indexOf('class="entry-content');
  const body = html.slice(start >= 0 ? start : 0);
  const end = body.search(/<h[1-4][^>]*>\s*Tags\s*</i);
  let track = null, kind = null;
  for (const [, tag, inner] of (end > 0 ? body.slice(0, end) : body).matchAll(/<(h2|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = text(inner);
    if (tag === "h2") { track = TRACK[t.toLowerCase()] ?? null; kind = null; continue; }
    if (track === null) continue;
    // the title is bold, or a link (2018, 2020); whatever follows it is the author list
    const head = /<(strong|a)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(inner);
    if (!head) continue;
    const bold = text(head[2]);
    // (in 2016 a "Runner Up" label can end the winner's own paragraph: it is not an author, and it changes the kind for what follows)
    let afterHtml = inner.slice(head.index + head[0].length);
    const runnerUpNext = /(?:<br\s*\/?>\s*)*<strong>\s*Runner[- ]?Up\s*<\/strong>\s*$/i.test(afterHtml);
    if (runnerUpNext) afterHtml = afterHtml.replace(/(?:<br\s*\/?>\s*)*<strong>\s*Runner[- ]?Up\s*<\/strong>\s*$/i, "");
    const rest = text(afterHtml);
    // a label paragraph is the bold text alone ("BEST PAPER AWARD", "Audience Appreciation Award"); one that is no paper award ends the previous kind
    // (2016–2019 add "Winner" / "Runner Up" under the award: the winner keeps the kind, a runner-up is one step down)
    if (!rest && head[1] === "strong") {
      if (/^winners?$/i.test(bold)) { /* same award */ }
      else if (/^runners?[- ]?up$/i.test(bold) && kind) kind = { award: "runner-up", label: kind.label.replace(/\s*(?:Runner-up|Honorable Mention)$/, "") + " Runner-up" };
      else kind = awardOf(bold);
      continue;
    }
    if (!kind || !rest) continue;
    const authors = splitAuthors(rest);
    if (!bold || !authors.length) continue;
    entries.push({
      venue: "KDD", year, award: kind.award, awardLabel: kind.label + track, title: bold.replace(/\s+$/, ""), authors, track: "main", source,
      evidence: `${year} ${kind.label}${track}: ${bold} — ${rest}`.slice(0, 400)
    });
    if (runnerUpNext) kind = { award: "runner-up", label: kind.label.replace(/\s*(?:Runner-up|Honorable Mention)$/, "") + " Runner-up" };
  }
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [range, dir] = process.argv.slice(2);
  const m = /^(\d{4})-(\d{4})$/.exec(range || "");
  if (!m) { console.error("usage: kdd.mjs <from>-<to> [dir-with-saved-pages]"); process.exit(2); }
  const entries = [];
  for (let year = parseInt(m[1], 10); year <= parseInt(m[2], 10); year++) {
    const url = `https://kdd.org/awards/view/${year}-sigkdd-best-paper-award-winners`;
    let html;
    try {
      html = dir ? readFileSync(join(dir, `rr-kdd-${year}.html`), "utf8")
        : await (await fetch(url, { headers: { "user-agent": "scholar-roles-and-ranks award reader (reads one public page)" } })).text();
    } catch (e) { console.error(year, "unreadable"); continue; }
    const got = parse(html, year);
    console.error(year, got.length, "entries");
    entries.push(...got);
    if (!dir) await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
