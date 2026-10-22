// Text for the copy buttons, the toolbar popup and agents: the papers (as records) or the summary go in, a string comes out. Pure, no DOM.
//
// A paper record, as content/main.js makes it from the rows the page shows:
//   { id, title, authors, me, venue, year, citations, role, status, highlighted, type, rank: { ccf: { tier, name } | null, core: { rank, name } | null }, marks: [string], url }
//   `me` is the profile owner's name as this paper's author line prints it ("" when it was not found there)
//   `authors` is the author line as Scholar printed it (or the full list read from the paper's page), "…" or "..." where Scholar cut it; `type` is
//   "conference" | "journal" | null (what the rank lists say the venue is); `url` is absolute or "". Titles and author names are whatever their authors typed: every
//   format below treats them as untrusted text (a title can look like a spreadsheet formula, a Markdown link, a TeX command).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).formats = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NONE = "none";
  const ROLE_LABEL = { first: "First author", cofirst: "Co-first author", second: "Second author", last: "Last author", middle: "Other positions" };
  const clean = (s) => String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").trim();
  const CUT = /^(?:\.\.\.|…)$/;
  // the names of an author line, and whether Scholar cut the list ("A Author, B Writer, …")
  function authorList(line) {
    const parts = clean(line).split(/,\s*/).filter(Boolean);
    return { names: parts.filter((a) => !CUT.test(a)), cut: parts.some((a) => CUT.test(a)) || /(?:\.\.\.|…)$/.test(clean(line)) };
  }
  // `prefer`: the list that stands alone where both rank the venue (the settings' `rows.prefer`, as the chips draw it), or null for both
  const rankNotes = (p, { ccfOn = true, coreOn = true, prefer = null } = {}) => {
    const ccf = ccfOn && p.rank.ccf && p.rank.ccf.tier, core = coreOn && p.rank.core && p.rank.core.rank, both = ccf && core;
    return [ccf && !(both && prefer === "core") ? `CCF ${ccf}` : "", core && !(both && prefer === "ccf") ? `CORE ${core}` : ""].filter(Boolean);
  };

  // ---- the summary --------------------------------------------------------------------------------------------------------------------------

  // Plain-text summary for the clipboard.
  // `scope`: what the counts count when it is less than the whole profile ("Showing 25 of 100 papers · 2021–…"): a line under the title; `notes`: lines of provenance
  // ("Source: <the profile's link> · 2026-10-16", "Not fully loaded: 20 papers so far") under it
  function summaryText(summary, { owner = "", edition = "", label = ROLE_LABEL, notRanked = "unranked", extra = [], scope = "", notes = [] } = {}) {
    const src = summary.source === "core" ? "CORE" : summary.source === null ? "" : "CCF";
    const lines = [];
    lines.push((owner ? owner + " — " : "") + `${summary.papers} papers on Google Scholar, by authorship role${src ? ` and ${src} rank` : ""}`);
    if (scope) lines.push(scope);
    for (const note of notes) lines.push(note);
    for (const r of summary.rows) {
      if (!r.total) continue;
      const parts = summary.columns.filter((c) => r[c]).map((c) => `${c === NONE ? notRanked : c}: ${r[c]}`);
      lines.push(`${label[r.role]}: ${r.total}${parts.length ? ` (${parts.join(", ")})` : ""}`);
    }
    const u = summary.unranked;
    if (u && summary.totals[NONE]) lines.push(`Not ranked: ${summary.totals[NONE]} (${[["preprints", u.preprint], ["secondary tracks of ranked venues", u.secondary], ["other venues", u.other]].filter(([, n]) => n).map(([w, n]) => `${w} ${n}`).join(", ")})`);
    lines.push(...unseenLines(summary));
    for (const line of extra) lines.push(line);
    if (edition) lines.push(edition);
    return lines.join("\n");
  }

  // The papers the table does not count by role: the author list was cut and the name is not in the part Scholar shows, or the list is whole and has no such name
  const unseenLines = (summary) => [
    summary.hidden ? `Role not visible (author list truncated by Scholar): ${summary.hidden}` : "",
    summary.absent ? `Name not found in author list: ${summary.absent}` : ""
  ].filter(Boolean);

  // The summary table: a header and one row per role, then the totals.
  function summaryTable(summary, { label = ROLE_LABEL, header = "Role", total = "Total", notRanked = "Unranked" } = {}) {
    return {
      header: [header, ...summary.columns.map((c) => (c === NONE ? notRanked : c)), total],
      rows: [...summary.rows.map((r) => [label[r.role], ...summary.columns.map((c) => r[c]), r.total]), ["", ...summary.columns.map((c) => summary.totals[c]), summary.totals.total]]
    };
  }
  // The same table, tab-separated, for a spreadsheet. `opts.scope`: what it counts, when that is less than the whole profile: a last line under the table
  function summaryTsv(summary, opts) {
    const t = summaryTable(summary, opts), o = opts || {};
    return rowsTsv(t.header, [...t.rows, ...[o.scope, ...unseenLines(summary), ...(o.notes || [])].filter(Boolean).map((line) => [line])]);
  }

  // ---- tables: tab-separated and CSV ----------------------------------------------------------------------------------------------------------
  // A title is whatever its author typed: one that begins with = + - or @ would be a formula in Excel or Sheets (and "=HYPERLINK(…)" could do more than
  // show itself), so such a field gets a leading apostrophe — the spreadsheets' own sign for "text" — unless it is a plain number.
  const formulaSafe = (s) => (/^[=+\-@]/.test(s) && !/^[+-]?\d+(?:[.,]\d+)?$/.test(s) ? "'" + s : s);

  // Tab-separated rows under a header. A tab or line break inside a field is a space; a field with a quotation mark is quoted whole, its quotes doubled
  // (a quotation mark is a text qualifier to a spreadsheet).
  function rowsTsv(header, rows) {
    const cell = (v) => {
      const safe = formulaSafe(String(v == null ? "" : v).replace(/[\t\r\n]+/g, " ").trim());
      return safe.includes('"') ? '"' + safe.replace(/"/g, '""') + '"' : safe;
    };
    return [header, ...rows].map((r) => r.map(cell).join("\t")).join("\n");
  }

  // RFC 4180 CSV with a UTF-8 byte-order mark (Excel needs it for non-ASCII text); fields with a comma, quote, semicolon or line break are quoted, quotes doubled.
  function rowsCsv(header, rows) {
    const cell = (v) => {
      const safe = formulaSafe(String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim());
      return /[",;\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
    };
    return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  }

  // The papers as a table: one line each. `labels`: { year, title, authors, role, venue, ccf, core, awards, citations, hidden, roles: { first, … } } (what the header and the role cells say)
  function table(papers, { labels, ccfOn = true, coreOn = true }) {
    const roleOf = (p) => (p.status === "found" ? labels.roles[p.role] || p.role : p.status === "hidden" ? labels.hidden : "");   // (a cut list: the role is not known; no name in the list: no role)
    return {
      header: [labels.year, labels.title, labels.authors, labels.role, labels.venue, ...(ccfOn ? [labels.ccf] : []), ...(coreOn ? [labels.core] : []), labels.awards, labels.citations],
      rows: papers.map((p) => [p.year, p.title, p.authors, roleOf(p), p.venue, ...(ccfOn ? [p.rank.ccf ? p.rank.ccf.tier : ""] : []), ...(coreOn ? [p.rank.core ? p.rank.core.rank : ""] : []), p.marks.join(", "), p.citations])
    };
  }
  const papersTsv = (papers, ctx) => { const t = table(papers, ctx); return rowsTsv(t.header, t.rows); };
  const papersCsv = (papers, ctx) => { const t = table(papers, ctx); return rowsCsv(t.header, t.rows); };

  // ---- the clipboard's second flavour: HTML -------------------------------------------------------------------------------------------------------
  // A word processor (Word, Docs, Pages) takes what is on the clipboard as HTML where a spreadsheet or a text box takes the text: the same table becomes a real table
  // there and the reference list gets real italics. Every text is escaped; a cell is as safe as in the tab-separated form (a spreadsheet reads HTML cells too).
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  // a cell is a text, or { html } (already made safe: the owner's name in bold)
  function rowsHtml(header, rows, caption = "") {
    const cell = (tag) => (v) => `<${tag}>${v && typeof v === "object" && "html" in v ? v.html : esc(formulaSafe(clean(v)))}</${tag}>`;
    return `<table border="1" cellspacing="0" cellpadding="4">\n${caption ? `<caption>${esc(clean(caption))}</caption>\n` : ""}<thead><tr>${header.map(cell("th")).join("")}</tr></thead>\n<tbody>\n${rows.map((r) => `<tr>${r.map(cell("td")).join("")}</tr>`).join("\n")}\n</tbody>\n</table>`;
  }
  // `ctx.markMe`: the owner's name is in bold in the author cells (as the page marks it in the author line); a name is one of the line's names, whole
  const boldOwner = (authors, me) => {
    const re = new RegExp("(^|, )(" + me.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?=,|$)");
    return authors.replace(re, (_, lead, name) => `${lead}<b>${name}</b>`);
  };
  function papersHtml(papers, ctx) {
    const t = table(papers, ctx), col = t.header.indexOf(ctx.labels.authors);
    const rows = ctx.markMe && col >= 0 ? t.rows.map((r, i) => (clean(papers[i].me) ? r.map((v, j) => (j === col ? { html: boldOwner(esc(formulaSafe(clean(papers[i].authors))), esc(clean(papers[i].me))) } : v)) : r)) : t.rows;
    return rowsHtml(t.header, rows);
  }
  const summaryHtml = (summary, opts) => {
    const t = summaryTable(summary, opts), o = opts || {};
    const after = [...unseenLines(summary), ...(o.notes || [])];
    return rowsHtml(t.header, t.rows, o.scope) + (after.length ? "\n" + after.map((n) => `<p>${esc(clean(n))}</p>`).join("\n") : "");
  };

  // ---- BibTeX -----------------------------------------------------------------------------------------------------------------------------------
  // Everything that means something to TeX is made into the text it spells, so that an entry compiles whatever the title says (and a title cannot carry a command). A brace is
  // spelled with \textbraceleft{}: BibTeX counts the braces of a field whatever stands before them, so "\}" would close the field, and what came after it could open an entry.
  const TEX = { "\\": "\\textbackslash{}", "{": "\\textbraceleft{}", "}": "\\textbraceright{}", "$": "\\$", "&": "\\&", "#": "\\#", "^": "\\textasciicircum{}", "_": "\\_", "~": "\\textasciitilde{}", "%": "\\%" };
  const tex = (s) => clean(s).replace(/[\\{}$&#^_~%]/g, (c) => TEX[c]);
  const STOP = new Set(["a", "an", "the", "on", "in", "for", "and", "of", "to", "with", "at", "by", "from", "towards"]);
  // letters without accents, and those that have none to take off, as ASCII (a citation key is ASCII)
  const ASCII_LETTERS = { "ł": "l", "Ł": "L", "ø": "o", "Ø": "O", "đ": "d", "Đ": "D", "ð": "d", "Ð": "D", "þ": "th", "Þ": "Th", "ß": "ss", "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE", "ı": "i", "ħ": "h", "Ħ": "H" };
  const ascii = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[łŁøØđĐðÐþÞßæÆœŒıħĦ]/g, (c) => ASCII_LETTERS[c]);

  // Scholar's venue line → { name, volume, issue, pages, year }. Scholar prints "Journal 44 (8), 4012-4025, 2022" and "Conference name, 770-778, 2016";
  // the tail is read only in those shapes, and a cut line ("…") keeps its end in the name. A preprint's number after its arXiv id is not a volume, a
  // page "0" is no page, and a number after a month is a day ("Cediti, September 5, 2003"): those stay out.
  const MONTH = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?$/i;
  // (a number that belongs to a label or to an article-local page range is not a part: "Article No. 1", "Vol. 2", "62: 1-62: 14", "15.6. 1-15.6. 4")
  const LABEL_BEFORE = /(?:\b(?:no|vol|volume|article|heft|band|issue|nr|pages|pp)\.?:?|\bart\.:?|,\s*paper|\d[:.]\s?\d*\s*-\s*\d*[:.]?)$/i;          // ("Art." with its full stop, "paper" as a field of its own: "the state of the art" and "Pulp & Paper" are names)
  // a patent, a thesis or a report: a document that is no journal and no proceedings, given as Scholar printed it
  const DOCUMENT = /\bpatent\b|\b(?:thesis|dissertation)\b|\b(?:tech(?:nical|\.)?\s*rep(?:ort)?|report)\b/i;
  // a publisher's name on its own ("MIT Press", "Springer", "O'Reilly Media, Inc."): a book, given as printed too (APA does not italicise a publisher)
  const CHAPTER = /\b(?:chapter|ch)\.?:?$/i;          // ("chapter 13": the number right after it is a chapter's, not a volume — "…SIGCHI Chapter, 66-73" keeps its pages)
  const PUBLISHER = /^(?:the\s)?[^,]*\b(?:press|springer|wiley|elsevier|o'?reilly|publish(?:ing|ers?)|verlag|routledge|cengage|pearson|mcgraw)\b(?![/-]subscri)(?![^,]*\b(?:quarterly|gazette|bulletin|research|letters|journal|review|news)\b)[^,]*(?:,\s*(?:inc|ltd|llc|gmbh)\.?)?$/i;
  // (journals whose title is a publishing word: no publisher)
  const PUBLISHING_JOURNAL = /^(?:learned publishing|publishing research quarterly|logos|publishers weekly)\b/i;
  const isPublisher = (text) => !PUBLISHING_JOURNAL.test(asPrinted(text)) && (PUBLISHER.test(asPrinted(text)) || PUBLISHER.test(venueParts(text).name));          // ("Morgan & Claypool Publishers 13, 1-187": the name before Scholar's numbers)
  const isDocument = (p) => entryType(p).type === "misc" && (DOCUMENT.test(clean(p.venue)) || isPublisher(p.venue));
  // an unclassified line with a volume is a periodical's ("Scientific Reports 6, 29545") — unless its name says it is a meeting, a book or a place: "BMVC 1, 2",
  // "Robotics: Science and Systems VIII 8", a handbook, an encyclopedia, a university's report
  const NOT_PERIODICAL = /https?:|\bwww\.|\b(?:conference|conf|symposi(?:um|a)|workshop|proceedings|proc|summit|meeting|congress|handbook|encyclopa?edia|university|universit[aäéy]|chapter|lecture|tutorial|science and systems)\b/i;
  const ACRONYM = /^[A-Z]{2,6}(?:\s\d{2,4})?$/;          // (case-sensitive: "BMVC" is a meeting's acronym, "Nature" and "eLife" are journals)
  const periodical = (p) => { if (entryType(p).type !== "misc" || isDocument(p)) return false; const { name, volume } = venueParts(p.venue); return !!volume && !NOT_PERIODICAL.test(name) && !ACRONYM.test(name); };
  // the venue line as Scholar printed it, without the year at its end (for such a document, which no rule splits)
  const JUNK = /^#\s*PLACEHOLDER_/;          // (Scholar's "# PLACEHOLDER_PARENT_METADATA_VALUE#" where it has no venue)
  const asPrinted = (text) => { if (JUNK.test(clean(text))) return ""; const s = clean(text).replace(/\s+/g, " ").replace(/,\s*(?:19|20)\d{2}$/, "").replace(/,\s*0$/, "").trim();          // (Scholar's ", 0" stands for no year)
      return /[\p{L}\p{N}]/u.test(s) ? s : ""; };
  // A number equal to the year's last two digits after a name is that edition's year, not a volume: "STOC 18, 2018", "Proc. IEEE Globecom 98", "ISCA 12".
  // Two digits: after a short name or one that says it is a meeting; one digit ("INFOCOM 2004 4", "Results in Engineering 24" aside): after a short name only.
  function editionYear(n, before, year) {
    if (!year || +n !== +year % 100) return false;
    const words = before.trim().split(/\s+/).length, dated = /\b(?:19|20)\d{2}\b/.test(before);
    if (n.length === 2) return !dated && (words <= 2 || /\b(?:proc|proceedings|conf|conference|workshop|symp|symposium|summit|meeting|congress|tr|rep)\b/i.test(before));
    return !dated && words <= 2;
  }
  function venueParts(text) {
    // (an en dash between numbers is a range — "344–354", "(3–4)" — in the fields at the end; in the name it stays: "January 5–7, 1983")
    const whole = clean(text).replace(/\s+/g, " ").replace(/((?:\s\d+\s*\([^()]*\))?(?:,\s+[^,]*){0,2})$/, (tail) => tail.replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2"));
    let s = whole, year = "", pages = "", volume = "", issue = "", m;
    if ((m = /,\s*((?:19|20)\d{2})$/.exec(s))) { year = m[1]; s = s.slice(0, m.index).trim(); }
    const keep = () => ({ name: s.replace(/[,;:]\s*$/, ""), volume: "", issue: "", pages: "", year });
    if (/…|\.\.\./.test(s)) {
      // (Scholar cut the line inside the issue, "TODAES 11 (1 …": the volume before it is whole, the cut issue is left out)
      if ((m = /\s(\d{1,4})\s\(\d+\s?…$/.exec(s)) && !/\b(?:arxiv|biorxiv|medrxiv|preprint)\b/i.test(s) && !/…|\.\.\./.test(s.slice(0, m.index)) && (!/^(?:19|20)\d{2}$/.test(m[1]) || /\b(?:journal|transactions|proceedings on)\b/i.test(s.slice(0, m.index)))
        && !CHAPTER.test(s.slice(0, m.index)) && !LABEL_BEFORE.test(s.slice(0, m.index)) && !editionYear(m[1], s.slice(0, m.index + 1), year)) return { name: s.slice(0, m.index).replace(/[,;:]\s*$/, ""), volume: m[1], issue: "", pages: "", year };
      return keep();
    }
    if ((m = /,\s*(?:\d{1,3}\s*pp\.?|(?:article|art\.)(?:\s*no\.?:?)?\s*(\d{1,6})|no\.:?\s*(\d{1,6})|(\d{1,4}(?:\.\d{1,3})?[:.]\s?\d{1,3}\s*-\s*\d{1,4}(?:\.\d{1,3})?[:.]\s?\d{1,3}))$/i.exec(s))) {
      if (m[2] && !/\)$/.test(s.slice(0, m.index).trim())) return keep();          // (a bare "no. 3" after a volume is its issue: "Neural Computation 12, no. 3" is given as printed)
      pages = (m[1] || m[2] || m[3] || "").replace(/\s+/g, ""); s = s.slice(0, m.index).trim(); }
    // (Scholar puts ", " between its fields: "US Patent 10,007,785" and "11,985-11,993" are one number each)
    if (!pages && (m = /,\s+([A-Za-z]{0,4}\d{1,16}(?:\s*-{1,2}\s*[A-Za-z]{0,4}\d{1,16})?(?:\.\s?e\d{1,3})?)$/.exec(s)) && (!/^(?:19|20)\d{2}$/.test(m[1]) || /\s\d{1,4}\s*\([^()]+\)$/.test(s.slice(0, m.index)))) {
      if (LABEL_BEFORE.test(s.slice(0, m.index)) || /\d,\d{1,3}$/.test(s)) return keep();
      if (!/^0+$/.test(m[1])) pages = m[1].replace(/\s*-{1,2}\s*/, "-").replace(/\.\s?(e\d+)$/, ".$1");          // (Cell's "158-170. e12" is "158-170.e12")
      s = s.slice(0, m.index).trim();
    }
    if ((m = /\s(\d{1,4})\s\((\d{1,2})\s\([A-Z]{2,10}\)$/.exec(s))) { volume = m[1]; issue = m[2]; s = s.slice(0, m.index).trim(); }        // (PACMMOD's "4 (1 (SIGMOD)", one bracket short)
    else if ((m = /\s(\d{1,4})\s*\((\d{1,4}(?:\s*(?:--|[-‐–])\s*\d{1,4})?|[A-Za-z]{1,4}|(?!art)[A-Za-z]{0,10}[ _]?\d{1,4}[A-Za-z]{0,3}\d?|\d{1,2},?\s?(?:pt\.?|part)\s?\d|\d{1,3}[ _]?(?:suppl?\.?|supplement)|[A-Za-z]+(?: [A-Za-z]+){0,3} issue|\d{1,2}\s?[/&]\s?\d{1,2}|[A-Za-z]+_\d|(?:suppl?|supplement)[ _]?\d*)\)$/i.exec(s)) && (!/^(?:19|20)\d{2}$/.test(m[1]) || (/^\d{1,2}$/.test(m[2]) && /\b(?:journal|transactions|proceedings on)\b/i.test(s.slice(0, m.index)))) && !CHAPTER.test(s.slice(0, m.index)) && !LABEL_BEFORE.test(s.slice(0, m.index))) {
      volume = m[1]; issue = m[2].replace(/\s*-{1,2}\s*/, "-"); s = s.slice(0, m.index).trim();
    } else if ((m = /\s(\d{1,4})\s\(([A-Z]{2,10}(?: [A-Z]{2,6})?)\)$/.exec(s)) && !/^(?:19|20)\d{2}$/.test(m[1]) && !CHAPTER.test(s.slice(0, m.index))) {
      volume = m[1]; issue = m[2]; s = s.slice(0, m.index).trim();          // (an issue named in capitals: "1 (OOPSLA)", "8 (CHI PLAY)"; case-sensitive, so "(March)" is not one)
    } else if (pages && (m = /\s(\d{1,4})\s*\([^()]*\)$/.exec(s)) && !/^(?:19|20)\d{2}$/.test(m[1])) {
      s = whole.replace(/,\s*(?:19|20)\d{2}$/, ""); return keep();          // (pages read but not the "V (…)" before them — "21 (2.3)", "38 (4 : SIGGRAPH 2019)": the line as printed, not half of it; a year's brackets are the name's: "Web Conference 2021 (WWW 2021)")
    } else if ((m = /[^,\s]\s(\d{1,3})$/.exec(s)) && !MONTH.test(s.slice(0, m.index + 1)) && !CHAPTER.test(s.slice(0, m.index + 1)) && !LABEL_BEFORE.test(s.slice(0, m.index + 1))
      && !editionYear(m[1], s.slice(0, m.index + 1), year)) {
      volume = m[1]; s = s.slice(0, m.index + 1).trim();
    }
    if (/\b(?:arxiv|biorxiv|medrxiv|preprint)\b/i.test(s)) { volume = ""; issue = ""; }
    const name = s.replace(/[,;:]\s*$/, "");
    return /[\p{L}\p{N}]/u.test(name) && !JUNK.test(name) ? { name, volume, issue, pages, year } : { name: "", volume: "", issue: "", pages: "", year };          // (a line of dashes is no venue, nor Scholar's placeholder: no numbers of its own either)
  }

  function entryType(p) {
    const venue = venueParts(p.venue).name;
    if (!venue) return { type: "misc", field: "" };
    if (/patent\b/i.test(venue)) return { type: "misc", field: "howpublished" };
    if (/^proceedings of the (?:ieee|national academy of sciences)(?:\s*\([^()]*\))?$/i.test(venue) || /^(?:[\w-]+:\s*)?(?:proceedings of the (?:acm on (?!web conference)|vldb endowment)|proceedings on privacy enhancing technologies|proc\.? acm [a-z]\w*|proc\.? vldb endow)\b/i.test(venue)) return { type: "article", field: "journal" };   // (journals literally titled so)
    if (p.type === "journal" || (p.type !== "conference" && /arxiv\b|biorxiv\b|medrxiv\b/i.test(venue))) return { type: "article", field: "journal" };
    if (p.type === "conference") return { type: "inproceedings", field: "booktitle" };
    // ("2015 IEEE Trustcom/BigDataSE/ISPA 1", "2010 Internet of Things (IOT)": a name that opens with its year is the title of a meeting's proceedings, IEEE's form)
    if (/^(?:19|20)\d{2}\s+\S/.test(venue) && !/journal|transactions|letters|magazine/i.test(venue) && !DOCUMENT.test(venue) && !venueParts(p.venue).issue) return { type: "inproceedings", field: "booktitle" };
    if ((venueParts(p.venue).issue || /\s\d{1,4}\s\(\d+\s?…/.test(p.venue)) && !/\b(?:conference|symposium|workshop|tech(?:nical|\.)?\s*rep(?:ort)?)\b|https?:|\bwww\./i.test(venue)) return { type: "article", field: "journal" };           // ("44 (8)", or cut "44 (8 …": a volume with an issue is a periodical's)
    if (/journal(?!is)|transactions|letters|review|annals|magazine|ieee\/acm trans/i.test(venue)) return { type: "article", field: "journal" };
    if (/conference|symposi(?:um|a)|proceedings?\b|workshop|annual|proc\.|\bcongress\b|extended abstracts|^findings of the|companion proceedings/i.test(venue)) return { type: "inproceedings", field: "booktitle" };
    return { type: "misc", field: "howpublished" };
  }

  // Standard entries: a citation key (surname, year, first long word of the title; a repeated key gets b, c, … so that no entry is dropped), the authors joined with "and"
  // (and "and others" where Scholar cut the list), the venue as booktitle / journal, the year, the address, the ranks and marks in a note.
  function bibtex(papers, ctx = {}) {
    const used = new Set();
    return papers.map((p) => {
      const { names, cut } = authorList(p.authors);
      const surname = ascii(names[0] || "").split(/\s+/).pop().replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "paper";
      const year = p.year ? String(p.year).replace(/[^0-9]/g, "") : "";                          // (a year is digits: it goes into the key and a field as it is)
      const words = ascii(clean(p.title)).toLowerCase().match(/[a-z]+/g) || [];          // (letters: "Über die Welt" is "uber", "2016 Survey of Things" is "survey")
      const word = words.find((w) => !STOP.has(w) && w.length >= 3) || words[0] || "paper";
      const base = `${surname}${year || "nodate"}${word}`;
      let key = base;
      for (let i = 1; used.has(key); i++) key = base + (i <= 25 ? String.fromCharCode(97 + i) : i + 1);       // b … z, then 27, 28, …
      used.add(key);

      const { type, field } = periodical(p) ? { type: "article", field: "journal" } : entryType(p);          // (as in the other styles: "Scientific Reports 6, 29545" is a periodical's)
      const parts = venueParts(p.venue), venue = tex(field === "howpublished" ? clean(p.venue) : parts.name);
      const notes = [...rankNotes(p, ctx), ...p.marks.map(tex)];
      const fields = [
        `  title = {${tex(p.title)}}`,
        names.length ? `  author = {${[...names.map((n) => (/\band\b/i.test(n) ? "{" + tex(n) + "}" : tex(n))), ...(cut ? ["others"] : [])].join(" and ")}}` : null,
        field && venue ? `  ${field} = {${venue}}` : null,
        field && field !== "howpublished" && parts.volume ? `  volume = {${parts.volume}}` : null,
        field && field !== "howpublished" && parts.issue ? `  number = {${tex(parts.issue)}}` : null,
        field && field !== "howpublished" && parts.pages ? `  pages = {${tex(parts.pages).replace("-", "--")}}` : null,
        year ? `  year = {${year}}` : null,
        p.url ? `  url = {${clean(p.url).replace(/[{}\\]/g, (c) => encodeURIComponent(c))}}` : null,          // (an address whose braces or backslash would unbalance the field or run a command)
        notes.length ? `  note = {${notes.join(", ")}}` : null
      ].filter(Boolean);
      return `@${type}{${key},\n${fields.join(",\n")}\n}`;
    }).join("\n\n");
  }

  // ---- Markdown ---------------------------------------------------------------------------------------------------------------------------------
  // 1. **[Title](url)**
  //    Authors
  //    *Venue*, Year · **CCF A** · ★ Best Paper · Cited by 1,234
  // What the authors typed cannot become markup: the characters Markdown reads are escaped (and a title cannot close its own link).
  const md = (s) => clean(s).replace(/[\\`*_{}[\]()<>#|~]/g, "\\$&");
  const mdUrl = (u) => u.replace(/[()\s<>]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
  // a line that begins like a list ("- Name", "1. Name") would become one: its marker is escaped
  const mdLead = (s) => s.replace(/^(\s*)([-+])(?=\s)/, "$1\\$2").replace(/^(\s*)(\d+)([.)])(?=\s)/, "$1$2\\$3");
  function markdown(papers, ctx = {}) {
    return papers.map((p, i) => {
      const title = md(p.title), venue = md(p.venue), year = p.year ? String(p.year) : "";
      const meta = [];
      if (venue && year && !new RegExp(`(?:^|\\D)${year}(?:\\D|$)`).test(p.venue)) meta.push(`*${venue}*, ${year}`);
      else if (venue) meta.push(`*${venue}*`);
      else if (year) meta.push(year);
      const ranks = rankNotes(p, ctx);
      if (ranks.length) meta.push(`**${md(ranks.join(" · "))}**`);
      if (p.marks.length) meta.push(p.marks.map((m) => `★ ${md(m)}`).join(" · "));
      if (Number.isFinite(p.citations) && p.citations > 0) meta.push(`Cited by ${p.citations.toLocaleString("en-US")}`);
      const lines = [`${i + 1}. ${p.url ? `**[${title}](${mdUrl(p.url)})**` : `**${title}**`}`];
      if (clean(p.authors)) lines.push(`   ${mdLead(md(p.authors))}`);
      if (meta.length) lines.push(`   ${meta.join(" · ")}`);
      return lines.join("  \n");
    }).join("\n\n");
  }

  // ---- APA 7th edition ----------------------------------------------------------------------------------------------------------------------------
  // The words that belong to the surname when they stand in front of it ("van der Maaten", "de León").
  const PARTICLE = new Set(["van", "von", "der", "den", "de", "del", "della", "di", "da", "dos", "das", "du", "la", "le", "ter", "ten"]);
  const initialsOf = (given) => given.split(/\s+/).filter(Boolean).map((g) => (/^\p{Lu}{2,3}$/u.test(g) ? g.split("").join(". ") + "." : g.split("-").map((x) => (x.endsWith(".") ? x : x.charAt(0).toUpperCase() + ".")).join("-"))).join(" ");

  // "I Stoica" → "Stoica, I."; "MF Kaashoek" → "Kaashoek, M. F."; "L van der Maaten" → "van der Maaten, L."; "Jane Doe" → "Doe, J."
  // "Smith Jr." and "Smith II" keep their suffix after the initials (APA: "Smith, J., Jr.")
  function apaAuthor(name) {
    const raw = clean(name);
    const m = /\s+(jr\.?|sr\.?|i{2,3}|iv)$/i.exec(raw);
    if (!m || CUT.test(raw)) return apaName(raw);
    const s = m[1].toLowerCase(), suffix = s.startsWith("jr") ? "Jr." : s.startsWith("sr") ? "Sr." : s.toUpperCase();
    const base = apaName(raw.slice(0, m.index));
    return base ? `${base}, ${suffix}` : "";
  }

  function apaName(name) {
    const raw = clean(name);
    if (!raw || CUT.test(raw)) return "";
    if (raw.includes(",")) {
      const [last, ...rest] = raw.split(",").map((p) => p.trim()).filter(Boolean);
      const initials = initialsOf(rest.join(" "));
      return initials ? `${last}, ${initials}` : last;
    }
    const parts = raw.split(/\s+/);
    if (parts.length === 1) return parts[0];
    let at = parts.length - 1;
    for (let i = 1; i < parts.length - 1; i++) if (PARTICLE.has(parts[i].toLowerCase())) { at = i; break; }      // the surname starts at the first particle that has a given name before it
    return `${parts.slice(at).join(" ")}, ${initialsOf(parts.slice(0, at).join(" "))}`;
  }

  // One reference as pieces: { t } text, { t, em: true } italics (its full stop follows outside them unless the venue's own text ends with one), { t, url: true } the address.
  function apaPieces(p) {
    const { names, cut } = authorList(p.authors);
    const list = names.map(apaAuthor).filter(Boolean);
    let by = "";
    if (list.length === 1) by = list[0] + (cut ? ", …" : "");
    else if (list.length === 2 && !cut) by = `${list[0]}, & ${list[1]}`;
    else if (list.length > 20) by = cut ? `${list.slice(0, 19).join(", ")}, …` : `${list.slice(0, 19).join(", ")}, … ${list[list.length - 1]}`;   // (a cut list does not know its last author)
    else if (list.length > 1) by = cut ? `${list.join(", ")}, …` : `${list.slice(0, -1).join(", ")}, & ${list[list.length - 1]}`;
    if (by && !/[.!?…]$/.test(by)) by += ".";
    let title = clean(p.title);
    if (title && !/[.?!]$/.test(title)) title += ".";
    // the venue in italics, then (APA 7) a journal's volume in italics, its issue and pages, or "In *Proceedings* (Vol. 1, pp. 1–10)"; the year is the one above.
    // A line that is neither (a patent, a thesis, a publisher) is given as Scholar printed it, without its year and without italics.
    const { name: venue, volume, issue, pages } = venueParts(p.venue), kind = entryType(p), journal = kind.type === "article";
    const range = pages.replace("-", "–"), venuePieces = [];
    if (isDocument(p)) { const raw = asPrinted(p.venue); if (raw) venuePieces.push({ t: raw + (/[.]$/.test(raw) ? "" : ".") }); }
    else if (venue && (journal || periodical(p)) && (volume || pages)) {          // (an unclassified line with a volume is a periodical's: "Scientific Reports 6, 29545")
      venuePieces.push({ t: venue, em: true, comma: true });
      if (volume) venuePieces.push({ t: volume, em: true, tail: (issue ? `(${issue})` : "") + (pages ? "," : ".") });
      if (pages) venuePieces.push({ t: (/-/.test(pages) ? range : `Article ${pages}`) + "." });
    } else if (venue && kind.type === "inproceedings") {
      const inner = pages.includes("-") ? [volume && `Vol. ${volume}`, `pp. ${range}`].filter(Boolean).join(", ") : "";          // (a lone number after a proceedings' name is no volume Scholar can vouch for)
      venuePieces.push({ t: "In" }, { t: venue, em: true, tail: inner ? ` (${inner}).` : "", dot: !inner && !venue.endsWith(".") });
    } else if (venue && pages.includes("-")) venuePieces.push({ t: venue, em: true, tail: ` (pp. ${range}).` });
    else if (venue) venuePieces.push({ t: venue, em: true, dot: !venue.endsWith(".") });
    return [by && { t: by }, { t: p.year ? `(${p.year}).` : "(n.d.)." }, title && { t: title }, ...venuePieces, p.url && { t: p.url, url: true }].filter(Boolean);
  }

  // Reference-list entries: Authors (Year). Title. *Venue*. url   (the asterisks mark the italics, as in a Markdown or plain-text reference list)
  const apaPiece = (x, em) => (x.em ? em(x.t) + (x.comma ? "," : "") + (x.tail || "") + (x.dot ? "." : "") : x.t);
  const apa = (papers) => papers.map((p) => apaPieces(p).map((x) => apaPiece(x, (t) => `*${t}*`)).join(" ")).join("\n\n");

  // The same list for a word processor: a paragraph each, the venue in real italics, the address a link (web addresses only), a hanging indent of half an inch (APA 7)
  const apaHtml = (papers) => papers.map((p) => {
    const html = apaPieces(p).map((x) => (x.em ? apaPiece({ ...x, tail: esc(x.tail || "") }, (t) => `<i>${esc(t)}</i>`) : x.url && /^https?:\/\//i.test(x.t) ? `<a href="${esc(x.t)}">${esc(x.t)}</a>` : esc(x.t))).join(" ");
    return `<p style="margin:0 0 0.6em 0.5in;text-indent:-0.5in">${html}</p>`;
  }).join("\n");

  // ---- IEEE ----------------------------------------------------------------------------------------------------------------------------------------
  // [1] K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in *Proc. Name*, 2016, pp. 770–778.
  // A journal: *Name*, vol. 44, no. 8, pp. 4012–4025, 2022. More than six authors, or a cut list: the first author and "et al." (IEEE's own rule).
  const ieeeAuthor = (name) => {
    const [last, initials, suffix] = apaAuthor(name).split(", ");
    return initials ? `${initials} ${last}${suffix ? " " + suffix : ""}` : last || "";
  };
  function ieeePieces(p, n) {
    const { names, cut } = authorList(p.authors);
    const list = names.map(ieeeAuthor).filter(Boolean);
    const by = !list.length ? "" : list.length > 6 || cut ? `${list[0]} et al.` : list.length === 1 ? list[0] : list.length === 2 ? `${list[0]} and ${list[1]}` : `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
    const title = clean(p.title).replace(/[.]$/, "");
    const { name, volume, issue, pages } = venueParts(p.venue), kind = entryType(p), type = kind.type, year = p.year ? String(p.year) : "";
    const misc = isDocument(p), venue = misc ? asPrinted(p.venue) : name;
    const range = pages.replace("-", "–"), where = [], page = pages && (pages.includes("-") ? `pp. ${range}` : `Art. no. ${pages}`);
    if (type === "article" || periodical(p)) where.push(volume && `vol. ${volume}`, issue && `no. ${issue}`, page, year);
    else if (type === "inproceedings") where.push(year, pages.includes("-") && volume && `vol. ${volume}`, pages.includes("-") && page);          // (a lone number after a proceedings' name is not printed)
    else where.push(year, !misc && pages.includes("-") && page);
    const tail = where.filter(Boolean).join(", ");
    // ("Why does it work?" takes no comma after its own question mark)
    return [{ t: `[${n}]` }, by && { t: by + "," }, title && { t: /[?!]$/.test(title) ? `"${title}"` : `"${title},"` }, venue && type === "inproceedings" && { t: "in" }, venue && (misc ? { t: venue + (tail ? "," : "") } : { t: venue, em: true, comma: !!tail }), { t: (tail || (venue ? "" : "n.d")) + "." }].filter(Boolean);
  }
  // (a piece that is only the closing full stop joins the one before it)
  const ieeeLine = (p, i, em) => ieeePieces(p, i + 1).map((x) => (x.em ? em(x.t) + (x.comma ? "," : "") : x.t)).join(" ").replace(/ \.$/, ".");
  const ieee = (papers) => papers.map((p, i) => ieeeLine(p, i, (t) => `*${t}*`)).join("\n\n");
  const ieeeHtml = (papers) => papers.map((p, i) => `<p style="margin:0 0 0.6em 2.2em;text-indent:-2.2em">${ieeeLine(p, i, (t) => `\u0000${t}\u0001`).split(/(\u0000[^\u0001]*\u0001)/).map((s) => (s.startsWith("\u0000") ? `<i>${esc(s.slice(1, -1))}</i>` : esc(s))).join("")}</p>`).join("\n");

  // ---- GB/T 7714-2015 ---------------------------------------------------------------------------------------------------------------------------------
  // The Chinese national standard for references (NSFC and most Chinese forms ask for it):
  // [1] HE K, ZHANG X, REN S, et al. Deep residual learning for image recognition[C]//Proceedings of …. 2016: 770-778.
  // [2] AUTHOR A, WRITER B. Title[J]. Journal, 2022, 44(8): 4012-4025.
  // Surname in capitals and initials without full stops; more than three authors, or a cut list: the first three and "et al."
  const gbAuthor = (name) => {
    if (/[\u3400-\u9fff]/.test(name)) return clean(name);                    // (a name in Chinese characters stays as it is written)
    const [last, initials, suffix] = apaAuthor(name).split(", ");
    return last ? [last.toUpperCase(), (initials || "").replace(/\./g, "").replace(/\s+/g, " ").trim(), suffix ? suffix.replace(/\./g, "") : ""].filter(Boolean).join(" ") : "";
  };
  function gbLine(p, n) {
    const { names, cut } = authorList(p.authors);
    const list = names.map(gbAuthor).filter(Boolean);
    // (et al. is "等" when the names are Chinese: the word of the reference's own language, §8.1.2)
    const by = list.length > 3 || (cut && list.length) ? `${list.slice(0, 3).join(", ")}, ${list.some((x) => /[\u3400-\u9fff]/.test(x)) ? "等" : "et al"}` : list.join(", ");
    const title = clean(p.title).replace(/[.]$/, "");
    const { name, volume, issue, pages } = venueParts(p.venue), kind = entryType(p), year = p.year ? String(p.year) : "";
    // (an unclassified line with a volume is a periodical's, as in the other styles; any other unclassified line keeps all its fields as printed)
    const type = periodical(p) ? "article" : kind.type;
    const venue = type === "misc" ? asPrinted(p.venue) : type === "inproceedings" ? name.replace(/\.$/, "") : name, line = clean(p.venue);
    // the type code of Appendix B: patent [P], thesis [D], report [R], journal [J], proceedings [C], anything else [Z]
    const mark = type === "article" ? "J" : type === "inproceedings" ? "C" : /\bpatent\b/i.test(line) ? "P" : /\b(?:thesis|dissertation)\b/i.test(line) ? "D" : /\b(?:tech(?:nical|\.)?\s*rep(?:ort)?|report)\b/i.test(line) ? "R" : isPublisher(line) ? "M" : "Z";
    let where = "";
    if (type === "article") where = [venue, [year, volume && volume + (issue ? `(${issue})` : "")].filter(Boolean).join(", ")].filter(Boolean).join(", ") + (pages ? `: ${pages}` : "");
    else if (type === "inproceedings") where = (venue ? `//${venue}. ` : "") + year + (year && pages.includes("-") ? `: ${pages}` : "");
    else where = [venue, year].filter(Boolean).join(", ");
    const head = `[${n}] ${by ? by + ". " : ""}${title}[${mark}]`;
    return (type === "inproceedings" ? head + where : head + (where ? ". " + where : "")).replace(/[.\s]*$/, "") + ".";
  }
  const gbt = (papers) => papers.map((p, i) => gbLine(p, i + 1)).join("\n");

  // ---- JSON ---------------------------------------------------------------------------------------------------------------------------------------
  const json = ({ owner, source, papers }) => JSON.stringify({ owner, source, total: papers.length, papers }, null, 2);

  return { ROLE_LABEL, summaryText, summaryTable, summaryTsv, summaryHtml, rowsTsv, rowsCsv, rowsHtml, table, papersTsv, papersCsv, papersHtml, bibtex, markdown, apa, apaHtml, apaAuthor, ieee, ieeeHtml, gbt, venueParts, json };
});
