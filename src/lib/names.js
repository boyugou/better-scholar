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
  // (a name is not longer than a few hundred characters, and runs of white space are made one before the patterns below look at them: a long run would make them quadratic)
  function cleanOwnerHeader(s) {
    let r = fold(String(s == null ? "" : s).slice(0, 300)).replace(/\s+/g, " ").replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
    r = r.replace(/[,;|]+/g, " ").replace(/\s+/g, " ").replace(/ (?:ph\.?\s?d|m\.?\s?d)\.?\s*$/i, "");
    const toks = r.split(/\s+/).filter(Boolean);
    while (toks.length > 1 && PREFIXES.has(bare(toks[0]))) toks.shift();
    while (toks.length > 2 && SUFFIXES.has(bare(toks[toks.length - 1]))) toks.pop();          // (not the second word of a two-word name: "Chidi Mba", "Naoki Ii")
    return toks.join(" ");
  }

  // { givens: [tokens], particles: [..], last: surname token, compound: the surname is joined by a hyphen or an apostrophe ("Carreira-Perpinan", "O'Connell"),
  //   head: the parts of a joined surname before its last one ("carreira", "o"), which are no given names }
  function nameParts(s, { owner = false } = {}) {
    const raw = owner ? cleanOwnerHeader(s) : String(s == null ? "" : s);
    const toks = normalize(raw).split(" ").filter(Boolean);
    if (!toks.length) return { givens: [], particles: [], last: "", compound: false, head: "" };
    const lastWord = fold(raw).trim().split(/\s+/).pop().replace(/^[-'’.]+|[-'’.]+$/g, "");
    const compound = /[-'’]/.test(lastWord);
    const last = toks[toks.length - 1];
    // (the parts of the joined surname are the tokens just before the last one: they are taken out of the given names, so that "MG Perez-Lopez" is
    // not "Maria Garcia-Lopez" by reading "G" against "garcia")
    const headParts = compound ? lastWord.split(/[-'’]+/).slice(0, -1).flatMap((w) => normalize(w).split(" ").filter(Boolean)) : [];
    const take = headParts.length && headParts.length < toks.length && headParts.every((w, i) => toks[toks.length - 1 - headParts.length + i] === w) ? headParts.length : 0;
    let end = toks.length - 1 - take;
    const particles = [];
    // A particle only counts when something (a given name) precedes it.
    while (end > 1 && PARTICLES.has(toks[end - 1])) particles.unshift(toks[--end]);
    return { givens: toks.slice(0, end), particles, last, compound, head: take ? headParts.join(" ") : "" };
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

  // (a surname joined by a hyphen or an apostrophe is another surname than its last part: "Carreira-Perpinan" and "O'Connell" are not "Perpinan" and "Connell")
  const sameSurname = (a, b) =>
    a.last === b.last && !!a.compound === !!b.compound && (a.head || "") === (b.head || "") &&
    (!a.particles.length || !b.particles.length || a.particles.join(" ") === b.particles.join(" "));

  // How strongly does the displayed author text match one owner name variant?
  //   3  identical after normalisation          2  every given name spelled out and equal
  //   1  initial-compatible only                0  no match
  function strength(a, variant) {
    const form = ownerForm(variant), b = form.parts;
    if (!a.last || !b.last) return 0;
    if (a.norm === undefined) a.norm = normalize(a.raw);
    if (a.norm === form.norm) return 3;
    if (!sameSurname(a, b)) return 0;
    if (!a.givens.length || !b.givens.length) return 0;
    if (!givensCompatible(a.givens, b.givens)) return 0;
    const full = (g) => g.every((t) => t.length > 1);
    return full(a.givens) && full(b.givens) ? 2 : 1;
  }

  const isAllCaps = (s) => /[A-Z]/.test(fold(s)) && fold(s) === fold(s).toUpperCase();

  // What is made of an owner's name (the profile's name, a spelling) is made once: the same few names are compared with every author of every paper, and the profile of a large
  // collaboration has thousands of authors in a paper
  const forms = new Map();
  function ownerForm(name) {
    const key = String(name == null ? "" : name);
    let f = forms.get(key);
    if (!f) {
      if (forms.size >= 200) forms.clear();
      const norm = normalize(cleanOwnerHeader(key));
      f = { norm, words: norm.split(" ").filter(Boolean), parts: nameParts(key, { owner: true }), caps: isAllCaps(key) };
      forms.set(key, f);
    }
    return f;
  }

  // owner = { name, alternates?: string[] } — alternates are extra spellings the
  // user told us about ("Zhang Wei", "W. Zhang").
  function matchStrength(authorText, owner) {
    const a = nameParts(authorText);
    a.raw = authorText;
    const variants = [owner.name, ...(owner.alternates || [])].filter(Boolean);
    let best = 0, authorCaps;
    for (const v of variants) {
      // a spelling in capitals ("JA DOUDNA", offered from a patent) names the capitals: it must not make every "Wu Li" the owner's, as an ordinary spelling would
      // (not when the profile's own name is in capitals: its rearrangements, which the page derives, are in capitals too)
      if (v !== owner.name && ownerForm(v).caps) {
        if (authorCaps === undefined) authorCaps = isAllCaps(authorText);
        if (!authorCaps && !ownerForm(owner.name).caps) continue;
      }
      // a spelling written in initials ("SY Philip", offered from the papers or typed in) is that print form and no other: "S Philip" and "Sam Philip" are other people
      const form = ownerForm(v);
      if (v !== owner.name && form.parts.givens.length && form.parts.givens.every((g) => g.length === 1 || (form.caps && g.length <= 3))) {          // ("JA DOUDNA": in capitals "JA" is two initials, not a name)
       if (a.norm === undefined) a.norm = normalize(a.raw); best = Math.max(best, a.norm === form.norm ? 3 : 0); continue; }
      // (the name as printed, once the page has chosen its rearrangement: only the identical name is still the owner's — "L Wei" is not "Li Wei" where "W Li" is)
      if (owner.exactName && v === owner.name) { if (a.norm === undefined) a.norm = normalize(a.raw); best = Math.max(best, a.norm === ownerForm(v).norm ? 3 : 0); continue; }
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
  // (truncated: the list was cut, so "every author marked" cannot be told from "the first few": then there is no leading group either)
  function leadingGroup(tokens, truncated = false) {
    const a = tokens[0] && tokens[0].marks, b = tokens[1] && tokens[1].marks;
    if (!a || !a.length || !b || !b.length || tokens[1].afterCut) return 0;          // (a name after a cut has no known place: "A Smith#, …, D Molina#" is no group)
    const shared = a.filter((m) => b.includes(m));
    if (!shared.length) return 0;
    let k = 2;
    while (k < tokens.length && !tokens[k].afterCut && shared.some((m) => (tokens[k].marks || []).includes(m))) k++;
    return k === tokens.length && (k > 2 || truncated) ? 0 : k;          // (every author marked: the mark is no equal contribution of a leading few)
  }

  // Parse "A Smith, B Jones, C Lee" into ordered tokens with co-first flags.
  // Scholar truncates long lists with "…" or "..."; the marker is dropped but we
  // remember the list was cut so "last author" is never over-claimed.
  // (the marks of a cut: "…", "⋯", "‥", two or more dots, ". . .", "et al"; and the separators besides the comma: ";", "·", the ideographic and Arabic commas, "|", a spaced slash, " and ", "&")
  const CUT = /…|⋯|‥|\.{2,}|(?:\.\s){2,}\.|\bet al\b\.?/gi;
  const SEPARATOR = /[,;·、､，；،|]|\s\/\s|\s(?:and|&amp;|&)\s/i;
  function parseAuthors(text) {
    const src = String(text || "");
    const truncated = new RegExp(CUT.source, "i").test(src);
    // what stands after a cut has no known position in the list: it can be neither the first, the second nor the last author
    const tokens = src.split(CUT).flatMap((part, seg) => part.split(SEPARATOR)
      .map((t) => t.trim())
      .filter(Boolean)
      .map(splitCofirst)
      .filter((t) => t.name.length > 1)
      .map((t) => (seg > 0 ? { ...t, afterCut: true } : t)));
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

  // Every author entry that matches the owner as well as the best one does, in order ([] when none): "X Wang, X Wang" holds two of them, and nothing in the line says which is the owner.
  function ownerCandidates(tokens, owner) {
    const best = findOwner(tokens, owner);
    if (best < 0) return [];
    const top = matchStrength(tokens[best].name, owner);
    return tokens.map((t, i) => i).filter((i) => matchStrength(tokens[i].name, owner) === top);
  }

  // Role of the author at `idx`: 'cofirst' | 'first' | 'last' | 'second' | 'middle'.
  // Co-first only for an author inside the leading group that shares a mark ("A*, B*, C"); a mark anywhere else says nothing about the role.
  // In a two-author paper the second author is the senior (last) author. A
  // truncated list never claims the last slot.
  function roleFor(idx, tokens, truncated) {
    if (tokens[idx].afterCut) return "middle";
    if (tokens[idx].cofirst && idx < leadingGroup(tokens, truncated)) return "cofirst";
    if (idx === 0) return "first";
    if (idx === tokens.length - 1 && !truncated) return "last";
    if (idx === 1) return "second";
    return "middle";
  }

  // One-call analysis of a row's author string for a given owner.
  //   status: 'found'   owner located; role is set ("middle" with `ambiguous` when the line holds the owner's spelling at places that give different roles)
  //           'hidden'  list is truncated and the owner is not in the visible part
  //           'absent'  list is complete but the owner's name never appears
  function classifyRow(authorsText, owner) {
    const { tokens, truncated } = parseAuthors(authorsText);
    const idx = findOwner(tokens, owner);
    if (idx >= 0) {
      // Two entries of the line match the owner equally well and would give different roles ("X Wang, X Wang, P Cong"): the line cannot tell which is the owner, so it claims no place of
      // honour — not first, second, last or co-first: the paper is one of the "other" authors', never over-claimed
      const candidates = ownerCandidates(tokens, owner);
      const roles = new Set(candidates.map((i) => roleFor(i, tokens, truncated)));
      if (roles.size > 1) return { status: "found", role: "middle", index: idx, ambiguous: true, tokens, truncated };
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
    const o = ownerForm(ownerName).words;
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
    const a = nameParts(authorName), o = ownerForm(ownerName).parts;
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
  const ownerKey = (o) => [o.exactName ? "=" : "~", o.name, ...(o.alternates || [])].join("\u0001");          // (an exact name matches fewer lines: its own cache)
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
        current = { name: owner.name, alternates: [...(owner.alternates || []), best.cand], exactName: true };
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
    normalize, cleanOwnerHeader, nameParts,
    matchesAuthor, leadingGroup, parseAuthors, findOwner, roleFor, classifyRow, reorderings, isPermutation, isShoutedInitials, suggestVariants
  };
});
