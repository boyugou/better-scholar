// Semantic Scholar (https://www.semanticscholar.org): an optional second source for a paper's full author list, asked before Scholar's own
// page when the settings allow it. One request per paper to the public API (no account; an API key only if the person gave one, to avoid the limit shared by keyless users), carrying nothing but the paper's title.
// An answer is used only when its title is the same paper's title (capitals, accents and punctuation aside).
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const API = "https://api.semanticscholar.org/graph/v1/paper/search/match";
  // About one request a second (the public limit); instant against a local test server's stand-in.
  const PACE = () => (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? 30 : 1100);

  // → { authors: "A, B, C", venue } for the paper, null when Semantic Scholar has no such title; throws { limited: true } when it asks to slow down
  async function lookup(title, signal, { authorsText = "", year = null } = {}) {
    const url = API + "?fields=title,authors,year&query=" + encodeURIComponent(title);
    const apiKey = await B.store.loadS2Key();                       // (a free key avoids the limit shared by everyone without one)
    const res = await fetch(url, { signal, credentials: "omit", referrerPolicy: "no-referrer", headers: apiKey ? { "x-api-key": apiKey } : {} });
    if (res.status === 404) return null;
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error(apiKey ? "key" : "limited"), apiKey ? { badKey: true } : { limited: true });          // (a key Semantic Scholar does not accept: no point in asking again; without a key a refusal is the shared limit)
    if (res.status === 429 || res.status >= 500) throw Object.assign(new Error("limited"), { limited: true });
    if (!res.ok) return null;
    const hit = ((await res.json()).data || [])[0];
    if (!hit || !Array.isArray(hit.authors) || !hit.authors.length) return null;
    // the same paper: the same title (a long enough one: "Introduction" names many papers), a first author who is the row's first author,
    // and a year within two of the row's (a preprint and its publication differ)
    const key = B.awards.titleKey(title);
    if (key.length < 16 || B.awards.titleKey(hit.title) !== key) return null;
    const first = String(authorsText).split(",")[0].replace(/…|\.\.\./g, "").trim();
    const sur = first ? B.awards.surnameKey(first) : "";
    if (!sur || !hit.authors.some((a) => a.name && B.awards.surnameKey(a.name) === sur)) return null;
    if (year != null && hit.year != null && Math.abs(hit.year - year) > 2) return null;
    // (only the authors: the venue of a merged preprint / publication record could belong to another version of the paper)
    return { authors: hit.authors.map((a) => a.name).filter(Boolean).join(", "), venue: "" };
  }

  B.semantic = { lookup, PACE };
})();
