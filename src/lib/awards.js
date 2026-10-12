// Paper awards from the bundled, curated list (data/awards-2026.json): match a Scholar row to an
// award-winning paper by its full title and the first author's surname. Pure, no DOM.
//
// Precision first: the title must be identical once case, accents and punctuation are ignored,
// AND the award's first author must be among the row's authors. A near title, a similar surname or a
// shared venue is never enough. The list only knows the paper awards of the venues and years it covers
// (best papers of the main conferences, test-of-time awards); a paper that is not on it simply has no mark.
(function (root, factory) {
  const api = factory(
    typeof require === "function" && typeof module === "object" ? require("./names.js") : root.RolesRanks.names
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).awards = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (names) {
  "use strict";

  // A little LaTeX survives in some official titles — "Understanding Dataset Difficulty with $\mathcal{V}$-Usable Information" —
  // while Scholar prints "V-usable": the markup around a letter is dropped.
  const untex = (s) => s.replace(/\\(?:mathcal|mathbf|mathrm|mathit|mathbb|textbf|textit|textrm|text|emph)\s*\{([^{}]*)\}/g, "$1").replace(/\$/g, "");

  // "Deep Residual Learning for Image Recognition" → "deepresiduallearningforimagerecognition"
  function titleKey(s) {
    return untex(String(s == null ? "" : s))
      .normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/ß/g, "ss").replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d").replace(/œ/g, "oe").replace(/æ/g, "ae")
      .replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "");
  }

  // "Kaiming He" and "K He" both → "he"; "Luis von Ahn" and "L von Ahn" both → "ahn".
  const surnameKey = (name) => names.nameParts(name || "").last || "";

  // How the list's award names map onto the marker kinds (see marks.js).
  const KIND = { best: "best", outstanding: "outstanding", distinguished: "distinguished", "runner-up": "runner-up", student: "best-student", category: "best-category", tot: "tot" };

  // items: [[titleKey, surnameKey, venue, year, award, printedAwardName?], …]  (as emitted by scripts/build-data.mjs)
  function createIndex(items) {
    const byTitle = new Map();
    for (const it of items || []) {
      const [k, s, v, y, a, l] = it;
      if (!KIND[a]) continue;
      if (!byTitle.has(k)) byTitle.set(k, []);
      byTitle.get(k).push({ s, v, y, a, l: l || "" });
    }
    // fields: { title, authorsText } — authorsText is the list view's text, or a paper page's full list
    function lookup({ title, authorsText }) {
      const hits = byTitle.get(titleKey(title));
      if (!hits) return [];
      const authors = new Set(names.parseAuthors(authorsText || "").tokens.map((t) => surnameKey(t.name)));
      const out = [];
      for (const h of hits) {
        if (!authors.has(h.s)) continue;
        out.push({ kind: KIND[h.a], venue: h.v, year: h.y, awardLabel: h.l });
      }
      return out;
    }
    return { lookup, size: items ? items.length : 0 };
  }

  return { titleKey, surnameKey, KIND, createIndex };
});
