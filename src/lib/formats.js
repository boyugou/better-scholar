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
  const rankNotes = (p, { ccfOn = true, coreOn = true } = {}) => [ccfOn && p.rank.ccf && p.rank.ccf.tier ? `CCF ${p.rank.ccf.tier}` : "", coreOn && p.rank.core && p.rank.core.rank ? `CORE ${p.rank.core.rank}` : ""].filter(Boolean);

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
    if (summary.hidden) lines.push(`Role not visible (author list truncated by Scholar): ${summary.hidden}`);
    if (summary.absent) lines.push(`Name not found in author list: ${summary.absent}`);
    for (const line of extra) lines.push(line);
    if (edition) lines.push(edition);
    return lines.join("\n");
  }

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
    return rowsTsv(t.header, [...t.rows, ...[o.scope, ...(o.notes || [])].filter(Boolean).map((line) => [line])]);
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
    return rowsHtml(t.header, t.rows, o.scope) + (o.notes && o.notes.length ? "\n" + o.notes.map((n) => `<p>${esc(clean(n))}</p>`).join("\n") : "");
  };

  // ---- BibTeX -----------------------------------------------------------------------------------------------------------------------------------
  // Everything that means something to TeX is made into the text it spells, so that an entry compiles whatever the title says (and a title cannot carry a command). A brace is
  // spelled with \textbraceleft{}: BibTeX counts the braces of a field whatever stands before them, so "\}" would close the field, and what came after it could open an entry.
  const TEX = { "\\": "\\textbackslash{}", "{": "\\textbraceleft{}", "}": "\\textbraceright{}", "$": "\\$", "&": "\\&", "#": "\\#", "^": "\\textasciicircum{}", "_": "\\_", "~": "\\textasciitilde{}", "%": "\\%" };
  const tex = (s) => clean(s).replace(/[\\{}$&#^_~%]/g, (c) => TEX[c]);
  const STOP = new Set(["a", "an", "the", "on", "in", "for", "and", "of", "to", "with", "at", "by", "from", "towards"]);

  function entryType(p) {
    const venue = clean(p.venue);
    if (!venue) return { type: "misc", field: "" };
    if (/patent\b/i.test(venue)) return { type: "misc", field: "howpublished" };
    if (/^proceedings of the (?:ieee|national academy of sciences)$/i.test(venue)) return { type: "article", field: "journal" };   // (journals literally titled so)
    if (/arxiv\b|biorxiv\b|medrxiv\b/i.test(venue) || p.type === "journal") return { type: "article", field: "journal" };
    if (p.type === "conference") return { type: "inproceedings", field: "booktitle" };
    if (/journal|transactions|letters|review|annals|magazine|ieee\/acm trans/i.test(venue)) return { type: "article", field: "journal" };
    if (/conference|symposium|proceedings|workshop|annual|proc\./i.test(venue)) return { type: "inproceedings", field: "booktitle" };
    return { type: "misc", field: "howpublished" };
  }

  // Standard entries: a citation key (surname, year, first long word of the title; a repeated key gets b, c, … so that no entry is dropped), the authors joined with "and"
  // (and "and others" where Scholar cut the list), the venue as booktitle / journal, the year, the address, the ranks and marks in a note.
  function bibtex(papers, ctx = {}) {
    const used = new Set();
    return papers.map((p) => {
      const { names, cut } = authorList(p.authors);
      const surname = (names[0] || "").split(/\s+/).pop().normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "paper";
      const year = p.year ? String(p.year).replace(/[^0-9]/g, "") : "";                          // (a year is digits: it goes into the key and a field as it is)
      const words = clean(p.title).toLowerCase().match(/[a-z0-9]+/g) || [];
      const word = words.find((w) => !STOP.has(w) && w.length >= 3) || words[0] || "paper";
      const base = `${surname}${year || "nodate"}${word}`;
      let key = base;
      for (let i = 1; used.has(key); i++) key = base + (i <= 25 ? String.fromCharCode(97 + i) : i + 1);       // b … z, then 27, 28, …
      used.add(key);

      const { type, field } = entryType(p);
      const venue = tex(p.venue);
      const notes = [...rankNotes(p, ctx), ...p.marks.map(tex)];
      const fields = [
        `  title = {${tex(p.title)}}`,
        names.length ? `  author = {${[...names.map((n) => (/\band\b/i.test(n) ? "{" + tex(n) + "}" : tex(n))), ...(cut ? ["others"] : [])].join(" and ")}}` : null,
        field && venue ? `  ${field} = {${venue}}` : null,
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
    const venue = clean(p.venue);
    return [by && { t: by }, { t: p.year ? `(${p.year}).` : "(n.d.)." }, title && { t: title }, venue && { t: venue, em: true, dot: !venue.endsWith(".") }, p.url && { t: p.url, url: true }].filter(Boolean);
  }

  // Reference-list entries: Authors (Year). Title. *Venue*. url   (the asterisks mark the italics, as in a Markdown or plain-text reference list)
  const apa = (papers) => papers.map((p) => apaPieces(p).map((x) => (x.em ? `*${x.t}*${x.dot ? "." : ""}` : x.t)).join(" ")).join("\n\n");

  // The same list for a word processor: a paragraph each, the venue in real italics, the address a link (web addresses only), a hanging indent of half an inch (APA 7)
  const apaHtml = (papers) => papers.map((p) => {
    const html = apaPieces(p).map((x) => (x.em ? `<i>${esc(x.t)}</i>${x.dot ? "." : ""}` : x.url && /^https?:\/\//i.test(x.t) ? `<a href="${esc(x.t)}">${esc(x.t)}</a>` : esc(x.t))).join(" ");
    return `<p style="margin:0 0 0.6em 0.5in;text-indent:-0.5in">${html}</p>`;
  }).join("\n");

  // ---- JSON ---------------------------------------------------------------------------------------------------------------------------------------
  const json = ({ owner, source, papers }) => JSON.stringify({ owner, source, total: papers.length, papers }, null, 2);

  return { ROLE_LABEL, summaryText, summaryTable, summaryTsv, summaryHtml, rowsTsv, rowsCsv, rowsHtml, table, papersTsv, papersCsv, papersHtml, bibtex, markdown, apa, apaHtml, apaAuthor, json };
});
