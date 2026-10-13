// Name normalisation, author-list parsing and authorship-role classification.
//
// Pure functions — no DOM, no chrome.* — so the same file runs in the content
// script (as a plain script that attaches to `globalThis.RolesRanks.names`) and under
// `node --test` (via require).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).names = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Footnote marks authors put after a name. In a group at the front of the list ("A*, B*, C") they mean "equal contribution"; alone, or on someone
  // further down ("..., C*": a corresponding author, or a co-senior one), they mean something else. The envelope only ever means the second.
  const COFIRST_SYMBOLS = ["†", "‡", "§", "*", "#", "⁎", "∗"];
  const CORRESPONDING_SYMBOLS = ["✉"];
  const canonicalMark = (sym) => (sym === "∗" || sym === "⁎" ? "*" : sym);       // (the star-like characters are one mark)

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

  const isAllCaps = (s) => /[A-Z]/.test(fold(s)) && fold(s) === fold(s).toUpperCase();

  // owner = { name, alternates?: string[] } — alternates are extra spellings the
  // user told us about ("Zhang Wei", "W. Zhang").
  function matchStrength(authorText, owner) {
    const a = nameParts(authorText);
    a.raw = authorText;
    const variants = [owner.name, ...(owner.alternates || [])].filter(Boolean);
    let best = 0;
    for (const v of variants) {
      // a spelling in capitals ("JA DOUDNA", offered from a patent) names the capitals: it must not make every "Wu Li" the owner's, as an ordinary spelling would
      if (v !== owner.name && isAllCaps(v) && !isAllCaps(authorText)) continue;
      best = Math.max(best, strength(a, v));
    }
    return best;
  }

  const matchesAuthor = (authorText, owner) => matchStrength(authorText, owner) > 0;

  // Strip trailing footnote marks from one raw author token; `marks` are the ones that can mean equal contribution (the envelope is dropped, it never does).
  // "Jane Doe†" -> { name: "Jane Doe", cofirst: true, marks: ["†"] }
  function splitCofirst(token) {
    let name = token.trim();
    const marks = [];
    for (let changed = true; changed;) {
      changed = false;
      for (const sym of [...COFIRST_SYMBOLS, ...CORRESPONDING_SYMBOLS]) {
        if (name.endsWith(sym)) {
          name = name.slice(0, -sym.length).trim();
          if (!CORRESPONDING_SYMBOLS.includes(sym)) marks.unshift(canonicalMark(sym));
          changed = true;
        }
      }
    }
    return { name, cofirst: marks.length > 0, marks };
  }

  // How many authors at the front share a mark ("A*, B*, C": 2). The marks of the group are the ones the first two authors have in common, and it goes on while
  // an author carries one of them; fewer than two is no group: a lone mark on the first author is a note or a corresponding author, and marks that begin
  // further down (or another symbol, or an extra symbol of the first author — "A*†, B*, C†": C is the corresponding author) are not equal contribution.
  function leadingGroup(tokens) {
    const a = tokens[0] && tokens[0].marks, b = tokens[1] && tokens[1].marks;
    if (!a || !a.length || !b || !b.length) return 0;
    const shared = a.filter((m) => b.includes(m));
    if (!shared.length) return 0;
    let k = 2;
    while (k < tokens.length && shared.some((m) => (tokens[k].marks || []).includes(m))) k++;
    return k;
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
  // Co-first only for an author inside the leading group that shares a mark ("A*, B*, C"); a mark anywhere else says nothing about the role.
  // In a two-author paper the second author is the senior (last) author. A
  // truncated list never claims the last slot.
  function roleFor(idx, tokens, truncated) {
    if (tokens[idx].cofirst && idx < leadingGroup(tokens)) return "cofirst";
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

  // ---------------------------------------------------------------- evidence-based variants

  // The same name with its parts in another order: "Tang Jie" → "Jie Tang". Only the rotations of a two- or three-part name.
  function reorderings(ownerName) {
    const words = cleanOwnerHeader(ownerName).split(/\s+/).filter(Boolean);
    if (words.length === 2) return [`${words[1]} ${words[0]}`];
    if (words.length === 3) return [`${words[1]} ${words[2]} ${words[0]}`, `${words[2]} ${words[0]} ${words[1]}`];
    return [];
  }

  // Is `authorName` the owner's name with its parts in another order, initials standing for some of them? Every word of one
  // is a word of the other or a letter that starts it, each used once, and at least one word is written out:
  // "SY Philip" for "Philip S. Yu", "J Tang" for "Tang Jie", "M Tomas" for "Tomas Mikolov" — but not "PA David" for "David Patterson".
  function isPermutation(authorName, ownerName) {
    const a = normalize(authorName).split(" ").filter(Boolean);
    const o = normalize(cleanOwnerHeader(ownerName)).split(" ").filter(Boolean);
    if (a.length !== o.length || a.length < 2) return false;
    const used = new Array(o.length).fill(false);
    let written = 0;
    for (const t of a) if (t.length > 1) {
      const i = o.findIndex((w, k) => !used[k] && w === t);
      if (i < 0) return false;
      used[i] = true; written++;
    }
    for (const t of a) if (t.length === 1) {
      const i = o.findIndex((w, k) => !used[k] && w[0] === t);
      if (i < 0) return false;
      used[i] = true;
    }
    return written >= 1;
  }

  // An all-caps author name — "JA DOUDNA", as patent databases print an inventor — is not read as initials plus surname when matching (an all-caps name is just
  // shouting, and "WU LI" is not "Wei Li"), so such a name is only ever offered, never used: would it be the owner's surname with initials that fit the owner's
  // given names, if its short leading words were read as initials?
  function isShoutedInitials(authorName, ownerName) {
    const raw = fold(authorName).trim();
    if (!/[A-Z]/.test(raw) || raw !== raw.toUpperCase()) return false;
    const words = raw.split(/\s+/);
    if (words.length < 2) return false;
    const a = nameParts(authorName), o = nameParts(ownerName, { owner: true });
    if (!a.last || !o.last || !sameSurname(a, o) || !o.givens.length) return false;
    const given = words.slice(0, -1);
    if (!given.every((w) => /^[A-Z]{1,3}$/.test(w))) return false;
    return givensCompatible(given.flatMap((w) => w.toLowerCase().split("")), o.givens);
  }

  // What the page itself says about how the owner's name is spelled, from the rows read so far.
  //   auto         spellings to use without asking: the profile name in the other order, when the name as printed finds the
  //                owner in hardly any paper and the other order in many ("Tang Jie" on the profile, "J Tang" in the papers)
  //   suggestions  spellings to offer: author names, in at least two papers whose complete author lists do not otherwise
  //                contain the owner, that are the owner's name rearranged ("SY Philip") or the owner's surname in capitals with
  //                initials ("JA DOUDNA")
  //
  // It runs again over every row read so far each time a page of rows is loaded, so what it works out about a row — the parsed author
  // line, where an owner's spelling finds the owner in it, whether a name is a rearrangement of the owner's — is remembered.
  const CACHE_LIMIT = 6000;
  const parsedCache = new Map(), foundCache = new Map();
  const remember = (cache, key, make) => {
    let v = cache.get(key);
    if (v === undefined) { if (cache.size >= CACHE_LIMIT) cache.clear(); v = make(); cache.set(key, v); }
    return v;
  };
  const ownerKey = (o) => [o.name, ...(o.alternates || [])].join("\u0001");
  function suggestVariants(authorTexts, owner) {
    const lists = authorTexts.map((text) => remember(parsedCache, text, () => parseAuthors(text)));
    const found = (l, text, o, key) => remember(foundCache, key + "\u0002" + text, () => findOwner(l.tokens, o));
    const count = (o) => {
      const key = ownerKey(o);
      return lists.reduce((n, l, i) => n + (found(l, authorTexts[i], o, key) >= 0 ? 1 : 0), 0);
    };
    const out = { auto: [], suggestions: [] };
    let current = owner;
    const base = count(owner);
    if (lists.length >= 8 && base < lists.length * 0.1) {
      let best = null;
      for (const cand of reorderings(owner.name)) {
        const n = count({ name: owner.name, alternates: [...(owner.alternates || []), cand] });
        if (!best || n > best.n) best = { cand, n };
      }
      if (best && best.n - base >= Math.max(5, 4 * base) && best.n >= lists.length * 0.25) {
        out.auto.push({ name: best.cand, rows: best.n - base });
        current = { name: owner.name, alternates: [...(owner.alternates || []), best.cand] };
      }
    }
    const tally = new Map();
    const currentKey = ownerKey(current), permutations = new Map();
    // an all-caps "JA DOUDNA" is offered only when the same initials, written as usual ("JA Doudna"), already find the owner in other papers of the profile: without
    // that evidence "WU LI" would be offered to "Wei Li", and a click would make every "Wu Li" the owner's
    const compact = (name) => normalize(name).replace(/ /g, "");
    const written = new Set();
    for (let i = 0; i < lists.length; i++) {
      const at = found(lists[i], authorTexts[i], current, currentKey);
      if (at >= 0) written.add(compact(lists[i].tokens[at].name));
    }
    const isRearranged = (name) => { let v = permutations.get(name); if (v === undefined) { v = isPermutation(name, current.name) || (isShoutedInitials(name, current.name) && written.has(compact(name))); permutations.set(name, v); } return v; };
    for (let i = 0; i < lists.length; i++) {
      const l = lists[i];
      if (l.truncated || found(l, authorTexts[i], current, currentKey) >= 0) continue;
      const seen = new Set();
      for (const t of l.tokens) {
        const key = normalize(t.name);
        if (seen.has(key) || !isRearranged(t.name)) continue;
        seen.add(key);
        const e = tally.get(key) || { name: t.name, rows: 0 };
        e.rows++;
        tally.set(key, e);
      }
    }
    out.suggestions = [...tally.values()].filter((e) => e.rows >= 2).sort((x, y) => y.rows - x.rows).slice(0, 3);
    return out;
  }

  return {
    COFIRST_SYMBOLS, CORRESPONDING_SYMBOLS, normalize, cleanOwnerHeader, nameParts, givensCompatible,
    matchStrength, matchesAuthor, splitCofirst, leadingGroup, parseAuthors, findOwner, roleFor, classifyRow, reorderings, isPermutation, isShoutedInitials, suggestVariants
  };
});
