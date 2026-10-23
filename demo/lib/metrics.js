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
  // `winner`: the list whose name stands for a venue both rank (lib/prefs.js winner()): "SIGKDD" is CCF's name for KDD, "KDD" CORE's
  function venueKey(venue, lists, winner = null) {
    const v = venue || {}, on = lists || {};
    const name = (k) => on[k] !== false && v[k] && (v[k].abbr || v[k].name);
    return (winner === "core" ? name("core") || name("ccf") : name("ccf") || name("core")) || "";
  }

  // Where the highlighted papers were published: ranked venues, most papers first (ties by name), at most `n`. One short name can stand for more than one venue
  // (a conference and the journal that share it): the venue's full name and ranks are given only when every paper under the key agrees, and only for the lists that are on.
  // `winner`: the list whose rank stands alone where both rank the venue (lib/prefs.js winner(): the one the settings prefer), or null
  function topVenues(rows, n = 6, lists, winner = null) {
    const on = lists || {};
    const groups = new Map();                       // key → { count, seen: signature → { name, ccf, core } }
    for (const r of rows) {
      if (!r.highlighted) continue;
      const key = venueKey(r.venue, lists, winner);
      if (!key) continue;
      const v = r.venue || {};
      // (the venue's full name is the one of the list that names it by `key`: CCF's name is not paired with CORE's rank)
      const named = (winner === "core" ? ["core", "ccf"] : ["ccf", "core"]).map((k) => on[k] !== false && v[k]).find((x) => x && (x.abbr || x.name));
      const meta = { name: (named && named.name) || key, ccf: on.ccf !== false && v.ccf ? v.ccf.tier : null, core: on.core !== false && v.core ? v.core.rank : null };
      if (winner && meta[winner]) for (const k of ["ccf", "core"]) if (k !== winner) meta[k] = null;
      const g = groups.get(key) || { count: 0, seen: new Map() };
      g.count++;
      g.seen.set(`${meta.name}|${meta.ccf}|${meta.core}`, meta);
      groups.set(key, g);
    }
    return [...groups].map(([key, g]) => {
      const m = g.seen.size === 1 ? [...g.seen.values()][0] : { name: key, ccf: null, core: null };
      return { key, count: g.count, name: m.name, ccf: m.ccf || null, core: m.core || null };
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
  //   unranked: of the papers in the "not ranked" column, how many are preprints (the venue line begins with arXiv, bioRxiv…, as Scholar lists them), how many are a secondary
  //             track (a workshop, demo or the like) of a venue that is on a list, and how many are another venue — so that "–: 21" is not read as 21 papers at weak venues
  // `keep`: roles that have a row even with no paper (a count of fewer papers keeps the rows of the whole list, so that the table does not change its shape)
  const PREPRINT = /^(?:arxiv|biorxiv|medrxiv|ssrn|preprint|techrxiv|chemrxiv|research square|corr\b|(?:iacr )?cryptol(?:ogy|\.)? eprint|eprint)/i;          // (CoRR is DBLP's name for arXiv; the IACR's preprint server is "Cryptology ePrint Archive", "IACR Cryptol. ePrint Arch.")
  const unrankedKind = (p) => (PREPRINT.test(String(p.venueText || "").trim()) ? "preprint" : p.venue && p.venue.refused ? "secondary" : "other");
  function summarize(papers, source = "ccf", { keep = [] } = {}) {
    const columns = source === null ? [] : [...(TIERS[source] || TIERS.ccf), NONE];
    const blank = () => Object.assign(Object.fromEntries(columns.map((c) => [c, 0])), { total: 0 });
    const byRole = Object.fromEntries(ROLES.map((r) => [r, blank()]));
    const totals = blank();
    let hidden = 0, absent = 0;
    const unranked = { preprint: 0, secondary: 0, other: 0 };
    for (const p of papers) {
      if (p.status === "hidden") { hidden++; continue; }
      if (p.status !== "found" || !p.role) { absent++; continue; }
      if (columns.length) {
        const t = tierOf(p, source);
        const col = columns.includes(t) ? t : NONE;
        byRole[p.role][col]++; totals[col]++;
        if (col === NONE) unranked[unrankedKind(p)]++;
      }
      byRole[p.role].total++; totals.total++;
    }
    const rows = ROLES
      .filter((r) => byRole[r].total > 0 || r === "first" || r === "second" || r === "last" || keep.includes(r))
      .map((r) => ({ role: r, ...byRole[r] }));
    return { source, columns, rows, totals, hidden, absent, papers: papers.length, unranked: columns.length ? unranked : null };
  }

  // Does a paper fall inside the matrix selection? sel = { role?, tier? }.
  function inSelection(paper, sel, source = "ccf") {
    if (!sel) return true;
    if (sel.role === "hidden") return paper.status === "hidden";
    if (sel.role === "absent") return paper.status === "absent";                 // (the papers whose complete author list does not have the profile's name)
    if (paper.status !== "found") return false;
    if (sel.role && paper.role !== sel.role) return false;
    if (sel.tier && tierOf(paper, source) !== sel.tier) return false;
    return true;
  }

  // Venues the matcher could not place — surfaced so users can see what is missing.
  function unmatchedVenues(papers) {
    const counts = new Map();
    for (const p of papers) {
      // (the paper page's line where it is known: whole, where the profile's line may be cut — what "Check", the copied list and the report then carry)
      const v = p.pageVenueText || p.venueText;
      if (!v) continue;
      const r = p.venue || {};
      if (!r.ccf && !r.core && !r.secondary && !/^(?:arxiv|biorxiv|medrxiv|technical report|tech\.? rep|https?:|url\b)/i.test(v.trim())) {
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    }
    return Array.from(counts, ([venue, count]) => ({ venue, count })).sort((a, b) => b.count - a.count);
  }

  return { ROLES, NONE, hIndex, i10Index, citationMetrics, byYear, yearBars, YEAR_BARS, venueKey, topVenues, tierOf, summarize, inSelection, unmatchedVenues };
});
