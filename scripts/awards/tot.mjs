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
// Added later (each reader's own comment above its function says what it reads; the data/README.md row names the page):
//   icwsm, etaps, etaps-bp, gecco, sigcomm, dac, mobicom      one page each (ICWSM awards, ETAPS test of time / best papers, GECCO's SIGEVO Impact Award, SIGCOMM's test of time, DAC's Most Influential Papers,
//                                                             MobiCom's best paper page)
//   ras-<name>                                                 IEEE RAS's per-award pages (ICRA, CASE: the table RAS)
//   kdd-bp, kdd-tot, siggraph, ubicomp, www-best               one page per year, the page's address is the third argument
//   icdm                                                       the ICDM series' best paper page (several layouts over the years)
//   nips-book-2018, neurips-2022, neurips-2024, icml-tot-2021  single test-of-time papers named by a conference book, a blog post or a virtual-site page
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
  sigcse: "https://sigcse.org/programs/awards/test-of-time.html",
  icwsm: "https://www.icwsm.org/awards/",
  etaps: "https://etaps.org/awards/test-of-time",
  "etaps-bp": "https://etaps.org/awards/best-paper/",
  gecco: "https://sig.sigevo.org/SIGEVO-Impact-Award",
  "kdd-bp": "https://kdd.org/awards/sigkdd-best-research-paper-awards",
  "kdd-tot": "https://kdd.org/awards/kdd-test-of-time-award",
  sigcomm: "https://www.sigcomm.org/awards/acm-sigcomm-test-of-time-paper-award",
  dac: "https://www.dac.com/2027/dac-most-influential-papers-award",
  ubicomp: "https://ubicomp.org/ubicomp-iswc-2025/awards/",
  icdm: "https://icdm.zhonghuapu.com/Awards/BestPapers.shtml",
  mobicom: "https://beta.sigmobile.org/articles/mobicom-best-paper-award",
  "mobicom-year": "https://www.sigmobile.org/mobicom/2025/awards.html",
  "www-best": "https://www2022.thewebconf.org/awards",
  sc: "https://sc25.supercomputing.org/program/awards/",
  siggraph: "https://blog.siggraph.org/2025/06/siggraph-2025-technical-papers-awards-best-papers-honorable-mentions-and-test-of-time.html/",
  "icml-tot-2021": "https://icml.cc/virtual/2021/test-of-time/11808",
  "nips-book-2018": "https://media.nips.cc/Conferences/NIPS2018/NIPS-2018-Conference-Book.pdf",
  "neurips-2022": "https://blog.neurips.cc/2022/11/21/announcing-the-neurips-2022-awards/",
  "neurips-2024": "https://blog.neurips.cc/2024/11/27/announcing-the-neurips-2024-test-of-time-paper-awards/"
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

export function parseIcwsmAwards(html, source = PAGES.icwsm) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  let section = null, year = null, sub = "main";
  const authorsOf = (l) => { const t = l.replace(/;?\s*ICWSM\s*((?:19|20)\d{2})\s*$/, ""); return { who: names(t.replace(/\s+and\s+/g, ", and ").replace(/\bDavidW\./, "David W.")), py: (/ICWSM\s*((?:19|20)\d{2})\s*$/.exec(l) || [])[1] }; };
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (/^Test of Time Award$/i.test(l)) { section = "tot"; year = null; continue; }
    if (/^Best Paper Award$/i.test(l)) { section = "best"; year = null; continue; }
    if (/^Adamic-Glance Distinguished Young Researcher Award$/i.test(l)) { section = null; continue; }
    if (!section) continue;
    if (/^(?:19|20)\d{2}$/.test(l)) { year = parseInt(l, 10); sub = "main"; continue; }
    if (/^Outstanding Papers$/i.test(l)) { sub = "outstanding"; continue; }
    if (/^Runner[- ]Up$/i.test(l)) { sub = "runner-up"; continue; }
    if (!year || !ls[i + 1]) continue;
    // (a Test of Time row wraps: "Authors;" and "ICWSM 2010" are lines of their own, and a long author list wraps before)
    let take = 1, authorLine = ls[i + 1];
    if (section === "tot") for (let k = 2; k <= 4 && ls[i + k]; k++) { if (/ICWSM\s*(?:19|20)\d{2}\s*$/.test(authorLine) || !(/[;,]$/.test(authorLine) || /^ICWSM\s*(?:19|20)\d{2}$/.test(ls[i + k]))) break; authorLine += " " + ls[i + k]; take = k; }
    const { who, py } = authorsOf(authorLine);
    if (!who.length || !who.every(isPerson)) continue;
    const award = sub === "outstanding" ? "outstanding" : sub === "runner-up" ? "runner-up" : section === "tot" ? "tot" : "best";
    const label = award === "outstanding" ? "Outstanding Paper" : award === "runner-up" ? (section === "tot" ? "Test of Time Award Runner Up" : "Best Paper Runner Up") : section === "tot" ? "Test of Time Award" : "Best Paper Award";
    const title = cleanTitle(l);
    if (title.length >= 8) entries.push({ venue: "ICWSM", year, award, awardLabel: label, title, authors: who, track: "main", source, evidence: `ICWSM ${year} ${label}: ${l} — ${authorLine}`, ...(py ? { paperYear: parseInt(py, 10) } : {}) });
    else skipped.push(`${year}: not read: ${l.slice(0, 50)}`);
    i += take;
  }
  return { entries, skipped };
}

// "The 2025 ETAPS Test of Time Award went to A, B and C for their ESOP 2009 paper Title" — one sentence per year; the venue is the constituent conference
// the paper appeared in (TACAS, ESOP, FoSSaCS, FASE).
export function parseEtapsTot(html, source = PAGES.etaps) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const re = /^The\s+((?:19|20)\d{2})\s+ETAPS Test of Time Award went to\s+(.+?)\s+for\s+(?:their|his|her)\s+(TACAS|ESOP|FoSSaCS|FASE|ETAPS)\s+((?:19|20)\d{2})\s+paper\s+(.+)$/;
  for (const l of ls) {
    const m = re.exec(l);
    if (!m) continue;
    const who = names(m[2].replace(/\s*\((?:posthumously)\)/i, "")), title = cleanTitle(m[5]), year = parseInt(m[1], 10);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push(entry(m[3], year, "ETAPS Test of Time Award", title, who, source, `ETAPS ${year} Test of Time Award: ${m[2]} — ${m[3]} ${m[4]} “${title}”`, parseInt(m[4], 10)));
    else skipped.push(`${year}: not read: ${m[2].slice(0, 50)} / ${title.slice(0, 40)}`);
  }
  return { entries, skipped };
}

// ETAPS best paper page: a year heading (followed by "moreless"), then category headings ("EATCS Best Paper Award", "EASST …", "EAPLS …", "SCP Best Tool Paper Award",
// "Springer’s Best Student Paper Award", "Distinguished Paper Awards") with their papers, and "Award Nominations" lists, which are not awards and are left out
// (as are the artifact awards, 2026). A paper is "Authors. Title (TACAS)" / "Authors. Title. TACAS 2019" and wraps over lines (the tag may be alone on the last one,
// the year on a line of its own); a record ends at a line that ends in the conference tag, or when the next line starts a record of its own.
const ETAPS_TAG = "TACAS|ESOP|FoSSaCS|FASE|POST|CC";
function splitAuthorsTitle(text) {
  for (let i = text.indexOf(". "); i >= 0; i = text.indexOf(". ", i + 1)) {
    const word = (/(\S+)$/.exec(text.slice(0, i)) || [""])[0];
    if (word.length < 2 || word.includes(".")) continue;                    // an initial, not the end of the names
    const who = names(text.slice(0, i)), title = text.slice(i + 2).trim();
    if (who.length && who.every(isPerson) && /^[\p{L}\d“"]/u.test(title)) return { who, title };
  }
  return null;
}
export function parseEtapsBest(html, source = PAGES["etaps-bp"]) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const tagEnd = new RegExp(`(?:[.,]\\s+|\\s*\\()(${ETAPS_TAG})\\)?(?:\\s+(?:19|20)\\d{2})?[.\\s]*$`, "i");
  const tagOnly = new RegExp(`^(?:${ETAPS_TAG})(?:\\s+(?:19|20)\\d{2})?\\.?$`, "i");
  let year = null, kind = null, label = "", rec = [];
  const flush = () => {
    if (!rec.length) return;
    const text = rec.join(" ").replace(/\s+/g, " ").trim(); rec = [];
    const tag = tagEnd.exec(text), body = tag ? text.slice(0, tag.index) : text;
    const split = splitAuthorsTitle(body.replace(/,?\s*$/, "") + (/\.\s*$/.test(body) ? "" : "") );
    const title = split && cleanTitle(split.title.replace(/[,.\s]+$/, ""));
    if (split && title.length >= 8) {
      const venue = tag ? ({ fossacs: "FoSSaCS", fase: "FASE", tacas: "TACAS", esop: "ESOP", post: "POST", cc: "CC" })[tag[1].toLowerCase()] : "ETAPS";
      entries.push({ venue, year, award: kind, awardLabel: label, title, authors: split.who, track: "main", source, evidence: `ETAPS ${year} ${label}: ${split.who.join(", ")}. ${title}` });
    } else skipped.push(`${year} ${label}: not read: ${text.slice(0, 70)}`);
  };
  const heading = (l) => {
    if (/^Award Nominations$/i.test(l) || /^Distinguished Artifact Awards?$/i.test(l)) return { kind: null };
    if (/^Springer.?s Best Student Paper Award$/i.test(l)) return { kind: "student", label: "Springer Best Student Paper Award" };
    if (/^(?:[A-Z]+ )?Best (?:Tool )?Paper Award$/i.test(l) && l.length < 40) return { kind: "best", label: l.replace(/^Springer.?s /, "") };
    if (/^Distinguished Paper Awards?$/i.test(l)) return { kind: "distinguished", label: "Distinguished Paper Award" };
    return null;
  };
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (/^ETAPS International Joint/i.test(l)) break;
    if (/^(?:19|20)\d{2}$/.test(l) && /^more\s?less$/i.test(ls[i + 1] || "")) { flush(); year = parseInt(l, 10); kind = null; i++; continue; }
    if (!year) continue;
    const hd = heading(l);
    if (hd) { flush(); kind = hd.kind; label = hd.label || ""; continue; }
    if (!kind) continue;
    // the next line starts a record of its own while the one being gathered is already whole
    if (!rec.length && /^(?:19|20)\d{2}$/.test(l)) continue;                 // the year of the paper, wrapped onto a line of its own
    const own = splitAuthorsTitle(l);
    if (rec.length && own && !tagOnly.test(own.title) && splitAuthorsTitle(rec.join(" "))) flush();
    rec.push(l);
    if (tagEnd.test(rec.join(" "))) flush();
  }
  flush();
  return { entries, skipped };
}

// IEEE RAS's conference award pages (www.ieee-ras.org/awards-recognition/conference-awards/<award>/): each has a "Winners of this Award" list — a year line, then per
// paper a line of authors and a line with the title in quotation marks, sometimes followed by a line of citation text. The award (and venue) is the page's.
export const RAS = {
  "ras-icra": { slug: "ieee-icra-best-conference-paper-award", venue: "ICRA", award: "best", label: "ICRA Best Conference Paper Award" },
  "ras-icra-student": { slug: "ieee-icra-best-student-paper-award", venue: "ICRA", award: "student", label: "ICRA Best Student Paper Award" },
  "ras-icra-automation": { slug: "ieee-icra-best-paper-award-in-automation", venue: "ICRA", award: "category", label: "ICRA Best Paper Award in Automation" },
  "ras-icra-hri": { slug: "ieee-icra-best-paper-award-on-human-robot-interaction", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Human-Robot Interaction" },
  "ras-icra-medical": { slug: "ieee-icra-best-paper-award-in-medical-robotics", venue: "ICRA", award: "category", label: "ICRA Best Paper Award in Medical Robotics" },
  "ras-icra-multirobot": { slug: "ieee-icra-best-paper-award-on-multi-robot-systems", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Multi-Robot Systems" },
  "ras-icra-mechanisms": { slug: "ieee-icra-best-paper-award-on-mechanisms-and-design", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Mechanisms and Design" },
  "ras-icra-manipulation": { slug: "ieee-icra-best-paper-award-on-robot-manipulation-and-locomotion", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Robot Manipulation and Locomotion" },
  "ras-icra-field": { slug: "ieee-icra-best-paper-award-in-field-and-service-robotics", venue: "ICRA", award: "category", label: "ICRA Best Paper Award in Field and Service Robotics" },
  "ras-icra-vision": { slug: "ieee-icra-best-paper-award-in-robot-vision", venue: "ICRA", award: "category", label: "ICRA Best Paper Award in Robot Vision" },
  "ras-icra-cognitive": { slug: "ieee-icra-best-paper-award-in-cognitive-robotics", venue: "ICRA", award: "category", label: "ICRA Best Paper Award in Cognitive Robotics" },
  "ras-icra-uav": { slug: "ieee-icra-best-paper-award-on-unmanned-aerial-vehicles", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Unmanned Aerial Vehicles" },
  "ras-icra-perception": { slug: "ieee-icra-best-paper-award-on-robot-perception", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Robot Perception" },
  "ras-icra-learning": { slug: "ieee-icra-best-paper-award-on-robot-learning", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Robot Learning" },
  "ras-icra-planning": { slug: "ieee-icra-best-paper-award-on-planning-and-control", venue: "ICRA", award: "category", label: "ICRA Best Paper Award on Planning and Control" },
  "ras-case-young": { slug: "ieee-case-peter-luh-memorial-best-paper-award-for-young-researcher", venue: "CASE", award: "category", label: "CASE Peter Luh Memorial Best Paper Award for Young Researcher" },
  "ras-case": { slug: "ieee-case-best-conference-paper-award", venue: "CASE", award: "best", label: "CASE Best Conference Paper Award" },
  "ras-case-student": { slug: "ieee-case-best-student-paper-award", venue: "CASE", award: "student", label: "CASE Best Student Paper Award" },
  "ras-case-application": { slug: "ieee-case-best-application-paper-award", venue: "CASE", award: "category", label: "CASE Best Application Paper Award" },
  "ras-case-healthcare": { slug: "ieee-case-best-healthcare-automation-paper-award", venue: "CASE", award: "category", label: "CASE Best Healthcare Automation Paper Award" }
};
for (const [k, v] of Object.entries(RAS)) PAGES[k] = `https://www.ieee-ras.org/awards-recognition/conference-awards/${v.slug}/`;
export function parseRas(html, cfg, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const start = ls.findIndex((l) => /^Winners of this Award/i.test(l));
  let year = null;
  for (let i = start < 0 ? ls.length : start + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^(?:19|20)\d{2}$/.test(l)) { year = parseInt(l, 10); continue; }
    if (!year) continue;
    if (/^Follow us$/i.test(l) || /^Home$/.test(l)) break;
    if (year < 1990) continue;                                              // the bundled list starts at 1990 (the student award goes back to 1988)
    if (!/^[“"]/.test(l) || i === 0) continue;
    // ("1st Place: " puts a rank in front of the names; a nickname in quotation marks sits between two of them)
    const title = cleanTitle(l), authorLine = ls[i - 1], place = (/^(\d)(?:st|nd|rd|th) Place:\s*/i.exec(authorLine) || [])[1];
    const who = names(authorLine.replace(/^\d(?:st|nd|rd|th) Place:\s*/i, "").replace(/\s*[“"][^”"]*[”"]\s*/g, " ").replace(/\s+and\s+/g, ", and "));
    const label = place ? `${cfg.label} (place ${place})` : cfg.label;
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: cfg.venue, year, award: cfg.award, awardLabel: label, title, authors: who, track: "main", source, evidence: `${label} ${year}: ${authorLine} — “${title}”` });
    else skipped.push(`${year}: not read: ${authorLine.slice(0, 50)} / ${title.slice(0, 40)}`);
  }
  return { entries, skipped };
}

// SIGEVO's Impact Award page (sig.sigevo.org/SIGEVO-Impact-Award, a GECCO paper of ten years earlier): per year a heading "2024 SIGEVO Impact Award", then per paper a line
// with the title, a line with the authors and citation lines (the newest rows put "GECCO'14, pp. …" on the authors' line, and write the names "Surname I." or "Surname, I.,").
export function parseGeccoImpact(html, source = PAGES.gecco) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC"));
  const initials = /^(?:\p{Lu}\.?-?)+\.?$/u;
  const cit = /GECCO|Genetic and Evolutionary|Proceedings|\bpp\.?\s*\d|\(Eds?\.?\)|\bEds?\b|LNCS|Morgan Kaufmann|PDF/i;
  const flip = (list) => {
    const parts = list.split(/\s*,\s*/).filter(Boolean);
    if (parts.length >= 2 && parts.every((p, i) => (i % 2 ? initials.test(p) : !initials.test(p)))) {         // "McDermott, J., White, D.R."
      const out = []; for (let i = 0; i + 1 < parts.length; i += 2) out.push(parts[i + 1] + " " + parts[i]); return out;
    }
    return parts.map((n) => { const w = n.split(" "); return w.length === 2 && initials.test(w[1]) && !initials.test(w[0]) ? w[1] + " " + w[0] : n; });
  };
  let year = null, title = null;
  const emit = (authorLine) => {
    const hasVenue = /GECCO\s?'/.test(authorLine), text = authorLine.split(/,?\s*GECCO\s?'/)[0].replace(/(?<=\p{L}{2})\.\s*$/u, "").replace(/,\s*$/, "").replace(/,\s*and\s+/g, ", ").replace(/\s+and\s+/g, ", ");
    const who = (hasVenue || /^\p{Lu}[\p{L}'’ -]+,\s*(?:\p{Lu}\.?-?)+\.?\s*,/u.test(text) ? flip(text) : text.split(/\s*,\s*/)).map((n) => n.replace(/\s+/g, " ").trim()).filter(Boolean);
    const t = cleanTitle(title);
    if (who.length && who.every(isPerson) && t.length >= 8) entries.push(entry("GECCO", year, "SIGEVO Impact Award", t, who, source, `GECCO ${year} SIGEVO Impact Award: ${who.join(", ")}. ${t}`));
    else skipped.push(`${year}: not read: ${authorLine.slice(0, 50)} / ${t.slice(0, 40)}`);
    title = null;
  };
  for (const l of ls) {
    const h = /^((?:19|20)\d{2}) SIGEVO Impact Award$/.exec(l);
    if (h) { year = parseInt(h[1], 10); title = null; continue; }
    if (!year) continue;
    if (/^Log in$/i.test(l)) break;
    if (/^(?:Two awards|Note )/i.test(l)) continue;
    if (title === null) { if (!cit.test(l)) title = l; continue; }
    emit(l);
  }
  return { entries, skipped };
}

// SIGKDD's award pages (kdd.org/awards/view/<year>-…): one page per year, read one file at a time (the third argument of the command is the page's address).
//   Best paper pages: capitalised category lines ("BEST PAPER AWARD", "BEST STUDENT PAPER AWARD RUNNER-UP", "BEST APPLICATION PAPER: WINNER", "… HONORABLE MENTION"), a track
//   heading ("Applied Data Science Track") that applies to the lines below it, then a title line and an authors line (affiliations in parentheses from 2016 on).
//   Test of time pages: an authors line, then "Title, KDD 2002", then a paragraph on the paper.
const ZW = /[​‌‍﻿]/g;
// "Name (Affiliation);Name (Affiliation)", "Name, Affiliation; Name, Affiliation" or plain "A, B, and C" — the names, in order (empty when a name is not one)
function kddAuthors(line, strict = false) {
  const t = line.replace(ZW, "").replace(/\s+/g, " ").trim().replace(/[,;.\s]+$/, "");
  const noBrackets = t.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ").trim();          // (an affiliation may hold a ";" or a "," of its own)
  let who;
  if (noBrackets.includes(";")) who = noBrackets.split(/\s*;\s*/).map((seg) => seg.split(",")[0].replace(/\s+/g, " ").trim());
  else who = names(noBrackets.replace(/\s+and\s+/g, ", and ").replace(/\s+,/g, ","));
  if (strict && who.some((n) => ORG.test(n))) return [];                                      // (strict: an organisation among the names means the line is a fragment)
  who = who.filter((n) => n && !ORG.test(n));                                                // (a bare "Cornell University" after a name is the affiliation)
  return who.length && who.every((n) => isPerson(n) && n.split(" ").length <= 4) ? who : [];
}
export function parseKddBest(html, source = PAGES["kdd-bp"]) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const year = (/^((?:19|20)\d{2})\b.*Best .*Paper/i.exec(ls.find((l) => /^(?:19|20)\d{2}\b.*Best .*Paper/i.test(l)) || "") || [])[1];
  if (!year) return { entries, skipped: ["no year heading"] };
  // a category line: the capitalised ones, the mixed-case "Best Student Paper Award" of 2015, the sentences of 2014 ("The runner up to the best research track paper is:")
  const category = (l) => {
    if (/^BEST (?:RESEARCH |APPLICATION |STUDENT )?PAPER\b/.test(l) && l === l.toUpperCase()) return { text: l.toUpperCase() };
    if (/^Best (?:Student )?Paper Award$/.test(l)) return { text: l.toUpperCase() };
    const m = /^(?:The )?(overall best|runner up (?:to|for) the best|best) (research track|student) paper(?: award)?(?: goes to(?: the paper)?| is)?:$/i.exec(l);
    if (m) return { text: ((/runner/i.test(m[1]) ? "RUNNER-UP " : "") + (/student/i.test(m[2]) ? "BEST STUDENT PAPER" : "BEST PAPER")).replace("RUNNER-UP BEST", "BEST") + (/runner/i.test(m[1]) ? " RUNNER-UP" : "") };
    return null;
  };
  let track = "";
  const first = ls.findIndex((l) => /pleased to announce/i.test(l));
  const quoted = (l) => /^[“"]/.test(l);
  for (let i = Math.max(0, first); i < ls.length; i++) {
    const l = ls[i];
    if (/^(?:Tags|Twitter Feed)$/.test(l)) break;
    if (/Track$/.test(l) && l.length < 40) { track = l; continue; }
    const cat = category(l);
    if (!cat) continue;
    let j = i + 1;
    const sub = /^(Winner|Runner[- ]Up)$/i.exec(ls[j] || "");
    if (sub) j++;
    const text = cat.text, kindLine = text + (sub ? " " + sub[1].toUpperCase() : "");
    const student = /STUDENT/.test(text), application = /APPLICATION/.test(text), runner = /RUNNER/.test(kindLine), honor = /HONORABLE/.test(text);
    const base = student ? "Best Student Paper" : application ? "Best Application Paper" : /RESEARCH/.test(text) ? "Best Research Paper" : "Best Paper";
    const award = honor || runner ? "runner-up" : student ? "student" : application ? "category" : "best";
    const label = (base + (honor ? " Honorable Mention" : runner ? " Runner-up" : "")) + (track ? ` (${track})` : "");
    for (;;) {                                                               // (one category line can head several papers: 2015's student papers)
      const title = cleanTitle(ls[j] || ""), authorLine = ls[j + 1] || "", who = kddAuthors(authorLine);
      if (who.length && title.length >= 8) entries.push({ venue: "KDD", year: parseInt(year, 10), award, awardLabel: label, title, authors: who, track: "main", source, evidence: `KDD ${year} ${label}: ${title} — ${authorLine.replace(ZW, "")}` });
      else skipped.push(`${year}: not read: ${title.slice(0, 40)} / ${authorLine.slice(0, 40)}`);
      i = j + 1;
      if (quoted(ls[i + 1] || "") && quoted(ls[j] || "")) { j = i + 1; continue; }
      break;
    }
  }
  return { entries, skipped };
}
export function parseKddTot(html, source = PAGES["kdd-tot"]) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const year = (/^((?:19|20)\d{2}) .*Test of Time/i.exec(ls.find((l) => /^(?:19|20)\d{2} .*Test of Time/i.test(l)) || "") || [])[1];
  if (!year) return { entries, skipped: ["no year heading"] };
  const y = parseInt(year, 10);
  let area = "", areaLine = -9;
  const add = (title, who, py, evidence) => {
    const t = cleanTitle(title.replace(/\s*\[KDD\s*(?:19|20)\d{2}\]\s*$/, ""));
    const label = "Test of Time Award" + (area ? ` for ${area}` : "");
    if (who.length && t.length >= 8) entries.push({ ...entry("KDD", y, label, t, who, source, `KDD ${year} ${label}: ${evidence}`, py) });
    else skipped.push(`${year}: not read: ${evidence.slice(0, 80)}`);
  };
  for (let i = 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^(?:Tags|Twitter Feed)$/.test(l)) break;
    const ar = /^SIGKDD Test of Time Award for (Research|Applied Data Science)$/i.exec(l);
    if (ar) { area = ar[1]; areaLine = i; continue; }
    let m;
    // "Authors: Title. KDD 2011: 448-456." — the line under a "Test of Time Award for …" heading (the venue may be left out)
    if (i === areaLine + 1 && (m = /^([^:]+?)\s*:\s+(.{8,})$/.exec(l)) && kddAuthors(m[1]).length) {
      const v = /[.,]?\s*(?:In\s+)?KDD\s*(?:'|’)?((?:19|20)?\d{2})\b.*$/.exec(m[2]);
      add(v ? m[2].slice(0, v.index) : m[2], kddAuthors(m[1]), v && /^\d{4}$/.test(v[1]) ? parseInt(v[1], 10) : null, l); continue;
    }
    if ((m = /^(.{8,}?)\s*\[KDD\s*((?:19|20)\d{2})\]$/.exec(l)) && ls[i + 1] && kddAuthors(ls[i + 1]).length) { add(m[1], kddAuthors(ls[i + 1]), parseInt(m[2], 10), `${ls[i + 1]} — ${l}`); continue; }  // "Title [KDD 1996]" then the authors
    if ((m = /^(.{8,}?),\s*KDD\s*((?:19|20)\d{2})$/.exec(l))) {                                                       // authors on the line(s) before, "Title, KDD 2002"
      const who = []; let k = i - 1;
      while (k >= 1 && kddAuthors(ls[k]).length && ls[k].split(" ").length <= 12 && !/^The /.test(ls[k])) { who.unshift(...kddAuthors(ls[k])); k--; }
      add(m[1], who, parseInt(m[2], 10), `${who.join(", ")} — ${l}`); continue;
    }
    if (/^Significance/i.test(ls[i + 1] || "") && kddAuthors(ls[i - 1] || "").length && !/^Significance/i.test(l)) add(l, kddAuthors(ls[i - 1]), null, `${ls[i - 1]} — ${l}`);   // "Authors" / "Title" / "Significance …"
  }
  return { entries, skipped };
}

// The ACM SIGCOMM Test of Time page (www.sigcomm.org/awards/acm-sigcomm-test-of-time-paper-award): per year a heading "2024:", then per paper one line and a line saying why. The
// newer lines read `"Title" by Authors. ACM SIGCOMM Computer Communication Review, …, 2015.` (the authors may be written "Zhu, Y., Eran, H." as well), the older ones `Title, by
// Authors. SIGCOMM 1999.` or `Title, Author, Author, Proc. ACM SIGCOMM 2002.`; the 2006 batch (papers of 1969–1995, initials and surnames) is not read.
const VENUE_AT = /(?:[.,]\s*|\s+)(?:in\s+)?(?:Proc\b\.?|ACM\b|SIGCOMM\b|CCR\b|IMC\b|HotNets\b|SIGMETRICS\b)/i;
function surnameFirst(list) {
  const initials = /^(?:\p{Lu}\.?-?)+\.?$/u;
  const parts = list.replace(/\s+and\s+/g, ", ").split(/\s*,\s*/).filter(Boolean);
  if (parts.length >= 2 && parts.every((p, i) => (i % 2 ? initials.test(p) : !initials.test(p)))) {
    const out = []; for (let i = 0; i + 1 < parts.length; i += 2) out.push(parts[i + 1] + " " + parts[i]); return out;
  }
  return null;
}
export function parseSigcommTot(html, source = PAGES.sigcomm) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const start = ls.findIndex((l) => /past recipients of the ACM SIGCOMM Test of Time/i.test(l));
  let year = null;
  const add = (title, authorText, tail, raw) => {
    const t = cleanTitle(title), cut = VENUE_AT.exec(authorText);
    let text = (cut ? authorText.slice(0, cut.index) : authorText).replace(/[,\s]+$/, "").replace(/(?<=\p{L}{2})\.$/u, "");
    if (cut && /^\.\s/.test(authorText.slice(cut.index)) && /(?:^|[\s,])\p{Lu}$/u.test(text)) text += ".";                   // (the full stop after "Zhang, M." is an initial's)
    const flipped = surnameFirst(text);
    const who = flipped || names(text);
    const py = (/((?:19|20)\d{2})\D*$/.exec(tail) || [])[1];
    if (who.length && who.every(isPerson) && t.length >= 8) entries.push(entry("SIGCOMM", year, "Test of Time Paper Award", t, who, source, `SIGCOMM ${year} Test of Time Paper Award: ${raw}`, py ? parseInt(py, 10) : null));
    else skipped.push(`${year}: not read: ${raw.slice(0, 80)}`);
  };
  for (let i = Math.max(0, start); i < ls.length; i++) {
    const l = ls[i];
    if (/^acm sigcomm$/i.test(l)) break;
    const y = /^((?:19|20)\d{2}):$/.exec(l);
    if (y) { year = parseInt(y[1], 10); continue; }
    if (!year || year < 2007 || /^For |Committee|^The \d{4}|^In 2006/.test(l)) continue;
    let m;
    if ((m = /^[“"]\s*(.+?)[”"]\s*,?\s+by\s+(.+)$/.exec(l))) { add(m[1], m[2], m[2], l); continue; }
    if ((m = /^(.{8,}?),?\s+by\s+(.+)$/.exec(l)) && VENUE_AT.test(m[2])) { add(m[1], m[2], m[2], l); continue; }
    if (VENUE_AT.test(l) && /,/.test(l)) {                                    // "Title, Author, Author, Proc. ACM SIGCOMM 2002."
      const v = VENUE_AT.exec(l), head = l.slice(0, v.index), commas = [...head.matchAll(/,\s+/g)].map((c) => c.index);
      const k = commas.find((c) => { const who = names(head.slice(c + 1)); return who.length && who.every(isPerson); });
      if (k !== undefined) { add(head.slice(0, k), l.slice(k + 1), l, l); continue; }
      skipped.push(`${year}: not read: ${l.slice(0, 80)}`);
    }
  }
  return { entries, skipped };
}

// NeurIPS's own blog posts announcing a Test of Time paper where the virtual site's award page does not (2022, 2024). Two shapes: "The awarded papers are:" followed by title and authors
// lines (2024), and a sentence in the "Test of Time Award" section — `… “Title” by A, B, and C, aka “…” was unanimously selected` (2022). The year is the post's (its address).
export function parseNeuripsBlogTot(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").trim()).filter(Boolean);
  const year = parseInt((/blog\.neurips\.cc\/(\d{4})\//.exec(source) || [])[1], 10);
  const add = (title, who, evidence) => {
    const t = cleanTitle(title);
    if (who.length && who.every(isPerson) && t.length >= 8) entries.push({ ...entry("NeurIPS", year, "Test of Time Award", t, who, source, `NeurIPS ${year} Test of Time Award: ${evidence}`) });
    else skipped.push(`${year}: not read: ${evidence.slice(0, 80)}`);
  };
  for (let i = 0; i < ls.length; i++) {
    if (/awarded papers are:?$/i.test(ls[i])) {
      for (let j = i + 1; j + 1 < ls.length && ls[j].length < 140 && !/\.$/.test(ls[j]); j += 2) {
        const who = names(ls[j + 1].replace(/\s+and\s+/g, ", and "));
        if (!who.length || !who.every(isPerson)) break;
        add(ls[j], who, `${ls[j]} — ${ls[j + 1]}`);
      }
      break;
    }
  }
  if (!entries.length) {
    const k = ls.findIndex((l) => /^Test of Time Award$/i.test(l));
    for (let i = k < 0 ? ls.length : k + 1; i < Math.min(ls.length, k + 4); i++) {
      const m = /[“"]([^”"]{8,})[”"]\s+by\s+(.+?)(?:,?\s+(?:aka|was|which)\b|\.\s)/.exec(ls[i]);
      if (m) add(m[1], names(m[2].replace(/\s+and\s+/g, ", and ")), `${m[1]} by ${m[2]}`);
    }
  }
  return { entries, skipped };
}

// The NIPS 2018 conference book (a PDF; read from its extracted text, e.g. `swift` + PDFKit, one line per line of the page): the Tuesday schedule names the Test of Time talk —
// "Test Of Time Award: Leon Bottou, Olivier Bousquet" and, on the next line, the paper ("The Tradeoffs of Large-Scale Learning"). The virtual site has no page for 2018.
export function parseNipsBookTot(text, source = PAGES["nips-book-2018"]) {
  const entries = [], skipped = [];
  const ls = String(text).split("\n").map((x) => x.normalize("NFC").trim()).filter(Boolean);
  for (let i = 0; i + 1 < ls.length; i++) {
    const m = /^Test Of Time Award:\s*(.+)$/i.exec(ls[i]);
    if (!m || !/,/.test(m[1]) || /^\d/.test(ls[i + 1])) continue;                 // (the programme overview prints the authors after the time, the title two lines on)
    const who = names(m[1]), title = cleanTitle(ls[i + 1]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ ...entry("NeurIPS", 2018, "Test of Time Award", title, who, source, `NIPS 2018 conference book, Tuesday schedule: Test Of Time Award: ${m[1]} — ${title}`) });
    else skipped.push(`not read: ${ls[i].slice(0, 60)}`);
  }
  return { entries, skipped };
}

// A test-of-time page on a conference's virtual site (icml.cc/virtual/2021/test-of-time/<id>) whose award page lists no row for it (ICML 2021): the page's <title> is
// "ICML Test Of Time <paper title>", and the paper's own heading is followed by the authors, "A ⋅ B". The year is the one in the address.
export function parseVirtualTotDetail(html, source) {
  const entries = [], skipped = [];
  const venue = ({ "icml.cc": "ICML", "neurips.cc": "NeurIPS", "nips.cc": "NeurIPS", "iclr.cc": "ICLR" })[new URL(source).host.replace(/^www\./, "")];
  const year = parseInt((/\/virtual\/(\d{4})\//.exec(source) || [])[1], 10);
  const raw = String(html);
  const tm = /<title>\s*[A-Za-z]+\s+Test Of Time\s+([^<]+?)\s*<\/title>/i.exec(raw);
  if (!venue || !year || !tm) return { entries, skipped: ["not a test-of-time page"] };
  const title = cleanTitle(tm[1].replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "’"));
  const lines = raw.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").split(/<[^>]+>/).map((x) => x.replace(/&nbsp;/g, " ").trim()).filter(Boolean);
  const at = lines.findIndex((l) => cleanTitle(l).toLowerCase() === title.toLowerCase());
  const authorLine = at >= 0 ? lines[at + 1] : "";
  const who = /⋅|·/.test(authorLine || "") ? authorLine.split(/\s*[⋅·]\s*/).map((n) => n.trim()).filter(Boolean) : [];
  if (who.length && who.every(isPerson)) entries.push({ ...entry(venue, year, "Test of Time Award", title, who, source, `${venue} ${year} test of time page: ${title} — ${authorLine}`) });
  else skipped.push(`not read: ${title} / ${authorLine}`);
  return { entries, skipped };
}

// DAC's Most Influential Paper award page (www.dac.com/2027/dac-most-influential-papers-award, "Past Winners"): per year a heading "2024 DAC Most Influential Paper (MIP) Award Winner(s)",
// then per paper a line with the title in quotation marks (2023 prefixes a decade: `1960s "Sketch pad …"`) and a line `by Authors, [14th DAC,] 1977.` (a stray parenthesis, the paper's year and its DAC
// number are in the author line; affiliations in parentheses in the newest).
export function parseDacMip(html, source = PAGES.dac) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").trim()).filter(Boolean);
  const start = ls.findIndex((l) => /^Past Winners$/i.test(l));
  let year = null;
  for (let i = Math.max(0, start); i < ls.length; i++) {
    const l = ls[i];
    const h = /^((?:19|20)\d{2}) DAC Most Influential Paper/i.exec(l);
    if (h) { year = parseInt(h[1], 10); continue; }
    if (year && /^View Profile$/i.test(l)) break;
    if (!year || !/^by\s/i.test(l) || i === 0) continue;
    const tl = /^(?:\d{4}s\s+)?[“"”](.+?)[”"“]\s*$/.exec(ls[i - 1]);
    if (!tl) { skipped.push(`${year}: not read: ${ls[i - 1].slice(0, 60)}`); continue; }
    const py = (/((?:19|20)\d{2})\.?\s*$/.exec(l) || [])[1];
    const parts = l.replace(/^by\s+/i, "").replace(/[.,\s]*(?:19|20)\d{2}\.?\s*$/, "").replace(/\([^()]*\)/g, " ").replace(/\)/g, " ").split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((x) => x.replace(/\s+/g, " ").trim().replace(/\.$/, (m, off, str) => (/\b\p{Lu}$/u.test(str.slice(0, off)) ? "." : ""))).filter((x) => x && !/^\d+(?:st|nd|rd|th)\s+DAC$/i.test(x) && !/^(?:19|20)\d{2}$/.test(x));
    if (parts.length && parts.every(isPerson)) entries.push({ ...entry("DAC", year, "Most Influential Paper Award", cleanTitle(tl[1]), parts, source, `DAC ${year} Most Influential Paper Award: “${tl[1]}” ${l}`, py ? parseInt(py, 10) : null) });
    else skipped.push(`${year}: not read: ${l.slice(0, 80)}`);
  }
  return { entries, skipped };
}

// UbiComp / ISWC's awards page of a year (ubicomp.org/ubicomp-iswc-<year>/awards/; the year is in the address, only the newest years carry the paper awards): "IMWUT Distinguished Paper Awards" with
// title / authors line pairs, and the UbiComp 10-Year Impact Award ("Winner" or "Overall Winner:", then "Runner Up"), each a title line, an authors line (affiliations in brackets) and a paragraph on the paper.
// The ISWC Test of Time list on the same page is read from ISWC's own source, and the student, poster, demo and design awards are not paper awards.
const SECTION_END = /^(?:Design Exhibition|Best Poster Awards?|Best Demo Awards?|Gaetano Bor?r?iello|ISWC Test of Time)/i;
export function parseUbicompAwards(html, source) {
  const entries = [], skipped = [];
  const year = parseInt((/ubicomp-iswc-(\d{4})/.exec(source) || [])[1], 10);
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const start = ls.findIndex((l, i) => i > 30 && /^Awards$/.test(l));
  let section = null, sub = "winner";
  const add = (award, label, title, authorLine) => {
    const who = kddAuthors(authorLine), t = cleanTitle(title);
    if (who.length && t.length >= 8) entries.push({ venue: "UbiComp", year, award, awardLabel: label, title: t, authors: who, track: "main", source, evidence: `UbiComp ${year} ${label}: ${t} — ${authorLine}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)} / ${authorLine.slice(0, 50)}`);
  };
  for (let i = Math.max(0, start); i < ls.length; i++) {
    const l = ls[i];
    if (SECTION_END.test(l)) { section = null; continue; }
    if (/^IMWUT Distinguished Paper Awards?$/i.test(l)) { section = "distinguished"; continue; }
    if (/^(?:UbiComp )?(?:10-Year|Ten-Year) Impact Award$/i.test(l)) { section = "impact"; sub = "winner"; continue; }
    if (!section) continue;
    if (section === "impact") {
      if (/^(?:Overall )?Winner:?$/i.test(l)) { sub = "winner"; continue; }
      if (/^Runners?[- ]?up:?$/i.test(l)) { sub = "runner-up"; continue; }
      if (ls[i + 2] && l.length >= 8 && l.length < 200 && !/^(?:Overall )?Winner|^Runners?/i.test(l) && !SECTION_END.test(ls[i + 1]) && kddAuthors(ls[i + 1]).length && !/^[A-Z][^.]{0,40}\([^)]*\)$/.test(l)) {
        add(sub === "winner" ? "tot" : "runner-up", sub === "winner" ? "10-Year Impact Award" : "10-Year Impact Award Runner-up", l, ls[i + 1]);
        i += 1;                                                                        // (a paragraph on the paper may follow; it is no title, so it is passed over)
      }
    } else if (kddAuthors(ls[i + 1] || "").length && l.length >= 8 && /\.$/.test(l) && !kddAuthors(l).length) {
      add("distinguished", "IMWUT Distinguished Paper Award", l, ls[i + 1]);
      i += 1;
    }
  }
  return { entries, skipped };
}

// The ICDM series' own Best Paper Awards page (icdm.zhonghuapu.com/Awards/BestPapers.shtml — the series home kept by the ICDM steering committee): per year a heading "IEEE ICDM 2024 Best Paper Awards:", category
// lines ("Best Paper Award", "Best Student Paper Runner-Up", "Best Application Paper Award:", 2007's "Theoretical/Algorithms Category:" …) and per paper a title (it may wrap), a line "by Authors" (or "by" alone, the
// authors wrap, a bracketed affiliation line may follow). 2010 and 2013 write the authors first ("A, B, and C," then the title). 2008 and 2009 run category, title and authors together in one paragraph and are not read.
export function parseIcdmBest(html, source = PAGES.icdm) {
  const entries = [], skipped = [];
  const ls0 = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  // 2008 starts a paper on its category line ("Best Application Paper Award: “Interpreting"): the category is a line of its own, the rest follows
  const ls = ls0.flatMap((l) => { const m = /^((?:Best (?:Theoretical\/Algorithms |Application |Student )?Papers? Awards?|(?:Theoretical\/Algorithms|Applications) Category)):\s*(\S.*)$/.exec(l); return m && /^[“"]/.test(m[2]) ? [m[1] + ":", m[2]] : [l]; })
    .flatMap((l) => { const m = /^(.*[”"]),?\s+by\s+(\S.*)$/.exec(l); return m ? [m[1], "by " + m[2]] : [l]; });          // (2008: the title ends and the authors begin on one line)
  const yearRe = /^IEEE ICDM\s*'?((?:19|20)?\d{2}) Best Paper Awards?:?\s*(.*)$/i;
  const catRe = /^(?:Best (?:Research |Application |Student |Theoretical\/Algorithms )?Paper(?: Awards?)?(?: Runner-?up(?: Awards?)?)?|Best Paper (?:Award )?Runner-?up(?: Awards?)?|Best Paper Runner-?up Awards?|Runner-up for Best Research Paper Award|Honorable Mention|(?:Theoretical\/Algorithms|Applications?) Category|Best (?:Theoretical\/Algorithms|Application) Paper Award|Student Paper):?$/i;
  const isBy = (l) => /^by(?:\s|$)/i.test(l || "");
  const startsRecord = (i) => isBy(ls[i]) || isBy(ls[i + 1]) || isBy(ls[i + 2]) || (/^[“"][^”"]*$/.test(ls[i] || "") && isBy(ls[i + 3]));   // (a quotation that opens and runs over three lines)
  let year = null, top = "best", cat = null;
  const kindOf = (c) => /runner|honorable/i.test(c) ? "runner-up" : /student/i.test(c) ? "student" : /application/i.test(c) && !/category/i.test(c) ? "category" : "best";
  const add = (title, authorText, evidenceLine) => {
    const who = kddAuthors(authorText.replace(/\s+and\s+/g, ", and ")), t = cleanTitle(title.replace(/[,\s]+$/, "").replace(/^[“"]\s*(.*?)\s*[”"]$/, "$1").replace(/[,\s]+$/, ""));
    const name = cat.replace(/:$/, "");
    let award = kindOf(name), label = name;
    if (/category$/i.test(name)) { award = top === "runner" ? "runner-up" : "best"; label = (top === "runner" ? "Best Paper Runner-up (" : "Best Paper (") + name.replace(/\s*Category$/i, "") + ")"; }
    else if (top === "runner" && award !== "runner-up") { award = "runner-up"; label = "Best Paper Runner-up (" + name.replace(/^Best\s+|\s*Awards?$/gi, "") + ")"; }
    if (/Award|Category|[“”]/.test(t)) { skipped.push(`${year}: not read (category, title and authors run together): ${title.slice(0, 50)}`); return; }
    if (who.length && t.length >= 8) entries.push({ venue: "ICDM", year, award, awardLabel: label, title: t, authors: who, track: "main", source, evidence: `ICDM ${year} ${label}: ${t} — ${evidenceLine}` });
    else skipped.push(`${year}: not read: ${t.slice(0, 50)} / ${authorText.slice(0, 50)}`);
  };
  // a year whose papers run together after their category labels ("Best Application Paper Award: A, B, and C, Title …": 2009) has no "by" line: read it as one paragraph, the names being the leading entries
  // (two to four words each) up to the first entry that is not a name
  const labelRe = /(Best (?:Theoretical\/Algorithms |Application |Student )?Papers? Awards?|Best Paper Runner-Up Awards|(?:Theoretical\/Algorithms|Applications) Category|Student Paper):/g;
  const runTogether = (blockLines) => {
    const text = blockLines.join(" ").replace(/\s+/g, " ");
    const marks = [...text.matchAll(labelRe)];
    for (let n = 0; n < marks.length; n++) {
      const body = text.slice(marks[n].index + marks[n][0].length, n + 1 < marks.length ? marks[n + 1].index : text.length).trim();
      const label = marks[n][1];
      if (/^Best Paper Awards?$/i.test(label)) { top = "best"; }
      if (/Runner-Up Awards/i.test(label)) { top = "runner"; }
      if (!body || /^Best Paper (?:Awards?|Runner-Up Awards)$/i.test(label)) continue;
      if (!/category|^Student Paper$/i.test(label)) top = /runner/i.test(label) ? "runner" : "best";
      const pieces = body.split(/(,\s+(?:and\s+)?|\s+and\s+)/);
      let k = 0;
      for (; k < pieces.length; k += 2) { const nm = pieces[k].trim(); const w = nm.split(" ").length; if (!isPerson(nm) || w < 2 || w > 4) break; }
      if (k >= 2 && k < pieces.length) { cat = label + ":"; add(pieces.slice(k).join("").replace(/\.$/, ""), pieces.slice(0, k).join(""), body.slice(0, 80)); }
    }
  };
  const blocks = [];
  for (let i = 0; i < ls.length; i++) { const y = yearRe.exec(ls[i]); if (y) blocks.push({ from: i, year: y[1].length === 2 ? 2000 + parseInt(y[1], 10) : parseInt(y[1], 10) }); }
  const skip = new Set();
  blocks.forEach((b, n) => {
    const to = n + 1 < blocks.length ? blocks[n + 1].from : ls.length, inner = ls.slice(b.from + 1, to);
    if (!inner.some((x) => isBy(x)) && inner.filter((x) => /^Best .*Award:\s*\S/.test(x)).length >= 2) { year = b.year; top = "best"; cat = "Best Paper Award"; runTogether(inner); for (let q = b.from; q < to; q++) skip.add(q); }
  });
  for (let i = 0; i < ls.length; i++) {
    if (skip.has(i)) continue;
    const l = ls[i];
    const y = yearRe.exec(l);
    if (y) {
      year = y[1].length === 2 ? 2000 + parseInt(y[1], 10) : parseInt(y[1], 10); top = "best"; cat = "Best Paper Award";
      if (y[2] && !catRe.test(y[2].replace(/^Best Paper Award:\s*/i, "") + ":") && y[2].length > 12) ls.splice(i + 1, 0, y[2].replace(/^Best Paper Award:?\s*/i, ""));   // (2005 starts the title on the heading line)
      continue;
    }
    if (!year) continue;
    if (/^Best Paper Awards:$/i.test(l)) { top = "best"; continue; }
    if (catRe.test(l)) {
      cat = l;
      if (!/category/i.test(l) && !/^Student Paper/i.test(l)) top = /runner|honorable/i.test(l) ? "runner" : "best";      // (a category line under "Runner-Up Awards" keeps the runner-up context)
      continue;
    }
    if (!cat || /^IEEE ICDM/i.test(l) || /^\(/.test(l)) continue;
    // the record starting here: either "Title / by Authors" or "Authors, / Title"
    if (startsRecord(i)) {
      let j = i; const title = [];
      while (j < ls.length && !isBy(ls[j])) title.push(ls[j++]);
      const auth = [/^by\s*(.*)$/i.exec(ls[j] || "")[1]]; j++;
      while (j < ls.length && !yearRe.test(ls[j]) && !catRe.test(ls[j]) && !/^\(/.test(ls[j]) && !startsRecord(j)) auth.push(ls[j++]);
      while (j < ls.length && /^\(/.test(ls[j])) j++;                                                  // (a bracketed affiliation line)
      add(title.join(" "), auth.join(" "), auth.join(" "));
      i = j - 1;
    } else if (!kddAuthors(l).length && l.length >= 12 && (kddAuthors(ls[i + 1] || "").length >= 3 || (/,/.test(ls[i + 1] || "") && kddAuthors(ls[i + 1]).length >= 2)) && !catRe.test(ls[i + 1]) && !yearRe.test(ls[i + 1])) {   // "Title" then "A, B, and C" (2012's best paper)
      add(l, ls[i + 1], ls[i + 1]);
      i += 1;
    } else if (/,$/.test(l) && kddAuthors(l).length) {                                             // authors first
      let j = i + 1; const title = [];
      while (j < ls.length && !yearRe.test(ls[j]) && !catRe.test(ls[j]) && !(/,$/.test(ls[j]) && kddAuthors(ls[j]).length)) title.push(ls[j++]);
      add(title.join(" "), l, l);
      i = j - 1;
    }
  }
  return { entries, skipped };
}

// ACM SIGGRAPH's own blog posts "SIGGRAPH <year> Technical Papers Awards: Best Papers, Honorable Mentions, and Test-of-Time" (blog.siggraph.org; one post per year, the address is passed as the third argument):
// sections "Best Papers", "Honorable Mentions" and (from 2023) "Test-of-Time Awards"; per paper a title line (the test-of-time ones end in "(2014)", the paper's year), maybe a line with the abstract, and a line of
// authors — plain "A, B, C" in the newer posts, "A, Affiliation; B, Affiliation, Affiliation; C, D, Affiliation" in 2022's (the names are the leading entries of each group before an affiliation).
const ORG = /\b(?:University|Universit\p{L}*|Univ|Fondazione|Foundation|Devices|ICREA|ELLIS|Institute|Institut|Research|Lab|Labs|Laboratory|Inc|Corporation|Corp|College|School|Center|Centre|Technologies|Technology|NVIDIA|Adobe|Google|Microsoft|Meta|Disney|Pixar|Autodesk|Apple|Tencent|Alibaba|Huawei|Intel|Amazon|ETH|EPFL|MIT|CNRS|Inria|Studios?|Games|Systems|Academy|Polytechnique|Zürich|Zurich|Studio)(?![\p{L}])/u;
function siggraphAuthors(line) {
  const t = line.replace(ZW, "").replace(/\s+/g, " ").trim().replace(/[;,.\s]+$/, "");
  if (!t || t.length > 600 || /\p{Ll}{2}[.!?]\s+\p{Lu}/u.test(t)) return [];                    // (a sentence of the abstract is not a name list; an initial's full stop — "Gregory S. Johnson" — is no sentence end)
  const who = [];
  for (const group of t.split(/\s*;\s*/)) {
    for (const tok of group.split(/\s*,\s*(?:and\s+)?|\s+and\s+/)) {
      if (!tok || ORG.test(tok) || !isPerson(tok) || tok.split(" ").length < 2 || tok.split(" ").length > 4) break;   // (an affiliation ends the names of this group)
      who.push(tok);
    }
  }
  return who;
}
export function parseSiggraphAwards(html, source = PAGES.siggraph) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const year = parseInt((/^SIGGRAPH (\d{4}) Technical Papers Awards/.exec(ls.find((l) => /^SIGGRAPH \d{4} Technical Papers Awards/.test(l)) || "") || [])[1], 10);
  if (!year) return { entries, skipped: ["no heading"] };
  let section = null;
  const SECTIONS = { "Best Papers": ["best", "Best Paper"], "Honorable Mentions": ["runner-up", "Honorable Mention"], "Test-of-Time Awards": ["tot", "Test-of-Time Award"] };
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (SECTIONS[l] && i > 40) { section = SECTIONS[l]; continue; }
    if (!section) continue;
    if (/^(?:Register for|Related Posts|Thank you)/i.test(l)) break;
    if (/^ACM SIGGRAPH is proud/.test(l)) continue;
    // a title line is followed (at once, or after an abstract paragraph) by the authors' line
    let k = i + 1;
    const authors = [];
    for (; k <= i + 2 && k < ls.length; k++) { const w = siggraphAuthors(ls[k]); if (w.length && !SECTIONS[ls[k]]) { authors.push(...w); break; } if (ls[k].length < 120 && !/\.$/.test(ls[k])) break; }
    if (!authors.length || l.length < 6 || l.length > 220 || SECTIONS[l]) continue;
    const py = (/\((\d{4})\)\s*$/.exec(l) || [])[1];
    const title = cleanTitle(l.replace(/\s*\(\d{4}\)\s*$/, ""));
    entries.push({ venue: "SIGGRAPH", year, award: section[0], awardLabel: section[1], title, authors, track: "main", source, evidence: `SIGGRAPH ${year} ${section[1]}: ${title} — ${authors.join(", ")}`, ...(py ? { paperYear: parseInt(py, 10) } : {}) });
    i = k;
  }
  return { entries, skipped };
}

// SIGMOBILE's "Past Recipients of the MobiCom Best Paper Award" page (beta.sigmobile.org/articles/mobicom-best-paper-award; written in 2017, so it stops at 2012): two lists, the Best Paper Award (2008–2012) and the
// Best Student Paper Awards (1995–2007); per paper a line "2011E-MiLi: Energy-Minimizing Idle Listening in Wireless Networks" (the year runs into the title) and a line of authors with their affiliations in brackets.
export function parseMobicomBest(html, source = PAGES.mobicom) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  let section = null;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (/^Past Recipients of the MobiCom Best Paper Award$/i.test(l)) { section = ["best", "MobiCom Best Paper Award"]; continue; }
    if (/^Past Recipients of the MobiCom Best Student Paper Awards?$/i.test(l)) { section = ["student", "MobiCom Best Student Paper Award"]; continue; }
    if (/^Nomination Process$/i.test(l) && section && i > 20) break;
    const m = /^((?:19|20)\d{2})\s*(\S.+)$/.exec(l);
    if (!section || !m) continue;
    const who = kddAuthors(ls[i + 1] || ""), title = cleanTitle(m[2].replace(/[,\s]+$/, ""));
    if (who.length && title.length >= 8) entries.push({ venue: "MobiCom", year: parseInt(m[1], 10), award: section[0], awardLabel: section[1], title, authors: who, track: "main", source, evidence: `${section[1]} ${m[1]}: ${title} — ${ls[i + 1]}` });
    else skipped.push(`${m[1]}: not read: ${title.slice(0, 50)} / ${(ls[i + 1] || "").slice(0, 50)}`);
    i += 1;
  }
  return { entries, skipped };
}

// The Web Conference's own awards page of a year (www<year>.thewebconf.org/awards or /program/awards; the year is in the address — only the years whose site still answers and is laid out this way are read):
// the heading "Best Paper Award", the paper's title, maybe its track, and the authors — one line each with the affiliation on the next (2022), or one line with the affiliations as superscript numbers (2024) —
// up to the committee or the next award.
export function parseWwwBest(html, source) {
  const entries = [], skipped = [];
  const year = parseInt((/www(\d{4})\.thewebconf\.org/.exec(source) || [])[1], 10);
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const at = ls.findIndex((l, i) => i > 20 && /^Best Paper Award$/i.test(l));
  if (!year || at < 0) return { entries, skipped: ["no best paper heading"] };
  const title = cleanTitle(ls[at + 1] || "");
  const who = [];
  for (let i = at + 2; i < ls.length; i++) {
    const l = ls[i];
    if (/Committee|Test of Time|^Best (?:Student )?Paper|Track$|^\(/i.test(l) && who.length) break;
    if (/Track$/.test(l)) continue;
    const plain = l.replace(/\s*\d+(?:\s*,\s*\d+)*(?=\s*(?:,|$))/g, "");
    for (const tok of plain.split(/\s*,\s*(?:and\s+)?|\s+and\s+/)) { if (tok && !ORG.test(tok) && isPerson(tok) && tok.split(" ").length >= 2 && tok.split(" ").length <= 4) who.push(tok); }
    if (who.length >= 12) break;
  }
  if (who.length && title.length >= 8) entries.push({ venue: "WWW", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `The Web Conference ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
  else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  return { entries, skipped };
}

// The Supercomputing conference's awards page of a year (sc<yy>.supercomputing.org/program/awards/ — only the current year's page answers; the earlier years' answer 403 and are not worked around): under
// "Best Paper Award", "Best Student Paper Award" and "Best Reproducibility Advancement Award" a line `“Title”, Authors with affiliations; …`, and under "Test of Time Award" a line `Authors, “Title” SC05: Proceedings …`.
// The poster, cluster-competition and early-career awards are not paper awards.
export function parseScAwards(html, source = PAGES.sc) {
  const entries = [], skipped = [];
  const year = 2000 + parseInt((/sc(\d{2})\.supercomputing\.org/.exec(source) || [])[1], 10);
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const SECTIONS = { "Best Paper Award": ["best", "Best Paper Award"], "Best Student Paper Award": ["student", "Best Student Paper Award"], "Best Reproducibility Advancement Award": ["category", "Best Reproducibility Advancement Award"], "Test of Time Award": ["tot", "Test of Time Award"] };
  let section = null;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (SECTIONS[l] && i > 30) { section = SECTIONS[l]; continue; }
    if (/^(?:Best Research Poster Award|Student Cluster Competition|ACM Gordon Bell|Gordon Bell|Early Career|ACM\/IEEE|HPC Ph\.?D|Best Poster)/i.test(l)) { section = null; continue; }
    if (!section) continue;
    let m = /^[“"]([^”"]{8,})[”"],\s*(.+)$/.exec(l), title, authors;
    if (m) { title = m[1]; authors = siggraphAuthors(m[2]); }
    else if ((m = /^(.+?),\s*[“"]([^”"]{8,})[”"]\s*SC\s?(\d{2})\b/.exec(l))) { title = m[2]; authors = siggraphAuthors(m[1]); }
    else continue;
    const py = (/\bSC\s?(\d{2})\b/.exec(l) || [])[1];
    if (authors.length) entries.push({ venue: "SC", year, award: section[0], awardLabel: section[1], title: cleanTitle(title), authors, track: "main", source, evidence: `SC${String(year).slice(2)} ${section[1]}: ${title} — ${authors.join(", ")}`, ...(section[0] === "tot" && py ? { paperYear: 2000 + parseInt(py, 10) } : {}) });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// A MobiCom year's own awards page (www.sigmobile.org/mobicom/<year>/awards.html — only 2015 and 2025 have one; the 2016 address serves 2015's page again, so the year is taken from the page's title): the headings
// "Best Paper Award", "Best Community Paper Award" and "Best Artifact Award" (the video, poster and reviewer awards are not paper awards), the title (it may wrap) and the authors with their affiliations in brackets
// (one per line in 2015, one line in 2025). The address is the third argument.
export function parseMobicomYear(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  // (a SIGMOBILE newsletter's report on the conference — "ACM MobiCom 2017 was wrapped up last week …" — names the year too)
  const year = parseInt((/^MobiCom (\d{4}):/.exec(ls[0] || "") || /ACM MobiCom (\d{4}) was wrapped up/.exec(ls.join("\n")) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the title"] };
  // the newsletter lists them as "Best paper: Title. Authors (Affiliation); Authors (Affiliation)." and "Best community paper: …"
  for (const l of ls) {
    const n = /^Best (community )?paper:\s*(.+)$/i.exec(l);
    if (!n) continue;
    const cuts = [...n[2].matchAll(/\.\s+/g)].map((c) => c.index);
    const at = cuts.find((c) => n[2].slice(c + 1).trim().length > 5 && kddAuthors(n[2].slice(c + 1)).length >= 1 && /\(/.test(n[2].slice(c + 1)));
    if (at === undefined) { skipped.push(`${year}: not read: ${n[2].slice(0, 50)}`); continue; }
    const t = cleanTitle(n[2].slice(0, at)), who = kddAuthors(n[2].slice(at + 1));
    if (who.length && t.length >= 8) entries.push({ venue: "MobiCom", year, award: n[1] ? "category" : "best", awardLabel: n[1] ? "Best Community Paper Award" : "Best Paper Award", title: t, authors: who, track: "main", source, evidence: `MobiCom ${year} ${n[1] ? "best community paper" : "best paper"}: ${t} — ${who.join(", ")}` });
  }
  // the award headings the pages use over the years (video, poster, demo and reviewer awards are not paper awards)
  const kindOf = (l) => {
    const h = l.replace(/:$/, "");
    if (/^Best (?:Community (?:Paper|Contributions?)|Artifact)(?: Awards?)?$/i.test(h)) return ["category", h.replace(/Contributions?$/i, "Paper").replace(/ Awards?$/i, "") + " Award"];
    if (/^Best (?:Community (?:Paper|Contributions?)(?: Awards?)?|Paper(?: Awards?)?) (?:Runner-?ups?|Honorable Mention)$/i.test(h)) return ["runner-up", h.replace(/Runner-?ups?/i, "Runner-up").replace(/Contributions?/i, "Paper")];
    if (/^Best Paper(?: Awards?)?$/i.test(h)) return ["best", "Best Paper Award"];
    return null;
  };
  const stop = (l) => /^(?:Best (?:Video|Poster|Demo|Artifact Reviewer)|Best Artifact Awards?|Honou?rable|News|Program|Registration|Sponsors?|Keynotes?)\b/i.test(l);
  const bracket = (l) => l.replace(/\(([^()]*)$/, "($1)");
  const peopleOf = (l) => kddAuthors(bracket(l), true);
  const authorLine = (l) => /\(/.test(l) && l.length < 700 && peopleOf(l).length > 0;
  const continuation = (l) => /^and\s/i.test(l) || (/\)/.test(l) && !/^[A-Z][^()]{3,}:/.test(l));
  // 2018's keynotes-and-awards page (sigmobile.org/mobicom/2018/keynotes.php) writes each award on one line: "Best Paper Award Winner: Title by Authors (Affiliation), …"
  for (const l of ls) {
    const w = /^(Best (?:Community )?Paper Award) Winner:\s*(.+?)\s+by\s+(.+)$/.exec(l);
    if (!w) continue;
    const who = kddAuthors(w[3]), t = cleanTitle(w[2]);
    if (who.length && t.length >= 8) entries.push({ venue: "MobiCom", year, award: /Community/.test(w[1]) ? "category" : "best", awardLabel: w[1], title: t, authors: who, track: "main", source, evidence: `MobiCom ${year} ${w[1]} Winner: ${t} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${t.slice(0, 50)}`);
  }
  const start = ls.findIndex((l, i) => i > 15 && kindOf(l));
  let kind = null;
  for (let i = Math.max(0, start); i < ls.length; i++) {
    const l = ls[i];
    const k = kindOf(l);
    if (k) { kind = k; continue; }
    if (stop(l)) { kind = null; continue; }
    if (!kind) continue;
    // a title (it may wrap over two lines) followed by the authors' line; abstract paragraphs and wrapped author lines are passed over
    const title = [l];
    let j = i + 1;
    while (j < ls.length && !authorLine(ls[j]) && !kindOf(ls[j]) && !stop(ls[j]) && title.length < 3 && ls[j].length < 120) title.push(ls[j++]);
    if (!authorLine(ls[j] || "")) continue;
    const who = peopleOf(ls[j]);
    const t = cleanTitle(title.join(" "));
    const clean = who.length && t.length >= 8 && !/Award|Runner|Honou?rable|Mention|[()]|^[a-z]/.test(t) && !/[.:]$/.test(t);
    if (clean) entries.push({ venue: "MobiCom", year, award: kind[0], awardLabel: kind[1], title: t, authors: who, track: "main", source, evidence: `MobiCom ${year} ${kind[1]}: ${t} — ${who.join(", ")}` });
    else if (t) skipped.push(`${year}: not read: ${t.slice(0, 50)}`);
    i = j;
    while (i + 1 < ls.length && continuation(ls[i + 1])) i++;
    while (i + 1 < ls.length && ls[i + 1].length >= 160) i++;                                         // (the abstract)
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
  const [kind, file, srcUrl] = process.argv.slice(2);
  const venues = { popl: "POPL", pldi: "PLDI", icfp: "ICFP", oopsla: "OOPSLA" };
  const parse = venues[kind] ? (h, src) => parseSigplan(h, venues[kind], src) : RAS[kind] ? (h, src) => parseRas(h, RAS[kind], src) : { www: parseWww, isca: parseIsca, micro: parseMicro, dijkstra: parseDijkstra, focs: parseFocs, sigops: parseSigopsHof, eurosys: parseEurosysTot, aamas: parseAamas, ec: parseEcTot, asplos: parseAsplosMip, iacr: parseIacrTot, tcc: parseTccTot, sigmobile: parseSigmobileTot, sensys: parseSensysTot, pkc: (h, src) => parseTccTot(h, src, "PKC"), ches: parseChesTot, hpca: parseHpcaTot, imc: parseImcTot, vis: parseVisTot, icde: parseIcdeInfluential, ismar: parseIsmarAwards, icse: parseIcseMip, lics: parseLicsTot, "lics-dp": parseLicsDistinguished, aaai: parseAaaiClassic, icaps: parseIcapsInfluential, swsa: parseSwsaTenYear, sigmm: parseSigmmTot, ht: parseHtEngelbart, doceng: parseDocengBest, newton: parseSigdaNewton, sigspatial: parseSigspatial, sigcse: parseSigcseTot, icwsm: parseIcwsmAwards, etaps: parseEtapsTot, "etaps-bp": parseEtapsBest, gecco: parseGeccoImpact, "kdd-bp": parseKddBest, "kdd-tot": parseKddTot, sigcomm: parseSigcommTot, "nips-book-2018": parseNipsBookTot, dac: parseDacMip, "mobicom-year": parseMobicomYear, sc: parseScAwards, "www-best": parseWwwBest, mobicom: parseMobicomBest, siggraph: parseSiggraphAwards, icdm: parseIcdmBest, ubicomp: parseUbicompAwards, "icml-tot-2021": (h, src) => parseVirtualTotDetail(h, src), "neurips-2022": parseNeuripsBlogTot, "neurips-2024": parseNeuripsBlogTot }[kind];
  if (!parse) { console.error("usage: tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const { entries, skipped } = parse(html, srcUrl || PAGES[kind]);
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
