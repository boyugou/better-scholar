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

  // The venue a ranked paper belongs to, by its usual short name ("NeurIPS"), or "" when it matched no list
  function venueKey(venue) {
    const v = venue || {};
    return (v.ccf && (v.ccf.abbr || v.ccf.name)) || (v.core && (v.core.abbr || v.core.name)) || "";
  }

  // Where the highlighted papers were published: ranked venues, most papers first (ties by name), at most `n`.
  function topVenues(rows, n = 6) {
    const counts = new Map();
    for (const r of rows) {
      if (!r.highlighted) continue;
      const k = venueKey(r.venue);
      if (k) counts.set(k, (counts.get(k) || 0) + 1);
    }
    return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, n);
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

  function toTsv(summary, { label = ROLE_LABEL, header = "Role", total = "Total", notRanked = "Unranked" } = {}) {
    const head = [header, ...summary.columns.map((c) => (c === NONE ? notRanked : c)), total];
    const lines = [head.join("\t")];
    for (const r of summary.rows) lines.push([label[r.role], ...summary.columns.map((c) => r[c]), r.total].join("\t"));
    lines.push(["", ...summary.columns.map((c) => summary.totals[c]), summary.totals.total].join("\t"));
    return lines.join("\n");
  }

  return { ROLES, TIERS, NONE, hIndex, i10Index, citationMetrics, byYear, venueKey, topVenues, tierOf, summarize, inSelection, unmatchedVenues, toText, toTsv, toRowsTsv };
});
