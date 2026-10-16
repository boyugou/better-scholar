// Row analysis: author-list classification + venue resolution for one paper.
// Pure (no DOM), shared by the content script and the tests.
(function (root, factory) {
  const api = factory(
    typeof require === "function" && typeof module === "object" ? require("./names.js") : root.RolesRanks.names,
    typeof require === "function" && typeof module === "object" ? require("./marks.js") : root.RolesRanks.marks,
    typeof require === "function" && typeof module === "object" ? require("./query.js") : root.RolesRanks.query
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).analysis = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (names, marks, query) {
  "use strict";

  const ROLE_KEYS = ["first", "cofirst", "second", "last"];

  // raw:  { authorsText, venueText, title?, citations?, year? }   — straight from the Scholar list view
  // ctx:  { owner: {name, alternates?}, resolver, resolved?: { authors?, venue? }, venueWord?, awards? }
  //       `resolved` is what a paper's detail page said (full author list, clean venue).
  function analyzeRow(raw, ctx) {
    const resolved = ctx.resolved || null;
    const authorsText = (resolved && resolved.authors) || raw.authorsText || "";
    const cls = names.classifyRow(authorsText, ctx.owner);
    const venueText = raw.venueText || "";
    let venue = ctx.resolver.resolve(venueText);
    // A truncated or odd list-view venue may become matchable via the detail page's own field.
    if (!venue.ccf && !venue.core && resolved && resolved.venue) {
      const alt = ctx.resolver.resolve(resolved.venue);
      if (alt.ccf || alt.core) venue = alt;
    }
    return {
      status: cls.status,
      role: cls.role,
      index: cls.index,
      authorCount: cls.tokens.length,
      truncated: cls.truncated,
      tokens: cls.tokens,
      venue,
      venueText,
      citations: raw.citations || 0,
      year: raw.year || null,
      fromDetail: !!(resolved && resolved.authors),
      // award / talk words the author wrote into the title or venue (marks.js), plus awards from the
      // bundled list when one is given (ctx.awards, awards.js)
      marks: marks.merge(
        marks.detect({ title: raw.title, venue: [venueText, resolved && resolved.venue] }, { venueWord: ctx.venueWord }),
        ctx.awards ? ctx.awards.lookup({ title: raw.title, authorsText }) : [])
    };
  }

  // Is this analysed paper highlighted under the user's role toggles?
  function isHighlighted(a, roles) {
    return a.status === "found" && ROLE_KEYS.includes(a.role) && !!roles[a.role];
  }

  // The test a search query makes of a paper row, built once per query (lib/query.js has the language): `test(row)` for a row of the page's list
  // ({ raw: { title, authorsText, venueText }, a: the analysis, shown: the citations counted }), and the terms of the query that could not be read.
  // `marksOf(row)` says which marks count (the ones the settings leave on).
  const KIND = { C: "conference", J: "journal" };           // (what the rank lists call a venue's kind)
  const low = (x) => String(x || "").toLowerCase();
  // (the title, the author line and the venue of a row do not change: in lower case once, not for every key typed)
  const READ = new WeakMap();
  const readText = (raw) => { let t = READ.get(raw); if (!t) { t = [low(raw.title), low(raw.authorsText), low(raw.venueText)]; READ.set(raw, t); } return t; };
  // (the authors once "Read full lists" has read the whole list: every name of it, not the cut line of the page; kept for as long as the row's analysis is)
  const FULL = new WeakMap();
  const fullAuthors = (a) => { let t = FULL.get(a); if (t === undefined) { t = low(a.tokens.map((x) => x.name).join(", ")); FULL.set(a, t); } return t; };

  function queryMatcher(q, marksOf = (row) => row.a.marks || [], ranksOn = {}) {
    const parsed = query.parse(q);
    const fields = (row) => {
      const { raw, a } = row, v0 = a.venue || {}, found = marksOf(row);
      const v = { ccf: ranksOn.ccf === false ? null : v0.ccf, core: ranksOn.core === false ? null : v0.core };      // (a list that is switched off is not searched either)
      return {
        text: [...(a.fromDetail && a.tokens ? [readText(raw)[0], fullAuthors(a), readText(raw)[2]] : readText(raw)), ...[v.ccf && v.ccf.abbr, v.ccf && v.ccf.name, v.core && v.core.abbr, v.core && v.core.name,
          ...found.map((m) => `${m.kind || ""} ${m.label || ""} ${m.text || ""}`)].map(low)],
        year: a.year != null ? a.year : null,
        citations: row.shown,
        role: low(a.role),
        ccf: v.ccf && v.ccf.tier ? low(v.ccf.tier) : null,
        core: v.core && v.core.rank ? low(v.core.rank) : null,
        type: KIND[(v.ccf && v.ccf.kind) || (v.core && v.core.kind)] || null,
        award: found.some((m) => m.group === "award" || m.group === "finalist"),
        talk: found.some((m) => m.group === "oral" || m.group === "spotlight" || m.group === "highlight")
      };
    };
    // (the answer for a row is kept while its analysis (`row.a`, made again when anything it depends on changes) and its citations are the same: the page asks several times a refresh)
    const memo = new WeakMap();
    const test = (row) => {
      if (!parsed.terms.length) return true;
      const hit = row.raw && memo.get(row.raw);
      if (hit && hit.a === row.a && hit.shown === row.shown) return hit.ok;
      const ok = query.matches(parsed, fields(row));
      if (row.raw) memo.set(row.raw, { a: row.a, shown: row.shown, ok });
      return ok;
    };
    return { test, errors: parsed.errors, empty: !parsed.terms.length };
  }

  // The rows that would benefit from a look at the paper's own page: the owner is
  // invisible behind Scholar's "…" truncation.
  const needsDetail = (a) => a.status === "hidden" && !a.fromDetail;

  return { ROLE_KEYS, analyzeRow, isHighlighted, needsDetail, queryMatcher };
});
