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
//   hpca    https://ieeetcca.org/awards/hpca-test-of-time-award/          the HPCA Test of Time Award, 2018–: under "Previous winners" a line `2026: “Title”` and a line `by A; B; C, published at HPCA 2007.`
//                                                                       (an honorable mention has no year in front and is not read)
//   imc     https://sigcomm.hosting2.acm.org/awards/IMC-test-of-time-award  the IMC Test of Time Award (ACM-hosted copy of SIGCOMM's page; sigcomm.org's own address no longer serves it, and the page lists
//                                                                       2022–2023 only): "2023:", then per paper a line `"Title" by Authors, in ACM IMC 2009.`
//   vis     https://aa.ieeevis.org/year/2026/info/history/test-of-time-awards  the IEEE VIS Test-of-Time Awards (InfoVis, VAST, SciVis and VIS tracks): a heading per paper year, then per award a label line
//                                                                       ("10-Years InfoVis Test-of-Time Award"), the authors, the title, "(Awarded at: VIS 2025)" and the DOI
//   icde    https://tc.computer.org/tcde/icde-steering-committee/influential-papers  the ICDE Influential Paper Awards (the TCDE's page), 2005–: a heading "ICDE 2026", then per paper a line of authors and a
//                                                                       line with the title ("… ICDE 2011" after it in most rows), "Citation:" paragraphs between; a row typed "Authors: Title" over two lines is joined,
//                                                                       a row whose authors have no separator between them is reported and skipped
//   ismar   https://www.ismar.net/past_symposiums                         ISMAR's page of past symposia: a section "ISMAR 2024 - Place", its "Awards" block with per award a label line ("Best Paper Award",
//                                                                       "Honorable Mention for …", "ISMAR Paper Impact Award"), then the title and "Recipients: Authors" (2025: "Recipients: Title — Authors";
//                                                                       2019: "Recipients:" then `for the paper "Title."`); authors typed "Surname, I., and Surname, I." are turned round. Papers only: no
//                                                                       career, poster, demo, doctoral, student-volunteer or design awards
//   icse    https://www.icse-conferences.org/mostinfluential.html         the ICSE Most Influential Paper Award, 1989–2025: a year line, then free text wrapped over lines,
//                                                                       "Authors: Title, ICSE-37, 2015" (one or two papers; "No award." years are left out)
//   lics    https://lics.siglog.org/archive/test-of-time-award.html        the LICS Test-of-Time Award, 2006–: a heading "LICS Test-of-Time Award Winner in 2026", "All papers from LICS 2006 were considered", then per
//                                                                       paper `<div><i><a>Author</a><a>Author</a></i><br><b>Title</b>` (the authors are the links, with no separator in the text)
//   lics-dp https://lics.siglog.org/archive/distinguished-papers.html     the LICS Distinguished Papers, 2000s–: the same template, a heading `<a>LICS 2026</a>, Place` per year
//   aaai    https://aaai.org/about-aaai/aaai-awards/aaai-classic-paper-award/  the AAAI Classic Paper Award, 2005–2026: a year heading, then per paper a list item `<em>Classic Paper Recipients:</em> <strong>Authors</strong><br>Title
//                                                                       presented at …` (honorable mentions too; "for their two papers X and Y" rows are reported and skipped)
//   icaps   https://www.icaps-conference.org/icaps-awards/                 the ICAPS Influential Paper Awards, 2008–: "ICAPS Influential Paper Award 2026", then lines `WinnerAuthors. Title. (ICAPS 2013)“citation”` (also
//                                                                       "Winners", "Honorable Mention(s)", the paper's venue ICAPS, AIPS or ECP); the dissertation awards on the same page are not read
//   swsa    https://swsa.semanticweb.org/awards/swsa-ten-year-award/       the SWSA Ten-Year Award (ISWC), 2011–: a table of year, "ISWC 2013" and per paper `Authors. “Title”`
//   sigmm   https://www.sigmm.org/Awards/testoftime                       the SIGMM Test of Time Paper Award, 2020–: a block "2025 Awards", per paper three lines — "Authors.", "Title.", "In Proceedings of …, 2015." — the winners
//                                                                       first, then under "Honorable Mentions:" the others (read as runners-up); the paper may be of any SIGMM conference
//   ht      https://www.sigweb.org/douglas-engelbart-best-paper-award/    the Hypertext Douglas Engelbart Best Paper Award, 2003–: per year a line of authors and a line with the title
//   doceng  https://www.sigweb.org/sigweb-doceng-best-paper-award/        the SIGWEB DocEng Best Paper Award, 2010–: the same template
//   newton  https://www.sigda.org/acm-ieee-a-richard-newton-technical-impact-award-in-eda/  SIGDA's A. Richard Newton Technical Impact Award in EDA, 2009–: per year a line of authors and a
//                                                                       line `“Title,” in the proceedings of the 38st Design Automation Conference, 2001.` (a paper of any venue)
//   sigspatial  https://www.sigspatial.org/people/award-recipients/       ACM SIGSPATIAL's "10-Year Impact Award" and "Best Paper Award" blocks: a year line ("2020 Honorable Mention"), then the title (in quotation marks or
//                                                                       alone) and the authors as "Name (Affiliation)" with or without a separator between them
//
//   node scripts/awards/tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops|eurosys|aamas|ec|asplos|iacr|tcc|sigmobile|sensys|pkc|ches|hpca|imc|vis|icde|ismar|icse|lics|lics-dp|aaai|icaps|swsa|sigmm|ht|newton|sigspatial [saved-page.html] > tot.json      (fetches the page when no file is given)
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
  ches: "https://ches.iacr.org/testoftime.php",
  hpca: "https://ieeetcca.org/awards/hpca-test-of-time-award/",
  imc: "https://sigcomm.hosting2.acm.org/awards/IMC-test-of-time-award",
  vis: "https://aa.ieeevis.org/year/2026/info/history/test-of-time-awards",
  icde: "https://tc.computer.org/tcde/icde-steering-committee/influential-papers",
  ismar: "https://www.ismar.net/past_symposiums",
  icse: "https://www.icse-conferences.org/mostinfluential.html",
  lics: "https://lics.siglog.org/archive/test-of-time-award.html",
  "lics-dp": "https://lics.siglog.org/archive/distinguished-papers.html",
  aaai: "https://aaai.org/about-aaai/aaai-awards/aaai-classic-paper-award/",
  icaps: "https://www.icaps-conference.org/icaps-awards/",
  swsa: "https://swsa.semanticweb.org/awards/swsa-ten-year-award/",
  sigmm: "https://www.sigmm.org/Awards/testoftime",
  ht: "https://www.sigweb.org/douglas-engelbart-best-paper-award/",
  doceng: "https://www.sigweb.org/sigweb-doceng-best-paper-award/",
  newton: "https://www.sigda.org/acm-ieee-a-richard-newton-technical-impact-award-in-eda/",
  sigspatial: "https://www.sigspatial.org/people/award-recipients/",
  sigcse: "https://sigcse.org/programs/awards/test-of-time.html"
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

export function parseHpcaTot(html, source = PAGES.hpca) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  for (let i = ls.indexOf("Previous winners") + 1; i > 0 && i < ls.length - 1; i++) {
    const h = /^((?:19|20)\d{2}):\s*[“"](.+?)[.,]?[”"]\s*$/.exec(ls[i]);
    if (!h) continue;
    const b = /^by\s+(.+?),?\s+published at HPCA\s+((?:19|20)\d{2})\.?$/.exec(ls[i + 1]);
    if (!b) { skipped.push(`${h[1]}: no author line after “${h[2].slice(0, 40)}”`); continue; }
    const year = parseInt(h[1], 10), title = cleanTitle(h[2]), who = names(b[1].replace(/;/g, ",").replace(/\s+and\s+/g, ", and ").replace(/\b([A-Z]\.)(?=[A-Z][a-z])/g, "$1 "));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("HPCA", year, "Test of Time Award", title, who, source, `HPCA ${year} Test of Time Award: ${b[1]} “${title}”`, parseInt(b[2], 10)));
    else skipped.push(`${year}: not read: ${title.slice(0, 40)} / ${b[1].slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

export function parseImcTot(html, source = PAGES.imc) {
  const entries = [], skipped = [];
  let year = null;
  for (const l of lines(html).map((x) => x.normalize("NFC"))) {
    const h = /^((?:19|20)\d{2}):$/.exec(l);
    if (h) { year = parseInt(h[1], 10); continue; }
    const m = year && /^["“]([^"“”]{8,250})["”]\s+by\s+(.+?),\s+in\s+(?:ACM\s+)?(?:IMC|IMW)\s+((?:19|20)\d{2})\.?$/i.exec(l);
    if (!m) continue;
    const who = names(m[2].replace(/\s+and\s+/g, ", and ")), title = cleanTitle(m[1]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("IMC", year, "Test of Time Award", title, who, source, `IMC ${year} Test of Time Award: ${m[2]} “${title}”`, parseInt(m[3], 10)));
    else skipped.push(`${year}: not read: ${title.slice(0, 50)} / ${m[2].slice(0, 50)}`);
  }
  return { entries, skipped };
}

export function parseVisTot(html, source = PAGES.vis) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let paperYear = null;
  for (let i = ls.indexOf("IEEE VIS Test-of-Time Awards") + 1; i > 0 && i < ls.length; i++) {
    if (/^(?:19|20)\d{2}$/.test(ls[i])) { paperYear = parseInt(ls[i], 10); continue; }
    const lab = /^(\d+)-Years? (InfoVis|VAST|SciVis|VIS) Test-of-Time Award$/.exec(ls[i]);
    if (!lab || !paperYear) continue;
    const aw = /^\(Awarded at: VIS ((?:19|20)\d{2})\)$/.exec(ls[i + 3] || "");
    const who = names(ls[i + 1] || ""), title = cleanTitle(ls[i + 2] || "");
    if (aw && who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("VIS", parseInt(aw[1], 10), `${lab[1]}-Year ${lab[2]} Test of Time Award`, title, who, source, `VIS ${aw[1]} ${lab[1]}-Year ${lab[2]} Test of Time Award: ${ls[i + 1]} “${title}”`, paperYear));
    else skipped.push(`${paperYear}: not read: ${(ls[i + 1] || "").slice(0, 50)} / ${(ls[i + 2] || "").slice(0, 40)}`);
    i += 3;
  }
  return { entries, skipped };
}

export function parseIcdeInfluential(html, source = PAGES.icde) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const start = ls.indexOf("ICDE Influential Paper Awards"), end = ls.findIndex((l) => /^Award Selection Process$/i.test(l));
  const block = ls.slice(start < 0 ? 0 : start + 1, end < 0 ? ls.length : end);
  const tail = /[.,]?\s*ICDE\s+((?:19|20)\d{2})\.?$/;
  const nameList = (l) => names(l.replace(/;/g, ",").replace(/\s+and\s+/g, ", and "));
  let year = null;
  const add = (authorText, titleText) => {
    const t = tail.exec(titleText), who = nameList(authorText), title = cleanTitle(titleText.replace(tail, ""));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("ICDE", year, "Influential Paper Award", title, who, source, `ICDE ${year} Influential Paper Award: ${authorText} “${title}”`, t ? parseInt(t[1], 10) : undefined));
    else skipped.push(`${year}: not read: ${authorText.slice(0, 60)} / ${title.slice(0, 40)}`);
  };
  for (let i = 0; i < block.length; i++) {
    const h = /^ICDE ((?:19|20)\d{2})$/.exec(block[i]);
    if (h) { year = parseInt(h[1], 10); continue; }
    if (!year || /^Citation:/i.test(block[i])) continue;
    const colon = /^(.{5,200}?):\s+(.{3,200})$/.exec(block[i]);
    if (colon && nameList(colon[1]).length && nameList(colon[1]).every(isPerson)) {
      // ("Sergey Melnik, Hector Garcia-Molina, Erhard Rahm: Similarity Flooding" — the title goes on in the next line)
      let title = colon[2];
      if (block[i + 1] && tail.test(block[i + 1]) && !/^Citation:/i.test(block[i + 1])) title += ": " + block[++i];
      add(colon[1], title);
      continue;
    }
    const authors = nameList(block[i]);
    if (authors.length && authors.every(isPerson) && block[i + 1] && !/^Citation:/i.test(block[i + 1])) { add(block[i], block[i + 1]); i++; continue; }
    if (block[i + 1] && /[A-Z]\w+ [A-Z]/.test(block[i]) && !/^Citation:/i.test(block[i + 1]) && block[i].split(" ").length >= 6 && tail.test(block[i + 1])) { skipped.push(`${year}: not read: ${block[i].slice(0, 60)} / ${block[i + 1].slice(0, 40)}`); i++; }
  }
  return { entries, skipped };
}

// "Wang, Z., Wu, J., & Wang, L." / "Schmalstieg, D., and Wagner, D." — surname-first with initials: turned round; "Wen-Tong Shu, Yi-Jun Li, and Miao Wang" — as usual
function ismarNames(text) {
  const t = text.replace(/\s*&\s*/g, ", and ").replace(/\s+and\s+/g, ", and ").replace(/\s+$/, "").replace(/(?<=\p{Ll}{2})\.$/u, "");   // (the full stop after the last initial stays)
  const pairs = [...t.matchAll(/(?:^|,\s*(?:and\s+)?)([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+)?)\s*,\s*((?:\p{Lu}[.-]?\s*)+\.?)(?=,|$)/gu)];
  if (pairs.length && pairs.map((m) => m[0]).join("").replace(/\s/g, "").length >= t.replace(/\s/g, "").length - 4) return pairs.map((m) => `${m[2].replace(/\s+/g, " ").trim()} ${m[1]}`);
  return names(t);
}

export function parseIsmarAwards(html, source = PAGES.ismar) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const first = ls.findIndex((l) => /^ISMAR 2025 - /.test(l));
  let year = null, inAwards = false;
  const kindOf = (label) => {
    if (/career|poster|demo|doctoral|volunteer|design|contest|honou?rable.*(?:poster|demo)/i.test(label)) return null;
    if (/(?:paper impact|impact paper|lasting impact)/i.test(label)) return { award: "tot", label: label.replace(/^ISMAR \d{4} /, "").replace(/^Best /, "") };
    if (/honou?rable|runner.?up/i.test(label)) return /paper/i.test(label) ? { award: "runner-up", label: label.replace(/^ISMAR \d{4} /, "") } : null;
    if (/student/i.test(label) && /best/i.test(label) && /paper/i.test(label)) return { award: "student", label: label.replace(/^ISMAR \d{4} /, "") };
    if (/best/i.test(label) && /paper/i.test(label)) return { award: "best", label: label.replace(/^ISMAR \d{4} /, "").replace(/^Best IEEE ISMAR \d{4} /, "Best ") };
    return null;
  };
  const isLabel = (l) => l.length < 90 && /(?:best|honou?rable|impact|lasting)/i.test(l) && !/^Recipients?:/i.test(l) && !/[.?!]$/.test(l);
  for (let i = first < 0 ? 0 : first; i < ls.length; i++) {
    const h = /^(?:ISMAR|ISAR|IWAR) ((?:19|20)\d{2}) - /.exec(ls[i]);
    if (h) { year = parseInt(h[1], 10); inAwards = false; continue; }
    if (!year) continue;
    if (ls[i] === "Awards") { inAwards = true; continue; }
    if (!inAwards || !isLabel(ls[i])) continue;
    const k = kindOf(ls[i]);
    if (!k) continue;
    let title = null, authorText = null, j = i + 1;
    const inline = /^Recipients?:\s+(.+?)\s+[—–]\s+(.+)$/.exec(ls[j] || "");
    if (inline) { title = inline[1]; authorText = inline[2]; }
    else {
      if (ls[j] && !/^Recipients?:/i.test(ls[j])) title = ls[j++];
      const r = /^Recipients?:\s*(.*)$/i.exec(ls[j] || "");
      if (r) { authorText = r[1]; const f = /^for the paper [“"](.+?)[.,]?[”"]/i.exec(ls[j + 1] || ""); if (!title && f) title = f[1]; }
    }
    if (!title || !authorText) { skipped.push(`${year}: not read: ${ls[i].slice(0, 50)}`); continue; }
    title = cleanTitle(title.replace(/,\s*ISMAR \d{4}.*$/, "").replace(/\.\s*In (?:\d{4} )?IEEE.*$/, "").replace(/\.\s*IEEE\.?$/, ""));
    const who = ismarNames(authorText.replace(/,?\s*(?:Director|Professor|Prof\.).*$/i, ""));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ISMAR", year, award: k.award, awardLabel: k.label, title, authors: who, track: "main", source, evidence: `ISMAR ${year} ${ls[i]}: ${title} — ${authorText}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 40)} / ${authorText.slice(0, 40)}`);
  }
  return { entries, skipped };
}

export function parseIcseMip(html, source = PAGES.icse) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const start = ls.findIndex((l) => /^RECIPIENTS AND TITLE OF THE MOST INFLUENTIAL PAPER AWARD$/i.test(l));
  const blocks = [];
  for (const l of start < 0 ? [] : ls.slice(start + 1)) {
    if (/^(?:19|20)\d{2}$/.test(l)) blocks.push({ year: parseInt(l, 10), text: [] });
    else if (blocks.length) blocks[blocks.length - 1].text.push(l);
  }
  for (const b of blocks) {
    const text = b.text.join(" ").replace(/\s+/g, " ").replace(/\s+-\s+/g, "-");
    if (/^No award/i.test(text)) continue;
    for (const m of text.matchAll(/\s*(.+?)\s*(?:ICSE|NCSE)-\d+,?\s*((?:19|20)\d{2})[a-z]?\.?/g)) {
      const c = /^([^:]{3,400}?):\s+(.+?)[,.]?$/.exec(m[1].trim());
      if (!c) { skipped.push(`${b.year}: not read: ${m[1].slice(0, 60)}`); continue; }
      const who = names(c[1].replace(/\s+and\s+/g, ", and ")), title = cleanTitle(c[2]);
      // (a one-word name after the first author — "Robby" — is a name)
      if (who.length && isPerson(who[0]) && who.slice(1).every((n) => isPerson(n) || /^\p{Lu}[\p{L}'’-]+$/u.test(n)) && title.length >= 8) entries.push(entry("ICSE", b.year, "Most Influential Paper Award", title, who, source, `ICSE ${b.year} Most Influential Paper Award: ${c[1]}: ${title}`, parseInt(m[2], 10)));
      else skipped.push(`${b.year}: not read: ${c[1].slice(0, 50)} / ${title.slice(0, 40)}`);
    }
  }
  return { entries, skipped };
}

export function parseLicsTot(html, source = PAGES.lics) {
  const entries = [], skipped = [];
  const parts = html.split(/<h3>\s*LICS Test-of-Time Award Winner in (\d{4})\s*<\/h3>/);
  for (let i = 1; i < parts.length; i += 2) {
    const year = parseInt(parts[i], 10), body = parts[i + 1];
    const considered = /All papers from LICS (\d{4}) were considered/.exec(body);
    const stop = body.search(/<h3>|<\/ul>/), block = stop < 0 ? body : body.slice(0, stop);
    for (const m of block.matchAll(/<div>\s*<i>([\s\S]*?)<\/i>\s*<br\s*\/?>\s*<b>([\s\S]*?)<\/b>/g)) {
      const who = [...m[1].matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((a) => text(a[1])).filter(Boolean), title = cleanTitle(text(m[2]));
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("LICS", year, "Test-of-Time Award", title, who, source, `LICS ${year} Test-of-Time Award: ${who.join(", ")} “${title}”`, considered ? parseInt(considered[1], 10) : undefined));
      else skipped.push(`${year}: not read: ${who.join(", ").slice(0, 50)} / ${title.slice(0, 40)}`);
    }
  }
  return { entries, skipped };
}

export function parseLicsDistinguished(html, source = PAGES["lics-dp"]) {
  const entries = [], skipped = [];
  const parts = html.split(/<h3>\s*<a[^>]*>\s*LICS (\d{4})\s*<\/a>[^<]*<\/h3>/);
  for (let i = 1; i < parts.length; i += 2) {
    const year = parseInt(parts[i], 10), stop = parts[i + 1].search(/<h3>/), block = stop < 0 ? parts[i + 1] : parts[i + 1].slice(0, stop);
    for (const m of block.matchAll(/<div>\s*<i>([\s\S]*?)<\/i>\s*<br\s*\/?>\s*<b>([\s\S]*?)<\/b>/g)) {
      const who = [...m[1].matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((a) => text(a[1])).filter(Boolean), title = cleanTitle(text(m[2]));
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "LICS", year, award: "distinguished", awardLabel: "Distinguished Paper", title, authors: who, track: "main", source, evidence: `LICS ${year} Distinguished Paper: ${who.join(", ")} “${title}”` });
      else skipped.push(`${year}: not read: ${who.join(", ").slice(0, 50)} / ${title.slice(0, 40)}`);
    }
  }
  return { entries, skipped };
}

export function parseAaaiClassic(html, source = PAGES.aaai) {
  const entries = [], skipped = [];
  const start = html.search(/<h[23][^>]*>\s*Past Recipients/i);
  const head = start < 0 ? html : html;
  let year = null;
  for (const m of head.matchAll(/<h[23][^>]*>\s*((?:19|20)\d{2})\s*<\/h[23]>|<li>([\s\S]*?)<\/li>/g)) {
    if (m[1]) { year = parseInt(m[1], 10); continue; }
    if (!year) continue;
    const li = m[2], lab = /^\s*<em>\s*([^<]*?(?:Recipients?|Corecipients?)):?\s*<\/em>/i.exec(li);
    if (!lab) continue;
    const rest = li.slice(lab[0].length), br = rest.search(/<br\s*\/?>/i);
    if (br < 0) { skipped.push(`${year}: not read: ${text(rest).slice(0, 60)}`); continue; }
    const authorText = text(rest.slice(0, br)), titleText = text(rest.slice(br).replace(/<br\s*\/?>/gi, " ")).replace(/\s*,?\s*[Pp]resented at.*$/, "").replace(/\s+For (?:introducing|their|its|being|developing|the)\b.*$/, "");
    const who = names(authorText.replace(/\s+and\s+/g, ", and ")), title = cleanTitle(titleText);
    const honorable = /honou?rable/i.test(lab[1]);
    if (who.length && who.every(isPerson) && title.length >= 8 && !/^for\b/i.test(title)) entries.push({ venue: "AAAI", year, award: honorable ? "runner-up" : "tot", awardLabel: honorable ? "Classic Paper Honorable Mention" : "Classic Paper Award", title, authors: who, track: "main", source, evidence: `AAAI ${year} ${honorable ? "Classic Paper Honorable Mention" : "Classic Paper Award"}: ${authorText} “${title}”` });
    else skipped.push(`${year}: not read: ${authorText.slice(0, 50)} / ${title.slice(0, 40)}`);
  }
  return { entries, skipped };
}

export function parseIcapsInfluential(html, source = PAGES.icaps) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let year = null, honorable = false;
  for (const l of ls) {
    const h = /^ICAPS (Influential Paper|Best Dissertation) Award (\d{4})$/.exec(l);
    if (h) { year = h[1] === "Influential Paper" ? parseInt(h[2], 10) : null; honorable = false; continue; }
    if (/^(?:Awards committee:|Awards presented at)/.test(l)) { if (/^Awards committee:/.test(l)) year = null; continue; }
    if (!year) continue;
    let rest = l;
    const lead = /^(Winners?|Honou?rable Mentions?)\s*/.exec(rest);
    if (lead) { honorable = /honou?rable/i.test(lead[1]); rest = rest.slice(lead[0].length); }
    // (the authors end at the first full stop that follows a name, not an initial: "David I. Ferguson, … Sebastian Thrun. Anytime Dynamic A*")
    const m = /^(.+?\p{Ll}{2})\.\s+(.+?)\.?\s*\((?:ICAPS|AIPS|ECP) ((?:19|20)\d{2})\)/u.exec(rest);
    if (!m) continue;
    const who = names(m[1].replace(/\s+and\s+/g, ", and ")), title = cleanTitle(m[2]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ICAPS", year, award: honorable ? "runner-up" : "tot", awardLabel: honorable ? "Influential Paper Honorable Mention" : "Influential Paper Award", title, authors: who, track: "main", source, evidence: `ICAPS ${year} Influential Paper ${honorable ? "Honorable Mention" : "Award"}: ${m[1]}. ${title}` });
    else skipped.push(`${year}: not read: ${m[1].slice(0, 50)} / ${title.slice(0, 40)}`);
  }
  return { entries, skipped };
}

export function parseSwsaTenYear(html, source = PAGES.swsa) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let year = null, paperYear = null;
  for (let i = ls.indexOf("Awardees") + 1; i > 0 && i < ls.length; i++) {
    if (/^(?:19|20)\d{2}$/.test(ls[i])) { year = parseInt(ls[i], 10); paperYear = null; continue; }
    const c = /^(?:ISWC|SWWS|ISWC\/SWWS)\s?((?:19|20)\d{2})$/.exec(ls[i]);
    if (c) { paperYear = parseInt(c[1], 10); continue; }
    if (!year || /^©/.test(ls[i])) continue;
    // (the authors may end a line and the quoted title begin the next)
    let l = ls[i];
    if (/\.$/.test(l) && /^[“"]/.test(ls[i + 1] || "")) l += " " + ls[++i];
    const m = /^(.+?\p{Ll}{1,}\.?)\s+[“"](.+?)[.,]?[”"]\.?$/u.exec(l);
    if (!m) continue;
    const authorText = m[1].replace(/\.$/, ""), who = names(authorText.replace(/\s+and\s+/g, ", and ")), title = cleanTitle(m[2]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("ISWC", year, "Ten-Year Award", title, who, source, `ISWC ${year} SWSA Ten-Year Award: ${authorText} “${title}”`, paperYear || undefined));
    else skipped.push(`${year}: not read: ${authorText.slice(0, 50)} / ${title.slice(0, 40)}`);
  }
  return { entries, skipped };
}

export function parseSigmmTot(html, source = PAGES.sigmm) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let year = null, honorable = false;
  for (let i = ls.indexOf("PREVIOUS YEARS") + 1; i > 0 && i < ls.length; i++) {
    const h = /^((?:19|20)\d{2}) Awards$/.exec(ls[i]);
    if (h) { year = parseInt(h[1], 10); honorable = false; continue; }
    if (!year) continue;
    if (/^Honou?rable Mentions?:?$/i.test(ls[i])) { honorable = true; continue; }
    if (/^Selection Committee:/i.test(ls[i])) { year = null; continue; }
    if (/^Overall Winner/i.test(ls[i])) { honorable = false; continue; }
    // authors, title, "In Proceedings of …, 2015." — or all in one line, "Authors. Title. In Proceedings of …" (2022, 2023)
    let authorText = null, titleText = null, used = 0;
    if (ls[i + 1] && /^In (?:Proceedings|Proc\.)/i.test(ls[i + 2] || "") && !/\bIn (?:Proceedings|Proc\.)/.test(ls[i])) { authorText = ls[i]; titleText = ls[i + 1]; used = 2; }
    else { const one = /^(.+?\p{Ll}{2}|[\p{Lu}][^.]*?)\.\s+([^.]+?[.?])\s+In (?:Proceedings|Proc\.)/u.exec(ls[i]); if (one) { authorText = one[1]; titleText = one[2]; } }
    if (!authorText) continue;
    // (2020: "Winner: Authors. Title. In Proceedings …" and "Honorable Mention: …" in one line)
    const prefix = /^(Winner|Honou?rable Mentions?)\s*:\s*/i.exec(authorText);
    if (prefix) { honorable = /honou?rable/i.test(prefix[1]); authorText = authorText.slice(prefix[0].length); }
    const who = names(authorText.replace(/\.$/, "").replace(/\s+and\s+/g, ", and ")), title = cleanTitle(titleText);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "SIGMM", year, award: honorable ? "runner-up" : "tot", awardLabel: honorable ? "Test of Time Paper Award Honorable Mention" : "Test of Time Paper Award", title, authors: who, track: "main", source, evidence: `SIGMM ${year} Test of Time ${honorable ? "Honorable Mention" : "Paper Award"}: ${authorText} ${title}` });
    else skipped.push(`${year}: not read: ${authorText.slice(0, 60)} / ${title.slice(0, 40)}`);
    i += used;
  }
  return { entries, skipped };
}

// (the SIGWEB award pages share a template: the award's name, then per year a line of authors and a line with the title, then "Join Us")
function parseSigwebAward(html, source, heading, venue, label) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const firstYear = ls.findIndex((l, i) => /^(?:19|20)\d{2}$/.test(l) && ls[i + 2] && !/^(?:19|20)\d{2}$/.test(ls[i + 2]));
  let start = -1; ls.forEach((l, i) => { if (i < firstYear && heading.test(l)) start = i; });
  const end = ls.findIndex((l, i) => i > firstYear && /^Join Us$/i.test(l));
  const block = ls.slice(start < 0 ? 0 : start + 1, end < 0 ? ls.length : end);
  for (let i = 0; i < block.length; i++) {
    if (!/^(?:19|20)\d{2}$/.test(block[i]) || !block[i + 1] || !block[i + 2]) continue;
    const year = parseInt(block[i], 10);
    // (the 2018 Hypertext row prints the authors twice, "Lemei Zhang, Peng Liu and Jon Atle Gulla.Lemei Zhang, Peng Liu and Jon Atle Gulla.")
    let authorText = block[i + 1].replace(/\.$/, ""); const dup = /^(.+?)\.\1$/.exec(authorText); if (dup) authorText = dup[1];
    const who = names(authorText.replace(/\s+and\s+/g, ", and ")), title = cleanTitle(block[i + 2]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue, year, award: "best", awardLabel: label, title, authors: who, track: "main", source, evidence: `${venue} ${year} ${label}: ${authorText} “${title}”` });
    else skipped.push(`${year}: not read: ${authorText.slice(0, 50)} / ${title.slice(0, 40)}`);
    i += 2;
  }
  return { entries, skipped };
}
export const parseHtEngelbart = (html, source = PAGES.ht) => parseSigwebAward(html, source, /^Hypertext Douglas Engelbart Best Paper Award$/i, "HT", "Douglas Engelbart Best Paper Award");
export const parseDocengBest = (html, source = PAGES.doceng) => parseSigwebAward(html, source, /^SIGWEB DocEng Best Paper Award$/i, "DocEng", "SIGWEB DocEng Best Paper Award");

export function parseSigdaNewton(html, source = PAGES.newton) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const start = ls.findIndex((l) => /^Past Awardees$/i.test(l));
  for (let i = start < 0 ? 0 : start + 1; i < ls.length; i++) {
    if (!/^(?:19|20)\d{2}$/.test(ls[i]) || !ls[i + 1] || !/^[“"]/.test(ls[i + 2] || "")) continue;
    const year = parseInt(ls[i], 10), m = /^[“"](.+?)[,.]?[”"],?\s*(.*)$/.exec(ls[i + 2]);
    const who = names(ls[i + 1].replace(/\s+and\s+/g, ", and ")), title = cleanTitle(m ? m[1] : ""), py = m && [...m[2].matchAll(/\b((?:19|20)\d{2})\b/g)].map((x) => parseInt(x[1], 10)).pop();
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry("SIGDA", year, "A. Richard Newton Technical Impact Award in EDA", title, who, source, `SIGDA ${year} A. Richard Newton Technical Impact Award: ${ls[i + 1]} “${title}”`, py || undefined));
    else skipped.push(`${year}: not read: ${ls[i + 1].slice(0, 50)} / ${title.slice(0, 40)}`);
    i += 2;
  }
  return { entries, skipped };
}

export function parseSigspatial(html, source = PAGES.sigspatial) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let kind = null, year = null, honorable = false, buf = [];
  const flush = () => {
    if (!kind || !year || !buf.length) { buf = []; return; }
    const text = buf.join(" ").replace(/\s+/g, " ").trim(); buf = [];
    let title, rest;
    const q = /^[“"]\s*(.+?)\s*[”"]\s*(.*)$/.exec(text);
    if (q) { title = q[1]; rest = q[2]; } else { title = buf0(text).title; rest = buf0(text).rest; }
    const who = [...rest.matchAll(/\s*([^()]+?)\s*\((?:[^()]|\([^()]*\))*\)/g)].map((m) => m[1].replace(/^[\d\s,;&]+|and\s+/gi, "").replace(/\s+/g, " ").trim()).filter(Boolean);
    const t = cleanTitle(title.replace(/\s+$/, ""));
    const aw = kind === "tot" ? { award: "tot", label: honorable ? "10-Year Impact Award Honorable Mention" : "10-Year Impact Award" } : { award: honorable ? "runner-up" : "best", label: honorable ? "Best Paper Honorable Mention" : "Best Paper Award" };
    if (who.length && who.every(isPerson) && t.length >= 8) entries.push({ venue: "SIGSPATIAL", year, award: aw.award === "tot" && honorable ? "runner-up" : aw.award, awardLabel: aw.label, title: t, authors: who, track: "main", source, evidence: `SIGSPATIAL ${year} ${aw.label}: ${who.join(", ")} “${t}”` });
    else skipped.push(`${year}: not read: ${t.slice(0, 50)} / ${rest.slice(0, 40)}`);
  };
  // (an unquoted title is the first line: lines were joined, so it is cut at the first author's name — taken as the text before the first " Name (Affiliation)")
  const buf0 = (text) => { const m = /^(.+?[a-z\d)?])\s+(\p{Lu}[\p{L}'’.-]+(?:\s+\p{Lu}[\p{L}'’.-]+){0,3}\s*\()/u.exec(text); return m ? { title: m[1], rest: text.slice(m[1].length) } : { title: text, rest: "" }; };
  for (const l of ls) {
    if (/^10-Year Impact Award$/i.test(l)) { flush(); kind = "tot"; year = null; continue; }
    if (/^Best Paper Award$/i.test(l)) { flush(); kind = "best"; year = null; continue; }
    // (the page's other awards — a vision paper, a short paper, an application paper, a demo, a poster, the runners-up and the shortlist — come after the two lists: not read)
    if (/^(?:Lifetime Impact Award|Outstanding Doctoral Dissertation Award|Best Student Paper|Test of Time|Other Awards|Best (?:Vision|Short|Application|Demo|Poster|Research)\b[^“]{0,60}|Best Paper Runners?-Ups?:?|10-Year Impact Award (?:Runner-Up|Shortlisted))/i.test(l)) { flush(); kind = null; continue; }
    const y = /^((?:19|20)\d{2})(\s+Honou?rable Mention)?$/i.exec(l);
    if (y) { flush(); year = parseInt(y[1], 10); honorable = Boolean(y[2]); continue; }
    if (kind && year && !/^This (?:annual|award)/i.test(l)) buf.push(l);
  }
  flush();
  return { entries, skipped };
}

export function parseSigcseTot(html, source = PAGES.sigcse) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  for (let i = 0; i < ls.length - 1; i++) {
    const h = /^(.{8,200}?)\s*\(((?:19|20)\d{2})\)$/.exec(ls[i]);
    const c = h && /^(.+?)\.\s+((?:19|20)\d{2})\.\s+(.+?)\.\s+(?:In|Communications|ACM)\b/.exec(ls[i + 1]);
    if (!c) continue;
    const who = names(c[1].replace(/\s+and\s+/g, ", and ")), title = cleanTitle(h[1]);
    if (who.length && who.every(isPerson)) entries.push(entry("SIGCSE", parseInt(h[2], 10), "Test of Time Award", title, who, source, `SIGCSE ${h[2]} Test of Time Award: ${c[1]}. ${c[2]}. ${title}`, parseInt(c[2], 10)));
    else skipped.push(`${h[2]}: not read: ${c[1].slice(0, 50)} / ${title.slice(0, 40)}`);
    i++;
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
  const parse = venues[kind] ? (h, src) => parseSigplan(h, venues[kind], src) : { www: parseWww, isca: parseIsca, micro: parseMicro, dijkstra: parseDijkstra, focs: parseFocs, sigops: parseSigopsHof, eurosys: parseEurosysTot, aamas: parseAamas, ec: parseEcTot, asplos: parseAsplosMip, iacr: parseIacrTot, tcc: parseTccTot, sigmobile: parseSigmobileTot, sensys: parseSensysTot, pkc: (h, src) => parseTccTot(h, src, "PKC"), ches: parseChesTot, hpca: parseHpcaTot, imc: parseImcTot, vis: parseVisTot, icde: parseIcdeInfluential, ismar: parseIsmarAwards, icse: parseIcseMip, lics: parseLicsTot, "lics-dp": parseLicsDistinguished, aaai: parseAaaiClassic, icaps: parseIcapsInfluential, swsa: parseSwsaTenYear, sigmm: parseSigmmTot, ht: parseHtEngelbart, doceng: parseDocengBest, newton: parseSigdaNewton, sigspatial: parseSigspatial, sigcse: parseSigcseTot }[kind];
  if (!parse) { console.error("usage: tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, PAGES[kind]);
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
