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
// Modes added after the table above (each documented on the function it names; the address is the third argument where a year's page has its own address, see PAGES for a sample):
//   asplos-year  sigcomm-year  colt-year  corl-year  rss-year  sosp-program  ppopp-year  cikm-year  wsdm-year  eurosp  infocom  ipdps  ics      one conference page per year, in the layout of that year
//   recsys  aistats  uai  icassp  coling  interspeech  ecml  ecir                                                                              a conference's own best-papers / awards page
//   mobisys-year  mobicom-year  sc  www-best  mobicom  siggraph  icdm  ubicomp  icml-tot-2021  neurips-2022  neurips-2024  nips-book-2018  dac
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
  "mobisys-year": "https://www.sigmobile.org/mobisys/2017/program.php",
  "asplos-year": "https://www.asplos-conference.org/awards/",
  "sigcomm-year": "https://conferences.sigcomm.org/sigcomm/2024/program/",
  "colt-year": "https://learningtheory.org/colt2024/awards.html",
  "corl-year": "https://2025.corl.org/program/awards",
  "rss-year": "https://roboticsconference.org/2022/program/awards/",
  "sosp-program": "https://sosp2023.mpi-sws.org/program.html",
  recsys: "https://recsys.acm.org/best-papers/",
  aistats: "https://aistats.org/aistats2025/awards.html",
  uai: "https://auai.org/uai2025/best_papers",
  icassp: "https://2023.ieeeicassp.org/best-paper-awards/",
  coling: "https://coling2025.org/program/best_papers/",
  interspeech: "https://interspeech2024.org/best-paper-award-2024/",
  ecml: "https://ecmlpkdd.org/2025/awards/",
  infocom: "https://infocom2025.ieee-infocom.org/awards",
  eurosp: "https://www.ieee-security.org/TC/EuroSP2025/accepted_and_awards.html",
  "wsdm-year": "https://www.wsdm-conference.org/2020/",
  "ppopp-year": "https://ppopp23.sigplan.org/",
  ics: "https://ics2024.github.io/",
  ipdps: "https://www.ipdps.org/ipdps2024/",
  ecir: "https://ecir2025.eu/best-papers-award/",
  "focs-best": "https://focs.computer.org/2025/best-paper-awards/",
  "ccc-year": "https://www.computationalcomplexity.org/Archive/2025/program.html",
  "mobisys-html": "https://www.sigmobile.org/mobisys/2020/program/",
  "sensys-year": "https://sensys.acm.org/2024/program/",
  "isca-best": "https://iscaconf.org/isca2025/",
  "micro-best": "https://www.microarch.org/micro55/",
  "hri-year": "https://humanrobotinteraction.org/2025/awards/",
  "imc-year": "https://conferences.sigcomm.org/imc/2025/program/",
  "models-awards": "https://conf.researchr.org/track/models-2025/models-2025-awards",
  "jcdl-awards": "https://2025.jcdl.org/awards/",
  "gecco-best": "https://gecco-2025.sigevo.org/Best-Paper-Awards",
  "bmvc-awards": "https://bmvc2022.org/programme/paper-awards/",
  "vrst-best": "https://vrst.acm.org/vrst2024/",
  "assets-sui": "https://assets25.sigaccess.org/",
  "autoui-best": "https://www.auto-ui.org/24/",
  "acmmm-awards": "https://2025.acmmm.org/awards",
  "ieeevr-best": "https://ieeevr.org/2024/awards/conference-awards/",
  "icc-best": "https://icc2025.ieee-icc.org/program/best-paper-awards",
  "wcnc-best": "https://wcnc2024.ieee-wcnc.org/program/best-paper-awards",
  "globecom-best": "https://globecom2023.ieee-globecom.org/program/best-paper-awards",
  "chiir-best": "https://chiir2025.github.io/",
  sigcomm25: "https://conferences.sigcomm.org/sigcomm/2025/program/papers-info/",
  "ecml-authors-first": "https://2023.ecmlpkdd.org/awards",
  cidr: "https://cidrdb.org/cidr2025/awards.html",
  "www-year": "https://www2020.thewebconf.org/",
  "pimrc-best": "https://pimrc2025.ieee-pimrc.org/program/best-paper-awards",
  "ccnc-awards": "https://ccnc2025.ieee-ccnc.org/registration/awards",
  "noms-awards": "https://noms2025.ieee-noms.org/",
  "miccai-best": "https://conferences.miccai.org/2025/en/BEST-PAPER-AWARDS.html",
  "ecai-awards": "https://ecai2025.org/paper-awards/",
  "icdt-awards": "https://databasetheory.org/ICDT/awards",
  "eatcs-paper": "https://eatcs.org/index.php/best-esa-paper",
  "cade-awards": "https://cadeinc.org/Best-Paper-Award",
  "dsn-best": "https://www.dependability.org/?p=370",
  "tcfpga-best": "https://tcfpga.org/books/community-awards/page/fpga-best-paper-awards",
  "mccalla-awards": "https://ieee-ceda.org/awards/william-j-mccalla-award",
  "umap-best": "https://um.org/awards/best-paper-awards",
  "recomb-awards": "https://recomb.org/awards",
  "spaa-awards": "https://spaa.acm.org/best-paper-award/",
  "esweek-awards": "https://2024.esweek.org/?p=613",
  "hscc-past": "https://hscc.acm.org/2025/previous-hscc-editions/",
  "date-best": "https://past.date-conference.com/proceedings-archive/2018/html/date-best-papers-2018.pdf",
  "date-awards": "https://date24.date-conference.com/awards",
  "dac-best": "https://dac.com/press-release/the-61st-dac-chips-to-systems-conference-best-paper-awards",
  "ceda-paper": "https://ieee-ceda.org/paper-award/asp-dac-best-paper-award",
  "sca-awards": "https://computeranimation.org/awards",
  "middleware-awards": "https://middleware-conf.github.io/awards/best-paper/",
  "cp-awards": "https://www.a4cp.org/awards/paper-awards",
  "naacl-best": "https://naacl.org/naacl-hlt-2015/best-paper-awards.html",
  "ubicomp-sc": "https://ubicomp.org/sc/awards.html",
  "bpm-awards": "https://bpm-conference.org/awards/",
  "socg-awards": "https://computational-geometry.org/cg-week/awards/",
  "sat-awards": "https://satisfiability.org/SAT25/awards/",
  "cikm-year": "https://www.cikm2021.org/programme/best-paper-nominations",
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
  // 2014's front page: under "Awards" / "Best Paper" a line per paper, "A, B, and C, Title (Winner)" or "(Runner-up)" — the names are the leading entries that are names, the first that is not starts the title
  const bpAt = ls.findIndex((l, i) => i > 10 && /^Best Paper$/.test(l) && /\((?:Winner|Runner-up)\)$/.test(ls[i + 1] || ""));
  if (bpAt >= 0) {
    for (let i = bpAt + 1; i < ls.length; i++) {
      const m = /^(.+)\s\((Winner|Runner-up)\)$/.exec(ls[i]);
      if (!m) break;
      const pieces = m[1].split(/(\s*,\s*(?:and\s+)?|\s+and\s+)/);
      let k = 0;
      while (k < pieces.length && (k % 2 === 1 || isPerson(pieces[k].trim()))) k++;
      if (k < pieces.length && k % 2 === 1) k--;
      const who = pieces.slice(0, k).filter((_, q) => q % 2 === 0).map((x) => x.trim()), t = cleanTitle(pieces.slice(k).join("").replace(/^[\s,]+/, "").replace(/^and\s+/, ""));
      if (who.length && t.length >= 8 && k < pieces.length) entries.push({ venue: "MobiCom", year, award: m[2] === "Winner" ? "best" : "runner-up", awardLabel: m[2] === "Winner" ? "Best Paper Award" : "Best Paper Runner-up", title: t, authors: who, track: "main", source, evidence: `MobiCom ${year} Best Paper (${m[2]}): ${who.join(", ")}, ${t}` });
      else skipped.push(`${year}: not read: ${m[1].slice(0, 50)}`);
    }
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

// A MobiSys year's own program page (www.sigmobile.org/mobisys/<year>/program.php, 2011's front page; the address is the third argument): under "Awards" the heading "Best Paper" (or "Best Paper Runner Up"), then per paper a title line and an authors' line
// with the affiliations in brackets; 2011 writes `Best Paper - "Title" by Authors.` The poster, demo and video awards and the journal special section that follows are not read. Only the years laid out like this are read (2011–2015, 2016, 2017, 2019).
export function parseMobisysYear(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\t+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/^MobiSys (\d{4})\s*[-:]/.exec(ls[0] || "") || [])[1] || (/mobisys\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the title"] };
  const add = (award, label, t0, who) => {
    const t = cleanTitle(t0);
    if (who.length && t.length >= 8) entries.push({ venue: "MobiSys", year, award, awardLabel: label, title: t, authors: who, track: "main", source, evidence: `MobiSys ${year} ${label}: ${t} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${t.slice(0, 50)}`);
  };
  for (const l of ls) {                                                                   // 2011's form
    const m = /^Best Paper\s*[-–]\s*["“](.+?)["”]\s+by\s+(.+?)\.?$/.exec(l);
    if (m) add("best", "Best Paper Award", m[1], kddAuthors(m[2]));
  }
  const heading = (l) => (/^Best Papers?(?: Award)?$/.test(l) ? ["best", "Best Paper Award"] : /^Best Paper Runner[- ]?Up$/i.test(l) ? ["runner-up", "Best Paper Runner-up"] : null);
  const start = ls.findIndex((l, i) => i > 10 && /^(?:Awards|Program|Technical Program)$/.test(ls[i - 1] || "") && heading(l));
  let kind = null;
  for (let i = Math.max(0, start); i < ls.length && start >= 0; i++) {
    const l = ls[i], k = heading(l);
    if (k) { kind = k; continue; }
    if (/^(?:Best (?:Poster|Demo|Video|Student|Paper Nominees)|IEEE Transactions|Public review|Advance Program|Free Access)/i.test(l)) break;
    if (!kind) continue;
    if (!/\(/.test(l) && /\(/.test(ls[i + 1] || "")) {                                    // a title, then the authors' line
      const who = kddAuthors(ls[i + 1], true);
      if (who.length) add(kind[0], kind[1], l, who); else skipped.push(`${year}: not read: ${l.slice(0, 50)}`);
      i++;
    }
  }
  return { entries, skipped };
}

// An ASPLOS year's awards (www.asplos-conference.org/awards/ for the current year, asplos<year>/…/index.html for the others; the address is the third argument): under "Best Paper Awards" or "Distinguished Paper Awards" a title line and an authors' line
// (affiliations in brackets or not; "Spring / Summer / Fall" lines between), under "Influential Paper Award(s)" the same with the paper's year ("… ASPLOS 2009" or "(ASPLOS 2013)") closing the title; 2022 prints each paper on one line, "Title, Authors."
// The honorable mentions (titles only), the artifact awards and the distinguished reviewers are not read.
export function parseAsplosYear(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim()).filter(Boolean);
  const year = parseInt((/asplos(\d{4})|\/(\d{4})\//.exec(source) || [])[1] || (/ASPLOS (\d{4})/.exec(ls[0] || "") || [])[1] || (/ASPLOS (20\d{2})/.exec(ls.slice(0, 40).join(" ")) || [])[1], 10);
  const SEC = (l) => (/^Best Paper Awards?$/i.test(l) ? ["best", "Best Paper Award"] : /^Distinguished Paper Awards?$/i.test(l) ? ["distinguished", "Distinguished Paper Award"] : /^(?:ASPLOS )?Influential Paper Awards?$/i.test(l) ? ["tot", "Influential Paper Award"] : null);
  const END = /^(?:Platinum Sponsors|Distinguished (?:Artifact|Reviewers)|ASPLOS \d{4} Distinguished Reviewers|Best Paper Honorable Mentions|Distinguished Artifact Evaluation|CARES|Proudly powered)/i;
  const add = (kind, title0, who) => {
    const py = (/\(?ASPLOS\s*(\d{4})\)?\.?\s*$/i.exec(title0) || [])[1];
    const t = cleanTitle(title0.replace(/[,\s]*\(?ASPLOS\s*\d{4}\)?\.?\s*$/i, "").replace(/,\s*$/, ""));
    if (who.length && t.length >= 8) entries.push({ venue: "ASPLOS", year, award: kind[0], awardLabel: kind[1], title: t, authors: who, track: "main", source, evidence: `ASPLOS ${year} ${kind[1]}: ${t} — ${who.join(", ")}`, ...(py && kind[0] === "tot" ? { paperYear: parseInt(py, 10) } : {}) });
    else skipped.push(`${year}: not read: ${t.slice(0, 50)}`);
  };
  if (!year) return { entries, skipped: ["no year"] };
  let kind = null;
  const starts = ls.map((l, i) => (SEC(l) && ls[i + 1] && !SEC(ls[i + 1]) && (kddAuthors(ls[i + 2] || "").length || /,\s+\p{Lu}[\p{L}.' -]+(?:,| and )/u.test(ls[i + 1]) || /\)$/.test(ls[i + 2] || "")) ? i : -1)).filter((i) => i >= 0);
  if (!starts.length) {
    // 2020: 'Best Paper Award:“Title”,' then 'by Authors (Affiliation), …' per paper; 2019: 'Announcing our Best Paper Winners:' then a title (maybe over two lines) and an authors' line per paper, up to the influential paper
    const BK = ["best", "Best Paper Award"];
    const from = ls.findIndex((l) => /^Best Paper Award:\s*[“"]/.test(l) || /^Announcing our Best Paper Winners:?$/i.test(l));
    if (from < 0) return { entries, skipped: ["no award section"] };
    let title = "";
    for (let i = from; i < ls.length && !/^(?:ASPLOS Influential|Virtual ASPLOS|Follow Us)/i.test(ls[i]); i++) {
      const l = ls[i].replace(/^Best Paper Award:\s*/, "");
      const q = /^[“"](.+?)[”"],?$/.exec(l);
      if (q) { title = q[1]; continue; }
      const by = /^by\s+(.+)$/i.exec(l);
      if (by && title) { add(BK, title, kddAuthors(by[1])); title = ""; continue; }
      if (/^Announcing/i.test(l)) continue;
      if (!by && !q && year === 2019) {
        const who = kddAuthors(l, true);
        if (who.length >= 2 && title) { add(BK, title, who); title = ""; } else title = (title + " " + l).trim();
      }
    }
    return { entries, skipped };
  }
  for (let i = starts[0]; i < ls.length; i++) {
    const l = ls[i];
    const k = SEC(l);
    if (k) { kind = k; continue; }
    if (END.test(l) || (kind && /^Proudly/.test(l))) { kind = null; continue; }
    if (!kind) continue;
    // one-line form (2022): "Title, Authors."
    const next = ls[i + 1] || "";
    if (kddAuthors(next, true).length && !SEC(next) && !END.test(next)) { add(kind, l, kddAuthors(next, true)); i++; continue; }
    const tl = /,\s*ASPLOS\s*(\d{4})\.?$/.exec(l);
    const pieces = (tl ? l.slice(0, tl.index) + (tl ? "" : "") : l).split(/(,\s+)/);
    for (let c = 2; c < pieces.length; c += 2) {
      const tail = pieces.slice(c).join("").replace(/\.$/, "");
      const who = kddAuthors(tail);
      if (who.length >= 1 && pieces.slice(0, c - 1).join("").length >= 8 && !kddAuthors(pieces.slice(0, c - 1).join("")).length && (/ and /.test(tail) || who.length >= 2)) { add(kind, pieces.slice(0, c - 1).join("") + (tl ? ` (ASPLOS ${tl[1]})` : ""), who); break; }
    }
  }
  return { entries, skipped };
}

// SIGCOMM 2024's program page (conferences.sigcomm.org/sigcomm/2024/program/): under "Awards" the lines "Best Paper:<title>" and "Best Student Paper:<title>"; each paper's own entry further down is "<title> Research Track" and an authors' line.
// The honorable mentions are not read, and no other year's page names its awards.
export function parseSigcommProgram(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const year = parseInt((/sigcomm\/(\d{4})\//.exec(source) || [])[1], 10);
  for (const l of ls) {
    const m = /^Best (Student )?Paper:\s*(.{8,})$/.exec(l);
    if (!m) continue;
    const title = cleanTitle(m[2]);
    const at = ls.findIndex((x) => x === title + " Research Track");
    const raw = at >= 0 ? (ls[at + 1] || "").replace(/\([^()]*\)/g, " ").split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").trim()).filter(Boolean) : [];
    const who = raw.length && isPerson(raw[0]) && raw.every((n) => /^\p{L}[\p{L}.'’-]*(?: \p{L}[\p{L}.'’-]*)+$/u.test(n)) ? raw : [];   // (a lower-case "kc Claffy" is a person too)
    const kind = m[1] ? ["student", "Best Student Paper Award"] : ["best", "Best Paper Award"];
    if (who.length) entries.push({ venue: "SIGCOMM", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `SIGCOMM ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: authors not found: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// A COLT year's own "Paper Awards" page (learningtheory.org/colt<year>/awards.html): headings "Best paper(s)", "Best student paper(s)", "... runner(s)-up", then per paper a title and an authors' line ("Family, Given; Family, Given" or "Given Family; Given Family"),
// or, for 2021, one line "Title, by Family, Given; ...". Only 2021, 2022 and 2024 are read: the 2023 page is a copy of 2022's, so it is not trusted.
export function parseColtAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").trim()).filter(Boolean);
  const year = parseInt((/^COLT (\d{4}) - Paper Awards/.exec(ls[0] || "") || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the title"] };
  const KIND = (l) => (/^Best student papers? runners?-up$/i.test(l) || /^Best papers? runners?-up$/i.test(l) ? ["runner-up", "Best Paper Runner-up"] : /^Best student papers?$/i.test(l) ? ["student", "Best Student Paper Award"] : /^Best papers?$/i.test(l) ? ["best", "Best Paper Award"] : null);
  const people = (t) => {
    const parts = t.split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);
    const swap = parts.length && parts.every((x) => (x.match(/,/g) || []).length === 1);
    const who = parts.map((x) => (swap ? x.replace(/^(.+?),\s*(.+)$/, "$2 $1") : x).replace(/\s+/g, " "));
    return who.length && who.every(isPerson) ? who : [];
  };
  const add = (kind, t0, who) => {
    const t = cleanTitle(t0);
    if (who.length && t.length >= 8) entries.push({ venue: "COLT", year, award: kind[0], awardLabel: kind[1], title: t, authors: who, track: "main", source, evidence: `COLT ${year} ${kind[1]}: ${t} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${t.slice(0, 50)}`);
  };
  let kind = null;
  for (let i = 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^Menu$/.test(l)) break;
    const k = KIND(l);
    if (k) { kind = k; continue; }
    if (!kind) continue;
    const one = /^(.{8,}?),\s+by\s+(.+)$/.exec(l);
    if (one) { add(kind, one[1], people(one[2])); continue; }
    if (ls[i + 1] && !KIND(ls[i + 1]) && ls[i + 1] !== "Menu") { add(kind, l, people(ls[i + 1])); i++; }
  }
  return { entries, skipped };
}

// A CoRL year's awards page (<year>.corl.org/program/awards; the address is the third argument): a heading ("Best Paper Awards", "Best Student Paper Award", "\"Outstanding Paper Award\" Winners for CoRL 2024"), then per paper a title line and a plain
// "Given Family, Given Family, …" authors' line. The finalist lists are not read. Only 2024 and 2025 are laid out like this (2020's page marks a winner among its nominees, 2021's names none).
export function parseCorlAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/(\d{4})\.corl\.org/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => (/^"?Outstanding Paper Award"? Winners/i.test(l) ? ["outstanding", "Outstanding Paper Award"] : /^Best Student Paper Awards?$/i.test(l) ? ["student", "Best Student Paper Award"] : /^Best Paper Awards?$/i.test(l) ? ["best", "Best Paper Award"] : null);
  const start = ls.findIndex((l, i) => ls[i - 1] === "Awards" && KIND(l));
  if (start < 0) return { entries, skipped: ["no awards list"] };
  let kind = null;
  for (let i = start; i < ls.length; i++) {
    const l = ls[i], k = KIND(l);
    if (k) { kind = k; continue; }
    if (/Finalists|^Report abuse|^Page details/i.test(l)) { kind = null; if (/^Report abuse/.test(l)) break; continue; }
    if (!kind || !ls[i + 1] || KIND(ls[i + 1])) continue;
    const who = ls[i + 1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).filter(Boolean);
    if (who.length && who.every(isPerson)) entries.push({ venue: "CoRL", year, award: kind[0], awardLabel: kind[1], title: cleanTitle(l), authors: who, track: "main", source, evidence: `CoRL ${year} ${kind[1]}: ${cleanTitle(l)} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${l.slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

// An RSS year's awards page (roboticsconference.org/<year>/program/awards/): under "Congratulations to the following people!" the headings "Best Paper Award", "Best Student Paper Award", "Best Systems Paper Award", each with a title line and an authors' line
// ("A, B, and C"; the 2021 student paper line separates two author groups with a semicolon). The finalist lists end the winners. Only 2021, 2022 and 2025 are read: 2020 lists nominees, 2023 and 2024 finalists, 2025 marks the winner among the finalists with a \"Winner:\" line after its paper.
export function parseRssAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/roboticsconference\.org\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => (/^Best Student Paper Award$/i.test(l) ? ["student", "Best Student Paper Award"] : /^Best Systems Paper Award$/i.test(l) ? ["best", "Best Systems Paper Award"] : /^Best Paper Award(?: \/ Best Systems Paper Award in Memory of Seth Teller)?$/i.test(l) ? ["best", "Best Paper Award"] : null);
  const start = ls.findIndex((l, i) => /^Congratulations to the following people!?$/.test(ls[i - 1] || "") && KIND(l));
  if (start < 0) {
    // 2025: "Outstanding … Award [Finalists]" headings, each paper a title line and an authors' line, and a "Winner: <heading>" line right after the paper that won
    const H = /^(Outstanding (?:Demo |Systems |Student )?Paper Award)(?: Finalists)?$/;
    const from = ls.findIndex((l, i) => ls[i - 1] === "Awards" && H.test(l) && /^Winner:|^[^:]+$/.test(ls[i + 1] || "") && ls.slice(i, i + 12).some((x) => /^Winner:/.test(x)));
    if (from < 0) return { entries, skipped: ["no award list"] };
    let label = null, last = null;
    for (let i = from; i < ls.length; i++) {
      const l = ls[i], h = H.exec(l);
      if (h) { label = h[1]; last = null; continue; }
      if (/^Award Committee/.test(l)) break;
      const w = /^Winner:\s*(.+)$/.exec(l);
      if (w) {
        if (last && w[1] === label) entries.push({ venue: "RSS", year, award: "outstanding", awardLabel: label, title: cleanTitle(last.title), authors: last.who, track: "main", source, evidence: `RSS ${year} ${label}: ${cleanTitle(last.title)} — ${last.who.join(", ")}` });
        else skipped.push(`${year}: winner line without its paper`);
        last = null; continue;
      }
      if (!label || !ls[i + 1] || H.test(ls[i + 1]) || /^Winner:/.test(ls[i + 1])) continue;
      const who = ls[i + 1].split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).filter(Boolean);
      if (who.length && who.every(isPerson)) { last = { title: l, who }; i++; } else last = null;
    }
    return { entries, skipped };
  }
  let kind = null;
  for (let i = start; i < ls.length; i++) {
    const l = ls[i], k = KIND(l);
    if (k) { kind = k; continue; }
    if (/Finalists|Nominees|^Outstanding|^Report abuse/i.test(l)) { kind = null; if (/Finalists|Nominees/.test(l)) break; continue; }
    if (!kind || !ls[i + 1] || KIND(ls[i + 1])) continue;
    const who = ls[i + 1].split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).filter(Boolean);
    if (who.length && who.every(isPerson)) entries.push({ venue: "RSS", year, award: kind[0], awardLabel: kind[1], title: cleanTitle(l), authors: who, track: "main", source, evidence: `RSS ${year} ${kind[1]}: ${cleanTitle(l)} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${l.slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

// A SOSP year's program page (sosp<year>.mpi-sws.org/program.html and the like; the year comes from the address): per talk the title, "Best Paper Award" (only on the awarded ones) and the authors with their affiliations in brackets.
// A talk without the award line is not read. (2024 names its three papers by title only, on the front page.)
export function parseSospProgram(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/sosp(\d{4})|sosp\/(\d{4})/.exec(source) || [])[1] || (/sosp(\d{4})|sosp\/(\d{4})/.exec(source) || [])[2], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  for (let i = 0; i < ls.length; i++) {                                                  // 2024: "Best Paper Award: Title" on the front page, the authors under the title on the accepted-papers page (both pages given, one after the other)
    const m = /^Best Paper Award:\s*(.{8,})$/.exec(ls[i]);
    if (!m) continue;
    const title = cleanTitle(m[1]), at = ls.findIndex((x, j) => j !== i && x === title);
    const who = at >= 0 ? names(ls[at + 1] || "") : [];
    if (who.length && who.every(isPerson)) entries.push({ venue: "SOSP", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `SOSP ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: authors not found: ${title.slice(0, 50)}`);
  }
  for (let i = 1; i + 2 < ls.length; i++) {
    if (!/^Best Paper Awards?$/i.test(ls[i + 1]) || /^(?:Paper|Best Paper Awards?|and|•)$/.test(ls[i])) continue;
    const title = cleanTitle(ls[i]), who = names(ls[i + 2]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "SOSP", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `SOSP ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// ACM RecSys's own best-paper page (https://recsys.acm.org/best-papers/): a year heading, then per paper a title line and "by Authors (Best Full Paper)" (or Best Long / Short / Student Paper, with "Runner-up").
// The honorable mentions and the best demo are not read.
export function parseRecsysBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  let year = null;
  for (let i = 0; i < ls.length; i++) {
    if (/^(?:19|20)\d{2}$/.test(ls[i]) && ls[i - 1] && /Since 2009|^RecSys Best Paper|^[^]*$/.test(ls[i - 1])) { year = parseInt(ls[i], 10); continue; }
    if (/^RecSys \d{4} \(/.test(ls[i]) || /^Workshops$/.test(ls[i])) { if (year) year = null; continue; }
    const m = year && /^by\s+(.+?)\s*\(([^()]*)\)\s*$/.exec(ls[i]);
    if (!m || i < 1) continue;
    const label = m[2], title = cleanTitle(ls[i - 1]);
    const kind = /runner-?up/i.test(label) ? ["runner-up", "Best Paper Runner-up"] : /student/i.test(label) ? ["student", "Best Student Paper Award"] : /^Best (?:Full |Long |Short )?Paper$/i.test(label) ? ["best", `Best ${label.replace(/^Best /i, "")} Award`] : null;
    if (!kind) continue;
    const who = names(m[1]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "RecSys", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `RecSys ${year} ${label}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// An AISTATS year's awards page (aistats.org/aistats<year>/awards.html): prose, "The AISTATS 2025 Best Paper Award goes to A and B for their paper Title." (the test of time award the same, for the paper of ten years before), or
// "Best Paper / Congratulations to A, B and C for their paper Title." (2021, 2022). The notable-paper lists of 2019 and 2020, the honorable mentions and the outstanding-student highlights are not awards and are not read.
export function parseAistatsAwards(html, source) {
  const entries = [], skipped = [];
  const text = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" ");
  const year = parseInt((/aistats(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const re = /(Test of Time|Best Student Paper|Best Paper)(?: Award)?\b[^.]*?(?:goes to|Congra\w+ to)\s+(.+?)\s+for (?:their|the) paper\s+(.+?)\.(?=\s+(?:The paper was|Congratulations|Honorable|Best |Outstanding|Talk |This site|Github|[A-Z][a-z]+ [A-Z]|$))/g;
  let m;
  while ((m = re.exec(text))) {
    const who = m[2].replace(/\([^()]*\)/g, " ").split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").trim()).filter(Boolean), title = cleanTitle(m[3]);
    const kind = /Test/.test(m[1]) ? ["tot", "Test of Time Award"] : /Student/.test(m[1]) ? ["student", "Best Student Paper Award"] : ["best", "Best Paper Award"];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "AISTATS", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `AISTATS ${year} ${kind[1]}: ${title} — ${who.join(", ")}`, ...(kind[0] === "tot" ? { paperYear: year - 10 } : {}) });
    else skipped.push(`${year}: not read: ${m[1]} / ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// A UAI year's awards page (auai.org/uai<year>/awards for 2023, auai.org/uai2025/best_papers): lines "Best Paper Award: Title, by A, B and C" (2023), or a heading "Best Paper Award:" and then a title line and an authors' line (2025);
// "Best Student Paper" and the runner-up awards likewise. Other years' pages name no awards.
export function parseUaiAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/uai(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const HEAD = /^((?:Best|Outstanding) (?:Student )?Paper(?: Runner-?up)?)(?: Award)?:\s*(.*)$/i;
  const add = (label, t0, a0) => {
    const who = a0.replace(/\([^()]*\)/g, " ").split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").trim()).filter(Boolean), title = cleanTitle(t0);
    const out = /^Outstanding/i.test(label), kind = /runner/i.test(label) ? ["runner-up", out ? "Outstanding Paper Runner-up" : "Best Paper Runner-up"] : /student/i.test(label) ? ["student", out ? "Outstanding Student Paper Award" : "Best Student Paper Award"] : out ? ["outstanding", "Outstanding Paper Award"] : ["best", "Best Paper Award"];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "UAI", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `UAI ${year} ${label}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  for (let i = 0; i < ls.length; i++) {
    const m = HEAD.exec(ls[i]);
    if (!m) continue;
    const inline = /^(.+?),?\s+by\s+(.+)$/.exec(m[2]);
    if (inline) add(m[1], inline[1], inline[2]);
    else if (!m[2] && ls[i + 1] && ls[i + 2] && !HEAD.test(ls[i + 1])) { add(m[1], ls[i + 1], ls[i + 2].replace(/^by\s+/i, "")); i += 2; }   // (2024 prints "by Authors" on its own line)
  }
  return { entries, skipped };
}

// An ICASSP year's best-paper page (2023.ieeeicassp.org/best-paper-awards/, 2024.ieeeicassp.org/awards/): the headings "Best Paper Award", "Best (Conference / Industry) Paper Award", "Best Student Paper Awards", each followed by title and authors' line pairs
// (the title in quotation marks in 2024). An authors' line with an affiliation among the names (the 2024 industry paper) is not read. Only 2023 and 2024 have such a page.
export function parseIcasspAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/(\d{4})\.ieeeicassp/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => (/^Best Student Paper Awards?$/i.test(l) ? ["student", "Best Student Paper Award"] : /^(?:Conference )?Best (?:Industry )?Paper Award(?: for Industry)?$/i.test(l) || /^Best Industry Paper Award$/i.test(l) ? ["best", l.replace(/^Conference /, "")] : null);
  const start = ls.findIndex((l, i) => KIND(l) && /^Best Paper Awards?$/.test(ls[i - 1] || "") === false && ls.slice(i, i + 3).length === 3 && !KIND(ls[i + 1]) && ls[i - 1] && /following papers were at the top/i.test(ls[i - 1]));
  if (start < 0) return { entries, skipped: ["no award list"] };
  let kind = null;
  for (let i = start; i < ls.length; i++) {
    const l = ls[i], k = KIND(l);
    if (k) { kind = k; continue; }
    if (/^Home$|^Sitemap$/.test(l)) break;
    if (!kind || !ls[i + 1] || KIND(ls[i + 1])) continue;
    const who = ls[i + 1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(l.replace(/^[“"]|[”"]$/g, ""));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ICASSP", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `ICASSP ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

// COLING 2025's best-paper page (coling2025.org/program/best_papers/): headings "Best Long Paper Awards", "Best Short ...", "Best Social Impact ...", "Best Low-Resource Language ...", "Best Dataset ...", "Outstanding Paper Awards", "Best Demonstration ...",
// each followed by title / authors' line pairs, with "Presentation" and video-player lines between. The page's table of contents (headings run into the first title) is not read.
export function parseColingAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/coling(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => { const m = /^((?:Best (?:Long|Short|Social Impact|Low-Resource Language|Dataset|Demonstration) Paper)|Outstanding Paper) Awards?$/.exec(l); return m ? [/^Outstanding/.test(m[1]) ? "outstanding" : /Long|Short/.test(m[1]) ? "best" : "category", m[1] + " Award"] : null; };
  const start = ls.findIndex((l, i) => KIND(l) && ls[i + 1] && !KIND(ls[i + 1]));
  if (start < 0) return { entries, skipped: ["no award list"] };
  let kind = null;
  for (let i = start; i < ls.length; i++) {
    const l = ls[i], k = KIND(l);
    if (k) { kind = k; continue; }
    if (/^Share on$/.test(l)) break;
    if (!kind || /^Presentation$|^Your browser does not support/.test(l) || !ls[i + 1]) continue;
    const who = ls[i + 1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(l);
    if (who.length && who.every(isPerson) && title.length >= 8) { entries.push({ venue: "COLING", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `COLING ${year} ${kind[1]}: ${title} — ${who.join(", ")}` }); i++; }
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// Interspeech 2024's best-paper page (interspeech2024.org/best-paper-award-2024/): the shortlist, "1. A, B, C & D – WINNERS" (the others without the word) and under it the paper's title. Only the winners are read.
export function parseInterspeechBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/interspeech(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  for (let i = 0; i + 1 < ls.length; i++) {
    const m = /^\d+\.\s*(.+?)\s*[–-]\s*WINNERS?$/.exec(ls[i]);
    if (!m) continue;
    const who = m[1].split(/\s*,\s*(?:and\s+|&\s*)?|\s+(?:and|&)\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(ls[i + 1]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "Interspeech", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `Interspeech ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// ECML PKDD 2025's awards page (ecmlpkdd.org/2025/awards/): headings "Test of Time", "Best Paper Research Track", "Best Student Paper Research Track", "Best Paper Applied Data Science Track", "Best Student Paper Applied Data Science Track",
// each followed by "Title, by A, B, C and D." Only this year's page names awards.
export function parseEcmlAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const ym = /ecmlpkdd\.org\/(\d{4})\//.exec(source) || /ecmlpkdd(\d{4})\./.exec(source) || [], year = parseInt(ym[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => (/^Test of Time$/i.test(l) ? ["tot", "Test of Time Award"] : /^Best Student Paper (?:Research|Applied Data Science) Track$/i.test(l) ? ["student", l + " Award"] : /^Best Paper (?:Research|Applied Data Science) Track$/i.test(l) ? ["best", l + " Award"] : null);
  // 2026's layout: "Best Paper Award - Research Track", "Best Student Paper Award – Research Track", "Test-of-Time Award", each followed by the title and the authors' line.
  // 2020's layout: "Best (Student) Machine Learning Paper Award" / "Best Data Mining Paper Award" / "Best Applied Data Science Paper Award", "Sponsored by …", the title, "Authors: A; B; C", the abstract; under "Winners" and then "Runners-up".
  const B = (l) => /^Best (Student )?Paper Award\s*[-\u2013]\s*(?:Research|Applied Data Science) Track$/i.exec(l) || /^Test-of-Time Award$/i.exec(l);
  if (ls.some(B)) {
    for (let i = 0; i < ls.length; i++) {
      const m = B(ls[i]);
      if (!m) continue;
      const tot = /^Test/i.test(ls[i]), student = !!m[1], title = cleanTitle(ls[i + 1] || ""), who = names(ls[i + 2] || "");
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ECML PKDD", year, award: tot ? "tot" : student ? "student" : "best", awardLabel: ls[i].replace(/\s+/g, " "), title, authors: who, track: "main", source, evidence: `ECML PKDD ${year} ${ls[i]}: ${title} — ${ls[i + 2]}`, ...(tot ? { paperYear: year - 10 } : {}) });
      else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
      i += 2;
    }
    return { entries, skipped };
  }
  if (ls.some((l) => /^Authors: /.test(l)) && ls.some((l) => /^Best (?:Student )?(?:Machine Learning|Data Mining|Applied Data Science) Paper Award$|^Best (?:\(Student\) )?Machine Learning Paper Award$/i.test(l))) {
    let label = null, runners = false;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      if (/^Runners?-up/i.test(l)) { runners = true; continue; }
      if (/^Test of Time/i.test(l) || /^Part of ECML/i.test(l)) break;   // (the test-of-time paper follows the runners-up)
      if (/^Best (?:\((Student)\) )?(?:Student )?(?:Machine Learning|Data Mining|Applied Data Science) Paper Award$/i.test(l)) { label = l; continue; }
      const am = label && /^Authors: (.+)$/.exec(ls[i + 1] || "");
      if (!am || /^Sponsored by|^Authors:|^Abstract:/.test(l)) continue;
      const who = names(am[1].replace(/;/g, ",")), title = cleanTitle(l), student = /Student/i.test(label);
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ECML PKDD", year, award: runners ? "runner-up" : student ? "student" : "best", awardLabel: runners ? `${label} (runner-up)` : label, title, authors: who, track: "main", source, evidence: `ECML PKDD ${year} ${label}${runners ? " (runner-up)" : ""}: ${title} — ${am[1]}` });
      else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
      i++;
    }
    return { entries, skipped };
  }
  let kind = null;
  for (const l of ls) {
    const k = KIND(l);
    if (k) { kind = k; continue; }
    const m = kind && /^(.{8,}?),\s+by\s+(.+?)\.?$/.exec(l);
    if (!m) { if (/^Twitter$/.test(l)) kind = null; continue; }
    const who = m[2].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(m[1]);
    if (who.length && who.every(isPerson)) entries.push({ venue: "ECML PKDD", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `ECML PKDD ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    kind = null;
  }
  return { entries, skipped };
}

// An INFOCOM year's awards page (infocom<year>.ieee-infocom.org/awards): under "<year> IEEE INFOCOM Best Paper Awards" a title and an authors' line per paper, in either order (2023 and 2024 print the authors first), the authors with their
// affiliations in brackets (2020: an affiliation line after the names). The first line decides the order, and the pairs are taken in turn. The best demo and poster awards, and the test of time papers, are not read.
export function parseInfocomBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/infocom(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const start = ls.findIndex((l) => /^(?:\d{4} )?IEEE INFOCOM (?:\d{4} )?Best Paper Awards?$/i.test(l));
  if (start < 0) return { entries, skipped: ["no award list"] };
  const AFF = /University|Universit[äay]|Institute|Laborator|Research|College|School|Technology|Company|Inc\b|Corporation|,\s*(?:USA|China|Canada|Germany|Spain|Italy|Japan|Korea|Hong ?kong|UK|United Kingdom|India|Singapore|Australia)\)?$/i;
  const asNames = (t) => { const w = t.replace(/\([^()]*\)/g, " ").split(/\s*[;,]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").trim()).filter(Boolean); return w.length && w.every(isPerson) ? w : null; };
  const items = [];
  for (let i = start + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/Best (?:Demo|Poster)|^Patrons|^Platinum|Test of Time|^IEEE INFOCOM \d{4} Best Paper Award$/i.test(l)) { if (items.length) break; continue; }
    const who = asNames(l);
    if (who) { if (items.length && items[items.length - 1].a && /,\s*$|\)\s*,\s*$/.test(ls[i - 1] || "")) items[items.length - 1].a.push(...who); else items.push({ a: who }); }
    else if (AFF.test(l) && !/[:?]/.test(l)) continue;
    else items.push({ t: l });
  }
  const authorsFirst = !!(items[0] && items[0].a);
  for (let k = 0; k + 1 < items.length; k += 2) {
    const a = authorsFirst ? items[k] : items[k + 1], t = authorsFirst ? items[k + 1] : items[k];
    if (a && a.a && t && t.t) { const title = cleanTitle(t.t); entries.push({ venue: "INFOCOM", year, award: "best", awardLabel: "Best Paper Award", title, authors: a.a, track: "main", source, evidence: `INFOCOM ${year} Best Paper Award: ${title} — ${a.a.join(", ")}` }); }
    else skipped.push(`${year}: pair not read at item ${k}`);
  }
  return { entries, skipped };
}

// An IEEE Euro S&P year's accepted-papers-and-awards page (www.ieee-security.org/TC/EuroSP<year>/accepted_and_awards.html): the headings "Distinguished Papers" / "Distinguished Paper Award (Winners)" / "Distinguished Paper Award Runners-Up",
// then per paper a title line and the authors with their affiliations in brackets, over one line or several ("Name" / "(Affiliation),"). A line with a bracket, or followed by a line that opens with one, belongs to the authors; the others are titles.
// The finalist lists, the outstanding presentation awards and the reviewers are not read.
export function parseEurospAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt(((/EuroSP(\d{4})/i.exec(source) || [])[1]), 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => (/^Distinguished Papers?$|^Distinguished Paper Awards?(?: Winners?)?$/i.test(l) ? ["distinguished", "Distinguished Paper Award"] : /^Test-of-Time Awards?$/i.test(l) ? ["tot", "Test of Time Award"] : /^Distinguished Paper Award Runners?-?Up$/i.test(l) ? ["runner-up", "Distinguished Paper Runner-up"] : null);
  const STOP = /^(?:Accepted Papers|IEEE Euro S&P \d{4}|Distinguished Paper Award Finalists|Noteworthy|Distinguished Reviewers|Outstanding)/i;
  const isAuth = (l, i) => /\(/.test(l) || /^\(/.test(ls[i + 1] || "");
  let kind = null, cur = null;
  const flush = () => {
    if (cur && cur.a.length) {
      const who = names(cur.a.join(" "));
      if (who.length && who.every(isPerson)) entries.push({ venue: "EuroS&P", year, award: kind[0], awardLabel: kind[1], title: cleanTitle(cur.t), authors: who, track: "main", source, evidence: `EuroS&P ${year} ${kind[1]}: ${cleanTitle(cur.t)} — ${who.join(", ")}`, ...(kind[0] === "tot" ? { paperYear: year - 10 } : {}) });
      else skipped.push(`${year}: not read: ${cur.t.slice(0, 50)}`);
    }
    cur = null;
  };
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i], k = KIND(l);
    if (k) { flush(); kind = k; continue; }
    if (STOP.test(l)) { flush(); kind = null; continue; }
    if (!kind) continue;
    if (isAuth(l, i)) { if (cur) cur.a.push(l); } else { flush(); cur = { t: l, a: [] }; }
  }
  flush();
  return { entries, skipped };
}

// A WSDM year's own front page (www.wsdm-conference.org/<year>/): its announcement of the awards, in the form of its year. 2018: headings "Best Paper Award", "Best Student Paper Award", "Test of Time Paper Award" then the title (over lines) and the authors (over lines);
// 2019 and 2020: "WSDM 2019 Best Paper Award Recipient:" then "\"Title\", by A, B and C." (the test of time paper "\"Title\", A and B, WSDM 2008."); 2021: "WSDM 2021 Best Paper Award Recipient" then "38: Title" and an authors' line, runners-up and test of time likewise.
// Honorable mentions, the industry day and the reviewers are not read. The other years' pages do not name the winners.
export function parseWsdmYear(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/wsdm-conference\.org\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const add = (kind, label, t0, who, paperYear) => {
    const title = cleanTitle(t0);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "WSDM", year, award: kind, awardLabel: label, title, authors: who, track: "main", source, evidence: `WSDM ${year} ${label}: ${title} — ${who.join(", ")}`, ...(paperYear ? { paperYear } : {}) });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  const KINDW = (h) => (/Test[ -]of[ -]Time/i.test(h) ? ["tot", "Test of Time Award"] : /Runner-?Up/i.test(h) ? ["runner-up", "Best Paper Runner-up"] : /Best Student/i.test(h) ? ["student", "Best Student Paper Award"] : ["best", "Best Paper Award"]);
  const H21 = /^WSDM \d{4} (?:Best Paper Award (?:Recipient|Runner-Up)|Test-of-time Award (?:Recipient|Runner-Up))$/i;
  if (ls.some((l) => H21.test(l))) {
    let k = null;
    for (let i = 0; i < ls.length; i++) {
      if (H21.test(ls[i])) { k = KINDW(ls[i]); continue; }
      if (/^WSDM \d{4} Sponsors/.test(ls[i])) break;
      if (!k || !ls[i + 1] || H21.test(ls[i + 1])) continue;
      const py = (/\(WSDM (\d{4})\)/.exec(ls[i + 1]) || [])[1];
      add(k[0], k[1], ls[i].replace(/^\d+:\s*/, ""), names(ls[i + 1]), k[0] === "tot" && py ? parseInt(py, 10) : null);
      i++;
    }
    return { entries, skipped };
  }
  const text = ls.join(" ");
  const re = /WSDM (\d{4}) (Best Paper Award Recipient|Best Paper Award Runner-Up|Test of Time Award Recipient):\s*["“](.+?)[,.]?["”],?\s*(?:by\s+)?(.+?)(?:,\s*WSDM (\d{4}))?\.(?=\s+(?:WSDM|Best|Outstanding|A WSDM|Links)|$)/g;
  let m, any = false;
  while ((m = re.exec(text))) { any = true; const k = KINDW(m[2]); add(k[0], k[1], m[3], names(m[4]), k[0] === "tot" && m[5] ? parseInt(m[5], 10) : null); }
  if (any) return { entries, skipped };
  const H18 = /^(Best Paper Award|Best Student Paper Award|Test of Time Paper Award)$/;
  const STOP = /^(?:Best Paper Honorable Mentions|Best Senior|Best Program|Best Paper Nominees|Test of Time Paper Award|Best Paper Award|Best Student Paper Award)/;
  for (let i = 0; i < ls.length; i++) {
    if (!H18.test(ls[i])) continue;
    let j = i + 1;
    const block = [];
    while (j < ls.length && !STOP.test(ls[j]) && block.length < 12) block.push(ls[j++]);
    for (let c = 1; c < block.length; c++) {                                       // the longest run of lines at the end that reads as the authors and opens with two words or more (a lone "Contexts" ends a title)
      const who = block[c].includes(" ") ? names(block.slice(c).join(" ")) : [];
      if (who.length && who.every(isPerson)) { const k = KINDW(ls[i]); if (!entries.some((e) => e.title === cleanTitle(block.slice(0, c).join(" ")))) add(k[0], k[1], block.slice(0, c).join(" "), who, k[0] === "tot" ? year - 10 : null); break; }
    }
  }
  return { entries, skipped };
}

// A PPoPP year's front page (ppopp<yy>.sigplan.org): under "Best Paper" / "Best Papers" / "Best Paper Award" a title line and an authors' line with the affiliations in brackets, per paper, up to the next heading ("Best Artifact", the tracks).
// Only 2021–2023 are read: 2020 prints the affiliations without brackets, and the front pages of 2024 and 2025 name no award.
export function parsePpoppYear(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const m0 = /ppopp(\d{2})\.sigplan\.org/.exec(source);
  if (!m0) return { entries, skipped: ["no year in the address"] };
  const year = 2000 + parseInt(m0[1], 10);
  const start = ls.findIndex((l) => /^Best Papers?(?: Award)?$/.test(l));
  if (start < 0) return { entries, skipped: ["no best paper list"] };
  for (let i = start + 1; i + 1 < ls.length; i += 2) {
    if (!/\(/.test(ls[i + 1]) || /\(/.test(ls[i])) break;
    const who = names(ls[i + 1]), title = cleanTitle(ls[i]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "PPoPP", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `PPoPP ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// CIKM 2021's best-paper page (www.cikm2021.org/programme/best-paper-nominations): per track a heading ("Full Papers", "Applied Papers", "Short Papers", "Resource Papers", "Demo Papers") and the nominated papers, a title line ending " ‐" (the winner
// marked "best paper " and the runners-up "runner up " before it) and one authors' line per author with the affiliation in brackets. The unmarked nominations are not read.
export function parseCikmNominations(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/cikm(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const TITLE = /\s(?:[\u2010-\u2015-]|&dash;)$/;
  for (let i = 0; i < ls.length; i++) {
    if (!TITLE.test(ls[i])) continue;
    const mk = /^(best paper|runner up)\s+(.+?)\s+(?:[\u2010-\u2015-]|&dash;)$/.exec(ls[i]);
    const au = [];
    let j = i + 1;
    while (j < ls.length && !TITLE.test(ls[j]) && /\(/.test(ls[j])) au.push(ls[j++]);
    if (mk) {
      const who = names(au.join(" ")), title = cleanTitle(mk[2]), kind = mk[1] === "best paper" ? ["best", "Best Paper Award"] : ["runner-up", "Best Paper Runner-up"];
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "CIKM", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `CIKM ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
      else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    }
    i = j - 1;
  }
  return { entries, skipped };
}

// ICS 2024's front page (ics2024.github.io): the headings "BEST PAPER AWARD" and "BEST PAPER AWARD RUNNER-UP", each followed by a title line and an authors' line with the affiliations in brackets (which may wrap onto a second line).
export function parseIcsAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/ics(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  for (let i = 0; i + 2 < ls.length; i++) {
    const h = /^BEST PAPER AWARD( RUNNER-UP)?$/.exec(ls[i]);
    if (!h) continue;
    let a = ls[i + 2], n = 3;
    while ((a.match(/\(/g) || []).length > (a.match(/\)/g) || []).length && ls[i + n]) a += " " + ls[i + n++];
    const who = names(a.replace(/;/g, ","));
    const title = cleanTitle(ls[i + 1]), kind = h[1] ? ["runner-up", "Best Paper Runner-up"] : ["best", "Best Paper Award"];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ICS", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `ICS ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// An IPDPS year's front page (www.ipdps.org/ipdps<year>/): "IPDPS 2024 Best Paper Award(s)", a line of words ("was presented to the authors of:"), then the title and the authors' line (with affiliations in brackets, or "Authors: A, B"). The candidates, the honorable
// mention, the open source contribution and poster awards are not read.
export function parseIpdpsBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/ipdps(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const i0 = ls.findIndex((l) => /^IPDPS \d{4} Best Paper Awards?$/.test(l));
  if (i0 < 0) return { entries, skipped: ["no best paper award"] };
  let i = i0 + 1;
  while (i < ls.length && (/^(?:The IPDPS \d{4} Best Paper|Presented during|BEST PAPER AWARD$)/i.test(ls[i]) || /presented to the authors/i.test(ls[i]))) i++;
  const title = cleanTitle(ls[i] || ""), who = names((ls[i + 1] || "").replace(/^Authors:\s*/, "").replace(/;/g, ","));
  if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "IPDPS", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `IPDPS ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
  else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  return { entries, skipped };
}

// ECIR 2025's best-papers page (ecir2025.eu/best-papers-award/): per award a label line ("Best Paper", "Best Short Student Paper", "Best Demo", "Best IR4Good Paper", "Best Reproducibility Paper", also with ", Honorable Mention"), then the authors' line
// ("A, B and C") and the title. The honorable mentions are not read. Only 2025's site has such a page.
export function parseEcirAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/ecir(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const start = ls.findIndex((l, i) => /^Best Papers Award$/.test(l) && /^Best (?:Demo|Paper)/.test(ls[i + 1] || ""));
  if (start < 0) return { entries, skipped: ["no award list"] };
  const LABEL = /^Best (?:Short |Student |Short Student )?Paper\b.*$|^Best (?:Demo|IR4Good Paper|Reproducibility Paper)$/;
  for (let i = start + 1; i + 2 < ls.length; i++) {
    if (/^Best Papers Committee/.test(ls[i])) break;
    if (!LABEL.test(ls[i])) continue;
    const label = ls[i];
    if (/Honou?rable/i.test(label)) { i += 2; continue; }
    const who = ls[i + 1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(ls[i + 2]);
    const base = label.replace(/\s*\(.*\)\s*$/, "");
    const kind = /Student/.test(base) ? ["student", base + " Award"] : /^Best (?:Short )?Paper$/.test(base) ? ["best", base + " Award"] : ["category", base + " Award"];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ECIR", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `ECIR ${year} ${base}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i += 2;
  }
  return { entries, skipped };
}

// FOCS 2025's best-paper page (focs.computer.org/2025/best-paper-awards/): the headings "Best Paper Award co-winners" and "Machtey Award for Best Student Paper co-winners", then per paper a title line and "Authors: A, B, and C" (or "Author: A").
// Only 2025's site has such a page; the other years' awards pages list the test of time papers (read from the TCMF page).
export function parseFocsBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/focs\.computer\.org\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => (/^Best Paper Award(?: co-winners)?$/i.test(l) ? ["best", "Best Paper Award"] : /^Machtey Award for Best Student Paper(?: co-winners)?$/i.test(l) ? ["student", "Machtey Award for Best Student Paper"] : null);
  let kind = null;
  for (let i = 0; i + 1 < ls.length; i++) {
    const k = KIND(ls[i]);
    if (k) { kind = k; continue; }
    if (/^Privacy Policy/.test(ls[i])) break;
    const a = /^Authors?:\s*(.+)$/.exec(ls[i + 1]);
    if (!kind || !a) continue;
    const who = a[1].replace(/\s*\([^()]*\)/g, "").split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(ls[i]);   // ("Mi-Ying (Miryam) Huang": the nickname goes)
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "FOCS", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `FOCS ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

// A CCC year's program page (www.computationalcomplexity.org/Archive/<year>/program.html): the winners are tagged in the schedule, in three forms: a title line, a line "(winner - Best paper award)" and the authors (2024, 2025); a title ending
// "(winner - Best paper award)" or "(co-winner Best student paper)" and the authors on the next line (2022); a line "Best student paper award" / "Best paper award" above the title and the authors (2020, 2021). Only the tagged talks are read.
export function parseCccProgram(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/Archive\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const TAG = /\(\s*(?:co-)?winner\s*-?\s*(Best (?:student )?paper(?: award)?)\s*\)/i;
  const HEAD = /^(Best (?:student )?paper(?: award)?)$/i;
  const add = (label, t0, a0) => {
    const who = a0.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(t0.replace(/\s*\(paper, talk\)\s*$/i, ""));
    const kind = /student/i.test(label) ? ["student", "Best Student Paper Award"] : ["best", "Best Paper Award"];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "CCC", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `CCC ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  for (let i = 0; i + 1 < ls.length; i++) {
    const inline = TAG.exec(ls[i]);
    if (inline && ls[i].replace(TAG, "").trim().length >= 8) { add(inline[1], ls[i].replace(TAG, "").trim(), ls[i + 1]); continue; }
    if (HEAD.test(ls[i]) && ls[i + 2] && !/^\d/.test(ls[i + 1])) { add(ls[i], ls[i + 1], ls[i + 2]); i += 2; continue; }
    const next = /^\(/.test(ls[i + 1] || "") ? TAG.exec(ls[i + 1]) : null;
    if (next && ls[i + 2]) {
      const TIME = /^\d{1,2}:\d{2}/;                                                    // a title that wraps starts right after the time line, one line earlier
      add(next[1], !TIME.test(ls[i - 1] || "") && TIME.test(ls[i - 2] || "") ? ls[i - 1] + " " + ls[i] : ls[i], ls[i + 2]);
      i += 2;
    }
  }
  return { entries, skipped };
}

// MobiSys 2020's, 2021's and 2023's program pages read from their HTML (www.sigmobile.org/mobisys/2020/program/, …/2021/program.html): under <h3>Best Paper Award</h3> a list item with the title in a <span> and the authors in <span class="authors"> with each affiliation in <span class="affl">.
// (The text-only reader cannot tell where such a title ends and the first author begins.) The honourable mentions that follow the next <h3> are not read.
export function parseMobisysHtml(html, source) {
  const entries = [], skipped = [];
  const year = parseInt((/mobisys\/(\d{4})\//.exec(source) || [])[1], 10);
  const h = /<h3>\s*<b>\s*Best Paper Award\s*<\/b>[\s\S]*?<\/h3>([\s\S]*?)(?=<h3>|$)/i.exec(html);
  const ty = (/<title>[^<]*MobiSys\s*(\d{4})/i.exec(html) || [])[1];
  if (ty && parseInt(ty, 10) !== year) return { entries, skipped: [`the page is titled ${ty}, not ${year}`] };
  if (year && !h) {
    const r3 = /<strong[^>]*>\s*Best Paper Award!\s*<\/strong>\s*<p>\s*<strong>([^<]+)<\/strong>\s*<br>\s*<em>([\s\S]*?)<\/em>/g;   // 2023: a red "Best Paper Award!" before a bold title and the authors in <em>
    let c, any = false;
    while ((c = r3.exec(html))) {
      any = true;
      const title = cleanTitle(text(c[1])), who = names(text(c[2]).replace(/;/g, ","));
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "MobiSys", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `MobiSys ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
      else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    }
    if (any) return { entries, skipped };
  }
  if (year && !h) {                                                                      // 2021: a "Best Paper!" badge before the linked title, the authors in <em> ("Name (Affiliation); Name (Affiliation)")
    // a page may keep the sessions of an earlier year beside its own (2022's has 2021's): a paper belongs to the page's year when its DOI shares the prefix most DOIs on the page have
    const prefixes = {};
    for (const d of html.matchAll(/doi\.org\/(10\.\d+\/\d+)\.\d+/g)) prefixes[d[1]] = (prefixes[d[1]] || 0) + 1;
    const home = Object.keys(prefixes).sort((x, y) => prefixes[y] - prefixes[x])[0];
    // the proceedings of each year whose page was checked (the prefix most DOIs carry on that year's own page); 2024's page repeats 2022's, so a prefix of another year is refused
    const PROCEEDINGS = { "10.1145/3458864": 2021, "10.1145/3498361": 2022 };
    if (!home || PROCEEDINGS[home] !== year) return { entries, skipped: [`${year}: the page's papers are of ${PROCEEDINGS[home] || "an unchecked year"} (${home})`] };
    const rb = /<strong>\s*Best Paper!\s*<\/strong>\s*<\/span>\s*<span class="new(?:-blue)?">\s*(?:<a [^>]*>([^<]+)<\/a>|<strong>([^<]+)<\/strong>)\s*<\/span>\s*<br>\s*<em>([\s\S]*?)<\/em>(?=([\s\S]{0,2500}))/g;
    let b;
    while ((b = rb.exec(html))) {
      const rest = b[4].split(/<strong>\s*Best Paper!/)[0], doi = (/doi\.org\/(10\.\d+\/\d+)\.\d+/.exec(rest) || /doi\.org\/(10\.\d+\/\d+)\.\d+/.exec(html.slice(b.index, b.index + 400)) || [])[1];
      const title = cleanTitle(text(b[1] || b[2])), who = names(text(b[3]).replace(/;/g, ","));
      if (home && doi !== home) { skipped.push(`${year}: ${title.slice(0, 40)} belongs to another year's proceedings (${doi})`); continue; }
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "MobiSys", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `MobiSys ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
      else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    }
    return { entries, skipped };
  }
  if (!year || !h) return { entries, skipped: ["no best paper block"] };
  const re = /<li>\s*<span>([^<]+)<\/span>\s*<ul>\s*<li>\s*<span class="authors">([\s\S]*?)<\/span>\s*<\/li>\s*<\/ul>\s*<\/li>/g;
  let m;
  while ((m = re.exec(h[1]))) {
    const title = cleanTitle(text(m[1])), who = names(text(m[2].replace(/<span class="affl">[\s\S]*?<\/span>/g, " ")));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "MobiSys", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `MobiSys ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// A SenSys year's own page (sensys.acm.org/<year>/, 2024's …/program/): 2020 and 2024 print "Best Paper Award(s)" / "Best Paper Runner-up Award" and then title and authors-with-brackets lines (2024 also a list of honorable mentions); 2021 prints
// "Best paper:" / "Best paper runner-up:", then `"Title" -` and the authors by initials. 2018's and 2019's pages name a title only. The page must say it is of that year (its <title> or a "SenSys <year>" line).
export function parseSensysYear(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/sensys\.acm\.org\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  if (!ls.some((l) => new RegExp(`SenSys ?['’]?${year}|SenSys ?${String(year).slice(2)}\\b|SenSys 20${String(year).slice(2)}`).test(l)) && !new RegExp(`SenSys ?${year}`).test(html.replace(/&#?\w+;/g, " "))) return { entries, skipped: [`the page does not say it is SenSys ${year}`] };
  const add = (runner, t0, a0) => {
    const who = names(a0.replace(/;/g, ",")), title = cleanTitle(t0.replace(/^["“]|["”]\s*-?\s*$/g, ""));
    const kind = runner ? ["runner-up", "Best Paper Runner-up"] : ["best", "Best Paper Award"];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "SenSys", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `SenSys ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  const HA = /^Best Paper(?: Awards?| Runner-up Award)$/i, HB = /^Best paper( runner-up)?:$/i;
  let runner = false, mode = null;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (HA.test(l)) { mode = "A"; runner = /runner/i.test(l); continue; }
    if (HB.test(l)) { mode = "B"; runner = !!HB.exec(l)[1]; continue; }
    if (mode && /^(?:Best Paper Honorable|Important Dates|Best Presentation|Regular papers|Keynote|Call for|Program Committee)/i.test(l)) { mode = null; continue; }
    if (mode === "A" && ls[i + 1] && /\(/.test(ls[i + 1]) && !/\(/.test(l)) { add(runner, l, ls[i + 1]); i++; }
    else if (mode === "B" && /^["“]/.test(l) && ls[i + 1]) { add(runner, l, ls[i + 1]); i++; }
  }
  return { entries, skipped };
}

// An ISCA year's front page (iscaconf.org/isca<year>/): under "<year> ISCA Best Paper Award" `"Title" by Authors` lines (2025; one reads "y" for "by", a typo of the page's) or, for 2024, a title line ending " by" and the authors by initials on the next line.
// The honorable mentions, the artifact awards and the other prizes of the page are not read.
export function parseIscaBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/isca(\d{4})/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const i0 = ls.findIndex((l) => new RegExp(`^${year} ISCA Best Paper Award$`).test(l));
  if (i0 < 0) return { entries, skipped: ["no best paper award"] };
  const add = (t0, a0) => {
    const who = names(a0), title = cleanTitle(t0.replace(/\s+by$/, ""));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ISCA", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `ISCA ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  for (let i = i0 + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^\d{4} (?:ISCA|TCCA|Maurice)|^\(For |^Get our/.test(l)) break;
    const q = /^[“"](.+?)[”"]\s+(?:by|y)\s+(.+)$/.exec(l);
    if (q) { add(q[1], q[2]); continue; }
    if (ls[i + 1] && !/^\d{4} ISCA/.test(ls[i + 1]) && !/^[“"]/.test(l)) { add(l, ls[i + 1]); i++; }
  }
  return { entries, skipped };
}

// MICRO 2022's home page (www.microarch.org/micro55/): under "Best Paper Awards" the authors, then `for "Title"`, both over several lines, one block per paper, up to "The other best paper nominees". The year comes from the page's title line ("MICRO 2022: Home").
export function parseMicroBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/^MICRO (\d{4})/.exec(ls[0] || "") || [])[1], 10);
  const a = ls.findIndex((l) => /^Best Paper Awards$/.test(l)), b = ls.findIndex((l, i) => i > a && /^The other best paper nominees/.test(l));
  if (!year || a < 0 || b < 0) return { entries, skipped: ["no best paper block"] };
  const text_ = ls.slice(a + 1, b).join(" ");
  const re = /(.+?),\s+for\s+["“](.+?)["”](?=\s|$)/g;
  let m;
  while ((m = re.exec(text_))) {
    const who = names(m[1]), title = cleanTitle(m[2]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "MICRO", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `MICRO ${year} Best Paper Award: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// An HRI year's awards page (humanrobotinteraction.org/<year>/awards/): 2025 prints under a track heading ("Full Papers", "Short Contributions", "alt.HRI", "Late Breaking Reports", "Demonstrations") the lines `Best paper: “Title“, Authors.`
// (and honorable mentions the same way); 2022 prints "Best Paper Award" under an area heading, then the title and the authors' line. The honorable mentions are not read. 2018's numbered list is laid out otherwise and is not read.
export function parseHriAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/humanrobotinteraction\.org\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const add = (track, t0, a0) => {
    const who = names(a0), title = cleanTitle(t0.replace(/^[“"]|[“”"]$/g, ""));
    const main = !track || /^(?:Full Papers|Short Contributions)$/.test(track);
    const kind = main ? ["best", "Best Paper Award"] : ["category", `Best Paper Award (${track})`];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "HRI", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `HRI ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  let track = null;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (/^(?:Full Papers|Short Contributions|alt\.HRI|Late Breaking Reports|Demonstrations)$/.test(l)) { track = l; continue; }
    if (/Outstanding Reviewers/.test(l)) break;
    const a = /^Best paper:\s*[“"](.+?)[“”"],\s*(.+?)\.?$/.exec(l);
    if (a) { add(track, a[1], a[2]); continue; }
    if (/^Best Paper Award$/.test(l) && ls[i + 1] && ls[i + 2] && year === 2022) { add(null, ls[i + 1], ls[i + 2]); i += 2; }
  }
  return { entries, skipped };
}

// An IMC year's program page (conferences.sigcomm.org/imc/<year>/program/): per paper a title line (ending "long", "short" or "Long" / "Short", maybe "video"), a line with the award ("Best Paper Award", "Best Student Paper Award", "Best Short Paper Award",
// "Distinguished Paper Award", or the award written after the title as "(Best Paper Award)" or "long - distinguished paper award") and the authors with their affiliations in brackets. The "Community Contribution Award" and the PC awards are not paper awards. The page's <title> must name the year.
export function parseImcProgram(html, source) {
  const entries = [], skipped = [];
  const year = parseInt((/imc\/(\d{4})\//.exec(source) || [])[1], 10);
  const ty = (/<title>[^<]*IMC\s*(\d{4})/i.exec(html) || [])[1];
  if (!year || (ty && parseInt(ty, 10) !== year)) return { entries, skipped: ["the page is not that year's"] };
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const MARK = /\s*[(-]?\s*(Best Paper|Best Student Paper|Best Short Paper|Distinguished Paper) Award\)?/i;      // inline after the title: "Title (Best Paper Award)", "Title  long - distinguished paper award"
  const tidy = (t) => t.replace(/\s*\(video\)\s*$/i, "").replace(/\s+(?:long|short)(?:\s+video)?\s*[-–]?\s*$/i, "").replace(/\s+video\s*$/i, "").replace(/\s*[-–]\s*$/, "");
  for (let i = 0; i + 1 < ls.length; i++) {
    let m = /^(Best Paper|Best Student Paper|Best Short Paper|Distinguished Paper) Award$/.exec(ls[i]), t0 = m ? ls[i - 1] : null;
    if (!m && ls[i].length > 25 && !/^(?:Abstract|Paper)$/.test(ls[i]) && ls[i + 1] && /\(/.test(ls[i + 1])) { const x = MARK.exec(ls[i]); if (x && x.index > 12) { m = x; t0 = ls[i].slice(0, x.index) + ls[i].slice(x.index + x[0].length); } }
    if (!m || !t0) continue;
    m[1] = m[1].replace(/^./, (c) => c.toUpperCase()).replace(/ paper/i, " Paper");
    const title = cleanTitle(tidy(t0.replace(/\s+(?:long|short)(?:\s+video)?\s*$/i, ""))), who = names(ls[i + 1].replace(/;/g, ","));
    const kind = /Student/.test(m[1]) ? ["student", "Best Student Paper Award"] : /Distinguished/.test(m[1]) ? ["distinguished", "Distinguished Paper Award"] : ["best", m[1] + " Award"];
    if (who.length && isPerson(who[0]) && who.every((n) => /^\p{L}[\p{L}.'’-]*(?: \p{L}[\p{L}.'’-]*)+$/u.test(n)) && title.length >= 8) entries.push({ venue: "IMC", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `IMC ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// MODELS 2025's awards track page (conf.researchr.org/track/models-2025/models-2025-awards): the headings "Best Foundation Paper", "ACM SIGSOFT Distinguished Paper Awards" and "Best Practice Track Paper", each with title and authors' line pairs
// ("A, B, C and D"; a line "(sponsored by …)" may follow a heading). The ten year most influential paper awards (their authors are written by initials) and the best reviewers are not read. The page's heading must name the year.
export function parseModelsAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/models-(\d{4})/.exec(source) || [])[1], 10);
  if (!year || !ls.some((l) => new RegExp(`^MODELS ${year}`).test(l))) return { entries, skipped: ["no year in the address or page"] };
  const KIND = (l) => (/^Best (?:Foundation|Practice Track|Technical|Research)\s*(?:Track )?Papers?$|^Best Paper$/i.test(l) ? ["best", l.replace(/s$/, "") + " Award"] : /^ACM SIGSOFT Distinguished Paper Awards?$/i.test(l) ? ["distinguished", "ACM SIGSOFT Distinguished Paper Award"] : null);
  const start = ls.findIndex((l) => /^MODELS \d{2} Awards$/.test(l));
  if (start < 0) return { entries, skipped: ["no awards list"] };
  let kind = null;
  for (let i = start + 1; i < ls.length; i++) {
    const l = ls[i], k = KIND(l);
    if (k) { kind = k; continue; }
    if (/^Best Reviewer|^Plenary$/.test(l)) break;
    if (/^(?:MODELS|SoSyM)\b.*most influential|^\(sponsored/i.test(l)) { if (/most influential/i.test(l)) kind = null; continue; }
    if (!kind || !ls[i + 1] || KIND(ls[i + 1])) continue;
    const who = ls[i + 1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean), title = cleanTitle(l);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "MODELS", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `MODELS ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

// JCDL 2025's awards page (2025.jcdl.org/awards/): the headings "Vannevar Bush Best Paper Award" and "Best Short Paper Award" (and a student paper heading if there is one), each followed by `“Title”` and an authors' line.
export function parseJcdlAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/(\d{4})\.jcdl\.org/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const KIND = (l) => (/^Vannevar Bush Best Paper Award$/i.test(l) ? ["best", "Vannevar Bush Best Paper"] : /^Best Short Paper Award$/i.test(l) ? ["category", "Best Short Paper Award"] : /^Best Student Paper Award$/i.test(l) ? ["student", "Best Student Paper Award"] : null);
  let kind = null;
  for (let i = 0; i + 1 < ls.length; i++) {
    const k = KIND(ls[i]);
    if (k) { kind = k; continue; }
    if (!kind || !/^[“"]/.test(ls[i])) continue;
    const title = cleanTitle(ls[i].replace(/^[“"]|[”"]$/g, "")), who = names(ls[i + 1]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "JCDL", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `JCDL ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    kind = null; i++;
  }
  return { entries, skipped };
}

// A GECCO year's best-paper page (gecco-<year>.sigevo.org/Best-Paper-Awards): after a menu of the tracks, a heading per track or group of tracks ("GA + SI Tracks", "ECOM Track") and under it the winning paper(s), a title line and an authors' line
// ("A, B, C", maybe with affiliations in brackets). The page's <title> must name the year.
export function parseGeccoBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/gecco-(\d{4})\.sigevo\.org/.exec(source) || [])[1], 10);
  const ty = (/<title>[^<]*GECCO (\d{4})/i.exec(html) || [])[1];
  if (!year || !ty || parseInt(ty, 10) !== year) return { entries, skipped: ["the page is not that year's"] };
  const HEAD = /^[A-Z][A-Za-z0-9-]*(?: \+ [A-Z][A-Za-z0-9-]*)* Tracks?$/;
  let track = null;
  for (let i = 0; i + 1 < ls.length; i++) {
    const l = ls[i];
    if (/^About$/.test(l)) break;
    if (HEAD.test(l)) { track = l; continue; }
    if (!track || HEAD.test(ls[i + 1]) || !ls[i + 1]) continue;
    if (/^(?:About|Social)$/.test(ls[i + 1])) break;
    const who = names(ls[i + 1].replace(/,(?=\S)/g, ", ")), title = cleanTitle(l);
    if (title.split(" ").length < 4) { track = null; continue; }                          // (the footer after the last paper: "Latest News", "GECCO Tweets")
    if (who.length && isPerson(who[0]) && who.every((n) => /^\p{L}[\p{L}.'’-]*(?: \p{L}[\p{L}.'’-]*)+$|^\p{L}[\p{L}.'’-]+$/u.test(n)) && title.length >= 8) entries.push({ venue: "GECCO", year, award: "best", awardLabel: `Best Paper Award (${track.replace(/ Tracks?$/, "")})`, title, authors: who, track: "main", source, evidence: `GECCO ${year} Best Paper Award, ${track}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

// A BMVC year's award announcement: 2022's paper awards page (bmvc2022.org/programme/paper-awards/) prints "Best Paper Award" / "Best Student Paper Award" and then title and authors-with-brackets lines (a continued bracket on its own line is joined);
// 2025's front page prints "The Best Paper Award was awarded to", the authors, and `for their paper "Title".` The honourable mentions and the best presentation and poster awards are not read. The page's year comes from its address.
export function parseBmvcAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/bmvc(\d{4})\./.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const add = (student, t0, a0) => {
    const who = names(a0.replace(/;/g, ",")), title = cleanTitle(t0.replace(/^[“"]|[”"]$/g, ""));
    const kind = student ? ["student", "Best Student Paper Award"] : ["best", "Best Paper Award"];
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "BMVC", year, award: kind[0], awardLabel: kind[1], title, authors: who, track: "main", source, evidence: `BMVC ${year} ${kind[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  for (let i = 0; i + 2 < ls.length; i++) {
    const l = ls[i];
    const h = /^Best (Student )?Paper Award$/.exec(l);
    if (h && ls[i + 1] && !/^(?:Best|Sponsors)/.test(ls[i + 1]) && /\(/.test(ls[i + 2] || "")) {          // 2022
      for (let j = i + 1; j + 1 < ls.length && !/^(?:Best|Sponsors|We are)/.test(ls[j]); j += 2) {
        let a = ls[j + 1], n = j + 2;
        while (ls[n] && /^\(/.test(ls[n])) a += " " + ls[n++];
        add(!!h[1], ls[j], a);
        j = n - 2;
      }
      continue;
    }
    const w = /^The Best (Student )?Paper Award was awarded to$/.exec(l);                  // 2025
    const f = w && /^for their paper\s+[“"](.+?)[”"]\.?$/.exec(ls[i + 2] || "");
    if (f) add(!!w[1], f[1], ls[i + 1]);
  }
  return { entries, skipped };
}

// A VRST year's home page (vrst.acm.org/vrst<year>/): under "Best Paper" (2025: "VRST 2025 Paper Awards" above it) a title line and an authors' line per paper, up to the next heading ("Best Paper – Honorable Mention", "Paper Honorable Mentions", "Best Poster", …).
// 2022 (a quoted title over lines) and 2023 (the authors before each title, a tie) have their own forms. The page's <title> must name the year.
export function parseVrstBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/vrst(\d{4})/.exec(source) || [])[1], 10);
  const ty = (/<title>[^<]*VRST (\d{4})/i.exec(html) || [])[1];
  if (!year || (ty && parseInt(ty, 10) !== year) || ![2022, 2023, 2024, 2025].includes(year)) return { entries, skipped: ["not a page this reader knows"] };
  const put = (t0, a0) => {
    const who = names(a0), title = cleanTitle(t0.replace(/^[“"]|[”"]$/g, ""));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "VRST", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `VRST ${year} Best Paper: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  if (year === 2023) {                                                                    // "Best Papers (tie):" then the authors and the title of each paper
    const j = ls.findIndex((l) => /^Best Papers \(tie\):$/.test(l));
    for (let i = j + 1; j >= 0 && i + 1 < ls.length && !/^Best |^Sponsors/.test(ls[i]); i += 2) put(ls[i + 1], ls[i]);
    return { entries, skipped };
  }
  if (year === 2022) {                                                                    // "Best paper award", the quoted title over one or two lines, then the authors, then "Abstract"
    const j = ls.findIndex((l) => /^Best paper award$/i.test(l));
    if (j >= 0) {
      let t = ls[j + 1], n = j + 2;
      while (t && !/["”]$/.test(t) && ls[n]) t += " " + ls[n++];
      put(t, ls[n] || "");
    }
    return { entries, skipped };
  }
  const i0 = ls.findIndex((l, i) => l === "Best Paper" && /^(?:Awards|VRST \d{4} Paper Awards)$/.test(ls[i - 1] || ""));
  if (i0 < 0) return { entries, skipped: ["no best paper list"] };
  for (let i = i0 + 1; i + 1 < ls.length; i += 2) {
    if (/Honorable|^Best |^Supporters|^Awards$/i.test(ls[i])) break;
    const who = names(ls[i + 1]), title = cleanTitle(ls[i]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "VRST", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `VRST ${year} Best Paper: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// ASSETS 2025's home page (assets25.sigaccess.org): under "Best Paper" and "Best Student Paper" the title over one or two lines, then one author per line (an asterisk after a name marks an affiliate, "Dr" a title) and the institution; the paper impact award is a ten-year award
// of another form and is not read. SUI 2024's home page (sui.acm.org/2024/): under "Best Paper Award" the authors ("A, B, and C") and then the title, per paper, up to the honorable mentions.
export function parseAssetsSuiAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const m = /(assets|sui)(?:\.acm\.org\/|(\d{2})\.sigaccess\.org)(\d{4})?/.exec(source);
  const venue = /sui/.test(source) ? "SUI" : "ASSETS", year = parseInt((/sui\.acm\.org\/(\d{4})/.exec(source) || /assets(\d{2})\./.exec(source) || [])[1], 10);
  const Y = venue === "ASSETS" ? 2000 + year : year;
  if (!m || !Y) return { entries, skipped: ["no year in the address"] };
  const put = (student, t0, who) => {
    const title = cleanTitle(venue === "SUI" ? t0 : t0);
    if (who.length && who.every((n) => isPerson(n)) && title.length >= 8) entries.push({ venue, year: Y, award: student ? "student" : "best", awardLabel: student ? "Best Student Paper Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `${venue} ${Y} ${student ? "Best Student Paper" : "Best Paper"}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${Y}: not read: ${title.slice(0, 50)}`);
  };
  const person = (l) => !/University|Institute|Laborator|College|School|Award|Impact|Research|Microsoft|Google|Affiliates/i.test(l) && isPerson(l.replace(/\*+$/, "").replace(/^Dr\.?\s+/i, ""));
  const clean = (l) => l.replace(/\*+$/, "").replace(/^Dr\.?\s+/i, "");
  if (venue === "ASSETS") {
    for (let i = 0; i < ls.length; i++) {
      const h = /^Best (Student )?Paper$/.exec(ls[i]);
      if (!h) continue;
      let j = i + 1;
      const t = [];
      while (j < ls.length && !person(ls[j]) && t.length < 3) t.push(ls[j++]);
      const who = [];
      while (j < ls.length && person(ls[j])) who.push(clean(ls[j++]));
      if (t.length && who.length) put(!!h[1], t.join(" "), who);
    }
  } else {
    let on = false;
    for (let i = 0; i < ls.length; i++) {
      if (/^Best Paper Award$/.test(ls[i])) { on = true; continue; }
      if (on && /^(?:Best |Sponsors)/.test(ls[i])) break;
      if (on && ls[i + 1]) { put(false, ls[i + 1], names(ls[i])); i++; }
    }
  }
  return { entries, skipped };
}

// AutomotiveUI 2024: the front page (www.auto-ui.org/24/) names "the authors receiving the Best Paper Award" by title only (a line "🏆 Title"); the main proceedings page (…/proceedings/main-proceedings/) lists the same title with one author per line.
// Both pages are given one after the other. The honorable mentions are not read.
export function parseAutoUiBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = 2000 + parseInt((/auto-ui\.org\/(\d{2})\//.exec(source) || [])[1], 10);
  const i0 = ls.findIndex((l) => /^Congrats to the authors receiving the Best Paper Award!?$/.test(l));
  if (!(year > 2000) || i0 < 0 || !ls[i0 + 1]) return { entries, skipped: ["no best paper line"] };
  const title = cleanTitle(ls[i0 + 1].replace(/^[^\p{L}“"]+/u, "")), at = ls.findIndex((l, i) => i > i0 + 1 && l === title);
  const who = [];
  for (let j = at + 1; at >= 0 && j < ls.length && isPerson(ls[j]); j++) who.push(ls[j]);
  if (who.length && title.length >= 8) entries.push({ venue: "AutomotiveUI", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `AutomotiveUI ${year} Best Paper Award: ${title} — ${who.join(", ")}`, alsoAt: ["https://www.auto-ui.org/24/proceedings/main-proceedings/"] });
  else skipped.push(`${year}: authors not found for ${title.slice(0, 50)}`);
  return { entries, skipped };
}

// An ACM Multimedia year's awards: 2025's awards page (2025.acmmm.org/awards) prints "Best Paper" / "Best Student Paper", then the title in quotation marks and "Authors: …"; 2023's front page prints "Best Paper Award Presented to: A, B, C",
// "for the paper titled:" and the title (the same for the best student paper and the brave new idea award). The honorable mention, the open-source and the other awards are not read; 2022's page lists candidates only.
export function parseAcmmmAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/(\d{4})\.acmmm\.org/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const put = (student, t0, who) => {
    const title = cleanTitle(t0.replace(/^[“"]|[”"]$/g, ""));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ACM MM", year, award: student ? "student" : "best", awardLabel: student ? "Best Student Paper Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `ACM MM ${year} ${student ? "Best Student Paper" : "Best Paper"}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  const list = (t) => t.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean);
  for (let i = 0; i + 1 < ls.length; i++) {
    const a = /^Best (Student )?Paper$/.exec(ls[i]);                                      // 2025
    const au = a && /^Authors?:\s*(.+)$/.exec(ls[i + 2] || "");
    if (au) { put(!!a[1], ls[i + 1], list(au[1])); continue; }
    const b = /^Best (Student )?Paper Award Presented to:\s*(.+)$/.exec(ls[i]);          // 2023
    if (b && /^for the paper titled:?$/.test(ls[i + 1] || "") && ls[i + 2]) put(!!b[1], ls[i + 2], list(b[2]));
  }
  return { entries, skipped };
}

// IEEE VR's conference awards page (ieeevr.org/<year>/awards/conference-awards/): under "Best Papers" (the second time the heading appears, after the menu and the intro) per paper a title line (maybe ending "(Journal: P1422)"), the authors one per line
// ("Name," and, in 2024, "Affiliation;" lines between; 2023 has names only, the last without a comma) and "Abstract". The honorable mentions, the posters, demos and presentations are not read. 2023's page puts the best papers, the honorable mentions and the nominees under one heading, so a list of more than twelve is refused.
export function parseIeeeVrBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/ieeevr\.org\/(\d{4})\//.exec(source) || [])[1], 10);
  const i0 = ls.findIndex((l, i) => l === "Best Papers" && /,$/.test(ls[i + 2] || "") && !/,$/.test(ls[i + 1] || ""));
  if (!year || i0 < 0) return { entries, skipped: ["no best papers list"] };
  for (let i = i0 + 1; i < ls.length; i++) {
    if (/^Best Papers - Honorable|^Best Posters|^Honorable Mentions$/.test(ls[i])) break;
    if (!/,$/.test(ls[i + 1] || "") || /[,;]$/.test(ls[i]) || ls[i] === "Abstract") continue;
    const title = cleanTitle(ls[i].replace(/\s*\((?:Journal|Conference|TVCG|Short)[^)]*\)\s*$/i, ""));
    const who = [];
    let j = i + 1;
    let alt = false;                                                                      // 2024 alternates "Name," and "Affiliation;" (the last affiliation has no mark); 2023 lists names only
    for (let k = j; k < ls.length && ls[k] !== "Abstract"; k++) if (/;$/.test(ls[k])) alt = true;
    for (; j < ls.length && ls[j] !== "Abstract"; j++) {
      if (/,$/.test(ls[j])) who.push(ls[j].replace(/,$/, ""));
      else if (!alt && ls[j + 1] === "Abstract" && isPerson(ls[j])) who.push(ls[j]);
    }
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "VR", year, award: "best", awardLabel: "Best Paper Award", title, authors: who.map((n) => n.replace(/\s+PhD$/i, "")), track: "main", source, evidence: `IEEE VR ${year} Best Paper: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i = j;
  }
  if (entries.length > 12) return { entries: [], skipped: [`${year}: ${entries.length} papers under "Best Papers" is the whole list of nominees, not the winners`] };   // 2023's page mixes best papers, honorable mentions and nominees under one heading
  return { entries, skipped };
}

// An IEEE ICC year's best paper awards page (icc<year>.ieee-icc.org/program/best-paper-awards), after the committee and a line "ICC <year> BEST PAPER AWARDS RECIPIENTS": per symposium a heading line and then the winning paper, in the form of the year —
// 2025: heading, title, authors with brackets ("A, B and C (Univ, Country); D (Univ)"); 2024: an all-capitals heading, the title and a plain authors' line; 2022: an all-capitals heading and `“Title,” by A, B and C`. 2021 prints the title and a `by` line apart; 2023 follows 2024's form.
export function parseIccBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/icc(\d{4})\./.exec(source) || [])[1], 10);
  if (!year || !ls.some((l) => new RegExp(`ICC ${year}`, "i").test(l))) return { entries, skipped: ["no year in the address or page"] };
  if (ls.some((l) => /^Paper Title:/.test(l))) {                                          // 2019: "Symposium – X", "Paper Title: T", "Authors:" and one "Name (Affiliation)" line per author
    for (let i = 0; i < ls.length; i++) {
      const t = /^Paper Title:\s*(.+)$/.exec(ls[i]);
      if (!t || !/^Authors:?$/.test(ls[i + 1] || "")) continue;
      const who = [];
      for (let j = i + 2; j < ls.length && /\(.*\)$/.test(ls[j]) && !/^(?:Symposium|Paper Title)/.test(ls[j]); j++) who.push(...names(ls[j]));
      let head = "";
      for (let k = i - 1; k >= 0 && !head; k--) if (/^Symposium/.test(ls[k])) head = ls[k].replace(/^Symposium\s*[–-]\s*/, "");
      const title = cleanTitle(t[1]);
      if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ICC", year, award: "best", awardLabel: `Best Paper Award (${head})`, title, authors: who, track: "main", source, evidence: `ICC ${year} Best Paper Award, ${head}: ${title} — ${who.join(", ")}` });
      else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    }
    return { entries, skipped };
  }
  let start = ls.findIndex((l) => /^ICC \d{4} BEST PAPER AWARDS RECIPIENTS$/i.test(l));
  if (start < 0) start = ls.findIndex((l, i) => l === l.toUpperCase() && /\p{L}{6}/u.test(l) && /^[“"]/.test(ls[i + 1] || "") && /^by /.test(ls[i + 2] || "")) - 1;     // 2021 has no such line: the first capitals heading over a quoted title and a "by" line
  if (start < -1 || (start === -1 && !/^[“"]/.test(ls[1] || ""))) return { entries, skipped: ["no recipients list"] };
  const end = ls.findIndex((l, i) => i > start && /^(?:Career Fair|Search|Mentoring Program)$/.test(l));
  const caps = (l) => l === l.toUpperCase() && /\p{L}{6}/u.test(l);
  const put = (head, t0, a0) => {
    const who = names(a0.replace(/;/g, ",")), title = cleanTitle(t0.replace(/^[“"]|,?[”"]$/g, ""));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ICC", year, award: "best", awardLabel: `Best Paper Award (${head.replace(/ SYMPOSIUM$/i, "")})`, title, authors: who, track: "main", source, evidence: `ICC ${year} Best Paper Award, ${head}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  const stop = end < 0 ? ls.length : end;
  for (let i = start + 1; i + 1 < stop; i++) {
    const by = /^[“"](.+?),?[”"]\s+by\s+(.+)$/.exec(ls[i + 1]);
    if (by) { put(ls[i], by[1], by[2]); i += 1; continue; }
    const q = /^[“"](.+?),?[”"],?$/.exec(ls[i + 1] || ""), byl = /^by\s+(.+)$/.exec(ls[i + 2] || "");               // 2021: the quoted title and "by A, B and C" on the next line
    if (q && byl && caps(ls[i])) { put(ls[i], q[1], byl[1]); i += 2; continue; }
    if (caps(ls[i]) && ls[i + 2] && !caps(ls[i + 1])) { put(ls[i], ls[i + 1], ls[i + 2]); i += 2; continue; }
    if (!/\(/.test(ls[i]) && !/\(/.test(ls[i + 1]) && ls[i + 2] && /\(.*\)/.test(ls[i + 2]) && ls[i + 1].split(" ").length >= 4) { put(ls[i], ls[i + 1], ls[i + 2]); i += 2; }
  }
  return { entries, skipped };
}

// An IEEE WCNC year's best paper awards page (wcnc<year>.ieee-wcnc.org/program/best-paper-awards): per track a line "Track N" ("TRACK 1: PHYSICAL LAYER …" in 2022), the title and the authors (with brackets in 2023). The page's <title> must name the year.
export function parseWcncBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/wcnc(\d{4})\./.exec(source) || [])[1], 10);
  const ty = (/<title>[^<]*?(\d{4}) IEEE WCNC|<title>[^<]*WCNC[^<]*?(\d{4})/i.exec(html) || []);
  if (!year || !(ty[1] || ty[2]) || parseInt(ty[1] || ty[2], 10) !== year) return { entries, skipped: ["the page is not that year's"] };
  const i0 = ls.findIndex((l) => /^Congra\w+ (?:to )?(?:our |the )?Best Papers? Awards? Winners!?$/i.test(l) || /^Track Papers$/i.test(l));
  if (i0 < 0) return { entries, skipped: ["no winners list"] };
  for (let i = i0 + 1; i + 2 < ls.length; i++) {
    if (/^(?:Workshops?|Patrons|Platinum|Special Events|Keynotes|Best Paper Awards)$/i.test(ls[i])) break;
    const t = /^Track (\d+)|^TRACK (\d+)/i.exec(ls[i]);
    if (!t) continue;
    const who = names(ls[i + 2].replace(/;/g, ",")), title = cleanTitle(ls[i + 1]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "WCNC", year, award: "best", awardLabel: `Best Paper Award (Track ${t[1] || t[2]})`, title, authors: who, track: "main", source, evidence: `WCNC ${year} Best Paper Award, Track ${t[1] || t[2]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i += 2;
  }
  return { entries, skipped };
}

// An IEEE GLOBECOM year's best paper awards page (globecom<year>.ieee-globecom.org/program/best-paper-awards), after the committee and a line "GLOBECOM <year> BEST PAPER AWARDS RECIPIENTS": per symposium or track a heading line, the title and a plain authors' line.
// 2025's list runs the names together and is not read; 2021's page lists no recipients.
export function parseGlobecomBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/globecom(\d{4})\./.exec(source) || [])[1], 10);
  const start = ls.findIndex((l) => new RegExp(`^GLOBECOM ${year} BEST PAPER AWARDS RECIPIENTS$`, "i").test(l));
  if (!year || start < 0) return { entries, skipped: ["no recipients list"] };
  const end = ls.findIndex((l, i) => i > start && /^(?:Best Paper Awards|Board and Committee Meetings|WICE)/.test(l));
  const stop = end < 0 ? ls.length : end;
  const caps = (l) => l === l.toUpperCase() && /\p{L}{6}/u.test(l);
  const HEAD = (l) => l.split(" ").length <= 12 && (caps(l) || /\b(?:Symposium|Track|Workshop)\b/.test(l));
  let head = null;
  for (let i = start + 1; i < stop; i++) {
    if (HEAD(ls[i]) && ls[i + 1] && !HEAD(ls[i + 1])) { head = ls[i]; continue; }
    if (!head || !ls[i + 1]) continue;
    let t = ls[i];
    const h = t.length >> 1;                                                              // (a title the page printed twice, run together)
    if (t.length > 20 && t.slice(0, h).trim() === t.slice(h).trim()) t = t.slice(0, h).trim();
    const who = names(ls[i + 1].replace(/[\u266d\u266f\u2020\u2021*\u2217]+/g, "")), title = cleanTitle(t);      // (footnote marks after a name: ♭ † *)
    if (title.split(" ").length < 4 || !who.length || !who.every(isPerson)) continue;
    entries.push({ venue: "GLOBECOM", year, award: "best", awardLabel: `Best Paper Award (${head.replace(/ SYMPOSIUM$/i, "")})`, title, authors: who, track: "main", source, evidence: `GLOBECOM ${year} Best Paper Award, ${head}: ${title} — ${who.join(", ")}` });
    i += 1;
  }
  return { entries, skipped };
}

// CHIIR 2025's front page (chiir2025.github.io): "We are delighted to announce the recipients of the Best Paper Award:", the title in quotation marks and "by A and B." The other years' pages name none.
export function parseChiirBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/chiir(\d{4})\./.exec(source) || [])[1], 10);
  const i = ls.findIndex((l) => /announce the recipients of the Best Paper Award:?$/.test(l));
  if (!year || i < 0) return { entries, skipped: ["no best paper announcement"] };
  const t = /^[“"](.+?)[”"]$/.exec(ls[i + 1] || ""), by = /^by\s+(.+?)\.?$/.exec(ls[i + 2] || "");
  const who = by ? by[1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean) : [];
  if (t && who.length && who.every(isPerson)) entries.push({ venue: "CHIIR", year, award: "best", awardLabel: "Best Paper Award", title: cleanTitle(t[1]), authors: who, track: "main", source, evidence: `CHIIR ${year} Best Paper Award: ${cleanTitle(t[1])} — ${who.join(", ")}` });
  else skipped.push(`${year}: announcement not read`);
  return { entries, skipped };
}

// SIGCOMM 2025's paper information page (conferences.sigcomm.org/sigcomm/2025/program/papers-info/): "SIGCOMM'25 Best Paper Award" and "… Best Student Paper Award" (the honorable mentions have their own heading), then `Title | Technical Session: X` and the authors' line
// with the affiliations in brackets. Only that year's page is laid out so.
export function parseSigcomm25Awards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/sigcomm\/(\d{4})\//.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  for (let i = 0; i + 2 < ls.length; i++) {
    const h = new RegExp(`^SIGCOMM'${String(year).slice(2)} Best (Student )?Paper Award$`).exec(ls[i]);
    if (!h) continue;
    const title = cleanTitle(ls[i + 1].replace(/\s*\|\s*Technical Session:.*$/, "")), who = names(ls[i + 2].replace(/;/g, ","));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "SIGCOMM", year, award: h[1] ? "student" : "best", awardLabel: h[1] ? "Best Student Paper Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `SIGCOMM ${year} ${h[1] ? "Best Student Paper" : "Best Paper"}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// ECML PKDD 2023's awards page (2023.ecmlpkdd.org/awards): "Test of Time Award – from ECML PKDD 2013" and under "Reseach Track" / "ADS Track" the headings "Best Paper" and "Best Student Paper (Sponsored by …)", each followed by the authors' line and then the title.
export function parseEcmlAwardsAuthorsFirst(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/(\d{4})\.ecmlpkdd\.org/.exec(source) || [])[1], 10);
  const i0 = ls.findIndex((l) => new RegExp(`^ECML PKDD ${year} Awards$`).test(l));
  if (!year || i0 < 0) return { entries, skipped: ["no awards list"] };
  let track = null;
  for (let i = i0 + 1; i + 2 < ls.length; i++) {
    if (/^Privacy policy$/.test(ls[i])) break;
    const t = /^Test of Time Award\s*[–-]\s*from ECML PKDD (\d{4})$/.exec(ls[i]);
    const h = /^Best (Student )?Paper(?: \(.*\))?$/.exec(ls[i]);
    if (/^(?:Res\w+|ADS) Track$/.test(ls[i])) { track = ls[i].replace(/^Reseach/, "Research"); continue; }
    if (!t && !h) continue;
    const who = names(ls[i + 1]), title = cleanTitle(ls[i + 2]);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "ECML PKDD", year, award: t ? "tot" : h[1] ? "student" : "best", awardLabel: t ? "Test of Time Award" : `${h[1] ? "Best Student Paper Award" : "Best Paper Award"}${track ? ` (${track})` : ""}`, title, authors: who, track: "main", source, evidence: `ECML PKDD ${year} ${t ? "Test of Time Award" : ls[i]}: ${title} — ${who.join(", ")}`, ...(t ? { paperYear: parseInt(t[1], 10) } : {}) });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i += 2;
  }
  return { entries, skipped };
}

// CIDR 2025's awards page (cidrdb.org/cidr2025/awards.html): "Best Paper Award" with title and authors (with institutions in brackets) lines per paper, then "Test of Time Award" with a citation sentence and, per paper, the title, the authors and a line "CIDR 2003".
// The page's heading must name the year; the other years' sites have no such page.
export function parseCidrAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/cidr(\d{4})\//.exec(source) || [])[1], 10);
  if (!year || !ls.some((l) => new RegExp(`^CIDR ${year}$`).test(l))) return { entries, skipped: ["the page is not that year's"] };
  const i0 = ls.findIndex((l, i) => l === "Best Paper Award" && i > 20);
  if (i0 < 0) return { entries, skipped: ["no best paper award"] };
  const put = (kind, label, t0, a0, paperYear) => {
    const who = names(a0.replace(/;/g, ",")), title = cleanTitle(t0);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "CIDR", year, award: kind, awardLabel: label, title, authors: who, track: "main", source, evidence: `CIDR ${year} ${label}: ${title} — ${who.join(", ")}`, ...(paperYear ? { paperYear } : {}) });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  let i = i0 + 1;
  for (; i + 1 < ls.length && !/^Test of Time Award$/.test(ls[i]); i += 2) put("best", "Best Paper Award", ls[i], ls[i + 1]);
  if (/^Test of Time Award$/.test(ls[i] || "")) {
    for (let j = i + 2; j + 2 < ls.length; j += 3) {                                      // (j starts after the citation sentence)
      const y = /^CIDR (\d{4})$/.exec(ls[j + 2]);
      if (!y) break;
      put("tot", "Test of Time Award", ls[j], ls[j + 1], parseInt(y[1], 10));
    }
  }
  return { entries, skipped };
}

// The Web Conference's own year pages: 2020's front page ("Best Paper" / "Best Student Paper" over "Paper Title: …" and "Authors: A (Univ), B (Univ) and C (Univ)") and 2018's awards page (www2018.thewebconf.org/awards/: "Best Paper:" over the title and a plain authors' line).
// The posters, demos, honorable mentions and the test of time paper are not read here (the latter comes from the IW3C2 list).
export function parseWwwYearAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/www(\d{4})\.thewebconf/.exec(source) || [])[1], 10);
  if (!year) return { entries, skipped: ["no year in the address"] };
  const put = (student, t0, a0) => {
    const who = names(a0.replace(/;/g, ",")), title = cleanTitle(t0);
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "WWW", year, award: student ? "student" : "best", awardLabel: student ? "Best Student Paper Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `WWW ${year} ${student ? "Best Student Paper" : "Best Paper"}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  for (let i = 0; i + 2 < ls.length; i++) {
    const a = /^Best (Student )?Paper$/.exec(ls[i]);                                      // 2020
    const t = a && /^Paper Title:\s*(.+)$/.exec(ls[i + 1] || ""), au = a && /^Authors:\s*(.+?)\.?$/.exec(ls[i + 2] || "");
    if (t && au) { put(!!a[1], t[1], au[1]); continue; }
    const b = /^Best (Student )?Paper:$/.exec(ls[i]);                                     // 2018
    if (b && ls[i + 1] && ls[i + 2] && !/^Best /.test(ls[i + 1])) { put(!!b[1], ls[i + 1], ls[i + 2]); i += 2; }
  }
  return { entries, skipped };
}

// IEEE PIMRC 2025's best paper awards page (pimrc2025.ieee-pimrc.org/program/best-paper-awards), after "PIMRC 2025 BEST PAPER AWARDS RECIPIENTS": per paper a "Track: …" (or workshop session) line, "Paper #<number>", the title and the authors
// with their affiliations in brackets ("A and B (Univ, Country); C (Univ)"). The other years' pages are not there.
export function parsePimrcBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/pimrc(\d{4})\./.exec(source) || [])[1], 10);
  const start = ls.findIndex((l) => new RegExp(`^PIMRC ${year} BEST PAPER AWARDS RECIPIENTS$`, "i").test(l));
  if (!year || start < 0) return { entries, skipped: ["no recipients list"] };
  for (let i = start + 1; i + 3 < ls.length; i++) {
    if (!/^Paper\s*#\s*\d+/.test(ls[i + 1])) continue;
    const head = ls[i].replace(/^Track:\s*/, ""), title = cleanTitle(ls[i + 2]), who = names(ls[i + 3].replace(/;/g, ","));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "PIMRC", year, award: "best", awardLabel: `Best Paper Award (${head.replace(/^T\d+-\d+:\s*/, "")})`, title, authors: who, track: "main", source, evidence: `PIMRC ${year} Best Paper Award, ${head}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i += 3;
  }
  return { entries, skipped };
}

// An IEEE CCNC year's awards page (ccnc<year>.ieee-ccnc.org/registration/awards): the headings "Best Paper Award", "Best Paper Runner-up" and "Best Student Paper award", each followed by the title (2024 puts the paper number before it) and the authors, separated by commas or semicolons.
// The best poster and demo awards are not read. Only 2024 and 2025 have such a page.
export function parseCcncAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/ccnc(\d{4})\./.exec(source) || [])[1], 10);
  const i0 = ls.findIndex((l) => /^Congratulations to all Award Winners!?$/.test(l));
  if (!year || i0 < 0) return { entries, skipped: ["no winners list"] };
  const KIND = (l) => (/^Best Paper Runner-?up$/i.test(l) ? ["runner-up", "Best Paper Runner-up"] : /^Best Student Paper award$/i.test(l) ? ["student", "Best Student Paper Award"] : /^Best Paper Award$/i.test(l) ? ["best", "Best Paper Award"] : null);
  for (let i = i0 + 1; i + 2 < ls.length; i++) {
    if (/^(?:Awards|Patrons)/.test(ls[i])) break;
    const k = KIND(ls[i]);
    if (!k) continue;
    const title = cleanTitle(ls[i + 1].replace(/^\d{9,10}\s+/, "")), who = names(ls[i + 2].replace(/;/g, ","));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "CCNC", year, award: k[0], awardLabel: k[1], title, authors: who, track: "main", source, evidence: `CCNC ${year} ${k[1]}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i += 2;
  }
  return { entries, skipped };
}

// IEEE/IFIP NOMS 2025's front page (noms2025.ieee-noms.org): under "NOMS 2025 Award Winners" the headings "Best Paper Award" and "Best Student Paper Award", each followed by the title and the authors with their institutions in brackets.
// The best demo paper and the Dan Stokesberry award are not read; 2024's page only links to PDFs.
export function parseNomsAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/noms(\d{4})\./.exec(source) || [])[1], 10);
  const i0 = ls.findIndex((l) => new RegExp(`^NOMS ${year} Award Winners$`).test(l));
  if (!year || i0 < 0) return { entries, skipped: ["no award winners list"] };
  for (let i = i0 + 1; i + 2 < ls.length; i++) {
    if (/^(?:Conference Banquet|Dan Stokesberry|Best Demo)/.test(ls[i])) break;
    const h = /^Best (Student )?Paper Award$/.exec(ls[i]);
    if (!h) continue;
    const title = cleanTitle(ls[i + 1]), who = names(ls[i + 2].replace(/;/g, ","));
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "NOMS", year, award: h[1] ? "student" : "best", awardLabel: h[1] ? "Best Student Paper Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `NOMS ${year} ${h[1] ? "Best Student Paper" : "Best Paper"}: ${title} — ${who.join(", ")}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i += 2;
  }
  return { entries, skipped };
}

// MICCAI's "BEST PAPER AWARDS" page (conferences.miccai.org/<year>/en/BEST-PAPER-AWARDS.html): the heading "Winner", then one line of authors (institutions in brackets) and the title in double quotes; the same under "Runners-up".
// The conference's date line must carry the year of the address.
export function parseMiccaiBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/miccai\.org\/(\d{4})\//.exec(source) || [])[1], 10);
  const i0 = ls.findIndex((l) => /^Winners?$/i.test(l));
  if (!year || i0 < 0 || !ls.some((l) => /MEDICAL IMAGE COMPUTING/i.test(l)) || !ls.some((l) => new RegExp(`\\b${year}\\b`).test(l) && /SEPTEMBER|OCTOBER|OCT\\b|SEP\\b/i.test(l))) return { entries, skipped: ["no winners list for the year"] };
  let kind = "best";
  for (let i = i0; i < ls.length; i++) {
    const l = ls[i];
    if (/^Winners?$/i.test(l)) { kind = "best"; continue; }
    if (/^Runners?-?up/i.test(l)) { kind = "runner-up"; continue; }
    if (/^<!--|^PROGRAM OVERVIEW/.test(l)) break;
    const t = /^(.+?)[,\s]+["\u201c](.{8,}?)["\u201d]\.?$/.exec(l);
    if (!t) continue;
    const title = cleanTitle(t[2]), who = names(t[1]);
    const label = kind === "best" ? "Best Paper Award" : "Best Paper Runner-up";
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "MICCAI", year, award: kind, awardLabel: label, title, authors: who, track: "main", source, evidence: `MICCAI ${year} ${kind === "best" ? "Winner" : "Runner-up"}: ${t[1]}, "${title}"` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// ECAI's "Paper Awards" page (ecai<year>.org/paper-awards/): under "ECAI Outstanding Paper Awards" one line per main-track paper, "M1210. Authors. “Title”"; the PAIS (applications track) winner under its own heading is not read.
export function parseEcaiAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/ecai(\d{4})\./.exec(source) || [])[1], 10);
  const i0 = ls.findIndex((l) => /^ECAI Outstanding Paper Awards$/i.test(l));
  if (!year || i0 < 0 || !ls.some((l) => new RegExp(`ECAI ${year}`).test(l)) && !ls.some((l) => new RegExp(`ecai${year}`, "i").test(l))) return { entries, skipped: ["no outstanding paper list for the year"] };
  for (let i = i0 + 1; i < ls.length; i++) {
    if (/^PAIS /i.test(ls[i]) || /^ORGANIZING SECRETARIAT/i.test(ls[i])) break;
    const m = /^M\d+\.\s+(.+?)\.\s+[\u201c"](.{8,}?)[\u201d"]$/.exec(ls[i]);
    if (!m) continue;
    const title = cleanTitle(m[2]), who = names(m[1]);
    if (who.length && who.every(isPerson)) entries.push({ venue: "ECAI", year, award: "outstanding", awardLabel: "Outstanding Paper Award", title, authors: who, track: "main", source, evidence: `ECAI ${year} Outstanding Paper Award: ${m[1]}. “${title}”` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// SAT's awards page (satisfiability.org/SAT<yy>/awards/): "The Best Paper Award of SAT 2025 was conferred on the paper Title <doi> by Authors for …" and the same for the Best Student Paper (the title and "by" authors may run over two lines); the runners-up, the test of time (no authors), the PhD and service awards are not read.
export function parseSatAwards(html, source) {
  const entries = [], skipped = [];
  const text1 = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" ");
  const yy = (/SAT(\d{2})\//.exec(source) || [])[1];
  const year = yy ? 2000 + parseInt(yy, 10) : 0;
  if (!year || !new RegExp(`SAT ${year}`).test(text1)) return { entries, skipped: ["no awards for the year"] };
  const re = new RegExp(`The (Best Paper Award|Best Student Paper(?: Award)?) of SAT ${year} was conferred on the paper (.+?) (?:10\\.\\d{4,}/\\S+ )?by (.+?) for\\b`, "g");
  for (const m of text1.matchAll(re)) {
    const student = /Student/.test(m[1]), title = cleanTitle(m[2]), who = names(m[3]);
    if (who.length && who.every(isPerson) && title.length >= 8 && title.length < 160) entries.push({ venue: "SAT", year, award: student ? "student" : "best", awardLabel: student ? "Best Student Paper Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `SAT ${year} ${m[1]} was conferred on the paper ${title} by ${m[3]}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  // 2024's layout: under "SAT 2024 paper awards", one line each: Best paper award: “Title”, by Authors (student author marks in brackets)
  for (const l of lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim())) {
    const m = /^Best (student )?paper award:\s*[\u201c"](.{8,}?)[\u201d"],?\s+by\s+(.+)$/i.exec(l);
    if (!m) continue;
    const title = cleanTitle(m[2]), who = names(m[3]);
    if (who.length && who.every(isPerson)) entries.push({ venue: "SAT", year, award: m[1] ? "student" : "best", awardLabel: m[1] ? "Best Student Paper Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `SAT ${year} ${m[1] ? "Best student paper award" : "Best paper award"}: “${title}”, by ${m[3]}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// ICDT's own awards page (databasetheory.org/ICDT/awards): a year line, then "Best Paper Award", "Best Student Paper Award", both joined by "and", or "Best Newcomer Award" (not read), then the authors line and the title line (a lone "and" line adds a second authors/title pair).
export function parseIcdtAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!ls.some((l) => /^ICDT Awards$/i.test(l))) return { entries, skipped: ["not the ICDT awards page"] };
  let year = 0, kinds = null;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (/^(19|20)\d\d$/.test(l)) { year = +l; kinds = null; continue; }
    if (/^Search$/.test(l)) break;
    const h = /^Best (Newcomer|Paper|Student Paper) Award(?: and Best (Student Paper|Paper) Award)?$/.exec(l);
    if (h && year) { kinds = h[1] === "Newcomer" ? [] : [...new Set([h[1], h[2]].filter(Boolean))]; continue; }
    if (!kinds || !year) continue;
    for (let j = i; j + 1 < ls.length; j += 3) {
      const who = names(ls[j]), title = cleanTitle(ls[j + 1]);
      if (!who.length || !who.every(isPerson) || title.length < 8) { skipped.push(`${year}: not read: ${title.slice(0, 50)}`); break; }
      for (const k of kinds) entries.push({ venue: "ICDT", year, award: k === "Paper" ? "best" : "student", awardLabel: k === "Paper" ? "Best Paper Award" : "Best Student Paper Award", title, authors: who, track: "main", source, evidence: `ICDT ${year} ${k === "Paper" ? "Best Paper" : "Best Student Paper"} Award: ${ls[j]} — ${title}` });
      i = j + 1;
      if (ls[j + 2] !== "and") break;
    }
    kinds = null;
  }
  return { entries, skipped };
}

// EATCS's "Best <conference> Paper" / "Best Student <conference> Paper" pages (eatcs.org/index.php/best-esa-paper, …): after "A brief history of the prize follows below." a line "2025 / Warsaw, Poland", then one line per winner, "[Track A: ]Authors: “Title”" (the colon may be missing).
const EATCS_VENUE = { ESA: "ESA", ICALP: "ICALP", MFCS: "MFCS", ICGT: "ICGT" };
export function parseEatcsPaper(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const slug = (/best-(?:student-)?([a-z]+)-paper/.exec(source) || [])[1];
  const venue = EATCS_VENUE[(slug || "").toUpperCase()];
  const student = /best-student-/.test(source);
  const i0 = ls.findIndex((l) => /^A brief history of the prize follows below\.?$/i.test(l));
  const head = ls.slice(Math.max(0, i0 - 4), Math.max(0, i0)).find((l) => /^Best (Student )?[A-Za-z]+ Paper$/.test(l));
  if (!venue || i0 < 0 || !head || (student ? !/^Best Student /.test(head) : /^Best Student /.test(head)) || !head.toUpperCase().includes(venue)) return { entries, skipped: ["not an EATCS best paper page"] };
  let year = 0;
  for (let i = i0 + 1; i < ls.length; i++) {
    const l = ls[i];
    const y = /^(19|20)(\d\d) \/ /.exec(l);
    if (y) { year = +(y[1] + y[2]); continue; }
    if (/^We use cookies/.test(l)) break;
    const m = /^(?:Track [A-Z]\s*[:\-\u2013]\s*)?(.+?)[\s:]+(?:[A-Za-z &]+ Track:\s*)?[\u201c"](.{8,}?)[\u201d"\u2019']{0,2}$/.exec(l);
    if (!m || !year) continue;
    const title = cleanTitle(m[2]), who = names(m[1].replace(/\s+:\s*$/, ""));
    if (who.length && who.every(isPerson)) entries.push({ venue, year, award: student ? "student" : "best", awardLabel: student ? `Best Student ${venue} Paper` : `Best ${venue} Paper`, title, authors: who, track: "main", source, evidence: `${head} ${year}: ${m[1]}: “${title}”` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// The Computational Geometry community's awards page (computational-geometry.org/cg-week/awards/): under "SoCG Best Paper" and "SoCG Best Student Paper" a year line, then one line "Authors, “Title”" per winner (a "(practice)" or "(theory)" tag after the title is allowed); the other awards (presentation, reviewer, test of time) are not read.
export function parseSocgAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  let kind = null, year = 0;
  for (const l of ls) {
    if (/^SoCG Best Paper$/.test(l)) { kind = "best"; year = 0; continue; }
    if (/^SoCG Best Student Paper$/.test(l)) { kind = "student"; year = 0; continue; }
    if (/^SoCG /.test(l)) { kind = null; continue; }
    if (!kind) continue;
    if (/^(19|20)\d\d$/.test(l)) { year = +l; continue; }
    const m = /^(.+?),\s+[\u201c"](.{8,}?)[\u201d"](?:\s*\((?:practice|theory)\))?$/.exec(l);
    if (!m || !year) continue;
    const title = cleanTitle(m[2]), who = names(m[1]);
    if (who.length && who.every(isPerson)) entries.push({ venue: "SoCG", year, award: kind, awardLabel: kind === "best" ? "Best Paper Award" : "Best Student Paper Award", title, authors: who, track: "main", source, evidence: `SoCG Best ${kind === "best" ? "Paper" : "Student Paper"} ${year}: ${m[1]}, “${title}”` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// CADE Inc.'s "Best Paper Award" page (cadeinc.org/Best-Paper-Award), under "Recipients": "CADE-29 (2023): Authors - Title. Best student paper: Authors - Title" (a label of CADE-n or the nth IJCAR, a year in brackets; several winners are separated by a full stop and a capital letter; the 2022 winners follow on their own lines).
export function parseCadeAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^Recipients$/.test(l));
  if (i0 < 0) return { entries, skipped: ["no recipients list"] };
  let venue = "", year = 0;
  const add = (kind, seg, label) => {
    const m = /^(.+?) - (.{8,})$/.exec(seg.trim());
    if (!m) { skipped.push(`${year}: not read: ${seg.slice(0, 50)}`); return; }
    const title = cleanTitle(m[2].replace(/\.$/, "")), who = names(m[1].replace(/`/g, "\u2019"));
    if (who.length && who.every(isPerson)) entries.push({ venue, year, award: kind, awardLabel: label, title, authors: who, track: "main", source, evidence: `${venue === "CADE" ? "CADE" : "IJCAR"} ${year} ${label}: ${m[1]} - ${title}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  };
  const pairs = (text) => text.split(/(?<![\s.][A-Z])\.\s+(?=[A-Z\u00c0-\u017e][^.]*? - )/).map((x) => x.trim()).filter(Boolean);
  for (let i = i0 + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^\u00a9/.test(l)) break;
    const h = /^(CADE-\d+|\d+(?:st|nd|rd|th) IJCAR) \((\d{4})\):\s*(.*)$/.exec(l);
    if (h) { venue = /^CADE/.test(h[1]) ? "CADE" : "IJCAR"; year = +h[2]; }
    else if (!venue || !year || /^maintained by/.test(l)) continue;
    let rest = h ? h[3] : l;
    if (h && !rest) continue;
    const [main, student] = rest.split(/ Best student paper:\s*/);
    for (const seg of pairs(main)) add("best", seg, "Best Paper Award");
    if (student) for (const seg of pairs(student)) add("student", seg, "Best Student Paper Award");
  }
  return { entries, skipped };
}

// The DSN steering committee's page (dependability.org/?p=370), "List of Past Best Paper Award Winners": a "2025:" line (or "2022: Title, Authors" on one line), then "Title, Authors." per winner, affiliations and "(also Distinguished Paper Award)" in brackets. A title and its authors are told apart by the longest run of person names at the end of the comma-separated line; the 2018–2021 lines, where the authors follow the title without a comma, are not read.
export function parseDsnBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^List of Past Best Paper Award Winners$/i.test(l));
  if (i0 < 0) return { entries, skipped: ["no winners list"] };
  let year = 0;
  for (let i = i0 + 1; i < ls.length; i++) {
    let l = ls[i];
    if (/^Recent Posts$/i.test(l)) break;
    const y = /^(20\d\d):\s*(.*)$/.exec(l);
    if (y) { year = +y[1]; l = y[2]; if (!l) continue; }
    if (!year) continue;
    if (year >= 2018 && year <= 2021) { skipped.push(`${year}: title and authors run together: ${l.slice(0, 40)}`); continue; }
    const flat = l.replace(/\s*\([^)]*\)/g, "").replace(/[\u201d"]+,/, ",").replace(/\.$/, "");
    const parts = flat.split(/,\s*/);
    let k = 1;
    while (k < parts.length && !names(parts.slice(k).join(", ")).every(isPerson)) k++;
    const title = cleanTitle(parts.slice(0, k).join(", ").replace(/[\u201d"]+$/, "")), who = names(parts.slice(k).join(", "));
    if (k < parts.length && title.length >= 12 && who.length && who.every(isPerson) && who.every((w) => w.split(" ").length <= 4)) entries.push({ venue: "DSN", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `DSN ${year} Best Paper Award: ${title}, ${parts.slice(k).join(", ")}` });
    else skipped.push(`${year}: not read: ${l.slice(0, 60)}`);
  }
  return { entries, skipped };
}

// The IEEE TCFPGA community's award pages (tcfpga.org/books/community-awards/page/fpga-best-paper-awards, …fccm-best-paper-awards): a year line ("2025" or "2025, Fayetteville, AR"), then per winner a title line and an authors line; a "Best Paper Runner Up: " prefix marks a runner-up; a "Best Short Paper: …" title and its authors are not read.
const TCFPGA_VENUE = { fpga: "FPGA", fccm: "FCCM" };
export function parseTcfpgaBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const slug = (/community-awards\/page\/([a-z]+)-best-paper-awards/.exec(source) || [])[1];
  const venue = TCFPGA_VENUE[slug];
  const i0 = ls.findIndex((l) => /has awarded Best Paper Awards to the following papers:?$/i.test(l));
  if (!venue || i0 < 0 || !ls[i0].includes(venue === "FPGA" ? "Field Programmable Gate Arrays" : "Field-Programmable Custom Computing Machines")) return { entries, skipped: ["not a TCFPGA best paper page"] };
  let year = 0;
  for (let i = i0 + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^Enter section select mode/.test(l)) break;
    const y = /^((?:19|20)\d\d)(?:,\s.*)?$/.exec(l);
    if (y) { year = +y[1]; continue; }
    if (!year) continue;
    if (/^Best Short Paper\s*:/i.test(l)) { i++; continue; }
    const who = names((ls[i + 1] || "").replace(/\band(?=[A-Z])/g, "and "));
    if (who.length && who.every(isPerson) && !/[.:?]$/.test(ls[i + 1] || "x.") && l.length >= 12) {
      const runner = /^Best Paper Runner[- ]?Up\s*:\s*/i.test(l), title = cleanTitle(l.replace(/^Best Paper Runner[- ]?Up\s*:\s*/i, ""));
      entries.push({ venue, year, award: runner ? "runner-up" : "best", awardLabel: runner ? "Best Paper Runner-up" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `${venue} ${year} ${runner ? "Best Paper Runner-up" : "Best Paper Award"}: ${title} — ${ls[i + 1]}` });
      i++;
    } else skipped.push(`${year}: not read: ${l.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// IEEE CEDA's William J. McCalla ICCAD Best Paper Award page (ieee-ceda.org/awards/william-j-mccalla-award), the year-by-year blocks after "Choose Year": "Paper", "Paper", the title, "Author(s)", the authors separated by semicolons or commas, optionally "Publication Date" and a date, "Citation" and its award ("Front-End Award/Category", "Back-End Award/Category" read as best papers; "Ten Year Retrospective Influential Paper Award" as a test of time), "Event Where Awarded" and the conference with its year.
export function parseMccallaAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^Choose Year$/.test(l));
  if (i0 < 0 || !ls.some((l) => /McCalla ICCAD Best Paper Award/i.test(l))) return { entries, skipped: ["not the McCalla award page"] };
  for (let i = i0; i < ls.length; i++) {
    if (ls[i] !== "Author(s)") continue;
    const title = cleanTitle(ls[i - 1] || ""), who = names((ls[i + 1] || "").replace(/;/g, ","));
    let cit = "", ev = "", pub = "";
    for (let j = i + 2; j < Math.min(ls.length, i + 12); j++) {
      if (ls[j] === "Author(s)" || ls[j] === "Paper") break;
      if (ls[j] === "Publication Date") pub = ls[j + 1] || "";
      if (ls[j] === "Citation") cit = ls[j + 1] || "";
      if (ls[j] === "Event Where Awarded") { ev = ls[j + 1] || ""; break; }
    }
    const year = parseInt((/^(\d{4}) /.exec(ev) || [])[1], 10);
    const best = /^(Front|Back)-End (Award|Category)$/.exec(cit), tot = /^Ten Year Retrospective Influential Paper Award$/.test(cit);
    if (!year || (!best && !tot) || !who.length || !who.every(isPerson) || title.length < 8) { skipped.push(`${year || "?"}: not read: ${title.slice(0, 50)}`); continue; }
    const paperYear = parseInt((/(\d{4})/.exec(pub) || [])[1], 10);
    entries.push({ venue: "ICCAD", year, award: tot ? "tot" : "best", awardLabel: tot ? "Ten Year Retrospective Influential Paper Award" : `William J. McCalla ICCAD Best Paper Award (${best[1]}-End)`, title, authors: who, track: "main", source, evidence: `ICCAD ${year} ${cit}: ${title} — ${ls[i + 1]}`, ...(tot && paperYear ? { paperYear } : {}) });
  }
  return { entries, skipped };
}

// The UMAP society's "Best Paper Award Winners" page (um.org/awards/best-paper-awards): a year line, an optional sentence "The 27th International Conference …, ACM UMAP 2019, in Larnaca, Cyprus, awarded the following paper:", the title line and the authors line (a trailing ", University …" affiliation and a DOI line are dropped).
export function parseUmapBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^Best Paper Award Winners$/i.test(l));
  if (i0 < 0 || !/um\.org/.test(source) || !ls.some((l) => /UMAP/.test(l))) return { entries, skipped: ["no UMAP winners list"] };
  let year = 0;
  for (let i = i0 + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^(19|20)\d\d$/.test(l)) { year = +l; continue; }
    if (!year || /^The \d+(?:st|nd|rd|th) International Conference/.test(l) || /^https?:/.test(l)) continue;
    if (/^James Chen|^Imprint$/.test(l)) break;
    if (l.length < 12) continue;
    const au = (ls[i + 1] || "").replace(/\.$/, "").replace(/,\s*(?:University|Universit\u00e0|Institute)\b.*$/, "");
    const who = names(au);
    if (who.length && who.every(isPerson) && !/^https?:/.test(ls[i + 1] || "") && !(names(l).length > 1 && names(l).every(isPerson))) {
      entries.push({ venue: "UMAP", year, award: "best", awardLabel: "Best Paper Award", title: cleanTitle(l), authors: who, track: "main", source, evidence: `UMAP ${year} Best Paper Award: ${cleanTitle(l)} — ${ls[i + 1]}` });
      i++; year = 0;
    } else skipped.push(`${year}: not read: ${l.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// The BPM steering committee's awards page (bpm-conference.org/awards/): blocks "BPM 2025, Seville, Spain", under each "Best paper award" and "Best student paper award" lines "Authors: Title"; the runners-up, forum, reviewer, dissertation, demo and test of time awards are not read.
export function parseBpmAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  let year = 0, kind = null, seen = false;
  for (const l of ls) {
    const b = /^BPM (\d{4}), /.exec(l);
    if (b) { year = +b[1]; kind = null; seen = true; continue; }
    if (!seen) continue;
    if (/^Best paper award$/i.test(l)) { kind = "best"; continue; }
    if (/^Best student paper award$/i.test(l)) { kind = "student"; continue; }
    if (!kind) continue;
    const m = /^(.+?):\s+(.{12,})$/.exec(l);
    const who = m ? names(m[1]) : [];
    if (m && who.length && who.every(isPerson)) entries.push({ venue: "BPM", year, award: kind, awardLabel: kind === "best" ? "Best Paper Award" : "Best Student Paper Award", title: cleanTitle(m[2]), authors: who, track: "main", source, evidence: `BPM ${year} ${kind === "best" ? "Best paper award" : "Best student paper award"}: ${l}` });
    else kind = null;
  }
  return { entries, skipped };
}

// RECOMB's awards page (recomb.org/awards): under "Best Paper Awards" and "Best Student / Young Scientist Paper Awards" one line per year, "2025: Authors. “Title”." (2012 adds "for the contribution"); the poster awards are not read.
export function parseRecombAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  let kind = null;
  for (const l of ls) {
    if (/^Best Paper Awards$/i.test(l)) { kind = "best"; continue; }
    if (/^Best Student \/ Young Scientist Paper Awards$/i.test(l)) { kind = "student"; continue; }
    if (/^Best Poster Awards$/i.test(l)) { kind = null; continue; }
    if (!kind) continue;
    const m = /^((?:19|20)\d\d):\s+(.+?)\.?(?:\s+for the contribution)?\s+[\u201c"](.{8,}?)(?:[\u201d"]\.?)?$/.exec(l);
    if (!m) continue;
    const title = cleanTitle(m[3].replace(/\s*[\u201c"]\.?$/, "")), who = names(m[2]);
    if (who.length && who.every(isPerson)) entries.push({ venue: "RECOMB", year: +m[1], award: kind, awardLabel: kind === "best" ? "Best Paper Award" : "Best Student Paper Award", title, authors: who, track: "main", source, evidence: `RECOMB ${m[1]} ${kind === "best" ? "Best Paper" : "Best Student Paper"}: ${m[2]}. “${title}”` });
    else skipped.push(`${m[1]}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// SPAA's award page (spaa.acm.org/best-paper-award/): a year line ("2011:" for the older ones), then headings "Best Paper(s):", "Outstanding Papers:" or "Distinguished Papers:" and one line per paper, "Authors. Title" (the full stop that ends a middle initial does not split).
export function parseSpaaAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  let year = 0, kind = null;
  for (const l of ls) {
    if (/^(?:19|20)\d\d:?$/.test(l)) { year = parseInt(l, 10); kind = null; continue; }
    if (/^Proudly powered by/.test(l)) break;
    const h = /^(Best|Outstanding|Distinguished) Papers?:?$/i.exec(l);
    if (h) { kind = h[1].toLowerCase() === "best" ? "best" : h[1].toLowerCase(); continue; }
    if (!year || !kind) continue;
    const m = /^(.+?(?<![\s.][A-Z]))\.\s+(\S.{8,})$/.exec(l);
    if (!m) { if (/^[A-Z]/.test(l) && l.length > 20) skipped.push(`${year}: not read: ${l.slice(0, 50)}`); continue; }
    const who = names(m[1]), title = cleanTitle(m[2]);
    const label = kind === "best" ? "Best Paper Award" : kind === "outstanding" ? "Outstanding Paper Award" : "Distinguished Paper Award";
    if (who.length && who.every(isPerson)) entries.push({ venue: "SPAA", year, award: kind, awardLabel: label, title, authors: who, track: "main", source, evidence: `SPAA ${year} ${label}: ${m[1]}. ${title}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// Embedded Systems Week's "Best Paper and Test-of-Time Awards" page (<year>.esweek.org/?p=613, the newest year's site listing every year back to 2008): a year line, then per award a label line "CASES: Title", "CODES+ISSS: Title", "EMSOFT: Title" or "EMSOFT Test-of-Time: Title (2006)" and the authors line (an "&" for "and"; a one-word name after the first author is tolerated).
export function parseEsweekAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l, k) => k > 20 && /^Best Paper and Test-of-Time Awards$/.test(l));
  if (i0 < 0) return { entries, skipped: ["no awards list"] };
  let year = 0;
  for (let i = i0 + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^(?:19|20)\d\d$/.test(l)) { year = +l; continue; }
    const m = /^(CASES|CODES\+ISSS?|EMSOFT)( Test-of-Time)?:\s+(.{8,})$/.exec(l);
    if (!m || !year) continue;
    const venue = m[1] === "CASES" ? "CASES" : m[1] === "EMSOFT" ? "EMSOFT" : "CODES+ISSS", tot = !!m[2];
    const py = /\((\d{4})\)\s*$/.exec(m[3]), title = cleanTitle(m[3].replace(/\s*\(\d{4}\)\s*$/, ""));
    const who = names((ls[i + 1] || "").replace(/&\s*/g, "and ").replace(/,\s+and\s+and\b/g, ", and"));
    if (who.length && isPerson(who[0]) && who.every((w, k) => isPerson(w) || (k > 0 && /^\p{Lu}[\p{L}-]+$/u.test(w)))) {
      entries.push({ venue, year, award: tot ? "tot" : "best", awardLabel: tot ? "Test-of-Time Award" : "Best Paper Award", title, authors: who, track: "main", source, evidence: `${venue} ${year} ${tot ? "Test-of-Time" : "Best Paper"}: ${title} — ${ls[i + 1]}`, ...(tot && py ? { paperYear: +py[1] } : {}) });
      i++;
    } else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// HSCC's "Past HSCC Conferences" page (hscc.acm.org/<year>/previous-hscc-editions/): under "Test-of-time Award Winners" lines "2022: Authors. Title. HSCC 2002." (a line without the paper's HSCC year is not read) and under "Recent HSCC Best Paper (BP) and Best Student Paper (BSP) Award Winners" lines "2022: (BP) Authors. Title."
export function parseHsccPast(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  let mode = null;
  const split = (t) => /^(.+?(?<![\s.][A-Z]))\.\s+(\S.{8,})$/.exec(t);
  for (const l of ls) {
    if (/^Test-of-time Award Winners$/i.test(l)) { mode = "tot"; continue; }
    if (/^Recent HSCC Best Paper/i.test(l)) { mode = "best"; continue; }
    if (!mode) continue;
    const m = /^((?:19|20)\d\d):\s+(?:\((BP|BSP)\)\s+)?(.+)$/.exec(l);
    if (!m) { if (/^Home$/.test(l)) break; continue; }
    const year = +m[1];
    let rest = m[3], paperYear = 0;
    if (mode === "tot") {
      const t = /^(.*?)\.?\s+HSCC (\d{4})\.?$/.exec(rest);
      if (!t) { skipped.push(`${year}: no paper year: ${rest.slice(0, 40)}`); continue; }
      rest = t[1]; paperYear = +t[2];
    }
    const sp = split(rest.replace(/\.$/, ""));
    if (!sp) { skipped.push(`${year}: not read: ${rest.slice(0, 40)}`); continue; }
    const who = names(sp[1]), title = cleanTitle(sp[2]);
    const award = mode === "tot" ? "tot" : m[2] === "BSP" ? "student" : "best";
    const label = mode === "tot" ? "Test-of-Time Award" : m[2] === "BSP" ? "Best Student Paper Award" : "Best Paper Award";
    if (who.length && who.every(isPerson)) entries.push({ venue: "HSCC", year, award, awardLabel: label, title, authors: who, track: "main", source, evidence: `HSCC ${year} ${label}: ${sp[1]}. ${title}`, ...(paperYear ? { paperYear } : {}) });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// DATE's "date-best-papers-<year>.pdf" or, from 2020, the page proceedings-archive/<year>/html/bestpaper.html (HTML is split into lines first) (past.date-conference.com/proceedings-archive/<year>/html/…, text from scripts/awards/pdf-text.swift): "The DATE 2018 best papers are:", then per track "D Track" / "A Track" / "T Track" / "E Track" the title (one to three lines, upper case in 2015 and 2016), the authors with affiliation numbers, and the affiliations; "Best Paper Award Nominations" or "Congratulations" ends the winners, and a block whose authors and affiliations interleave (2015) is not read.
export function parseDateBest(text, source) {
  const entries = [], skipped = [];
  const ls = (/<(?:p|div|br|h\d|li|td|span)\b/i.test(text) ? lines(text).join("\n") : text).replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).normalize("NFC").replace(ZW, "").replace(/\u00ad/g, "").replace(/[\u2010\u2011\u2012\u2013]/g, "-").replace(/-{2,}/g, "-").split(/\r?\n/).map((x) => x.replace(/[\t\u00a0]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^The DATE \d{4} best papers are:?$/.test(l));
  if (i0 < 0) return { entries, skipped: ["no best papers list"] };
  const year = +/(\d{4})/.exec(ls[i0])[1];
  const AFFIL = /^\d|\b(?:University|Universit\w*|Institute|Intel|ARM|IBM|Corporation|Laboratories|Research|College|Inc|GmbH|Lab|Technology|Tsinghua|CISTER|NTU)\b/;
  const nameList = (t) => { const w = names(t.replace(/\s*\d+(?:,\d+)*/g, "").replace(/\s+,/g, ",").replace(/^[,\s]+|[,\s]+$/g, "")); return w.length && w.every((n) => isPerson(n) && !n.split(" ").some((x) => /^\p{Lu}{4,}$/u.test(x) || /^(?:University|Universit\w*|Institute|College|Laboratories|Corporation|Technology|Research|Lab|Inc|GmbH)$/.test(x))) ? w : null; };
  let i = i0 + 1;
  while (i < ls.length && !/^Best Paper Award Nominations$/i.test(ls[i]) && !/^[A-Z] track:?$/.test(ls[i])) {
    if (!/^[A-Z] Track:?$/.test(ls[i])) { i++; continue; }
    let j = i + 1;
    const block = [];
    while (j < ls.length && !/^[A-Z] [Tt]rack:?$/.test(ls[j]) && !/^Best Paper Award Nominations$/i.test(ls[j])) block.push(ls[j++]);
    i = j;
    const a = block.findIndex((l, k) => k >= 2 && (/^\d/.test(l) || (AFFIL.test(l) && !nameList(l))));
    let who = null, k = 0;
    if (a > 0 && block.slice(a).some((l) => !AFFIL.test(l) && !/^Congratulations/.test(l))) { skipped.push(`${year}: authors and affiliations interleave in ${block[0].slice(0, 40)}`); continue; }
    if (a > 0) for (k = 1; k <= Math.min(3, a - 1); k++) { if (k < a - 1 && !/\p{L}\s*\d|,/u.test(block[k])) continue; who = nameList(block.slice(k, a).join(" ")); if (who && who[0].split(" ").length <= 4) break; who = null; }
    const title = cleanTitle(block.slice(0, k).join(" "));
    if (who && title.length >= 12) entries.push({ venue: "DATE", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `DATE ${year} best paper: ${title} — ${block.slice(k, a).join(" ")}` });
    else skipped.push(`${year}: not read: ${(block[0] || "").slice(0, 50)}`);
  }
  return { entries, skipped };
}

// DATE's own site award pages (date<yy>.date-conference.com/awards, 2023–2025): under "DATE Best Paper Awards" a "D-Track" / "A Track:" heading per track and then either the title, the authors and the affiliations (2023, 2025) or the authors, the affiliations and the title ending in "(Session BPA04 …)" (2024); the authors are the run of person names at the start of the authors line, whatever follows (an institution on the same line) is dropped. The nominations and reviewer awards are not read.
export function parseDateAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const yy = (/date(\d\d)\.date-conference\.com/.exec(source) || [])[1];
  const year = yy ? 2000 + +yy : 0;
  const i0 = ls.findIndex((l) => /^DATE Best Paper Awards(?: \d{4})?$|^Best Paper Awards$/.test(l));
  if (!year || i0 < 0 || !ls.some((l) => new RegExp(`DATE ${year}\\b`).test(l))) return { entries, skipped: ["no best papers list for the year"] };
  let i = i0 + 1;
  while (i < ls.length && !/^Best Paper Award Nominations|^Outstanding Reviewer Awards?/i.test(ls[i])) {
    if (!/^[ADTE][- ]Track:?$/.test(ls[i])) { i++; continue; }
    let j = i + 1;
    const block = [];
    while (j < ls.length && !/^[ADTE][- ]Track:?$/.test(ls[j]) && !/^Best Paper Award Nominations|^Outstanding Reviewer Awards?/i.test(ls[j])) block.push(ls[j++]);
    i = j;
    let title = "", rest = [];
    for (const l of block) {
      const m = /^(.*?)\s*\(Session [^)]*\)\s*$/.exec(l);
      if (m && !m[1]) continue;
      if (m && !title) title = m[1].trim(); else rest.push(l);
    }
    if (!title) title = rest.shift() || "";
    const parts = (rest[0] || "").replace(/\s*\d+(?:,\d+)*(?=\s*(?:,|and\b|$))/g, "").split(/,\s*|\s+and\s+/);
    const who = [];
    for (const x of parts) { if (isPerson(x.trim()) && !/\b(?:University|Universit\w*|Institute|College|Laborator\w*|Corporation|Technology|Research|Lab|Inc)\b/.test(x)) who.push(x.trim()); else break; }
    if (who.length && title.length >= 12) entries.push({ venue: "DATE", year, award: "best", awardLabel: "Best Paper Award", title: cleanTitle(title), authors: who, track: "main", source, evidence: `DATE ${year} best paper: ${cleanTitle(title)} — ${rest[0]}` });
    else skipped.push(`${year}: not read: ${(block[0] || "").slice(0, 50)}`);
  }
  return { entries, skipped };
}

// DAC's best paper press releases (dac.com/press-release/the-57th-design-automation-conference-best-paper-awards, …the-61st-dac-chips-to-systems-conference-best-paper-awards; the only two the site has): the release date line gives the year, under "Best Paper Research" (or "… Track") the title and then one "Name, Affiliation" line per author; the nominees list before it and the designer-track presentation awards after it are not read.
export function parseDacBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const d = ls.findIndex((l) => /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}$/.test(l));
  const t = ls.findIndex((l, k) => k > d && /^The \d+(?:st|nd|rd|th) (?:Design Automation Conference|DAC)\b.*Best Paper Awards$/.test(l));
  const year = d >= 0 ? +/(\d{4})$/.exec(ls[d])[1] : 0;
  const i0 = ls.findIndex((l, k) => k > d && /^Best Paper Research(?: Track)?$/.test(l));
  if (!year || d < 0 || i0 < 0 || !ls.some((l) => /DAC/.test(l) && /Best Paper/i.test(l))) return { entries, skipped: ["no best paper release"] };
  const title = cleanTitle(ls[i0 + 1] || ""), who = [];
  for (let i = i0 + 2; i < ls.length; i++) {
    const m = /^([^,]+),\s+\S/.exec(ls[i]);
    if (!m || !isPerson(m[1].trim()) || /\b(?:University|Institute|College)\b/.test(m[1])) break;
    who.push(m[1].trim());
  }
  if (title.length >= 12 && who.length) entries.push({ venue: "DAC", year, award: "best", awardLabel: "Best Paper Award (Research Track)", title, authors: who, track: "main", source, evidence: `DAC ${year} Best Paper Research: ${title} — ${who.join(", ")}` });
  else skipped.push(`${year}: not read`);
  return { entries, skipped };
}

// IEEE CEDA's conference best paper award pages (ieee-ceda.org/paper-award/asp-dac-best-paper-award, …/dac-best-paper-award, …/date-best-paper-award), the same blocks as the McCalla page after "Choose Year": "Paper", "Paper", the title, "Author(s)", the authors (commas, semicolons or "and"; a quoted nickname and a space inside "C. -C." are tidied), optionally "Publication Date" and "Citation" (a nominee or finalist citation is not read), "Event Where Awarded" and the conference with its year, which is the year of the award.
const CEDA_VENUE = { "ASP-DAC": "ASP-DAC", DAC: "DAC", DATE: "DATE" };
export function parseCedaPaper(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const hd = ls.map((l) => /^(ASP-DAC|DAC|DATE) Best Paper Award(?:s)?(?: \| IEEE CEDA)?$/.exec(l)).find(Boolean);
  const i0 = ls.findIndex((l) => /^Choose Year$/.test(l));
  const venue = hd && CEDA_VENUE[hd[1]];
  if (!venue || i0 < 0) return { entries, skipped: ["not a CEDA conference best paper page"] };
  for (let i = i0; i < ls.length; i++) {
    if (ls[i] !== "Author(s)") continue;
    const title = cleanTitle(ls[i - 1] || ""), au = (ls[i + 1] || "").replace(/^\s*"+|"+\s*$/g, "").replace(/\s*"[^"]*"\s*/g, " ").replace(/\b([A-Z])\.\s+-([A-Z])/g, "$1.-$2").replace(/;/g, ",");
    const who = names(au);
    let cit = "", ev = "";
    for (let j = i + 2; j < Math.min(ls.length, i + 12); j++) {
      if (ls[j] === "Author(s)" || ls[j] === "Paper") break;
      if (ls[j] === "Citation") cit = ls[j + 1] || "";
      if (ls[j] === "Event Where Awarded") { ev = ls[j + 1] || ""; break; }
    }
    const year = parseInt((/^(\d{4}) /.exec(ev) || [])[1], 10);
    if (!year || /nominat|finalist|honorable/i.test(cit) || !who.length || !who.every(isPerson) || title.length < 8) { skipped.push(`${year || "?"}: not read: ${title.slice(0, 50)}`); continue; }
    entries.push({ venue, year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `${venue} ${year} Best Paper Award${cit ? ` (${cit})` : ""}: ${title} — ${ls[i + 1]}` });
  }
  return { entries, skipped };
}

// The SIGGRAPH/Eurographics Symposium on Computer Animation's award pages (computeranimation.org/awards for the current year, computeranimation.org/<year>/awards.html): a label line "Best Paper" or "Best Paper, Honourable Mention(s)" followed by pairs of a title line and an authors line; the presentation, poster, dissertation and early-career awards are not read. The year comes from the address, or for the current page from the "sca<year>awards" address on it.
export function parseScaAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/computeranimation\.org\/(\d{4})\//.exec(source) || /sca(\d{4})awards/i.exec(ls.join(" ")) || [])[1], 10);
  const i0 = ls.findIndex((l) => /^(?:Paper Presentation and Poster Awards|Awards)$/.test(l) || /^Best Paper(?:, Honou?rable Mentions?)?$/.test(l));
  if (!year || i0 < 0) return { entries, skipped: ["no paper awards for the year"] };
  let kind = null;
  for (let i = i0; i < ls.length; i++) {
    const l = ls[i];
    if (/^Best Paper$/.test(l)) { kind = "best"; continue; }
    if (/^Best Paper, Honou?rable Mentions?$/.test(l)) { kind = "runner-up"; continue; }
    if (/^(?:Best (?:Presentation|Poster)|Doctoral|Early Career|Awarded|Honou?rable mention|The SCA )/i.test(l)) { kind = null; continue; }
    if (!kind) continue;
    const who = names(ls[i + 1] || ""), title = cleanTitle(l);
    if (who.length && who.every(isPerson) && title.length >= 12 && !/[.:?]$/.test(ls[i + 1])) {
      entries.push({ venue: "SCA", year, award: kind, awardLabel: kind === "best" ? "Best Paper Award" : "Best Paper Honourable Mention", title, authors: who, track: "main", source, evidence: `SCA ${year} ${kind === "best" ? "Best Paper" : "Best Paper, Honourable Mention"}: ${title} — ${ls[i + 1]}` });
      i++;
    }
  }
  return { entries, skipped };
}

// MIDDLEWARE's award pages (middleware-conf.github.io/awards/best-paper/, …/best-student-paper/, …/test-of-time/): after the "Year / Paper / Authors" header, per paper a year line ("2025", "2024*" or "2022 Runner-up" / "2025 Honorable Mention"), the title and the authors with their affiliations in brackets; the test-of-time year is the award year, the paper being ten years older.
export function parseMiddlewareAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^(?:Year|Year of Award)$/.test(l));
  let h = null;
  for (let j = i0 - 1; j >= 0 && !h; j--) h = /^(Best Paper Award|Best Student Paper Award|Test of Time Award)$/.exec(ls[j]);   // the heading nearest above the table (the menu above it names all three)
  if (!h || i0 < 0 || !ls.some((l) => /MIDDLEWARE/i.test(l))) return { entries, skipped: ["not a MIDDLEWARE award page"] };
  const kind = h[1] === "Test of Time Award" ? "tot" : h[1] === "Best Paper Award" ? "best" : "student";
  for (let i = i0 + 1; i + 2 < ls.length; i++) {
    const y = /^(\d{4})\*?(?: (Runner-up|Honorable Mention))?$/.exec(ls[i]);
    if (!y) { if (/^Last updated/.test(ls[i])) break; continue; }
    const year = +y[1], title = cleanTitle(ls[i + 1].replace(/\s+(?:Talk )?Slides$/, "")), who = names(ls[i + 2]);
    const award = y[2] ? "runner-up" : kind;
    const label = kind === "tot" ? "Test of Time Award" : `${kind === "best" ? "Best Paper" : "Best Student Paper"}${y[2] ? ` ${y[2]}` : " Award"}`;
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "Middleware", year, award, awardLabel: label, title, authors: who, track: "main", source, evidence: `Middleware ${year} ${label}: ${title} — ${ls[i + 2]}`, ...(kind === "tot" ? { paperYear: year - 10 } : {}) });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i += 2;
  }
  return { entries, skipped };
}

// The Association for Constraint Programming's "Paper Awards" page (a4cp.org/awards/paper-awards): a "CP 2025" heading, then lines "Best Technical Paper: Authors. Title" (a label such as Best Paper, Best Student Paper, Distinguished Paper, a "Best Application Track Paper" or "Best ML Track Paper"; a line may wrap), and lists of unlabelled lines "Authors. Title" under "Runners-Up:", "Honorable Mentions:", "Best Papers:" or "Distinguished Papers:". Ligature letters are normalised.
export function parseCpAwards(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.replace(/\u0131\u0301/g, "\u00ed").normalize("NFKC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^Paper Awards$/.test(l));
  if (i0 < 0) return { entries, skipped: ["not the ACP paper awards page"] };
  const items = [];
  let year = 0, label = null, listMode = false, cur = null;
  const flush = () => { if (cur) items.push(cur); cur = null; };
  for (let i = i0 + 1; i < ls.length; i++) {
    const l = ls[i];
    if (/^CP 2001 was the first conference/.test(l) || /^Design by /.test(l)) break;
    const y = /^CP ((?:19|20)\d\d)$/.exec(l);
    if (y) { flush(); year = +y[1]; label = null; listMode = false; continue; }
    const m = /^((?:Best|Distinguished)(?: [A-Za-z/]+)* Papers?|Runners?-Up|Honorable Mentions?)\s*:\s*(.*)$/.exec(l);
    if (m) { flush(); label = m[1]; listMode = !m[2]; if (m[2]) cur = { year, label, body: m[2] }; continue; }
    if (!year || !label) continue;
    if (listMode) { flush(); items.push({ year, label, body: l }); continue; }
    if (cur) cur.body += " " + l;
  }
  flush();
  for (const it of items) {
    const sp = /^(.+?(?<!(?:^|[\s.])[A-Z]))\.\s+(\S.{8,})$/.exec(it.body.replace(/\s+/g, " "));
    if (!sp) { skipped.push(`${it.year}: not read: ${it.body.slice(0, 50)}`); continue; }
    const who = names(sp[1]), title = cleanTitle(sp[2].replace(/\.$/, ""));
    const lab = it.label;
    const award = /^Runner|^Honorable/.test(lab) ? "runner-up" : /Student/.test(lab) ? (/^Distinguished/.test(lab) ? "distinguished" : "student") : /^Distinguished/.test(lab) ? "distinguished" : /Application|ML/.test(lab) ? "category" : "best";
    if (who.length && who.every(isPerson) && title.length >= 8) entries.push({ venue: "CP", year: it.year, award, awardLabel: lab.replace(/s$/, ""), title, authors: who, track: "main", source, evidence: `CP ${it.year} ${lab}: ${sp[1]}. ${title}` });
    else skipped.push(`${it.year}: not read: ${title.slice(0, 50)}`);
  }
  return { entries, skipped };
}

// NAACL HLT's own best papers pages (naacl.org/naacl-hlt-2015/best-paper-awards.html, naacl.org/naacl-hlt-2016/best_papers.html; the other years' pages of that site are gone): after "List of best papers" a title line ending in a colon and an authors line "A, B and C. Affiliation"; the page does not say which is the long and which are the student papers, so all are read as best papers.
export function parseNaaclBest(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const year = parseInt((/naacl-hlt-(\d{4})\//.exec(source) || [])[1], 10);
  const main = ls.findIndex((l) => /^Best Papers: Main Conference$/i.test(l));
  if (main >= 0 && year) {
    // 2016's layout: "Best Short Paper", "Short Paper, Runners Up", "Best Long Papers", "Long Paper, Runners Up", then per paper the title, the authors and a long description paragraph
    if (!new RegExp(`NAACL HLT ${year}`).test(String(html))) return { entries, skipped: ["no best papers for the year"] };
    let kind = null;
    for (let i = main + 1; i < ls.length; i++) {
      const l = ls[i];
      if (/^Best (?:Short|Long) Papers?$/i.test(l)) { kind = "best"; continue; }
      if (/^(?:Short|Long) Paper, Runners? Up$/i.test(l)) { kind = "runner-up"; continue; }
      if (/^Best Papers:/i.test(l) || /^Best Reviewers$/i.test(l) || /^Back to Program$/i.test(l)) { if (entries.length) break; continue; }
      if (!kind || l.length > 160) continue;
      const who = names(ls[i + 1] || ""), title = cleanTitle(l);
      if (who.length && who.every(isPerson) && title.length >= 12 && ls[i + 1].length < 200) {
        entries.push({ venue: "NAACL", year, award: kind, awardLabel: kind === "best" ? "Best Paper Award" : "Best Paper Runner-up", title, authors: who, track: "main", source, evidence: `NAACL ${year} ${kind === "best" ? "best paper" : "best paper runner-up"}: ${title} — ${ls[i + 1]}` });
        i++;
      }
    }
    return { entries, skipped };
  }
  const i0 = ls.findIndex((l) => /^List of best papers$/i.test(l));
  if (!year || i0 < 0 || !ls.some((l) => new RegExp(`NAACL HLT ${year}`).test(l))) return { entries, skipped: ["no best papers list for the year"] };
  for (let i = i0 + 1; i + 1 < ls.length; i++) {
    if (!/:$/.test(ls[i])) continue;
    const title = cleanTitle(ls[i].replace(/:$/, "")), m = /^(.+?(?<!(?:^|[\s.])[A-Z]))\.\s+\S/.exec(ls[i + 1]);
    const who = m ? names(m[1]) : [];
    if (who.length && who.every(isPerson) && title.length >= 12) entries.push({ venue: "NAACL", year, award: "best", awardLabel: "Best Paper Award", title, authors: who, track: "main", source, evidence: `NAACL ${year} best paper: ${title} — ${ls[i + 1]}` });
    else skipped.push(`${year}: not read: ${title.slice(0, 50)}`);
    i++;
  }
  return { entries, skipped };
}

// The UbiComp steering committee's awards page (ubicomp.org/sc/awards.html): blocks headed "UbiComp 2016" or "Pervasive 2012" (newest first, a block heading never more than a year below the one before), in them the sections "Best Paper Awards", "Gaetano Borriello Best Student Paper Award" and "10-year Impact Award(s)", each paper a title line and an authors line, an impact paper also a line naming the venue and year it appeared in ("Pervasive 2006") or "Runner-up"; the outstanding student awards, which name people, and the one-time awards are not read.
export function parseUbicompSc(html, source) {
  const entries = [], skipped = [];
  const ls = lines(html).map((x) => x.normalize("NFC").replace(ZW, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const i0 = ls.findIndex((l) => /^UbiComp Awards/.test(l) || /^Award winners by year$/.test(l));
  if (i0 < 0 || !(ls.some((l) => /UbiComp/i.test(l)) && ls.some((l) => /Steering Committee/.test(l)))) return { entries, skipped: ["not the UbiComp steering committee's awards page"] };
  let venue = null, year = 0, section = null;
  const HEAD = /^(UbiComp|Pervasive) (\d{4})$/;
  for (let i = i0; i < ls.length; i++) {
    const l = ls[i], h = HEAD.exec(l);
    if (h && (!year || +h[2] === year || +h[2] === year - 1)) { venue = h[1]; year = +h[2]; section = null; continue; }
    if (!year) continue;
    if (/^Best Paper Awards?$/i.test(l)) { section = "best"; continue; }
    if (/^Gaetano Borriello Best Student Paper Award$/i.test(l)) { section = "student"; continue; }
    if (/^10-year Impact Awards?(?:: .*| for \d{4})?$/i.test(l)) { section = "tot"; continue; }
    if (/Award|^Committee chair|^Winner|^Finalist|^Runner-up$|^Jump to/.test(l) && l.length < 90) { if (!/^Runner-up$/.test(l)) section = null; continue; }
    if (!section) continue;
    const who = names(ls[i + 1] || ""), title = cleanTitle(l);
    if (/Outstanding Student Award|Postponed|Committee chair|^Winner|^Finalist/i.test(l) || /^(?:Winner|Finalist|Committee|Postponed)|&middot;/i.test(ls[i + 1] || "")) continue;
    if (who.length && who.every(isPerson) && title.length >= 12 && ls[i + 1].length < 400) {
      let paperYear = year - 10, j = i + 2;
      const o = /^(?:UbiComp|Pervasive) (\d{4})$/.exec(ls[j] || "");
      if (section === "tot" && o && Math.abs(+o[1] - (year - 10)) <= 1) { paperYear = +o[1]; j++; }
      const label = section === "best" ? "Best Paper Award" : section === "student" ? "Gaetano Borriello Best Student Paper Award" : "10-year Impact Award";
      entries.push({ venue, year, award: section === "tot" ? "tot" : section, awardLabel: label, title, authors: who, track: "main", source, evidence: `${venue} ${year} ${label}: ${title} — ${ls[i + 1]}`, ...(section === "tot" ? { paperYear } : {}) });
      i = j - 1;
    }
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

// A page that never mentions an entry's conference (a reader pointed at the wrong saved file) cannot have produced it: keep only entries whose venue name — or any word of it of three letters or more — is on the page.
export function venueGuard(entries, page) {
  const text = String(page).replace(/&amp;/gi, "&").replace(/<[^>]+>/g, " ").toLowerCase();
  const kept = [], dropped = [];
  for (const e of entries) {
    const words = String(e.venue ?? "").toLowerCase().split(/[\/+\s-]+/).filter((w) => w.length >= 3);
    (words.length === 0 || words.some((w) => text.includes(w)) ? kept : dropped).push(e);
  }
  return { kept, dropped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, file, srcUrl] = process.argv.slice(2);
  const venues = { popl: "POPL", pldi: "PLDI", icfp: "ICFP", oopsla: "OOPSLA" };
  const parse = venues[kind] ? (h, src) => parseSigplan(h, venues[kind], src) : RAS[kind] ? (h, src) => parseRas(h, RAS[kind], src) : { www: parseWww, isca: parseIsca, micro: parseMicro, dijkstra: parseDijkstra, focs: parseFocs, sigops: parseSigopsHof, eurosys: parseEurosysTot, aamas: parseAamas, ec: parseEcTot, asplos: parseAsplosMip, iacr: parseIacrTot, tcc: parseTccTot, sigmobile: parseSigmobileTot, sensys: parseSensysTot, pkc: (h, src) => parseTccTot(h, src, "PKC"), ches: parseChesTot, hpca: parseHpcaTot, imc: parseImcTot, vis: parseVisTot, icde: parseIcdeInfluential, ismar: parseIsmarAwards, icse: parseIcseMip, lics: parseLicsTot, "lics-dp": parseLicsDistinguished, aaai: parseAaaiClassic, icaps: parseIcapsInfluential, swsa: parseSwsaTenYear, sigmm: parseSigmmTot, ht: parseHtEngelbart, doceng: parseDocengBest, newton: parseSigdaNewton, sigspatial: parseSigspatial, sigcse: parseSigcseTot, icwsm: parseIcwsmAwards, etaps: parseEtapsTot, "etaps-bp": parseEtapsBest, gecco: parseGeccoImpact, "kdd-bp": parseKddBest, "kdd-tot": parseKddTot, sigcomm: parseSigcommTot, "nips-book-2018": parseNipsBookTot, dac: parseDacMip, "asplos-year": parseAsplosYear, "sigcomm-year": parseSigcommProgram, "colt-year": parseColtAwards, "corl-year": parseCorlAwards, "rss-year": parseRssAwards, "sosp-program": parseSospProgram, recsys: parseRecsysBest, aistats: parseAistatsAwards, uai: parseUaiAwards, icassp: parseIcasspAwards, coling: parseColingAwards, interspeech: parseInterspeechBest, ecml: parseEcmlAwards, infocom: parseInfocomBest, eurosp: parseEurospAwards, "wsdm-year": parseWsdmYear, "ppopp-year": parsePpoppYear, ics: parseIcsAwards, ipdps: parseIpdpsBest, ecir: parseEcirAwards, "focs-best": parseFocsBest, "ccc-year": parseCccProgram, "mobisys-html": parseMobisysHtml, "sensys-year": parseSensysYear, "isca-best": parseIscaBest, "micro-best": parseMicroBest, "hri-year": parseHriAwards, "imc-year": parseImcProgram, "models-awards": parseModelsAwards, "jcdl-awards": parseJcdlAwards, "gecco-best": parseGeccoBest, "bmvc-awards": parseBmvcAwards, "vrst-best": parseVrstBest, "assets-sui": parseAssetsSuiAwards, "autoui-best": parseAutoUiBest, "acmmm-awards": parseAcmmmAwards, "ieeevr-best": parseIeeeVrBest, "icc-best": parseIccBest, "wcnc-best": parseWcncBest, "globecom-best": parseGlobecomBest, "chiir-best": parseChiirBest, "sigcomm25": parseSigcomm25Awards, "ecml-authors-first": parseEcmlAwardsAuthorsFirst, cidr: parseCidrAwards, "www-year": parseWwwYearAwards, "pimrc-best": parsePimrcBest, "ccnc-awards": parseCcncAwards, "noms-awards": parseNomsAwards, "miccai-best": parseMiccaiBest, "ecai-awards": parseEcaiAwards, "icdt-awards": parseIcdtAwards, "eatcs-paper": parseEatcsPaper, "cade-awards": parseCadeAwards, "dsn-best": parseDsnBest, "tcfpga-best": parseTcfpgaBest, "mccalla-awards": parseMccallaAwards, "umap-best": parseUmapBest, "recomb-awards": parseRecombAwards, "spaa-awards": parseSpaaAwards, "esweek-awards": parseEsweekAwards, "hscc-past": parseHsccPast, "date-best": parseDateBest, "date-awards": parseDateAwards, "dac-best": parseDacBest, "ceda-paper": parseCedaPaper, "sca-awards": parseScaAwards, "middleware-awards": parseMiddlewareAwards, "cp-awards": parseCpAwards, "naacl-best": parseNaaclBest, "ubicomp-sc": parseUbicompSc, "bpm-awards": parseBpmAwards, "socg-awards": parseSocgAwards, "sat-awards": parseSatAwards, "cikm-year": parseCikmNominations, "mobisys-year": parseMobisysYear, "mobicom-year": parseMobicomYear, sc: parseScAwards, "www-best": parseWwwBest, mobicom: parseMobicomBest, siggraph: parseSiggraphAwards, icdm: parseIcdmBest, ubicomp: parseUbicompAwards, "icml-tot-2021": (h, src) => parseVirtualTotDetail(h, src), "neurips-2022": parseNeuripsBlogTot, "neurips-2024": parseNeuripsBlogTot }[kind];
  if (!parse) { console.error("usage: tot.mjs www|isca|micro|dijkstra|popl|pldi|icfp|oopsla|focs|sigops [saved-page.html]"); process.exit(2); }
  const html = file ? readFileSync(file, "utf8") : await (await fetch(PAGES[kind], { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const parsed = parse(html, srcUrl || PAGES[kind]);
  const { kept: entries, dropped } = venueGuard(parsed.entries, html);
  const skipped = [...parsed.skipped, ...dropped.map((e) => `dropped: the page never mentions ${e.venue} (${e.year} ${e.title.slice(0, 40)})`)];
  const by = {};
  for (const e of entries) by[e.year] = (by[e.year] || 0) + 1;
  console.error(entries.length + " entries:", JSON.stringify(by));
  for (const s of skipped) console.error("skipped:", s);
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
