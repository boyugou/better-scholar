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
//   eurosys https://www.eurosys.org/awards/test-of-time-award            the EuroSys Test-of-Time Award, 2016–: "EuroSys 2026 Test-of-Time Award Recipients", then a line "Authors, for their EuroSys 2016
//                                                                       paper Title"; under "Past Recipients" a line per paper, "2024: Authors for their EuroSys 2014 paper Title" (the newest has no year:
//                                                                       the award is of the paper's year + 10, as every dated row is)
//   aamas   https://aamas.csc.liv.ac.uk/award-influential.html            IFAAMAS's Influential Paper Award, 2015–: "2026:", then per paper three lines — "Authors (1994)", the title, the
//                                                                       venue (a paper whose authors are written "Surname, I., …" is reported and skipped)
//   ec      https://sigecom.org/award-tot.html                            the SIGecom Test of Time Award: a year heading, then per paper the title, the authors and the venue line(s); the
//                                                                       paper may be of any venue (EC, SODA, STOC, a journal)
//   asplos  https://sigplan.org/Awards/Other                              the ASPLOS Most Influential Paper Award (listed among SIGPLAN's other awards, 2017–2022): a year line, "ASPLOS Most
//                                                                       Influential Paper Award:", the authors, and the title (", ASPLOS 2008" after it in the newer rows)
//   iacr    https://iacr.org/testoftime/                                  the IACR Test of Time Awards for Asiacrypt, Crypto and Eurocrypt: a heading per year, "From Crypto 2010", then per
//                                                                       paper a lead paragraph "<a>Title</a> by Authors"
//   tcc     https://www.iacr.org/workshops/tcc/awards.html                the TCC Test of Time Award, 2015–: a heading per year, then per paper a paragraph "<a>Title</a> by Authors (affiliations). This paper was
//                                                                       published in TCC 2006. The award is given for …"
//   sigmobile https://sigmobile.org/grav/awards/test-of-time-paper        the SIGMOBILE Test-of-Time Paper Awards, 2018–: "2026 Paper Awardees", then per paper a line
//                                                                       `Authors. "Title," Venue Year.` (the older rows are typed by hand in other forms, a title that
//                                                                       runs over two lines has no closing quotation mark on its line: those are reported and skipped)
//   sensys  https://sensys.acm.org/tot/                                   the SenSys Test of Time Award, 2014–: a year heading, then per paper `Authors (affiliations): “Title,” Nth ACM Conference …`
//                                                                       or, in the 2022 block, the authors on one line and `Title (2004).` on the next
//   pkc     https://iacr.org/meetings/pkc/test_of_time_award             the PKC Test of Time Award, 2019–: the TCC page's template
//   ches    https://ches.iacr.org/testoftime.php                          the CHES Test of Time Award, 2020–: a list item `<b>2024:</b> <a>Title</a>, Authors, CHES 2004.`
//
//   node scripts/awards/tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops|eurosys|aamas|ec|asplos|iacr|tcc|sigmobile|sensys|pkc|ches [saved-page.html] > tot.json      (fetches the page when no file is given)
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
  sigops: "https://www.sigops.org/awards/hof/",
  eurosys: "https://www.eurosys.org/awards/test-of-time-award",
  aamas: "https://aamas.csc.liv.ac.uk/award-influential.html",
  ec: "https://sigecom.org/award-tot.html",
  asplos: "https://sigplan.org/Awards/Other",
  iacr: "https://iacr.org/testoftime/",
  tcc: "https://www.iacr.org/workshops/tcc/awards.html",
  sigmobile: "https://sigmobile.org/grav/awards/test-of-time-paper",
  sensys: "https://sensys.acm.org/tot/",
  pkc: "https://iacr.org/meetings/pkc/test_of_time_award",
  ches: "https://ches.iacr.org/testoftime.php"
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

export function parseEurosysTot(html, source = PAGES.eurosys) {
  const entries = [], skipped = [];
  let headYear = null;
  for (const l of lines(html).map((x) => x.normalize("NFC"))) {
    const h = /^EuroSys ((?:19|20)\d{2}) Test-of-Time Award Recipients?$/i.exec(l);
    if (h) { headYear = parseInt(h[1], 10); continue; }
    if (/^Past Recipients$/i.test(l)) { headYear = null; continue; }
    const m = /^(?:((?:19|20)\d{2}):\s*)?(.+?),?\s+for their EuroSys\s*['’]?(\d{2,4}) paper\s+(.+)$/.exec(l);
    if (!m) continue;
    const paperYear = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const year = m[1] ? parseInt(m[1], 10) : headYear || paperYear + 10;
    const authors = names(m[2]), title = cleanTitle(m[4]);
    if (authors.length && authors.every(isPerson) && title.length >= 8) entries.push(entry("EuroSys", year, "Test of Time Award", title, authors, source, `EuroSys ${year} Test-of-Time Award: ${m[2]} for “${title}”`, paperYear));
    else skipped.push(`${year}: not read: ${l.slice(0, 80)}`);
    headYear = null;
  }
  return { entries, skipped };
}

export function parseAamas(html, source = PAGES.aamas) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let year = null;
  for (let i = ls.indexOf("Previous winners of the award have been:") + 1; i > 0 && i < ls.length; i++) {
    const h = /^((?:19|20)\d{2}):$/.exec(ls[i]);
    if (h) { year = parseInt(h[1], 10); continue; }
    const m = year && /^(.+?)\s*\(((?:19|20)\d{2})(?:,\s*\w+)?\)$/.exec(ls[i]);
    if (!m) continue;
    const authors = names(m[1].replace(/\s+and\s+/g, ", and ")), title = cleanTitle(ls[i + 1] || "");
    // ("Bernstein, D. S., Zilberstein, S., & Immerman, N." is a surname-first list: not read)
    if (!/&/.test(m[1]) && authors.length && authors.every(isPerson) && title.length >= 8) entries.push(entry("AAMAS", year, "Influential Paper Award", title, authors, source, `AAMAS ${year} Influential Paper Award: ${m[1]} (${m[2]}) “${title}”`, parseInt(m[2], 10)));
    else skipped.push(`${year}: not read: ${ls[i].slice(0, 70)}`);
    i++;
  }
  return { entries, skipped };
}

// A year heading, then per paper: the title, the authors, the venue line(s) (each with the paper's year), and at the end of the year a quotation of the citation.
export function parseEcTot(html, source = PAGES.ec) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const hasYear = (l) => /\b(?:19|20)\d{2}\b/.test(l);
  let year = null;
  for (let i = ls.indexOf("Test of Time Award Winners") + 1; i > 0 && i < ls.length; i++) {
    const h = /^((?:19|20)\d{2})$/.exec(ls[i]);
    if (h) { year = parseInt(h[1], 10); continue; }
    if (!year || hasYear(ls[i]) || /^["“…]/.test(ls[i])) continue;
    if (!(ls[i + 2] && hasYear(ls[i + 2]) && !hasYear(ls[i + 1]))) continue;
    const who = names(ls[i + 1].replace(/\s+and\s+/g, ", and ")), title = cleanTitle(ls[i]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("SIGecom", year, "Test of Time Award", title, who, source, `SIGecom ${year} Test of Time Award: ${ls[i + 1]} “${title}”`));
    else skipped.push(`${year}: not read: ${ls[i].slice(0, 50)} / ${ls[i + 1].slice(0, 50)}`);
    i += 1;
  }
  return { entries, skipped };
}

export function parseAsplosMip(html, source = PAGES.asplos) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let year = null;
  for (let i = 0; i < ls.length; i++) {
    if (/^(?:19|20)\d{2}$/.test(ls[i])) { year = parseInt(ls[i], 10); continue; }
    if (!year || !/^ASPLOS Most Influential Paper Award:$/i.test(ls[i])) continue;
    const authors = names(ls[i + 1] || ""), tm = /^(.+?)(?:,\s*ASPLOS\s+((?:19|20)\d{2}))?$/.exec(ls[i + 2] || ""), title = cleanTitle(tm ? tm[1] : "");
    if (authors.length && authors.every(isPerson) && title.length >= 8) entries.push(entry("ASPLOS", year, "Most Influential Paper Award", title, authors, source, `ASPLOS ${year} Most Influential Paper Award: ${ls[i + 1]} “${title}”`, tm && tm[2] ? parseInt(tm[2], 10) : undefined));
    else skipped.push(`${year}: not read: ${(ls[i + 1] || "").slice(0, 50)} / ${(ls[i + 2] || "").slice(0, 40)}`);
    i += 2;
  }
  return { entries, skipped };
}

export function parseIacrTot(html, source = PAGES.iacr) {
  const entries = [], skipped = [];
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  const venues = { crypto: "CRYPTO", eurocrypt: "EUROCRYPT", asiacrypt: "ASIACRYPT" };
  let year = null, venue = null, paperYear = null;
  for (const m of body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>|<h4[^>]*>([\s\S]*?)<\/h4>|<p class="lead[^"]*">([\s\S]*?)<\/p>/g)) {
    if (m[1] !== undefined) { const y = /^((?:19|20)\d{2})$/.exec(text(m[1])); year = y ? parseInt(y[1], 10) : null; venue = null; continue; }
    if (m[2] !== undefined) {
      const f = /^From (Crypto|Eurocrypt|Asiacrypt) ((?:19|20)\d{2})$/i.exec(text(m[2]));
      venue = f ? venues[f[1].toLowerCase()] : null; paperYear = f ? parseInt(f[2], 10) : null;
      continue;
    }
    if (!year || !venue) continue;
    const a = /^\s*<a\s[^>]*>([\s\S]*?)<\/a>\s*by\s+([\s\S]+)$/.exec(m[3]);
    if (!a) { if (text(m[3]).length > 3) skipped.push(`${year} ${venue}: not read: ${text(m[3]).slice(0, 60)}`); continue; }
    const title = cleanTitle(text(a[1])), who = names(text(a[2]));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry(venue, year, "Test of Time Award", title, who, source, `${venue} ${year} Test of Time Award: ${text(a[2])} “${title}”`, paperYear));
    else skipped.push(`${year} ${venue}: not read: ${title.slice(0, 50)} / ${text(a[2]).slice(0, 50)}`);
  }
  return { entries, skipped };
}

// (the TCC and PKC pages share a template)
export function parseTccTot(html, source = PAGES.tcc, venue = "TCC") {
  const entries = [], skipped = [];
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  let year = null;
  for (const m of body.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>|<p[^>]*>\s*(<a\s[\s\S]*?)<\/p>/g)) {
    if (m[1] !== undefined) { const y = /^((?:19|20)\d{2})$/.exec(text(m[1])); if (y) year = parseInt(y[1], 10); else if (/award committee/i.test(text(m[1]))) year = null; continue; }
    if (!year) continue;
    const a = /^<a\s[^>]*>([\s\S]*?)<\/a>\s*by\s+([\s\S]+)$/.exec(m[2]);
    if (!a) continue;
    const rest = text(a[2]), cut = /\.\s+(?=This paper|The award|For\b)/.exec(rest);
    const authorText = cut ? rest.slice(0, cut.index) : rest, py = new RegExp(`published in ${venue} (\\d{4})`).exec(rest);
    const title = cleanTitle(text(a[1])), who = names(authorText);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry(venue, year, "Test of Time Award", title, who, source, `${venue} ${year} Test of Time Award: ${authorText} “${title}”`, py ? parseInt(py[1], 10) : undefined));
    else skipped.push(`${year}: not read: ${title.slice(0, 50)} / ${authorText.slice(0, 50)}`);
  }
  return { entries, skipped };
}

export function parseSigmobileTot(html, source = PAGES.sigmobile) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let year = null;
  for (let i = 0; i < ls.length; i++) {
    const h = /^((?:19|20)\d{2}) Paper Awardees?$/i.exec(ls[i]);
    if (h) { year = parseInt(h[1], 10); continue; }
    if (/^Selection Committee$/i.test(ls[i])) { year = null; continue; }
    if (!year) continue;
    let l = ls[i];
    // (a title that runs over two lines has its closing quotation mark on the next)
    if (/^[\p{Lu}][^"“”]{2,300}[.,]\s+["“”][^"“”]{8,}$/u.test(l) && ls[i + 1] && /^[^"“”]{1,120}["“”]/.test(ls[i + 1])) l = l + " " + ls[++i];
    const m = /^(.{3,400}?)[.,]\s+["“”]([^"“”]{8,200}?)[,.]?\s*["“”][,.]?\s*(.*)$/.exec(l);
    if (!m) continue;
    let who = names(m[1]);
    // (the 2018 rows are typed in the citation style "Kistler, James J., and Mahadev Satyanarayanan": the first author surname first, the others as usual)
    if (year === 2018 && who.length >= 2 && who[0].split(" ").length === 1 && who[1].split(" ").length <= 3 && who.slice(2).every(isPerson)) who = [`${who[1]} ${who[0]}`, ...who.slice(2)];
    const title = cleanTitle(m[2]), py = [...m[3].matchAll(/\b((?:19|20)\d{2})\b/g)].map((x) => parseInt(x[1], 10)).pop();
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("SIGMOBILE", year, "Test-of-Time Paper Award", title, who, source, `SIGMOBILE ${year} Test-of-Time Paper Award: ${m[1]} “${title}”`, py));
    else skipped.push(`${year}: not read: ${l.slice(0, 70)}`);
  }
  return { entries, skipped };
}

export function parseSensysTot(html, source = PAGES.sensys) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let year = null;
  const add = (authorText, titleText, py) => {
    // ("christopher Sadler" is typed so on the page; "Alan Broad (Crossbow, USA). Ramesh Govindan" has a full stop for a comma)
    const who = names(authorText.replace(/\)\.\s+(?=[A-Z])/g, "), ").replace(/\s+and\s+/g, ", and ")).map((n) => n.replace(/^([a-z])(?=[a-z]{3,}\s)/, (c) => c.toUpperCase())), title = cleanTitle(titleText);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("SenSys", year, "Test of Time Award", title, who, source, `SenSys ${year} Test of Time Award: ${authorText.replace(/[\s:,.]+$/, "")} “${title}”`, py));
    else skipped.push(`${year}: not read: ${authorText.slice(0, 50)} / ${title.slice(0, 40)}`);
  };
  for (let i = 0; i < ls.length; i++) {
    const h = /^((?:19|20)\d{2})$/.exec(ls[i]);
    if (h) { year = parseInt(h[1], 10); continue; }
    if (!year) continue;
    const q = /^(.{3,600}?)[:,]?\s+[“"]([^”"“]{8,200}?)[,.]?[”"]/.exec(ls[i]);
    if (q && !/^Committee:/i.test(ls[i])) { add(q[1], q[2], undefined); continue; }
    // (the 2022 block: the authors, then "Title (2004)." on the next line — or on the same line after the closing parenthesis of the last affiliation)
    const one = /^(.{20,800}\))\.\s+(.{8,200}?)\s*\(((?:19|20)\d{2})\)\.$/.exec(ls[i]);
    if (one && !/^Committee:/i.test(ls[i]) && !/[“"]/.test(ls[i])) { add(one[1], one[2], parseInt(one[3], 10)); continue; }
    const t = /^(.{8,200}?)\s*\(((?:19|20)\d{2})\)\.$/.exec(ls[i + 1] || "");
    if (t && /\.$/.test(ls[i]) && !/^Committee:/i.test(ls[i]) && !/[“"]/.test(ls[i])) { add(ls[i], t[1], parseInt(t[2], 10)); i++; }
  }
  return { entries, skipped };
}

export function parseChesTot(html, source = PAGES.ches) {
  const entries = [], skipped = [];
  for (const m of html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<li>\s*<b>\s*((?:19|20)\d{2}):\s*<\/b>\s*<a\s[^>]*>([\s\S]*?)<\/a>,\s*([\s\S]*?),\s*(?:T?CHES)\s+((?:19|20)\d{2})\.?\s*<\/li>/g)) {
    const year = parseInt(m[1], 10), title = cleanTitle(text(m[2])), authorText = text(m[3]), who = names(authorText);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("CHES", year, "Test of Time Award", title, who, source, `CHES ${year} Test of Time Award: ${authorText} “${title}”`, parseInt(m[4], 10)));
    else skipped.push(`${year}: not read: ${title.slice(0, 50)} / ${authorText.slice(0, 50)}`);
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
  const parse = venues[kind] ? (h, src) => parseSigplan(h, venues[kind], src) : { www: parseWww, isca: parseIsca, micro: parseMicro, dijkstra: parseDijkstra, focs: parseFocs, sigops: parseSigopsHof, eurosys: parseEurosysTot, aamas: parseAamas, ec: parseEcTot, asplos: parseAsplosMip, iacr: parseIacrTot, tcc: parseTccTot, sigmobile: parseSigmobileTot, sensys: parseSensysTot, pkc: (h, src) => parseTccTot(h, src, "PKC"), ches: parseChesTot }[kind];
  if (!parse) { console.error("usage: tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, PAGES[kind]);
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
