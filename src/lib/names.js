// Name normalisation, author-list parsing and authorship-role classification.
//
// Pure functions — no DOM, no chrome.* — so the same file runs in the content
// script (as a plain script that attaches to `globalThis.Byline.names`) and under
// `node --test` (via require).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.Byline = root.Byline || {}).names = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Footnote marks authors use for "equal contribution" / "corresponding".
  const COFIRST_SYMBOLS = ["†", "‡", "§", "*", "#", "✉", "⁎", "∗"];

  // Latin letters with no Unicode decomposition, so NFD alone leaves them behind.
  const SPECIAL_LETTERS = {
    "ł": "l", "Ł": "L", "ø": "o", "Ø": "O", "đ": "d", "Đ": "D", "ð": "d", "Ð": "D",
    "þ": "th", "Þ": "Th", "ß": "ss", "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE",
    "ı": "i", "ħ": "h", "Ħ": "H"
  };

  // Surname particles that belong to the family name ("Laurens van der Maaten").
  // Deliberately excludes de/di/da/la/le/al/el: those are common given names in
  // Chinese / Vietnamese ("Le Song", "Wei Da Li") and would eat the given name.
  const PARTICLES = new Set([
    "van", "von", "der", "den", "ter", "ten", "del", "della", "dos", "das", "du",
    "bin", "ibn", "op", "het"
  ]);

  const PREFIXES = new Set(["dr", "prof", "professor", "mr", "mrs", "ms", "miss", "sir", "madam"]);
  const SUFFIXES = new Set(["phd", "md", "jr", "sr", "ii", "iii", "iv", "esq", "dphil", "msc", "mba"]);

  // Strip accents and transliterate letters NFD cannot decompose. Case is kept.
  function fold(s) {
    return String(s == null ? "" : s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[łŁøØđĐðÐþÞßæÆœŒıħĦ]/g, (c) => SPECIAL_LETTERS[c]);
  }

  // Scholar abbreviates a given name with several parts into one all-caps token:
  // "GE Hinton", "WLH Smith". Expand those clusters into single letters so
  // "GE Hinton" lines up with the profile name "Geoffrey Hinton". Only applied to
  // mixed-case strings (an all-caps name is just shouting) and never to the last
  // token (the surname).
  function expandClusters(s) {
    if (s === s.toUpperCase()) return s;
    const toks = s.split(/\s+/).filter(Boolean);
    return toks
      .map((t, i) => (i < toks.length - 1 && /^[A-Z]{2,3}$/.test(t) ? t.split("").join(" ") : t))
      .join(" ");
  }

  // Lowercase, accent-folded tokens separated by single spaces. Names with no
  // Latin letters at all (CJK, Cyrillic, …) fall back to their own letters so two
  // identical non-Latin names still compare equal.
  function normalize(s) {
    const r = expandClusters(fold(s));
    const latin = r.toLowerCase()
      .replace(/[.\-'’]/g, " ")
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (latin) return latin;
    return r.normalize("NFKC").toLowerCase()
      .replace(/[^\p{L}\p{M}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const bare = (t) => t.toLowerCase().replace(/\./g, "");

  // The profile header is free text: "Prof. John Smith", "John Smith, PhD",
  // "Wei Zhang (张伟)". Reduce it to the name proper.
  function cleanOwnerHeader(s) {
    let r = fold(s).replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
    r = r.replace(/[,;|]+/g, " ").replace(/\s+(?:ph\.?\s?d|m\.?\s?d)\.?\s*$/i, "");
    const toks = r.split(/\s+/).filter(Boolean);
    while (toks.length > 1 && PREFIXES.has(bare(toks[0]))) toks.shift();
    while (toks.length > 1 && SUFFIXES.has(bare(toks[toks.length - 1]))) toks.pop();
    return toks.join(" ");
  }

  // { givens: [tokens], particles: [..], last: surname token }
  function nameParts(s, { owner = false } = {}) {
    const toks = normalize(owner ? cleanOwnerHeader(s) : s).split(" ").filter(Boolean);
    if (!toks.length) return { givens: [], particles: [], last: "" };
    const last = toks[toks.length - 1];
    let end = toks.length - 1;
    const particles = [];
    // A particle only counts when something (a given name) precedes it.
    while (end > 1 && PARTICLES.has(toks[end - 1])) particles.unshift(toks[--end]);
    return { givens: toks.slice(0, end), particles, last };
  }

  // True when a concatenated-initials token (one side) lines up letter by letter
  // with `cluster.length` consecutive tokens on the other side — "AK" vs
  // ["amin","karimi"].
  function matchesInitialsRun(cluster, tokens, start) {
    if (start + cluster.length > tokens.length) return false;
    for (let k = 0; k < cluster.length; k++) {
      if (cluster[k] !== tokens[start + k][0]) return false;
    }
    return true;
  }

  // Do two given-name token sequences plausibly name the same person? Walks both
  // with two pointers; whichever runs out first leaves the remainder unchecked, so
  // a shorter variant ("John" vs "John Q") is accepted. Full words must be
  // identical ("Jane" ≠ "John"); a single letter matches any word starting with it.
  function givensCompatible(ga, gb) {
    let i = 0, j = 0;
    while (i < ga.length && j < gb.length) {
      const ta = ga[i], tb = gb[j];
      if (ta[0] !== tb[0]) return false;
      if (ta.length === 1 || tb.length === 1 || ta === tb) { i++; j++; continue; }
      if (matchesInitialsRun(ta, gb, j)) { i++; j += ta.length; continue; }
      if (matchesInitialsRun(tb, ga, i)) { j++; i += tb.length; continue; }
      return false;
    }
    return true;
  }

  const sameSurname = (a, b) =>
    a.last === b.last &&
    (!a.particles.length || !b.particles.length || a.particles.join(" ") === b.particles.join(" "));

  // How strongly does the displayed author text match one owner name variant?
  //   3  identical after normalisation          2  every given name spelled out and equal
  //   1  initial-compatible only                0  no match
  function strength(a, variant) {
    const b = nameParts(variant, { owner: true });
    if (!a.last || !b.last) return 0;
    if (normalize(a.raw) === normalize(cleanOwnerHeader(variant))) return 3;
    if (!sameSurname(a, b)) return 0;
    if (!a.givens.length || !b.givens.length) return 0;
    if (!givensCompatible(a.givens, b.givens)) return 0;
    const full = (g) => g.every((t) => t.length > 1);
    return full(a.givens) && full(b.givens) ? 2 : 1;
  }

  // owner = { name, alternates?: string[] } — alternates are extra spellings the
  // user told us about ("Zhang Wei", "W. Zhang").
  function matchStrength(authorText, owner) {
    const a = nameParts(authorText);
    a.raw = authorText;
    const variants = [owner.name, ...(owner.alternates || [])].filter(Boolean);
    let best = 0;
    for (const v of variants) best = Math.max(best, strength(a, v));
    return best;
  }

  const matchesAuthor = (authorText, owner) => matchStrength(authorText, owner) > 0;

  // Strip trailing co-first markers from one raw author token.
  // "Jane Doe†" -> { name: "Jane Doe", cofirst: true }
  function splitCofirst(token) {
    let name = token.trim();
    let cofirst = false;
    for (let changed = true; changed;) {
      changed = false;
      for (const sym of COFIRST_SYMBOLS) {
        if (name.endsWith(sym)) {
          name = name.slice(0, -sym.length).trim();
          cofirst = true;
          changed = true;
        }
      }
    }
    return { name, cofirst };
  }

  // Parse "A Smith, B Jones, C Lee" into ordered tokens with co-first flags.
  // Scholar truncates long lists with "…" or "..."; the marker is dropped but we
  // remember the list was cut so "last author" is never over-claimed.
  function parseAuthors(text) {
    const src = String(text || "");
    const truncated = /…|\.\.\.|\bet al\b\.?/i.test(src);
    const tokens = src
      .replace(/…|\.\.\.|\bet al\b\.?/gi, ",")
      .split(/[,;·、，；]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map(splitCofirst)
      .filter((t) => t.name.length > 1);
    return { tokens, truncated };
  }

  // Index of the owner inside a parsed author list, or -1. When several tokens
  // match (initial collisions) the most specific match wins, then the earliest.
  function findOwner(tokens, owner) {
    let bestIdx = -1, bestScore = 0;
    for (let i = 0; i < tokens.length; i++) {
      const s = matchStrength(tokens[i].name, owner);
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
    return bestIdx;
  }

  // Role of the author at `idx`: 'cofirst' | 'first' | 'last' | 'second' | 'middle'.
  // In a two-author paper the second author is the senior (last) author. A
  // truncated list never claims the last slot.
  function roleFor(idx, tokens, truncated) {
    if (tokens[idx].cofirst) return "cofirst";
    if (idx === 0) return "first";
    if (idx === tokens.length - 1 && !truncated) return "last";
    if (idx === 1) return "second";
    return "middle";
  }

  // One-call analysis of a row's author string for a given owner.
  //   status: 'found'   owner located; role is set
  //           'hidden'  list is truncated and the owner is not in the visible part
  //           'absent'  list is complete but the owner's name never appears
  function classifyRow(authorsText, owner) {
    const { tokens, truncated } = parseAuthors(authorsText);
    const idx = findOwner(tokens, owner);
    if (idx >= 0) {
      return { status: "found", role: roleFor(idx, tokens, truncated), index: idx, tokens, truncated };
    }
    return { status: truncated ? "hidden" : "absent", role: null, index: -1, tokens, truncated };
  }

  return {
    COFIRST_SYMBOLS, normalize, cleanOwnerHeader, nameParts, givensCompatible,
    matchStrength, matchesAuthor, splitCofirst, parseAuthors, findOwner, roleFor, classifyRow
  };
});
