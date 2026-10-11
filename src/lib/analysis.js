// Row analysis: author-list classification + venue resolution for one paper.
// Pure (no DOM), shared by the content script and the tests.
(function (root, factory) {
  const api = factory(
    typeof require === "function" && typeof module === "object" ? require("./names.js") : root.Byline.names
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.Byline = root.Byline || {}).analysis = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (names) {
  "use strict";

  const ROLE_KEYS = ["first", "cofirst", "second", "last"];

  // raw:  { authorsText, venueText, citations?, year? }   — straight from the Scholar list view
  // ctx:  { owner: {name, alternates?}, resolver, resolved?: { authors?, venue? } }
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
      fromDetail: !!(resolved && resolved.authors)
    };
  }

  // Is this analysed paper highlighted under the user's role toggles?
  function isHighlighted(a, roles) {
    return a.status === "found" && ROLE_KEYS.includes(a.role) && !!roles[a.role];
  }

  // The rows that would benefit from a look at the paper's own page: the owner is
  // invisible behind Scholar's "…" truncation.
  const needsDetail = (a) => a.status === "hidden" && !a.fromDetail;

  return { ROLE_KEYS, analyzeRow, isHighlighted, needsDetail };
});
