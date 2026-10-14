// Row analysis: author-list classification + venue resolution for one paper.
// Pure (no DOM), shared by the content script and the tests.
(function (root, factory) {
  const api = factory(
    typeof require === "function" && typeof module === "object" ? require("./names.js") : root.RolesRanks.names,
    typeof require === "function" && typeof module === "object" ? require("./marks.js") : root.RolesRanks.marks
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).analysis = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (names, marks) {
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

  // Evaluates comparison operators (>, >=, <, <=, =, ==).
  function evalComp(val, op, target) {
    if (val == null || !Number.isFinite(val)) return false;
    switch (op) {
      case ">": return val > target;
      case ">=": return val >= target;
      case "<": return val < target;
      case "<=": return val <= target;
      case "=":
      case "==": return val === target;
      default: return false;
    }
  }

  // Evaluates whether a paper row satisfies a search query string.
  // Supports multi-token conjunctive (AND) matching across:
  // - plain text search: title, authors, venue text, venue acronyms, venue names, year, role, award text
  // - numeric citation filters: ">100", ">=50", "<20", "<=10", "cites:>100", "c:>=50"
  // - year filters: ">2020", "<2015", "year:>=2021", "y:>2019"
  // - rank tier filters: "ccf:a", "core:a*", "tier:a", "rank:a"
  // - role filters: "role:first", "role:last", "role:second", "role:cofirst"
  // - award filters: "has:award", "is:award", "has:talk", "is:talk"
  function matchesQuery(row, q) {
    if (!q) return true;
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;

    const raw = row.raw || row;
    const a = row.a || row;
    const title = (raw.title || "").toLowerCase();
    const authors = (raw.authorsText || raw.authors || "").toLowerCase();
    const venue = (raw.venueText || raw.venue || "").toLowerCase();
    const v = a.venue || {};
    const ccfAbbr = (v.ccf && v.ccf.abbr || "").toLowerCase();
    const ccfName = (v.ccf && v.ccf.name || "").toLowerCase();
    const coreAbbr = (v.core && v.core.abbr || "").toLowerCase();
    const coreName = (v.core && v.core.name || "").toLowerCase();
    const year = a.year != null ? a.year : raw.year != null ? raw.year : null;
    const yearStr = year != null ? String(year) : "";
    const role = (a.role || "").toLowerCase();
    const citations = Number.isFinite(row.shown) ? row.shown : (Number.isFinite(raw.citations) ? raw.citations : (Number.isFinite(a.citations) ? a.citations : 0));
    const marksList = a.marks || [];
    const marksText = marksList.map((m) => (m.kind || "") + " " + (m.label || "") + " " + (m.text || "")).join(" ").toLowerCase();

    return tokens.every((tok) => {
      // 1. Explicit citation filter: cites:>100, c:>=50, cites:<10
      const citeMatch = tok.match(/^(?:cites?|c):(>=?|<=?|>|<|=)(\d+)$/);
      if (citeMatch) return evalComp(citations, citeMatch[1], parseInt(citeMatch[2], 10));

      // 2. Explicit year filter: year:>2020, y:>=2021
      const yearMatch = tok.match(/^(?:years?|y):(>=?|<=?|>|<|=)(\d{1,4})$/);
      if (yearMatch) return evalComp(year, yearMatch[1], parseInt(yearMatch[2], 10));

      // 3. Shorthand comparison: >100, >=50, <10, >2020
      const compMatch = tok.match(/^(>=?|<=?|>|<|=)(\d+)$/);
      if (compMatch) {
        const op = compMatch[1];
        const num = parseInt(compMatch[2], 10);
        if (num >= 1800 && num <= 2100) return evalComp(year, op, num);
        return evalComp(citations, op, num);
      }

      // 4. Rank tier filter: ccf:a, core:a*, tier:a, rank:b
      const ccfMatch = tok.match(/^ccf:([a-c])$/);
      if (ccfMatch) return !!(v.ccf && v.ccf.tier && v.ccf.tier.toLowerCase() === ccfMatch[1]);

      const coreMatch = tok.match(/^core:([a-c]\*?)$/);
      if (coreMatch) return !!(v.core && v.core.rank && v.core.rank.toLowerCase() === coreMatch[1]);

      const tierMatch = tok.match(/^(?:tier|rank):([a-c]\*?)$/);
      if (tierMatch) {
        const t = tierMatch[1];
        return !!((v.ccf && v.ccf.tier && v.ccf.tier.toLowerCase() === t) || (v.core && v.core.rank && v.core.rank.toLowerCase() === t));
      }

      // 5. Role filter: role:first, r:last, role:cofirst
      const roleMatch = tok.match(/^(?:roles?|r):(first|cofirst|second|last|middle)$/);
      if (roleMatch) return role === roleMatch[1];

      // 6. Award / Talk filter: has:award, is:award, has:talk
      if (tok === "has:award" || tok === "is:award") {
        return marksList.some((m) => m.group === "award" || ["best", "best-student", "outstanding", "distinguished", "tot", "finalist", "runner-up"].includes(m.kind));
      }
      if (tok === "has:talk" || tok === "is:talk") {
        return marksList.some((m) => m.group === "talk" || ["oral", "spotlight", "highlight"].includes(m.kind));
      }

      // 7. General text substring match across all fields
      return title.includes(tok) ||
        authors.includes(tok) ||
        venue.includes(tok) ||
        ccfAbbr.includes(tok) ||
        ccfName.includes(tok) ||
        coreAbbr.includes(tok) ||
        coreName.includes(tok) ||
        yearStr === tok ||
        role === tok ||
        marksText.includes(tok);
    });
  }

  // The rows that would benefit from a look at the paper's own page: the owner is
  // invisible behind Scholar's "…" truncation.
  const needsDetail = (a) => a.status === "hidden" && !a.fromDetail;

  return { ROLE_KEYS, analyzeRow, isHighlighted, needsDetail, matchesQuery };
});
