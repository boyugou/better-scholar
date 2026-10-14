// Citation metrics and the role × venue-tier summary.
//
// Pure functions over plain row objects, so the panel, the popup and the tests
// share one implementation. A row is:
//   { status: 'found'|'hidden'|'absent', role: 'first'|'cofirst'|'second'|'last'|'middle'|null,
//     venue: { ccf: {tier}|null, core: {rank}|null }, citations: number, year: number|null,
//     highlighted: boolean }
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).metrics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ROLES = ["first", "cofirst", "second", "last", "middle"];
  const TIERS = { ccf: ["A", "B", "C"], core: ["A*", "A", "B", "C"] };
  const NONE = "none";

  // Largest h such that at least h papers have >= h citations.
  function hIndex(counts) {
    const sorted = counts.slice().sort((a, b) => b - a);
    let h = 0;
    while (h < sorted.length && sorted[h] >= h + 1) h++;
    return h;
  }

  const i10Index = (counts) => counts.filter((c) => c >= 10).length;

  // Papers / citations / h-index / i10 for the highlighted subset and for all rows.
  function citationMetrics(rows) {
    const pick = (list) => {
      const counts = list.map((r) => r.citations || 0);
      return {
        papers: list.length,
        citations: counts.reduce((a, b) => a + b, 0),
        h: hIndex(counts),
        i10: i10Index(counts)
      };
    };
    return { highlighted: pick(rows.filter((r) => r.highlighted)), all: pick(rows) };
  }

  // Highlighted papers per year and role, oldest first, every year between the first and the last (a year with none has zeros):
  // [{ year, first, cofirst, second, last, total }]. Rows without a year are left out.
  function byYear(rows) {
    const per = new Map();
    for (const r of rows) {
      if (!r.highlighted || r.year == null || !["first", "cofirst", "second", "last"].includes(r.role)) continue;
      if (!per.has(r.year)) per.set(r.year, { year: r.year, first: 0, cofirst: 0, second: 0, last: 0, total: 0 });
      const e = per.get(r.year);
      e[r.role]++; e.total++;
    }
    if (!per.size) return [];
    const years = [...per.keys()], out = [];
    for (let y = Math.min(...years); y <= Math.max(...years); y++) out.push(per.get(y) || { year: y, first: 0, cofirst: 0, second: 0, last: 0, total: 0 });
    return out;
  }

  // The bars of the year chart: at most the last `maxYears` years (a whole career fits: the real profiles of two veterans span 44 and 45 years), up to the newest year that can be
  // real (next year at the latest, so a typo such as 2099 draws nothing). A paper Scholar dates 1803 would otherwise stretch the chart over two centuries and leave every bar a
  // pixel wide; `older` counts the highlighted papers before the first bar.
  const YEAR_BARS = 50;
  // The window is found first and only it is expanded: a page's year far in the past (-1e9 would be a billion empty years) must not cost what it spans.
  function yearBars(rows, { maxYears = YEAR_BARS, now = new Date().getFullYear() } = {}) {
    const counted = rows.filter((r) => r.highlighted && Number.isInteger(r.year) && r.year <= now + 1 && ["first", "cofirst", "second", "last"].includes(r.role));
    if (!counted.length) return { bars: [], older: 0 };
    let newest = -Infinity;
    for (const r of counted) if (r.year > newest) newest = r.year;
    const from = newest - maxYears + 1;
    const inWindow = counted.filter((r) => r.year >= from);
    // (the chart starts at the first year inside the window that has a paper, not at an empty stretch; the papers before it are `older`)
    return { bars: byYear(inWindow), older: counted.length - inWindow.length };
  }

  // The venue a ranked paper belongs to, by its usual short name ("NeurIPS"), or "" when it matched no list
  // `lists` says which rankings are switched on ({ ccf, core }, both by default): a venue only a switched-off list knows has no key
  function venueKey(venue, lists) {
    const v = venue || {}, on = lists || {};
    return (on.ccf !== false && v.ccf && (v.ccf.abbr || v.ccf.name)) || (on.core !== false && v.core && (v.core.abbr || v.core.name)) || "";
  }

  // Where the highlighted papers were published: ranked venues, most papers first (ties by name), at most `n`.
  function topVenues(rows, n = 6, lists) {
    const counts = new Map();
    const meta = new Map();
    for (const r of rows) {
      if (!r.highlighted) continue;
      const k = venueKey(r.venue, lists);
      if (k) {
        counts.set(k, (counts.get(k) || 0) + 1);
        if (!meta.has(k)) {
          const v = r.venue || {};
          meta.set(k, {
            name: (v.ccf && v.ccf.name) || (v.core && v.core.name) || k,
            ccf: v.ccf ? v.ccf.tier : null,
            core: v.core ? v.core.rank : null
          });
        }
      }
    }
    return [...counts].map(([key, count]) => {
      const m = meta.get(key) || {};
      return { key, count, name: m.name || key, ccf: m.ccf || null, core: m.core || null };
    }).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, n);
  }

  // The tier a row falls in for the chosen ranking source: 'A' / 'B' / … or 'none'.
  function tierOf(row, source) {
    const v = row.venue || {};
    if (source === "core") return (v.core && v.core.rank) || NONE;
    return (v.ccf && v.ccf.tier) || NONE;
  }

  // Role × tier counts. `source` is 'ccf' (default), 'core', or null for no ranking at all: roles only, no tier columns.
  //   rows:    one entry per role bucket that has papers (cofirst/middle only when non-empty)
  //   hidden:  papers whose author list is truncated without the owner in view
  //   absent:  papers whose complete author list never names the owner
  function summarize(papers, source = "ccf") {
    const columns = source === null ? [] : [...(TIERS[source] || TIERS.ccf), NONE];
    const blank = () => Object.assign(Object.fromEntries(columns.map((c) => [c, 0])), { total: 0 });
    const byRole = Object.fromEntries(ROLES.map((r) => [r, blank()]));
    const totals = blank();
    let hidden = 0, absent = 0;
    for (const p of papers) {
      if (p.status === "hidden") { hidden++; continue; }
      if (p.status !== "found" || !p.role) { absent++; continue; }
      if (columns.length) {
        const t = tierOf(p, source);
        const col = columns.includes(t) ? t : NONE;
        byRole[p.role][col]++; totals[col]++;
      }
      byRole[p.role].total++; totals.total++;
    }
    const rows = ROLES
      .filter((r) => byRole[r].total > 0 || r === "first" || r === "second" || r === "last")
      .map((r) => ({ role: r, ...byRole[r] }));
    return { source, columns, rows, totals, hidden, absent, papers: papers.length };
  }

  // Does a paper fall inside the matrix selection? sel = { role?, tier? }.
  function inSelection(paper, sel, source = "ccf") {
    if (!sel) return true;
    if (sel.role === "hidden") return paper.status === "hidden";
    if (paper.status !== "found") return false;
    if (sel.role && paper.role !== sel.role) return false;
    if (sel.tier && tierOf(paper, source) !== sel.tier) return false;
    return true;
  }

  // Venues the matcher could not place — surfaced so users can see what is missing.
  function unmatchedVenues(papers) {
    const counts = new Map();
    for (const p of papers) {
      const v = p.venueText;
      if (!v) continue;
      const r = p.venue || {};
      if (!r.ccf && !r.core && !r.secondary && !/^(?:arxiv|biorxiv|medrxiv|technical report|tech\.? rep|https?:|url\b)/i.test(v.trim())) {
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    }
    return Array.from(counts, ([venue, count]) => ({ venue, count })).sort((a, b) => b.count - a.count);
  }

  const ROLE_LABEL = { first: "First author", cofirst: "Co-first author", second: "Second author", last: "Last author", middle: "Other positions" };

  // Plain-text summary for the clipboard.
  function toText(summary, { owner = "", edition = "", label = ROLE_LABEL, notRanked = "unranked", extra = [] } = {}) {
    const src = summary.source === "core" ? "CORE" : summary.source === null ? "" : "CCF";
    const lines = [];
    lines.push((owner ? owner + " — " : "") + `${summary.papers} papers on Google Scholar, by authorship role${src ? ` and ${src} rank` : ""}`);
    for (const r of summary.rows) {
      if (!r.total) continue;
      const parts = summary.columns.filter((c) => r[c]).map((c) => `${c === NONE ? notRanked : c}: ${r[c]}`);
      lines.push(`${label[r.role]}: ${r.total}${parts.length ? ` (${parts.join(", ")})` : ""}`);
    }
    if (summary.hidden) lines.push(`Role not visible (author list truncated by Scholar): ${summary.hidden}`);
    if (summary.absent) lines.push(`Name not found in author list: ${summary.absent}`);
    for (const line of extra) lines.push(line);
    if (edition) lines.push(edition);
    return lines.join("\n");
  }

  // Tab-separated table for spreadsheets.
  // Tab-separated rows under a header: "Copy papers" (one line per paper, for a spreadsheet or a CV). A tab or line break inside a field is a space.
  // A title is whatever its author typed: one that begins with = + - or @ would be a formula in Excel or Sheets (and "=HYPERLINK(…)" could do
  // more than show itself), so such a field gets a leading apostrophe — the spreadsheets' own sign for "text" — unless it is a plain number.
  function toRowsTsv(header, rows) {
    const cell = (v) => {
      const s = String(v == null ? "" : v).replace(/[\t\r\n]+/g, " ").trim();
      const safe = /^[=+\-@]/.test(s) && !/^[+-]?\d+(?:[.,]\d+)?$/.test(s) ? "'" + s : s;
      // a quotation mark is a text qualifier to a spreadsheet: a field that has one is quoted whole, its quotes doubled
      return safe.includes('"') ? '"' + safe.replace(/"/g, '""') + '"' : safe;
    };
    return [header, ...rows].map((r) => r.map(cell).join("\t")).join("\n");
  }

  // RFC-4180 compliant CSV serializer with UTF-8 BOM (\uFEFF) for Excel, Sheets, and pandas.
  // Fields with commas, quotes, semicolons, or line breaks are quoted, quotes doubled. Formula protection applied.
  function toRowsCsv(header, rows) {
    const cell = (v) => {
      const s = String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim();
      const safe = /^[=+\-@]/.test(s) && !/^[+-]?\d+(?:[.,]\d+)?$/.test(s) ? "'" + s : s;
      return /[",;\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
    };
    return "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  }

  // Escapes LaTeX special characters (%, &, _, #, $) in BibTeX field values so that
  // exported entries compile cleanly in TeX/Overleaf without unescaped comment/alignment errors.
  function escapeBibTeX(text) {
    if (!text) return "";
    return String(text).replace(/(?<!\\)([%&_#$])/g, "\\$1");
  }

  // Synthesizes standard, well-formed BibTeX entries for an array of paper items.
  // Generates clean citekeys (e.g. stoica2001chord), formats authors with " and ",
  // escapes LaTeX special characters, includes direct URLs, and puts rankings/awards in note.
  function toBibTeX(papers, { ccfOn = true, coreOn = true } = {}) {
    const stopWords = new Set(["a", "an", "the", "on", "in", "for", "and", "of", "to", "with", "at", "by", "from", "towards"]);
    const clean = (s) => String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").trim();

    return papers.map((p) => {
      const title = escapeBibTeX(clean(p.title));
      const authors = clean(p.authorsText)
        .split(/,\s*/)
        .map((a) => escapeBibTeX(a.trim()))
        .filter((a) => a && !/^(?:\.\.\.|…)$/.test(a));
      const firstAuthor = authors[0] || "";
      const lastName = firstAuthor.split(/\s+/).pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "paper";
      const year = p.year ? String(p.year) : "";
      const words = title.toLowerCase().match(/[a-z0-9]+/g) || [];
      const word = words.find((w) => !stopWords.has(w) && w.length >= 3) || words[0] || "paper";
      const key = `${lastName}${year || "nodate"}${word}`;

      const v = p.venue || {};
      const vt = escapeBibTeX(clean(p.venueText));
      let type = "inproceedings";
      let venueField = "booktitle";

      if (/patent\b/i.test(vt)) {
        type = "misc";
        venueField = "howpublished";
      } else if (/arxiv\b|biorxiv\b|medrxiv\b/i.test(vt) || /journal|transactions|letters|review|annals|nature|science|ieee\/acm trans/i.test(vt)) {
        type = "article";
        venueField = "journal";
      } else if (v.ccf || v.core || /conference|symposium|proceedings|workshop|annual|proc\./i.test(vt)) {
        type = "inproceedings";
        venueField = "booktitle";
      } else if (!vt) {
        type = "misc";
        venueField = "";
      }

      const notes = [];
      if (ccfOn && v.ccf && v.ccf.tier) notes.push(`CCF ${v.ccf.tier}`);
      if (coreOn && v.core && v.core.rank) notes.push(`CORE ${v.core.rank}`);
      if (Array.isArray(p.awards)) {
        for (const aw of p.awards) if (aw) notes.push(escapeBibTeX(clean(aw)));
      } else if (p.awards) {
        notes.push(escapeBibTeX(clean(p.awards)));
      }

      const url = p.href ? (p.href.startsWith("http") ? p.href : "https://scholar.google.com" + p.href) : null;

      const fields = [
        `  title = {${title}}`,
        authors.length ? `  author = {${authors.join(" and ")}}` : null,
        venueField && vt ? `  ${venueField} = {${vt}}` : null,
        year ? `  year = {${year}}` : null,
        url ? `  url = {${url}}` : null,
        notes.length ? `  note = {${notes.join(", ")}}` : null
      ].filter(Boolean);

      return `@${type}{${key},\n${fields.join(",\n")}\n}`;
    }).join("\n\n");
  }

  // Formats paper items into standard academic Markdown list entries:
  // 1. **[Title](url)**  
  //    Authors  
  //    *Venue*, Year · **CCF A** · ★ Best Paper Award · Cited by 1,234
  function toMarkdown(papers, { ccfOn = true, coreOn = true } = {}) {
    const clean = (s) => String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").trim();
    return papers.map((p, i) => {
      const title = clean(p.title);
      const authors = clean(p.authorsText);
      const venue = clean(p.venueText);
      const year = p.year ? String(p.year) : "";
      const v = p.venue || {};
      const ranks = [];
      if (ccfOn && v.ccf && v.ccf.tier) ranks.push(`CCF ${v.ccf.tier}`);
      if (coreOn && v.core && v.core.rank) ranks.push(`CORE ${v.core.rank}`);
      const rankPart = ranks.length ? `**${ranks.join(" · ")}**` : "";
      const awards = Array.isArray(p.awards) ? p.awards.filter(Boolean).map(clean) : p.awards ? [clean(p.awards)] : [];
      const awardPart = awards.length ? awards.map((a) => `★ ${a}`).join(" · ") : "";
      const citePart = Number.isFinite(p.citations) && p.citations > 0 ? `Cited by ${p.citations.toLocaleString("en-US")}` : "";

      const meta = [];
      if (venue && year && !new RegExp(`(?:^|\\D)${year}(?:\\D|$)`).test(venue)) meta.push(`*${venue}*, ${year}`);
      else if (venue) meta.push(`*${venue}*`);
      else if (year) meta.push(year);
      if (rankPart) meta.push(rankPart);
      if (awardPart) meta.push(awardPart);
      if (citePart) meta.push(citePart);

      const titlePart = p.href ? `**[${title}](${p.href.startsWith("http") ? p.href : "https://scholar.google.com" + p.href})**` : `**${title}**`;
      const lines = [`${i + 1}. ${titlePart}`];
      if (authors) lines.push(`   ${authors}`);
      if (meta.length) lines.push(`   ${meta.join(" · ")}`);
      return lines.join("  \n");
    }).join("\n\n");
  }

  // Formats author names into APA 7th style:
  // "I Stoica" -> "Stoica, I."
  // "MF Kaashoek" -> "Kaashoek, M. F."
  // "JA Doudna" -> "Doudna, J. A."
  // "Jane Doe" -> "Doe, J."
  function formatApaAuthor(name) {
    const raw = String(name || "").trim();
    if (!raw || /^(?:\.\.\.|…)$/.test(raw)) return "";
    if (raw.includes(",")) {
      const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
      const last = parts[0];
      const given = parts.slice(1).join(" ");
      const initials = given
        ? given.split(/\s+/).map((p) => (/^[A-Z]{2,3}$/.test(p) ? p.split("").join(". ") + "." : p.endsWith(".") ? p : p.charAt(0).toUpperCase() + ".")).join(" ")
        : "";
      return initials ? `${last}, ${initials}` : last;
    }
    const parts = raw.split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0];
    const last = parts.pop();
    const initials = parts.map((p) => {
      if (/^[A-Z]{2,3}$/.test(p)) return p.split("").join(". ") + ".";
      if (p.endsWith(".")) return p;
      return p.charAt(0).toUpperCase() + ".";
    }).join(" ");
    return `${last}, ${initials}`;
  }

  // Synthesizes standard APA 7th edition reference list entries:
  // Stoica, I., Morris, R., Karger, D., Kaashoek, M. F., & Balakrishnan, H. (2001). Chord: A scalable peer-to-peer lookup service for internet applications. *ACM SIGCOMM Computer Communication Review*, 31(4), 149–160. https://...
  function toApa(papers, { ccfOn = true, coreOn = true, includeRanks = false, includeAwards = false } = {}) {
    const clean = (s) => String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").trim();

    return papers.map((p) => {
      const rawAuthors = clean(p.authorsText);
      const hasMore = /(?:\.\.\.|…)/.test(rawAuthors);
      const authorList = rawAuthors
        .split(/,\s*/)
        .map(formatApaAuthor)
        .filter(Boolean);

      let authorPart = "";
      if (authorList.length === 1) {
        authorPart = authorList[0];
      } else if (authorList.length === 2) {
        authorPart = `${authorList[0]}, & ${authorList[1]}`;
      } else if (authorList.length > 2 && authorList.length <= 20) {
        if (hasMore) {
          authorPart = `${authorList.join(", ")}, …`;
        } else {
          authorPart = `${authorList.slice(0, -1).join(", ")}, & ${authorList[authorList.length - 1]}`;
        }
      } else if (authorList.length > 20) {
        authorPart = `${authorList.slice(0, 19).join(", ")}, … ${authorList[authorList.length - 1]}`;
      }
      if (authorPart && !/[.!?…]$/.test(authorPart)) authorPart += ".";

      const yearPart = p.year ? `(${p.year}).` : "(n.d.).";

      let title = clean(p.title);
      if (title && !/[.?!]$/.test(title)) title += ".";

      const venue = clean(p.venueText);
      let venuePart = "";
      if (venue) {
        venuePart = venue.endsWith(".") ? `*${venue}*` : `*${venue}*.`;
      }

      const extra = [];
      const v = p.venue || {};
      if (includeRanks) {
        const ranks = [];
        if (ccfOn && v.ccf && v.ccf.tier) ranks.push(`CCF ${v.ccf.tier}`);
        if (coreOn && v.core && v.core.rank) ranks.push(`CORE ${v.core.rank}`);
        if (ranks.length) extra.push(`[${ranks.join(" · ")}]`);
      }
      if (includeAwards) {
        const awards = Array.isArray(p.awards) ? p.awards.filter(Boolean).map(clean) : p.awards ? [clean(p.awards)] : [];
        if (awards.length) extra.push(`[★ ${awards.join(" · ")}]`);
      }

      const url = p.href ? (p.href.startsWith("http") ? p.href : "https://scholar.google.com" + p.href) : "";

      const segments = [authorPart, yearPart, title, venuePart, ...extra, url].filter(Boolean);
      return segments.join(" ");
    }).join("\n\n");
  }

  function toTsv(summary, { label = ROLE_LABEL, header = "Role", total = "Total", notRanked = "Unranked" } = {}) {
    const head = [header, ...summary.columns.map((c) => (c === NONE ? notRanked : c)), total];
    const lines = [head.join("\t")];
    for (const r of summary.rows) lines.push([label[r.role], ...summary.columns.map((c) => r[c]), r.total].join("\t"));
    lines.push(["", ...summary.columns.map((c) => summary.totals[c]), summary.totals.total].join("\t"));
    return lines.join("\n");
  }

  return { ROLES, TIERS, NONE, hIndex, i10Index, citationMetrics, byYear, yearBars, YEAR_BARS, venueKey, topVenues, tierOf, summarize, inSelection, unmatchedVenues, toText, toTsv, toRowsTsv, toRowsCsv, toBibTeX, toMarkdown, toApa };
});
