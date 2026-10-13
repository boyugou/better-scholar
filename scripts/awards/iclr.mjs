#!/usr/bin/env node
// ICLR's own announcements of its paper awards, for the years whose awards page on the virtual site is empty
// (https://iclr.cc/virtual/<year>/awards_detail lists nothing for 2020, 2021, 2025 and 2026):
//
//   * the Outstanding Paper / Honorable Mention post and the Test of Time post on the ICLR blog (2025, 2026), and
//   * the 2021 Fact Sheet PDF on iclr.cc ("Paper Award Winners" — the 8 Outstanding Papers; give it the PDF's text).
//
//   node scripts/awards/iclr.mjs blog <year> <post-url-or-saved.html> > iclr.json     (kind from the post's headings)
//   node scripts/awards/iclr.mjs factsheet <fact-sheet.txt> [--verify] > iclr-2021.json   (text of the PDF, any extractor)
//   node scripts/awards/merge-raw.mjs iclr.json [--write]
//
// The posts are WordPress pages whose award lists come in four shapes, all handled here and covered by the tests:
//   a list item   <li><a>Title.</a><br>Authors.</li>                      (2025 Outstanding Papers)
//   a sentence    <p><a>Title</a>, by <a>Author</a>, <a>Author</a></p>     (2026 Outstanding Papers)
//   one paragraph <p>Title<br>Authors<br><a>arXiv url</a></p>             (2025 Test of Time)
//   two           <p><a><em>Title</em></a></p><p>Authors</p>              (2026 Test of Time)
// A paragraph that reads like prose (the committee's comment on the paper) is never taken for an author list.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

// what a heading means; the first rule that matches wins. A "Runner Up" heading in a Test of Time post is the test-of-time runner-up.
const SECTIONS = [
  [/test of time/i, { award: "tot", label: "Test of Time Award" }],
  [/runner[- ]?up/i, { award: "runner-up", label: "Runner Up" }],
  [/honou?rable mention/i, { award: "runner-up", label: "Honorable Mention" }],
  [/outstanding paper/i, { award: "outstanding", label: "Outstanding Paper" }]
];
const classify = (heading, inTestOfTime) => {
  for (const [re, spec] of SECTIONS) if (re.test(heading)) return spec.label === "Runner Up" && inTestOfTime ? { ...spec, label: "Test of Time Runner Up" } : spec;
  return null;
};

const PARTICLES = new Set(["van", "von", "de", "der", "den", "del", "della", "di", "da", "dos", "du", "la", "le", "bin", "al", "el", "ten", "ter", "zu", "af"]);
// "Xiangyu Qi, Ashwinee Panda, …, Peter Henderson." — a list of names: no sentence in it, every word capitalised (or a particle / initial)
function authorsOf(line) {
  const s = line.replace(/\.\s*$/, "").trim();
  if (!s || s.length > 900) return null;
  const parts = s.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length || parts.length > 40) return null;
  for (const p of parts) {
    const words = p.split(/\s+/);
    if (words.length < 2 || words.length > 5) return null;
    if (!words.every((w) => /^[\p{Lu}][\p{L}'’.-]*$/u.test(w) || PARTICLES.has(w))) return null;
  }
  return parts;
}

// "Title." / "Title" — a trailing full stop is list punctuation, not part of the title
const cleanTitle = (t) => t.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();

function blocks(html) {
  const body = (/<div class="entry-content[^"]*">([\s\S]*?)<!-- \/?\.entry-content -->/i.exec(html) || [null, html])[1];
  const out = [];
  for (const [, tag, inner] of body.matchAll(/<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const lines = inner.split(/<br\s*\/?>/i).map(text).filter(Boolean);
    if (lines.length) out.push({ tag: tag.toLowerCase(), text: text(inner), lines, inner });
  }
  return out;
}

export function parseBlog(html, { year, source }) {
  const entries = [];
  const skipped = [];
  const list = blocks(html);
  // the Test of Time post of 2026 has no headings: the post's own title says what its paragraphs are
  const pageTitle = text((/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || /<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || "");
  let inTestOfTime = /test of time/i.test(pageTitle);
  let section = inTestOfTime ? classify(pageTitle) : null, heading = inTestOfTime ? pageTitle : "";
  const add = (title, authors) => {
    const spec = section;
    entries.push({
      venue: "ICLR", year, award: spec.award, awardLabel: spec.label, title, authors, track: "main", source,
      evidence: `${heading}: ${title} — ${authors.join(", ")}`
    });
  };
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (/^h[1-6]$/.test(b.tag)) { heading = b.text; section = classify(heading, inTestOfTime); if (section && section.award === "tot") inTestOfTime = true; continue; }
    if (!section) continue;
    // a sentence: "<a>Title</a>, by A, B, C" — the title is the paragraph's first link (a prose comment may also say "…, by X, Y")
    const by = /^(.+),\s+by\s+(.+)$/.exec(b.text);
    const link = /^<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(b.inner.trim());
    if (by && link && b.lines.length === 1 && text(link[1]) === by[1] && authorsOf(by[2])) { add(cleanTitle(by[1]), authorsOf(by[2])); continue; }
    // one block: Title <br> Authors [<br> link]
    if (b.lines.length >= 2 && authorsOf(b.lines[1]) && b.lines[0].length < 200) { add(cleanTitle(b.lines[0]), authorsOf(b.lines[1])); continue; }
    // two blocks: a title (the whole paragraph is one link) and then its authors
    const next = list[i + 1];
    if (b.lines.length === 1 && /^<a\b/i.test(b.inner.trim()) && next && next.lines.length === 1 && authorsOf(next.text)) {
      add(cleanTitle(b.text), authorsOf(next.text)); i++; continue;
    }
    if (b.text.length < 160 && !/[.!?]$/.test(b.text.replace(/\.$/, "")) && !/^(?:Congratulations|If you|We |The |This )/.test(b.text)) skipped.push(`${heading}: not read: ${b.text.slice(0, 80)}`);
  }
  return { entries, skipped };
}

// The 2021 Fact Sheet prints one title without its first word. The conference's own poster page for the paper prints it in
// full, so the entry carries that title, quotes both pages in its evidence and lists the poster page as a second source;
// `factsheet … --verify` fetches each such page and fails unless it prints the title.
export const TITLE_FIXES = [{
  printed: "Fully-Connected Layers with Quaternions: Parameterization of Hypercomplex Multiplications with 1/n Parameters",
  title: "Beyond Fully-Connected Layers with Quaternions: Parameterization of Hypercomplex Multiplications with $1/n$ Parameters",
  page: "https://iclr.cc/virtual/2021/poster/3068"
}];

// The 2021 Fact Sheet's text: a bullet per winner, "● Title by A, B, and C" (a bullet can wrap over several lines).
export function parseFactSheet(txt, { year = 2021, source } = {}) {
  const entries = [];
  const skipped = [];
  const at = txt.search(/Paper Award Winners:/i);
  if (at < 0) return { entries, skipped };
  const body = txt.slice(at).replace(/^Paper Award Winners:\s*/i, "");
  const end = body.search(/\n\s*(?:Four of the Outstanding|Learn more|# # #)/);
  for (const chunk of (end < 0 ? body : body.slice(0, end)).split(/[●•]/).map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean)) {
    const m = /^(.+)\s+by\s+(.+)$/.exec(chunk);          // greedy: the authors follow the last "by"
    const authors = m && authorsOf(m[2].replace(/,\s*and\s+/g, ", ").replace(/\s+and\s+/g, ", "));
    if (!m || !authors) { skipped.push("not read: " + chunk.slice(0, 80)); continue; }
    const printed = cleanTitle(m[1]);
    const fix = TITLE_FIXES.find((f) => f.printed === printed);
    entries.push({
      venue: "ICLR", year, award: "outstanding", awardLabel: "Outstanding Paper", title: fix ? fix.title : printed, authors, track: "main", source,
      evidence: `Paper Award Winners: ${printed} by ${m[2]}` + (fix ? `. The conference's poster page (${fix.page}) prints the title in full: “${fix.title}”` : ""),
      ...(fix ? { alsoAt: [fix.page] } : {})
    });
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode, a, b] = process.argv.slice(2);
  const UA = { headers: { "user-agent": "scholar-roles-and-ranks award reader (reads one public page)" } };
  let result;
  if (mode === "blog" && /^(?:19|20)\d{2}$/.test(a || "") && b) {
    const isUrl = /^https:\/\//.test(b);
    result = parseBlog(isUrl ? await (await fetch(b, UA)).text() : readFileSync(b, "utf8"), { year: parseInt(a, 10), source: isUrl ? b : process.env.ICLR_SOURCE });
  } else if (mode === "factsheet" && a) {
    result = parseFactSheet(readFileSync(a, "utf8"), { source: "https://iclr.cc/media/Press/ICLR_2021_Fact_Sheet.pdf" });
    if (process.argv.includes("--verify")) {
      for (const fix of TITLE_FIXES) {
        const page = text(await (await fetch(fix.page, UA)).text());
        if (!page.includes(fix.title)) { console.error(`${fix.page} does not print “${fix.title}”`); process.exit(1); }
        console.error(`verified: ${fix.page} prints the title`);
      }
    }
  } else { console.error("usage: iclr.mjs blog <year> <url-or-saved.html> | iclr.mjs factsheet <fact-sheet.txt>   (a saved blog page needs ICLR_SOURCE=<its url>)"); process.exit(2); }
  const by = {};
  for (const e of result.entries) by[`${e.year} ${e.awardLabel}`] = (by[`${e.year} ${e.awardLabel}`] || 0) + 1;
  console.error(result.entries.length + " entries:", JSON.stringify(by));
  for (const s of result.skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries: result.entries }, null, 1) + "\n");
}
