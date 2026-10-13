// Semantic Scholar (https://www.semanticscholar.org): an optional second source for a paper's full author list, asked before Scholar's own
// page when the settings allow it. One request per paper to the public API (no account, no key), carrying nothing but the paper's title.
// An answer is used only when its title is the same paper's title (capitals, accents and punctuation aside).
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const API = "https://api.semanticscholar.org/graph/v1/paper/search/match";
  // About one request a second (the public limit); instant against a local test server's stand-in.
  const PACE = () => (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? 30 : 1100);

  // → { authors: "A, B, C", venue } for the paper, null when Semantic Scholar has no such title; throws { limited: true } when it asks to slow down
  async function lookup(title, signal) {
    const url = API + "?fields=title,authors,venue&query=" + encodeURIComponent(title);
    const res = await fetch(url, { signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (res.status === 404) return null;
    if (res.status === 429 || res.status >= 500) throw Object.assign(new Error("limited"), { limited: true });
    if (!res.ok) return null;
    const hit = ((await res.json()).data || [])[0];
    if (!hit || !Array.isArray(hit.authors) || !hit.authors.length) return null;
    if (B.awards.titleKey(hit.title) !== B.awards.titleKey(title)) return null;
    return { authors: hit.authors.map((a) => a.name).filter(Boolean).join(", "), venue: hit.venue || "" };
  }

  B.semantic = { lookup, PACE };
})();
