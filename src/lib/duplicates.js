// Duplicate entries: the same paper listed twice (or more) in one profile, often differing only in capitals or punctuation.
// Pure (no DOM), shared by the content script and the tests.
(function (root, factory) {
  const api = factory(
    typeof require === "function" && typeof module === "object" ? require("./names.js") : root.RolesRanks.names,
    typeof require === "function" && typeof module === "object" ? require("./awards.js") : root.RolesRanks.awards
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).duplicates = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (names, awards) {
  "use strict";

  const MIN_KEY = 16;   // a title this short ("Introduction", "Survey") names too many different papers to be trusted

  // Two entries are the same paper when their titles agree apart from case, accents, punctuation and spacing AND they start with
  // the same first author's surname (an author line cut before any name, or without one, never matches).
  function key(title, authorsText) {
    const k = awards.titleKey(title);
    const first = String(authorsText || "").split(",")[0].replace(/…|\.\.\./g, "").trim();
    const sur = first ? awards.surnameKey(first) : "";
    return k.length >= MIN_KEY && sur ? k + "|" + sur : "";
  }

  // entries: [{ title, authorsText, citations }]. Returns { keep: boolean[], citations: number[], merged: number[] }:
  // per entry whether it stays, the citations it shows (the group's total on the entry that stays), and how many entries it stands for.
  // The entry that stays is the most cited one of its group (the earlier one on a tie).
  function plan(entries) {
    const groups = new Map();
    entries.forEach((e, i) => {
      const k = key(e.title, e.authorsText);
      if (!k) return;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    });
    const keep = entries.map(() => true), citations = entries.map((e) => e.citations || 0), merged = entries.map(() => 1);
    for (const idx of groups.values()) {
      if (idx.length < 2) continue;
      const top = idx.reduce((best, i) => ((entries[i].citations || 0) > (entries[best].citations || 0) ? i : best), idx[0]);
      for (const i of idx) if (i !== top) keep[i] = false;
      citations[top] = idx.reduce((n, i) => n + (entries[i].citations || 0), 0);
      merged[top] = idx.length;
    }
    return { keep, citations, merged };
  }

  return { key, plan, MIN_KEY };
});
