#!/usr/bin/env node
// Read AAAI's own paper-awards page (https://aaai.org/about-aaai/aaai-awards/aaai-conference-paper-awards-and-recognition/)
// into raw award entries for scripts/awards/merge-raw.mjs: the AAAI Conference's Outstanding Paper, Best Paper (the
// special tracks), Distinguished Paper and Outstanding / Best Student Paper awards, with their honorable mentions.
//
//   node scripts/awards/aaai.mjs [saved-page.html] > aaai.json      (fetches the page when no file is given)
//   node scripts/awards/aaai.mjs [saved-page.html] --classic > aaai-classic.json
//   node scripts/awards/merge-raw.mjs aaai.json aaai-classic.json [--write]
//
// --classic reads the Classic Paper Award page instead (https://aaai.org/about-aaai/aaai-awards/aaai-classic-paper-award/),
// AAAI's test-of-time award: a list item per award — <li><em>Classic Paper Recipients:</em> <strong>Authors</strong><br>Title
// presented at …<br>citation</li> — under a year heading.
//
// The page is WordPress blocks: a year (an <h3>, or a bold <p>), an <h4> per award, then one <p> per paper —
//   <p>[<em>Honorable Mention:</em><br>]<strong>Title</strong><br>Author; Author; …[<br>a note]</p>
// (a few have the authors in the next <p>). Demonstration, poster and student-abstract awards are not paper awards
// and are skipped; so is anything that is not under a recognised award heading. Years before 2010 are left out: those
// lists print affiliations after the authors, and the papers are rarely on a profile today.
import { readFileSync } from "node:fs";

const URL_PAGE = "https://aaai.org/about-aaai/aaai-awards/aaai-conference-paper-awards-and-recognition/";
const URL_CLASSIC = "https://aaai.org/about-aaai/aaai-awards/aaai-classic-paper-award/";

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s) => s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (m, hex, dec, name) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(parseInt(dec, 10)) : NAMED[name.toLowerCase()] || m);
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const isYear = (s) => /^(?:19|20)\d{2}$/.test(s);

// What a heading means. The first rule that matches wins; `null` = not a paper award.
const SECTIONS = [
  [/demonstration|poster|student abstract|video/i, null],
  [/best student paper/i, { award: "student", label: "Best Student Paper" }],
  [/outstanding student paper/i, { award: "student", label: "Outstanding Student Paper" }],
  [/distinguished paper/i, { award: "distinguished", label: "Distinguished Paper" }],
  [/best paper/i, { award: "best", label: "Best Paper" }],
  [/outstanding paper/i, { award: "outstanding", label: "Outstanding Paper" }]
];
const classify = (heading) => { for (const [re, spec] of SECTIONS) if (re.test(heading)) return spec; return null; };

// "… Award – AI for Social Alignment Track", "… Outstanding Paper Award: Special Track on AI for Social Impact",
// "Best Paper for the AI for Social Impact track at AAAI-2024"  →  " (AI for Social Alignment track)"
function trackOf(heading) {
  const m = /\s[–—-]\s+(.+?)\s+track\s*$/i.exec(heading) || /:\s*special track on\s+(.+?)\s*$/i.exec(heading) || /\bfor the\s+(.+?)\s+track\b/i.exec(heading);
  return m ? ` (${m[1].trim()} track)` : "";
}

const splitAuthors = (s) => s.replace(/\s*\([^)]*\)/g, "").replace(/\s+et\s+al\.?\s*$/i, "").split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((a) => a.trim().replace(/\.$/, "")).filter(Boolean);

export function parse(html, { since = 2010 } = {}) {
  const entries = [];
  const skipped = [];
  let year = null, section = null, heading = "", marker = null, pending = null;
  const flush = () => {
    if (pending && year >= since) {
      if (pending.authors.length) {
        const base = section.label + trackOf(heading);
        entries.push({
          venue: "AAAI", year, award: pending.honorable ? "runner-up" : section.award, awardLabel: pending.honorable ? `${base} Honorable Mention` : base,
          title: pending.title, authors: pending.authors, track: "main", source: URL_PAGE,
          evidence: `${year} ${heading}: ${pending.honorable ? "Honorable Mention: " : ""}${pending.title} — ${pending.authorsText}`
        });
      } else skipped.push(`${year} ${heading}: no authors for “${pending.title}”`);
    }
    pending = null;
  };
  const tokens = [...html.matchAll(/<(h[3-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  for (const [, tag, inner] of tokens) {
    const plain = text(inner);
    // a year: an <h3>, or a bold <p> ("Past Recipients" is followed by <p><strong>2025</strong></p>)
    if ((tag === "h3" || tag === "p") && isYear(plain)) { flush(); year = parseInt(plain, 10); section = null; marker = null; continue; }
    if (tag === "h3") continue;
    if (year == null) continue;
    // any deeper heading starts a new section ("Student Abstract Program Awards" sits under an <h5> in 2025)
    if (/^h[4-6]$/.test(tag)) { flush(); heading = plain; section = classify(heading); marker = null; continue; }
    if (!section) continue;
    const strong = /<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(inner);
    const em = [...inner.matchAll(/<em[^>]*>([\s\S]*?)<\/em>/gi)].map((m) => text(m[1]));
    const marked = em.some((e) => /honou?rable mention/i.test(e));
    const title = strong ? text(strong[1].replace(/<em[^>]*>[\s\S]*?<\/em>/gi, "")) : "";
    if (!title) {
      // a bare marker ("Honorable Mention:") applies to the next paper; plain text under a title without authors is its authors
      if (marked) { flush(); marker = "honorable"; }
      else if (pending && !pending.authors.length && !em.length) { pending.authorsText = plain; pending.authors = splitAuthors(plain); flush(); }
      continue;
    }
    flush();
    // the first line after the title is the author list; later lines ("For Outstanding Formal Analysis") are notes
    const after = inner.slice(strong.index + strong[0].length).split(/<br\s*\/?>/i).map(text).find(Boolean) || "";
    // a bold line with no authors that reads like a label, not a paper
    if (!after && /^(?:for |best |outstanding |honou?rable |distinguished |aaai)/i.test(title)) { skipped.push(`${year} ${heading}: label “${title}”`); marker = null; continue; }
    pending = { title, authorsText: after, authors: splitAuthors(after), honorable: marker === "honorable" || marked };
    marker = null;
    if (pending.authors.length) flush();
  }
  flush();
  return { entries, skipped };
}

export function parseClassic(html, { since = 2012 } = {}) {
  const entries = [];
  const skipped = [];
  let year = null;
  for (const [, tag, inner] of html.matchAll(/<(h3|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (tag === "h3") { year = isYear(text(inner)) ? parseInt(text(inner), 10) : year; continue; }
    const label = text((/<em[^>]*>([\s\S]*?)<\/em>/i.exec(inner) || [])[1] || "");
    if (!year || year < since || !/recipients?:?$/i.test(label)) continue;   // (the lists before 2012 are irregular)
    const authors = splitAuthors([...inner.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)].map((m) => text(m[1])).join(", "));
    const lines = inner.split(/<br\s*\/?>/i).map(text).filter(Boolean);
    const title = (lines[1] || "").replace(/\s+p?resented at\b.*$/i, "").replace(/[.\s]+$/, "");
    if (!authors.length || !title) { skipped.push(`${year}: ${text(inner).slice(0, 80)}`); continue; }
    const honorable = /honou?rable/i.test(label);
    entries.push({
      venue: "AAAI", year, award: honorable ? "runner-up" : "tot", awardLabel: honorable ? "Classic Paper Honorable Mention" : "Classic Paper Award",
      title, authors, track: "main", source: URL_CLASSIC, evidence: `${year} ${text(inner)}`.slice(0, 400)
    });
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const classic = process.argv.includes("--classic");
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const url = classic ? URL_CLASSIC : URL_PAGE;
  const html = file ? readFileSync(file, "utf8") : await (await fetch(url, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = classic ? parseClassic(html) : parse(html);
  const by = {};
  for (const e of entries) by[e.awardLabel] = (by[e.awardLabel] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
