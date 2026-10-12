#!/usr/bin/env node
// Test-of-time and influential-paper awards that one official page lists in full, read into raw award entries for
// scripts/awards/merge-raw.mjs:
//
//   www    https://www.iw3c2.org/ToT/                                    the Web Conference's Seoul Test of Time Award, 2015–2026 (IW3C2): a block
//                                                                       per year, "Winners: …" and  for their paper "Title".
//   isca   https://www.sigarch.org/awards/acm-sigarchieee-cs-tcca-influential-isca-paper-award/
//                                                                       the Influential ISCA Paper Award, 2003–2025: "2024 (For ISCA 2003): Authors"
//                                                                       and the title on the next line
//   micro  https://www.sigmicro.org/awards/tot/                         the MICRO Test of Time Award, 2014–2025: a table per year, rows
//                                                                       "MICRO 2006 | Title | Authors"
//   dijkstra  https://www.podc.org/dijkstra/                            the Edsger W. Dijkstra Prize in Distributed Computing (PODC and DISC), 2000–2026:
//                                                                       under "2023 citation" a line per paper, "Authors for “Title” in …"
//   popl|pldi|icfp|oopsla  https://www.sigplan.org/Awards/<POPL|PLDI|ICFP|OOPSLA>/
//                                                                       SIGPLAN's Most Influential Paper Awards (for the paper of ten years before): per year the
//                                                                       authors, then "(for 2016) Title." and a "Citation:" paragraph
//
//   focs   https://tc.computer.org/tcmf/focs-test-time-award/            the FOCS Test of Time Award, 2019–: "At FOCS 2025:", "1995 award (citations):", then per paper
//                                                                       a line "Authors:" and a line with the title
//
//   sigops https://www.sigops.org/awards/hof/                            the SIGOPS Hall of Fame Award, 2005–: a heading per year, then per paper a list item
//                                                                       "Authors. For their paper, <a>Title</a>. In …" (the title is the first link)
//
//   node scripts/awards/tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops [saved-page.html] > tot.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs tot.json [--write]
import { readFileSync } from "node:fs";
import { text, lines } from "./html.mjs";
import { isPerson } from "./people.mjs";

const PAGES = {
  www: "https://www.iw3c2.org/ToT/",
  isca: "https://www.sigarch.org/awards/acm-sigarchieee-cs-tcca-influential-isca-paper-award/",
  micro: "https://www.sigmicro.org/awards/tot/",
  dijkstra: "https://www.podc.org/dijkstra/",
  popl: "https://www.sigplan.org/Awards/POPL/",
  pldi: "https://www.sigplan.org/Awards/PLDI/",
  icfp: "https://www.sigplan.org/Awards/ICFP/",
  oopsla: "https://www.sigplan.org/Awards/OOPSLA/",
  focs: "https://tc.computer.org/tcmf/focs-test-time-award/",
  sigops: "https://www.sigops.org/awards/hof/"
};

// "Dr Badrul Sarwar, Professors George Karypis, Joseph Konstan, and John Riedl" — the names, in order
function names(s) {
  let r = s.replace(/\.\s*$/, ""), prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^(?:Drs?\.?|Professors?|Prof\.?)\s+/i, "").replace(/^[\s,]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

const entry = (venue, year, label, title, authors, source, evidence, paperYear) =>
  ({ venue, year, award: "tot", awardLabel: label, title, authors, track: "main", source, evidence, ...(paperYear ? { paperYear } : {}) });
const cleanTitle = (t) => t.replace(/^[“"]\s*|\s*[”"]$/g, "").replace(/\.$/, "").replace(/\s+/g, " ").trim();

export function parseWww(html, source = PAGES.www) {
  const entries = [], skipped = [];
  let year = null, winners = null;
  for (const l of lines(html)) {
    const y = /^The Web Conference (\d{4}) - (?:First )?Seoul Test of Time Award/i.exec(l);
    if (y) { year = parseInt(y[1], 10); winners = null; continue; }
    if (!year) continue;
    const w = /^Winners?:\s*(.+)$/i.exec(l);
    if (w) { winners = w[1]; continue; }
    // the winners may run over two lines
    if (winners && !/^for (?:their|his|her) paper/i.test(l) && !/^\(presented/i.test(l)) { winners += " " + l; continue; }
    const t = /^for (?:their|his|her) paper\s+[“"](.+?)[”"]\.?$/i.exec(l);
    if (t && winners) {
      const authors = names(winners), title = cleanTitle(t[1]);
      if (authors.length && title.length >= 8) entries.push(entry("WWW", year, "Seoul Test of Time Award", title, authors, source, `The Web Conference ${year} Seoul Test of Time Award: ${winners} for their paper “${title}”`));
      else skipped.push(`${year}: not read: ${title.slice(0, 60)}`);
      winners = null;
    }
  }
  return { entries, skipped };
}

export function parseIsca(html, source = PAGES.isca) {
  const entries = [], skipped = [];
  const ls = lines(html);
  for (let i = 0; i < ls.length - 1; i++) {
    const m = /^((?:19|20)\d{2})\s*\(\s*for ISCA\s+((?:19|20)\d{2})\s*\):\s*(.+)$/i.exec(ls[i]);
    if (!m) continue;
    const year = parseInt(m[1], 10), paperYear = parseInt(m[2], 10), title = cleanTitle(ls[i + 1]);
    const authors = names(m[3]);
    if (authors.length && title.length >= 8) entries.push(entry("ISCA", year, "Influential ISCA Paper Award", title, authors, source, `${year} (For ISCA ${paperYear}): ${m[3].replace(/\.$/, "")} — ${title}`, paperYear));
    else skipped.push(`${year}: not read: ${ls[i].slice(0, 60)}`);
  }
  return { entries, skipped };
}

export function parseMicro(html, source = PAGES.micro) {
  const entries = [], skipped = [];
  let year = null;
  // <h3 id="winners2025">2025</h3> … <table> … <tr><td>MICRO 2006</td><td><a>Title</a></td><td>Authors</td></tr>
  for (const m of html.matchAll(/<h3\b[^>]*>\s*((?:19|20)\d{2})\s*<\/h3>|<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    if (m[1]) { year = parseInt(m[1], 10); continue; }
    const cells = [...m[2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => text(c[1]));
    const conf = cells.length >= 3 && /^MICRO\s+((?:19|20)\d{2})$/.exec(cells[0]);
    if (!year || !conf) continue;
    const authors = names(cells[2]), title = cleanTitle(cells[1]);
    if (authors.length && title.length >= 8) entries.push(entry("MICRO", year, "Test of Time Award", title, authors, source, `MICRO ${year} Test of Time Award: ${cells[0]}: ${title} — ${cells[2]}`, parseInt(conf[1], 10)));
    else skipped.push(`${year}: not read: ${cells[1].slice(0, 60)}`);
  }
  return { entries, skipped };
}

// "Maurice Herlihy, Victor Luchangco, and Mark Moir for “Title” in Proceedings of …" — one line per paper under its year's heading ("2022 citation").
// A heading with an asterisk (2000–2002) is for the years the prize was named otherwise, as the page's footnote says (“PODC Influential-Paper Award”):
// those entries carry that name, and PODC alone. The page gives each paper's citation in a free form, so no paper year is read.
export function parseDijkstra(html, source = PAGES.dijkstra) {
  const entries = [], skipped = [];
  const ls = lines(html).map((l) => l.normalize("NFC"));
  const former = (/awarded under the name [“"]([^”"]+)[”"]/i.exec(ls.join("\n")) || [])[1];
  let year = null, starred = false;
  for (const l of ls) {
    const h = /^((?:19|20)\d{2}) citation(\*)?$/i.exec(l);
    if (h) { year = parseInt(h[1], 10); starred = Boolean(h[2]); continue; }
    if (/^Award committee$/i.test(l)) break;
    const m = year && /^(.+?) for [“"](.+?)[”"“]/.exec(l);
    if (!m) continue;
    const authors = names(m[1]), title = cleanTitle(m[2]);
    if (!authors.length || !authors.every(isPerson) || title.length < 8) { skipped.push(`${year}: not read: ${l.slice(0, 80)}`); continue; }
    if (starred && !former) { skipped.push(`${year}: starred, but the page names no former name: ${title.slice(0, 60)}`); continue; }
    const label = starred ? former : "Dijkstra Prize in Distributed Computing";
    entries.push(entry(starred ? "PODC" : "PODC/DISC", year, label, title, authors, source, `${year} ${label}: ${m[1]} for “${title}”`));
  }
  return { entries, skipped };
}

// A heading per year ("2025"), then a list item per paper: the authors, "For their paper," in the newest rows, the title as the first link, the venue.
// The paper may be of any venue (SOSP, OSDI, CACM, TOCS), so the award is SIGOPS's own.
export function parseSigopsHof(html, source = PAGES.sigops) {
  const entries = [], skipped = [];
  const start = html.search(/>\s*Winners\s*</);
  const body = start < 0 ? html : html.slice(start);
  const marks = [];
  for (const m of body.matchAll(/<h[1-4][^>]*>\s*((?:19|20)\d{2})\s*<\/h[1-4]>/g)) marks.push({ at: m.index, year: parseInt(m[1], 10) });
  for (const m of body.matchAll(/<li>((?:(?!<li)[\s\S])*?)<\/li>/g)) {
    const link = /<a\s[^>]*>([\s\S]*?)<\/a>/.exec(m[1]);
    if (!link) continue;
    const head = marks.filter((h) => h.at < m.index).pop();
    if (!head) continue;
    const authorText = text(m[1].slice(0, link.index)).replace(/\s*For (?:their|his|her) paper[,:]?\s*$/i, "").replace(/[\s,.;:]+$/, "")
      .replace(/,?\s*Google,?\s+Inc$/i, "").replace(/\b([A-Z][a-z]+)\.(?=\s+[A-Z]\.)/g, "$1");   // ("David. L. Parnas"; the 2022 row ends with the company)
    if (!authorText) continue;                                                                      // (the page's blog list after the winners)
    const who = names(authorText), title = cleanTitle(text(link[1]));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("SIGOPS", head.year, "Hall of Fame Award", title, who, source, `SIGOPS ${head.year} Hall of Fame Award: ${authorText} “${title}”`));
    else skipped.push(`${head.year}: not read: ${authorText.slice(0, 60)} / ${title.slice(0, 40)}`);
  }
  return { entries, skipped };
}

// The authors may run over several source lines ("…, Pierre-" / "Yves Strub"), the title too; a line that ends in a hyphen is joined to the next without a space.
// The POPL page writes "(for 2016): Title" for its newest rows and "(for 2006) Title" for the rest. The year heading is the award's, the paper is of the year in
// the parenthesis. A page's footer ("Page generated …") ends the list.
export function parseSigplan(html, venue, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((l) => l.normalize("NFC"));
  const join = (parts) => parts.reduce((a, b) => (a ? (/-$/.test(a) ? a + b : a + " " + b) : b), "");
  let year = null, state = null, authors = [], title = [], paperYear = null;
  const flush = () => {
    if (state !== "title") return;
    // (a stray quotation mark after the last name, a comma after the title: the older rows are typed by hand)
    const authorText = join(authors).replace(/["“”]+\s*$/, ""), t = cleanTitle(join(title).replace(/[,;]+$/, "")), who = names(authorText);
    if (who.length && who.every(isPerson) && t.length >= 8) entries.push(entry(venue, year, "Most Influential Paper Award", t, who, source, `${venue} ${year} Most Influential Paper Award: ${authorText} (for ${paperYear}) ${t}`, paperYear));
    else skipped.push(`${venue} ${year}: not read: ${authorText.slice(0, 50)} / ${t.slice(0, 40)}`);
    state = null;
  };
  for (const l of ls.slice(Math.max(0, ls.findIndex((x) => /^Recipients$/i.test(x))) + 1)) {
    if (/^Page generated\b/i.test(l)) break;
    const y = /^((?:19|20)\d{2})$/.exec(l);
    if (y) { flush(); year = parseInt(y[1], 10); state = "authors"; authors = []; title = []; continue; }
    const f = year && /^\(for ((?:19|20)\d{2})\)\s*:?\s*(.*)$/.exec(l);
    if (state === "authors" && f) { paperYear = parseInt(f[1], 10); title = f[2] ? [f[2]] : []; state = "title"; continue; }
    if (state === "title" && /^Citation:?/i.test(l)) { flush(); continue; }       // (what follows, the citation, is not read)
    if (state === "authors") authors.push(l);
    else if (state === "title") title.push(l);
  }
  flush();
  return { entries, skipped };
}

// "At FOCS 2025:" (the award year), "1995 award (citations):" (the paper's FOCS year), then "Author, Author:" and the title on the next line.
// A names line that does not read as names (the page runs two together without a comma) is reported and skipped.
export function parseFocs(html, source = PAGES.focs) {
  const entries = [], skipped = [];
  const ls = lines(html).map((l) => l.normalize("NFC"));
  const start = ls.findIndex((l) => /^Award Winners$/i.test(l));
  let year = null, paperYear = null;
  for (let i = start + 1; i < ls.length; i++) {
    const a = /^At FOCS (\d{4}):?$/i.exec(ls[i]);
    if (a) { year = parseInt(a[1], 10); paperYear = null; continue; }
    const p = /^((?:19|20)\d{2}) award\b/i.exec(ls[i]);
    if (p) { paperYear = parseInt(p[1], 10); continue; }
    if (!year || !paperYear || !/:\s*$/.test(ls[i]) || i + 1 >= ls.length) continue;
    // ("Subhash A.Khot": the space after an initial is missing)
    const who = names(ls[i].replace(/:\s*$/, "").replace(/\b(\p{Lu})\.(?=\p{Lu}\p{Ll})/gu, "$1. ")), title = cleanTitle(ls[i + 1]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("FOCS", year, "Test of Time Award", title, who, source, `FOCS ${year} Test of Time Award (${paperYear}): ${ls[i].replace(/:\s*$/, "")}: ${title}`, paperYear));
    else skipped.push(`${year}/${paperYear}: not read: ${ls[i].slice(0, 70)} / ${title.slice(0, 30)}`);
    i++;
  }
  return { entries, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, file] = process.argv.slice(2);
  const venues = { popl: "POPL", pldi: "PLDI", icfp: "ICFP", oopsla: "OOPSLA" };
  const parse = venues[kind] ? (h, src) => parseSigplan(h, venues[kind], src) : { www: parseWww, isca: parseIsca, micro: parseMicro, dijkstra: parseDijkstra, focs: parseFocs, sigops: parseSigopsHof }[kind];
  if (!parse) { console.error("usage: tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, PAGES[kind]);
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
