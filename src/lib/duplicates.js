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
  // (the first author as the roles read a line — "J Smith and B Lee", "张伟，李明" —, a suffix aside: "J Smith Jr" is a Smith)
  function key(title, authorsText) {
    const k = awards.titleKey(title);
    const first = names.parseAuthors(String(authorsText || "")).tokens.find((t) => !t.afterCut);
    const sur = first ? awards.surnameKey(first.name.replace(/[\s,]+(?:jr|sr|ii|iii|iv)\.?$/i, "")) : "";
    return k.length >= MIN_KEY && sur ? k + "|" + sur : "";
  }

  // Entries of one title that are two publications: two venues the lists know apart (the conference paper and its journal version: Faster R-CNN at NeurIPS 2015
  // and in TPAMI 2016), or, neither a preprint, years more than one apart. A preprint is a copy of whichever it is.
  // (venues: the names the lists give the entry's venue, in lower case; [] for none)
  const apart = (a, b) => !a.preprint && !b.preprint && (
    ((a.venues || []).length && (b.venues || []).length && !a.venues.some((v) => b.venues.includes(v))) ||
    (Number.isFinite(a.year) && Number.isFinite(b.year) && a.year > 0 && b.year > 0 && Math.abs(a.year - b.year) > 1));
  // The entry that stays: the published one before a preprint, a ranked one, one whose author list shows the owner, then the most cited (the earlier on a tie)
  const rank = (e) => [e.preprint ? 0 : 1, (e.venues || []).length ? 1 : 0, e.found ? 1 : 0, e.citations || 0];
  const better = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

  // entries: [{ title, authorsText, citations, year?, venues?, preprint?, found? }]. Returns { keep: boolean[], citations: number[], merged: number[] }:
  // per entry whether it stays, the citations it shows (the group's total on the entry that stays), and how many entries it stands for.
  function plan(entries) {
    const groups = [], byKey = new Map();
    entries.forEach((e, i) => {
      const k = e.key !== undefined ? e.key : key(e.title, e.authorsText);       // (a caller may hand over keys it computed once)
      if (!k) return;
      if (!byKey.has(k)) byKey.set(k, []);
      const same = byKey.get(k).find((g) => g.every((j) => !apart(entries[j], e)));
      if (same) same.push(i); else { const g = [i]; byKey.get(k).push(g); groups.push(g); }
    });
    const keep = entries.map(() => true), citations = entries.map((e) => e.citations || 0), merged = entries.map(() => 1), into = entries.map((e, i) => i);
    for (const idx of groups) {
      if (idx.length < 2) continue;
      const top = idx.reduce((best, i) => (better(entries[i], entries[best]) ? i : best), idx[0]);
      for (const i of idx) if (i !== top) { keep[i] = false; into[i] = top; }          // (into: the entry that stands for it)
      citations[top] = idx.reduce((n, i) => n + (entries[i].citations || 0), 0);
      merged[top] = idx.length;
    }
    return { keep, citations, merged, into };
  }

  return { key, plan };
});
