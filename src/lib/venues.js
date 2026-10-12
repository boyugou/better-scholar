// Venue resolution: map the free-text venue string Google Scholar prints for a
// paper to its CCF tier and CORE rank.
//
// Design rules, in order of importance:
//   1. Precision over recall. A missing badge is better than a wrong one, so there
//      is NO substring fallback: a venue is matched only by (a) its canonical full
//      name or a curated alias, (b) a strong acronym signal, or (c) an unambiguous
//      prefix when Scholar truncated the name with "…". Ambiguity => no badge.
//   2. Conferences and journals are indexed separately, and the string's own
//      wording (proceedings/conference vs journal/transactions) decides which
//      index is consulted — "Machine learning, 555-610" is the journal, not ICML.
//   3. Every result says which rule matched, so the UI can show its provenance.
//
// Pure functions, no DOM / chrome.* (runs in the content script and under node).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).venues = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ---------------------------------------------------------------- text utils

  const SPECIAL = { "ł": "l", "ø": "o", "đ": "d", "ß": "ss", "æ": "ae", "œ": "oe" };
  function fold(s) {
    return String(s == null ? "" : s)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[łøđßæœ]/gi, (c) => SPECIAL[c.toLowerCase()]);
  }

  const STOP = new Set(["the", "of", "on", "in", "for", "and", "a", "an", "at", "to", "with", "by"]);
  // Words that say "this is a conference-like event" but are not part of its identity.
  const BOILER = new Set([
    "proceedings", "proceeding", "proc", "conference", "conferences", "conf", "symposium",
    "symposia", "symp", "workshop", "workshops", "meeting", "meetings", "congress",
    "colloquium", "annual", "international", "intl", "int", "joint", "edition",
    "volume", "vol", "part", "track", "session", "sessions", "ann"
  ]);
  // Organisations that co-sponsor many events; never an identity on their own.
  const ORG = new Set(["ieee", "acm", "cvf", "usenix", "ifip", "siam", "ieeeacm", "acmieee", "springer", "elsevier"]);
  const ORDINAL_WORDS = new Set([
    "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
    "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth",
    "eighteenth", "nineteenth", "twentieth", "thirtieth", "fortieth", "fiftieth", "twenty",
    "thirty", "forty", "fifty", "sixty"
  ]);
  // ISO-4 style abbreviations Scholar sometimes prints ("Commun. Acm", "IEEE Trans. …").
  const ISO = { trans: "transactions", commun: "communications", lett: "letters", jour: "journal", j: "journal" };
  const TYPE_WORDS = ["symposium", "conference", "workshop", "meeting"];

  const isNoiseToken = (t) =>
    /^\d+$/.test(t) || /^\d+(st|nd|rd|th)$/.test(t) || ORDINAL_WORDS.has(t) || (t.length === 1 && t !== "a");
  // Authors often drop the "h" of an ordinal: "The Thirty-eight Conference on Neural Information Processing
  // Systems" (NeurIPS 2024 was the thirty-eighth). After a tens word, "eight" / "nine" / "nineth" is that ordinal.
  const TENS = new Set(["twenty", "thirty", "forty", "fifty", "sixty"]);
  const ORDINAL_TYPOS = new Set(["eight", "nine", "nineth"]);
  const dropOrdinalTypos = (tokens) => tokens.filter((t, i) => !(ORDINAL_TYPOS.has(t) && TENS.has(tokens[i - 1])));

  // Squash to a key where "S&P" and "SP" collide on purpose and spacing is irrelevant.
  const squash = (s) => fold(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
  // "nsdi11" -> "nsdi", "sp05" -> "sp"; leaves "3dv" and "p2p" alone.
  const stripDigits = (k) => (/^[a-z0-9]*[a-z]\d+$/.test(k) ? k.replace(/\d+$/, "") : k);
  const uniq = (list) => Array.from(new Set(list));

  // Canonical token list of a venue name. `mode`:
  //   "full"  — keeps organisation words (IEEE/ACM/…),
  //   "noOrg" — drops them,
  //   "noAcr" — also drops all-caps tokens listed in `known` (acronyms of real venues,
  //             the "2020 CHI Conference on Human Factors…" case).
  function canonTokens(s, mode, known) {
    let r = fold(s).replace(/&/g, " and ");
    if (mode === "noAcr" && known) {
      r = r.replace(/\b[A-Z][A-Z0-9]{1,9}\b/g, (m) => (known.has(m.toLowerCase()) ? " " : m));
    }
    return dropOrdinalTypos(r.toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter(Boolean))
      .map((t) => ISO[t] || t)
      .filter((t) => !STOP.has(t) && !BOILER.has(t) && !isNoiseToken(t) && !(mode !== "full" && ORG.has(t)));
  }

  // Like canonTokens but keeps connectives ("in", "and", "of"): used where the exact
  // connective after a truncated prefix matters ("Information processing in …").
  function canonTokensKeepStops(s, mode) {
    return dropOrdinalTypos(fold(s).replace(/&/g, " and ").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean)).map((t) => ISO[t] || t)
      .filter((t) => !BOILER.has(t) && !isNoiseToken(t) && !(mode !== "full" && ORG.has(t)));
  }

  // -------------------------------------------------------------- input cleanup

  const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
  const PAGES = "(?:[A-Za-z]{0,3}\\d+[A-Za-z]{0,3})(?:\\s*[-–−]+\\s*(?:[A-Za-z]{0,3}\\d+[A-Za-z]{0,3}|es))?";

  // NeurIPS's "Datasets and Benchmarks Track" papers are NeurIPS papers: the phrase (and its "(Round 2)", "Track on …",
  // "Datasets; Benchmarks" spellings) is not part of the venue's identity, so it is dropped before matching. Whether the
  // raw string names a workshop is judged on the raw string, so "… Workshop on Datasets and Benchmarks" stays unbadged.
  const DB_PHRASE = "(?:track\\s+on\\s+)?(?:datasets?\\s*(?:and|&|;)\\s*benchmarks?|d\\s?&\\s?b)(?:\\s+track)?(?:\\s*[(,]?\\s*round\\s*\\d\\s*\\)?)?";
  const DB_PAREN = new RegExp("\\(\\s*" + DB_PHRASE + "\\s*\\)", "gi");
  const DB_TAIL = new RegExp("[\\s,;:–-]*\\b" + DB_PHRASE + "(?=\\s*(?:[,;:.)]|$|\\d))", "gi");

  // Reduce a raw Scholar venue field to
  //   { name, plain, withParens, truncated, hasVolume }
  // name       the venue words with volume/pages/year tails removed (parentheses kept)
  // plain      name with parenthetical content removed (used for name matching)
  // withParens name before tail removal, parentheses kept (used for acronym extraction)
  function prepare(raw) {
    // (whitespace is collapsed first: a long run of spaces in front of a pattern would otherwise make the scan quadratic)
    let s = fold(raw).replace(/\s+/g, " ").trim().replace(DB_PAREN, " ").replace(DB_TAIL, " ").replace(/\s+/g, " ").trim();
    // "[arXiv preprint arXiv:2305.1]" / "(arXiv:…)" annotations some owners append
    s = s.replace(/\[[^\]]*\]?/g, " ").replace(/\((?:[^()]*arxiv[^()]*)\)?/gi, " ");
    const truncated = /…|\.{3}/.test(s);
    if (truncated) s = s.split(/…|\.{3}/)[0];
    s = s.replace(/\s+/g, " ").trim();
    const withParens = s;
    let hasVolume = false;
    for (let changed = true, guard = 0; changed && guard < 8; guard++) {
      const before = s;
      s = s.replace(/\s*,\s*(?:19|20)\d{2}\s*$/, "");                       // ", 2014"
      s = s.replace(/\s*,?\s*\bPMLR\b\s*\d*\s*[:,]?\s*(?:\d+\s*[-–]\s*\d+)?\s*$/i, "");   // ", PMLR 235:12345-12367" (the proceedings series, not a venue)
      s = s.replace(new RegExp("\\s*,\\s*" + PAGES + "\\s*$"), "");        // ", 611-626" / ", 79"
      s = s.replace(/\s*,\s*\d+\s*:\s*\d+\s*-\s*\d+\s*$/, "");              // ", 3: 1-3: 19"
      if (/\s+\d+\s*\([^)]*\)?\s*$/.test(s)) hasVolume = true;
      s = s.replace(/\s+\d+\s*\([^)]*\)?\s*$/, "");                         // " 42 (3)" / " 8 (4"
      s = s.replace(/\s*[,:]?\s*\b(?:volume|vol\.?)\s*\d+.*$/i, "");        // "Volume 1 (Long Papers)"
      s = s.replace(/\s+\d{1,3}\s*:.*$/, "");                               // "… Systems 15: Proceedings"
      s = s.replace(new RegExp("\\s*,?\\s*\\b" + MONTH + "\\b\\.?\\s*(?:\\d{1,2}\\s*[-–]\\s*\\d{1,2})?\\s*$", "i"), "");
      changed = s !== before;
    }
    // a bare trailing volume number: "ISCA 12", "NDSS 5", "Nature 521"
    if (/\s+\d{1,3}\s*$/.test(s)) { hasVolume = true; s = s.replace(/\s+\d{1,3}\s*$/, ""); }
    s = s.replace(/\s+(?:19|20)\d{2}\s*$/, "").replace(/[\s,;:.-]+$/, "").trim();   // "ISCA 2014"
    // an unclosed "(OSDI" at the very end still counts as acronym text, but is not name text
    const plain = s.replace(/\([^()]*\)?/g, " ").replace(/\s+/g, " ").trim();
    return { name: s, plain, withParens, truncated, hasVolume };
  }

  // ------------------------------------------------------- type & track signals

  const CONF_SIGNAL = /\b(?:proceedings?|proc|conference|conf|symposium|symposia|symp|workshop|meeting|congress|colloquium|summit|advances in)\b/i;
  const JOURNAL_SIGNAL = /\b(?:journal|transactions?|trans|letters?|reviews?|magazine|bulletin|annals?|archives|news(?:letter)?|quarterly|surveys?|reports?)\b|^communications of\b/i;
  // The journals literally titled "Proceedings of the IEEE" / "…National Academy of Sciences" — but not
  // "Proceedings of the IEEE Conference on …".
  const JOURNAL_PROCEEDINGS = /^proceedings of the (?:ieee|national academy of sciences)$/i;

  // The magazines of the special interest groups carry the group's acronym: "ACM SIGMOD Record", "SIGKDD Explorations",
  // "ACM SIGPLAN Notices", "SIGIR Forum", "SIGecom Exchanges" — periodicals, not the conferences SIGMOD, KDD, PLDI, SIGIR.
  const SIG_MAGAZINE = /\bsig[a-z]{2,10}\b(?:\s+[a-z]+){0,4}?\s+(?:record|explorations?|notices|forum|exchanges?|digest)\b/i;

  // 'C' | 'J' | null (unknown: consult journals first, then conferences).
  // A volume number alone proves nothing ("ISCA 2014 42 (3)" is a conference).
  function typeHint(name) {
    if (JOURNAL_PROCEEDINGS.test(name) || SIG_MAGAZINE.test(fold(name))) return "J";
    const c = CONF_SIGNAL.test(name), j = JOURNAL_SIGNAL.test(name);
    if (c && !j) return "C";
    if (j && !c) return "J";
    if (c && j) return /^(?:proceedings|advances)/i.test(name) ? "C" : "J";
    return null;
  }

  // Secondary tracks of a main conference: not the main proceedings, so no badge —
  // unless the venue's OWN official name contains the word (IWQoS, HotNets, …).
  const SECONDARY = /\b(?:workshops?|companion|demos?|demonstrations?|doctoral|tutorials?|courses?|posters?|adjunct|findings|extended abstracts?|late[- ]breaking|short papers?|industry track|shared task|student (?:abstracts?|research)|work[- ]in[- ]progress|symposium series|(?:spring|summer|fall|autumn|winter) symposi(?:um|a)|tiny papers?|blog ?posts?|competition track|creative ai(?: track)?|sister conferences?|journal[- ](?:track|first))\b/i;
  function secondaryWord(raw) {
    const m = SECONDARY.exec(fold(raw));
    return m ? m[0].toLowerCase().replace(/s$/, "") : null;
  }

  const ratingOf = (e) => (e.src === "ccf" ? e.tier : e.rank);

  // the words of a name that are not connectives ("of", "on", "and" …)
  const contentWords = (text) => fold(text).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));

  // ----------------------------------------------------------------- indexing

  // Build lookup structures from the bundled datasets.
  //   ccf:     [{ kind:'C'|'J', tier:'A'|'B'|'C', abbr, name, area?, dblp? }]
  //   core:    [{ acronym, name, rank }]            (conferences only)
  //   aliases: [{ ccf?: "ABBR", core?: "ACRONYM", kind?: 'C'|'J', names: [..] }]
  function buildIndex({ ccf = [], core = [], aliases = [] } = {}) {
    const sources = { ccf: { C: newSide(), J: newSide() }, core: { C: newSide() } };
    const byRef = { ccf: new Map(), core: new Map() }; // "kind|key" -> entry[]
    const known = new Set();                           // every abbreviation key, for noAcr

    function newSide() {
      // `bare`: the names that are nothing but their own content words ("Pacific Graphics", "NIPS"), not what is left of a longer
      // official name once its boilerplate is dropped ("IEEE International Conference on Data Mining" → "data mining")
      return { names: new Map(), bare: new Map(), abbrs: new Map(), bags: new Map(), all: [], first: { full: new Map(), noOrg: new Map() } };
    }
    const push = (map, key, entry) => {
      if (!key) return;
      const list = map.get(key);
      if (!list) map.set(key, [entry]); else if (!list.includes(entry)) list.push(entry);
    };

    function register(src, kind, entry, names, abbrs) {
      const side = sources[src][kind];
      if (!side) return;
      if (!side.all.includes(entry)) side.all.push(entry);
      for (const n of names) {
        // "(was NIPS)" style parentheticals become acronym aliases, not name text
        const paren = /\(([^()]{2,30})\)/.exec(n);
        if (paren && /\bwas\b|\baka\b|formerly/i.test(paren[1])) {
          const a = squash(paren[1].replace(/\b(?:was|aka|formerly)\b/gi, ""));
          if (a) { push(side.abbrs, a, entry); known.add(a); }
        }
        const plain = n.replace(/\([^()]*\)/g, " ");
        // token forms are computed once here, not on every lookup
        const form = {
          full: canonTokens(plain, "full"), noOrg: canonTokens(plain, "noOrg"),
          kfull: canonTokensKeepStops(plain, "full"), knoOrg: canonTokensKeepStops(plain, "noOrg")
        };
        for (const mode of ["full", "noOrg"]) {
          const t = form[mode];
          if (t.length) { push(side.names, t.join(" "), entry); push(side.first[mode], t[0], { entry, form }); }
        }
        if (form.full.length && form.full.length === contentWords(plain).length) push(side.bare, form.full.join(" "), entry);
        // order-insensitive key for journals ("…, IEEE Transactions on")
        const bag = canonTokens(plain, "noOrg");
        if (kind === "J" && bag.length >= 3) push(side.bags, uniq(bag).sort().join(" "), entry);
      }
      for (const a of abbrs) { const k = squash(a); push(side.abbrs, k, entry); if (k.length >= 2) known.add(k); }
    }

    for (const v of ccf) {
      const former = v.former || {};
      const names = [v.name, ...(former.name ? [former.name] : [])];
      const abbrs = [...(v.abbr ? [v.abbr] : []), ...(former.abbr ? [former.abbr] : [])];
      const entry = { src: "ccf", kind: v.kind, tier: v.tier, abbr: v.abbr || "", name: v.name, area: v.area || "", dblp: v.dblp || "", extra: names.slice() };
      register("ccf", v.kind, entry, names, abbrs);
      push(byRef.ccf, v.kind + "|" + squash(v.abbr || v.name), entry);
    }
    for (const v of core) {
      const entry = { src: "core", kind: "C", rank: v.rank, abbr: v.acronym, name: v.name, extra: [v.name] };
      register("core", "C", entry, [v.name], [v.acronym]);
      push(byRef.core, "C|" + squash(v.acronym), entry);
    }
    for (const a of aliases) {
      for (const src of ["ccf", "core"]) {
        const ref = a[src];
        if (!ref) continue;
        const kind = src === "core" ? "C" : a.kind || "C";
        const want = src === "core" ? a.coreRank : a.ccfTier;
        const entries = (byRef[src].get(kind + "|" + squash(ref)) || []).filter((e) => !want || ratingOf(e) === want);
        for (const entry of entries) {
          entry.extra.push(...a.names);
          register(src, kind, entry, a.names, a.abbrs || []);
        }
      }
    }
    // how many venues use each word anywhere in their names: a lone visible word is only a usable prefix
    // when it is rare ("architectural" → ASPLOS), never when it is common ("computer", "principles")
    const df = new Map();
    for (const side of [sources.ccf.C, sources.ccf.J, sources.core.C]) {
      for (const entry of side.all) {
        const words = new Set();
        for (const n of entry.extra) for (const w of canonTokens(n.replace(/\([^()]*\)/g, " "), "full")) words.add(w);
        for (const w of words) df.set(w, (df.get(w) || 0) + 1);
      }
    }
    return { sources, known, df };
  }

  // ---------------------------------------------------------------- matching

  const hasWord = (e, w) => e.extra.some((n) => new RegExp("\\b" + w + "\\b", "i").test(n));

  // Of entries that share a canonical key, the one whose own name uses the most of the string's
  // boilerplate words (forum, international, symposium …) — or null when none stands out.
  function pickByBoiler(entries, plain) {
    const words = new Set(fold(plain).toLowerCase().split(/[^a-z0-9]+/).filter((w) => BOILER.has(w)));
    const score = (e) => {
      let n = 0;
      for (const name of e.extra) for (const w of new Set(fold(name).toLowerCase().split(/[^a-z0-9]+/))) if (words.has(w)) n++;
      return n;
    };
    const scored = entries.map((e) => ({ e, s: score(e) })).sort((a, b) => b.s - a.s);
    return scored[0].s > scored[1].s ? scored[0].e : null;
  }

  // Pick one entry out of the hits for a key. Hits that all carry the same rating are
  // interchangeable for the badge; otherwise the event-type word in the raw string
  // (symposium vs conference vs workshop) may break the tie. Else: ambiguous.
  function decide(list, rawWords) {
    if (!list || !list.length) return null;
    const u = uniq(list);
    if (u.length === 1) return u[0];
    if (rawWords.length) {
      const f = u.filter((e) => rawWords.every((w) => hasWord(e, w)));
      if (f.length === 1) return f[0];
      if (f.length > 1 && uniq(f.map(ratingOf)).length === 1) return f[0];
    }
    return uniq(u.map(ratingOf)).length === 1 && uniq(u.map((e) => e.kind)).length === 1 ? u[0] : "ambiguous";
  }

  // Strings that are a publisher, not a venue: the ACL Anthology's publisher is printed as the venue of papers from
  // ACL, NAACL, EMNLP, CoNLL and their workshops alike; AAAI Press publishes AAAI, ICWSM, HCOMP, ICAPS, KR …; so the bare
  // string says nothing about which conference it was (the same name with an acronym — "(ACL 2016)" — still does).
  const PUBLISHERS = new Set(["associationforcomputationallinguistics", "aaaipress", "nipsfoundation", "neuralinformationprocessingsystemsfoundation"]);
  const isPublisher = (p) => PUBLISHERS.has(squash(p.name).replace(/^the/, ""));

  // "ACM CCS 2023", "IEEE/ACM ASE 2023": the organisation words in front are not part of the acronym.
  const ORG_LEAD = /^(?:(?:ieee|acm|usenix|ifip|siam|cvf)(?:\s*[\/-]\s*(?:ieee|acm|usenix|ifip|siam|cvf))*\s+)+(?=[A-Za-z0-9])/i;

  // All-caps / camel-case acronym signals present in the string, strongest first.
  function acronymSignals(p) {
    const out = [];
    const keys = (txt) => {
      const k = squash(txt);
      return k.length >= 2 ? uniq([k, stripDigits(k)]).filter((x) => x.length >= 2 && !ORG.has(x)) : [];
    };
    // (ICML), (NSDI 11), (USENIX Security 21), (EMNLP-IJCNLP), (S&P'05), unclosed "(OSDI"
    const reParen = /\(([^()]*)(?:\)|$)/g;
    for (let m; (m = reParen.exec(p.withParens.replace(SIG_CHAIN, " "))); ) {
      const g = m[1];
      for (const part of g.split(/[-–/,;]+/)) for (const k of keys(part.replace(/'?\d{2,4}$/, ""))) out.push({ key: k, kind: "paren" });
      for (const k of keys(g)) out.push({ key: k, kind: "paren" });
    }
    // leading acronym: "ISCA 2014", "MICRO 2017", "ACL 2015 Proceedings of …", "NDSS 5", "HPCA-16 2010 …"
    const head = p.withParens.replace(/^[\s,]+/, "").replace(ORG_LEAD, "");
    const first = head.split(/[\s,]+/)[0] || "";
    const rest = head.slice(first.length).replace(/^[\s,]+/, "");
    const looksAcr = /^[A-Za-z][A-Za-z0-9&'’-]{1,14}$/.test(first) &&
      (/[A-Z].*[A-Z]/.test(first) || first === first.toUpperCase() || /^[A-Z][a-z]+[A-Z]/.test(first));
    const restNoise = canonTokens(rest, "full").length === 0;
    const yearAfter = /^(?:'?\d{2,4}\b|\d+(?:st|nd|rd|th)\b)/.test(rest);
    if (looksAcr && (restNoise || yearAfter)) for (const k of keys(first)) out.push({ key: k, kind: "lead", event: yearAfter });
    // a one-word venue equal to an acronym: "Ndss", "Osdi 8 (4), 7, 2008", "ICLR"
    const words = p.plain.split(/\s+/).filter(Boolean);
    if (words.length === 1 && /^[A-Za-z][A-Za-z0-9&'’-]{3,14}$/.test(words[0])) for (const k of keys(words[0])) out.push({ key: k, kind: "lead", event: false });
    return out;
  }

  // "ACL-08: HLT", "NDSS'05", "SIGCOMM'98": acronym glued to a year, or a long all-caps token.
  // "ACM SIGMOD-SIGACT-SIGART" names a joint symposium (PODS), not SIGMOD, and "ACM SIGGRAPH/Eurographics" one on
  // graphics hardware or animation, not SIGGRAPH itself: a joint-sponsor chain carries no acronym of its own.
  const SIG_CHAIN = /\bSIG[A-Za-z]+(?:\s*[-–/]\s*(?:SIG[A-Za-z]+|Eurographics|EUROGRAPHICS))+/g;

  function embeddedSignals(p) {
    const out = [];
    const text = fold(p.withParens).replace(SIG_CHAIN, " ");
    for (const m of text.matchAll(/\b([A-Z][A-Za-z]{2,10})[-–']\s?(\d{2,4})\b/g)) out.push({ key: m[1].toLowerCase(), kind: "embedded" });
    for (const m of text.matchAll(/\b[A-Z][A-Z0-9]{3,11}\b/g)) out.push({ key: m[0].toLowerCase(), kind: "embedded" });
    for (const m of text.matchAll(/\bSig[a-z]{3,9}\b/g)) out.push({ key: m[0].toLowerCase(), kind: "embedded" });
    // "SC'05: Proceedings of the 2005 …": a short acronym, a two-digit year and a colon
    for (const m of text.matchAll(/\b([A-Z]{2,10})['’]\d{2}\s*:/g)) out.push({ key: m[1].toLowerCase(), kind: "embedded" });
    return out.filter((s) => !ORG.has(s.key));
  }

  // Resolve against one source (ccf | core). Returns { entry, rule } | null.
  function matchSource(idx, src, p, hint, known) {
    if (isPublisher(p)) return null;
    const kinds = hint ? [hint] : ["J", "C"];
    const sides = kinds.map((k) => idx.sources[src][k]).filter(Boolean);
    if (!sides.length) return null;
    const rawWords = TYPE_WORDS.filter((w) => new RegExp("\\b" + w + "s?\\b", "i").test(p.plain));
    const firstHit = (getter) => {
      for (const side of sides) {
        const d = decide(getter(side), rawWords);
        if (d === "ambiguous") return "ambiguous";
        if (d) return d;
      }
      return null;
    };

    // R1/R2: canonical name (curated aliases are indexed as names too). A truncated
    // string only gets the strict variant — weaker variants collide too easily.
    // A volume number with no conference wording ("Information Fusion 50") is a journal:
    // do not name-match it to a conference of the same name.
    const nameSides = !hint && p.hasVolume ? sides.filter((side) => side === idx.sources[src].J) : sides;
    const nameHit = (getter) => {
      const hits = [];
      for (const side of nameSides) {
        const d = decide(getter(side), rawWords);
        if (d === "ambiguous") return "ambiguous";
        if (d) hits.push(d);
      }
      // a journal and a conference can share a canonical key ("Computer Graphics Forum" / "Computer
      // Graphics International"): the boilerplate word the string keeps (forum / international) says which
      if (hits.length > 1) { const pick = pickByBoiler(hits, p.plain); if (pick) return pick; }
      return hits[0] || null;
    };
    // does another venue's name begin with these words, go on ("… Distributed Computing" → "… Distributed Computing Systems")
    // and use the string's own event word ("conference") where the hit does not (the symposium DISC)?
    const continuesBeyond = (sidesNow, mode, tokens, hit) => {
      if (!rawWords.length || rawWords.every((w) => hasWord(hit, w))) return false;
      return sidesNow.some((side) => (side.first[mode].get(tokens[0]) || []).some(({ entry, form }) => {
        const t = form[mode];
        return entry !== hit && t.length > tokens.length && tokens.every((w, i) => t[i] === w) && rawWords.every((w) => hasWord(entry, w));
      }));
    };
    // "… Computer graphics and …": cut after a connective, so the name goes on — what is visible equals no complete
    // name (it is not CGI; it is SIGGRAPH's "… on Computer Graphics and Interactive Techniques"); only the prefix rule may speak
    const danglingStop = p.truncated && (() => { const k = canonTokensKeepStops(p.plain, "full"); return k.length > 0 && STOP.has(k[k.length - 1]); })();
    // a venue that is only a publisher ("ACM, 2011", "IEEE") is a book or report, not "Journal of the ACM"
    const publisherOnly = ORG.has(squash(p.plain));
    const modes = danglingStop || publisherOnly ? [] : p.truncated ? ["full"] : ["full", "noOrg", "noAcr"];
    // One or two plain words, no organisation and no conference wording ("Data mining", "Software engineering"): a field or a
    // book, not the conference whose official name merely boils down to them. Only a name that really is those words counts
    // (a curated alias such as "Pacific Graphics", a journal called "Machine Learning").
    const plainWords = contentWords(p.plain);
    const bareString = !hint && plainWords.length <= 2 && !plainWords.some((w) => ORG.has(w)) && plainWords.length === canonTokens(p.plain, "full").length;
    const seen = new Set();
    for (const mode of modes) {
      const tokens = canonTokens(p.plain, mode, idx.known);
      // organisation words / acronyms carry identity ("Communications of the ACM" is not
      // "Communications"): a weakened variant must still be at least two words long
      if (!tokens.length || (mode !== "full" && tokens.length < 2)) continue;
      const key = tokens.join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      const d = nameHit((side) => (bareString ? side.bare : side.names).get(key));
      if (d === "ambiguous") return null;
      // Scholar cut the name right here ("… Conference on Distributed Computing …") and the string says "conference" while this
      // venue is a symposium: a venue whose longer name goes on the same way and does say "conference" is the better reading —
      // the prefix rule below decides between them
      if (d && p.truncated && continuesBeyond(sides, mode, tokens, d)) continue;
      if (d) return { entry: d, rule: "name" };
    }

    // R2b: same words, different order (journals: "Audio, Speech, and Language Processing, IEEE Transactions on")
    if (!p.truncated) {
      const bag = canonTokens(p.plain, "noOrg");
      if (bag.length >= 3) {
        const bkey = uniq(bag).sort().join(" ");
        const d = nameHit((side) => side.bags && side.bags.get(bkey));
        if (d && d !== "ambiguous") return { entry: d, rule: "name" };
      }
    }

    // R3: acronym signals
    const signals = acronymSignals(p);
    for (const { key } of signals) {
      const d = firstHit((side) => side.abbrs.get(key));
      if (d && d !== "ambiguous") return { entry: d, rule: "acronym" };
    }
    // Acronym buried in a sentence: only when little else is said ("… SIGCOMM 2008 conference on
    // Data communication"), and never for journals — otherwise "NIPS-2010 deep learning and
    // unsupervised feature learning" workshops would inherit NeurIPS.
    if (hint !== "J") {
      const confSide = idx.sources[src].C;
      const content = canonTokens(p.plain, "noOrg", idx.known);
      const room = CONF_SIGNAL.test(p.plain) ? 3 : 1;   // a bare "IEEE INFOCOM" says little else
      for (const { key } of embeddedSignals(p)) {
        const hits = confSide && confSide.abbrs.get(key);
        const left = content.filter((t) => t !== key);
        if (hits && left.length <= room) {
          const d = decide(hits, rawWords);
          if (d && d !== "ambiguous") return { entry: d, rule: "acronym" };
        }
      }
    }

    // R4: Scholar cut the name short with "…": accept a unique entry that begins with what is left.
    const R = canonTokens(p.plain, "full");
    const visibleWords = p.plain.split(/\s+/).filter(Boolean).length;
    if (p.truncated && R.length >= 1 && (R.length >= 3 || visibleWords >= 6)) {
      const rawHasOrg = fold(p.plain).toLowerCase().split(/[^a-z0-9]+/).some((t) => ORG.has(t));
      // if Scholar cut the name right after a connective, that connective must agree
      const rawKeep = canonTokensKeepStops(p.plain, "full");
      const trailingStops = [];
      for (let i = rawKeep.length - 1; i >= 0 && STOP.has(rawKeep[i]); i--) trailingStops.unshift(rawKeep[i]);
      const prefixPass = (mode) => {
        const Rm = canonTokens(p.plain, mode);
        const found = new Set();
        // One content word says too little ("… the IEEE Computer and …" is INFOCOM, not CCS; "Principles of …"
        // is PODC, PODS or POPL) unless the word is rare among venue names ("Architectural …" is ASPLOS).
        if (!Rm.length || (Rm.length < 2 && (idx.df.get(Rm[0]) || 0) > 5)) return [];
        for (const side of sides) {
          for (const { entry, form } of side.first[mode].get(Rm[0]) || []) {
            const t = form[mode];
            // an entry whose whole name is what is visible is a candidate too: "… International Conference on
            // Software Engineering 1 …" is ICSE as much as it begins SEKE ("… and Knowledge Engineering")
            if (!(t.length >= Rm.length && Rm.every((w, i) => t[i] === w))) continue;
            if (trailingStops.length) {
              const ts = form[mode === "full" ? "kfull" : "knoOrg"];
              const at = ts.findIndex((w, i) => !STOP.has(w) && ts.filter((x, j) => j <= i && !STOP.has(x)).length === Rm.length);
              if (at < 0 || trailingStops.some((w, k) => ts[at + 1 + k] !== w)) continue;
            }
            found.add(entry);
          }
        }
        return Array.from(found);
      };
      // strict pass first (organisation words must agree), then a looser one without them
      let d = decide(prefixPass(rawHasOrg ? "full" : "noOrg"), rawWords);
      if (!d && rawHasOrg) d = decide(prefixPass("noOrg"), rawWords);
      if (d && d !== "ambiguous") return { entry: d, rule: "prefix" };
      return null;
    }

    // R5: the string is a known name plus a subtitle ("…: Human Language Technologies")
    if (R.length >= 4) {
      const found = [];
      for (const side of sides) {
        for (const { entry, form } of side.first.full.get(R[0]) || []) {
          const t = form.full;
          if (t.length >= 4 && t.length < R.length && t.every((w, i) => R[i] === w)) found.push({ e: entry, len: t.length });
        }
      }
      if (found.length) {
        const best = Math.max(...found.map((f) => f.len));
        const d = decide(found.filter((f) => f.len === best).map((f) => f.e), rawWords);
        if (d && d !== "ambiguous") return { entry: d, rule: "name" };
      }
    }
    return null;
  }

  // Does the venue's own name (or alias) contain the secondary-track word itself?
  const ownWord = (entry, word) => entry.extra.some((n) => fold(n).toLowerCase().includes(word));

  const NON_VENUE = /^(?:arxiv|biorxiv|medrxiv|ssrn|preprint|technical report|tech\.? rep|url|https?:|see https?:|cited on|unpublished)/i;

  function createResolver(data) {
    const idx = buildIndex(data);
    const cache = new Map();

    function resolve(raw) {
      const key = String(raw == null ? "" : raw);
      if (cache.has(key)) return cache.get(key);
      const res = resolveUncached(key);
      cache.set(key, res);
      return res;
    }

    function resolveUncached(raw) {
      const out = { ccf: null, core: null, secondary: null, truncated: false, name: "", kind: null };
      const p = prepare(raw);
      out.truncated = p.truncated;
      out.name = p.name;
      if (!p.name || NON_VENUE.test(p.name)) return out;
      let hint = typeHint(p.name);
      // "WWW 2018", "ISCA 2014 42 (3)": an acronym followed by a year names an event
      if (!hint) {
        const lead = acronymSignals(p).find((s) => s.kind === "lead" && s.event);
        if (lead) hint = "C";
      }
      out.kind = hint;
      const sec = secondaryWord(raw);
      for (const src of ["ccf", "core"]) {
        // CORE ranks conferences only: a string CCF identified as a journal is not one
        if (src === "core" && out.ccf && out.ccf.kind === "J") continue;
        const r = matchSource(idx, src, p, hint, idx.known);
        if (!r) continue;
        if (sec && !ownWord(r.entry, sec)) { out.secondary = sec; continue; }
        out[src] = src === "ccf"
          ? { tier: r.entry.tier, name: r.entry.name, abbr: r.entry.abbr, area: r.entry.area, kind: r.entry.kind, dblp: r.entry.dblp, rule: r.rule }
          : { rank: r.entry.rank, name: r.entry.name, abbr: r.entry.abbr, rule: r.rule };
      }
      // a workshop / Findings / demo string is unranked on purpose, not "missing"
      if (sec && !out.ccf && !out.core) out.secondary = sec;
      return out;
    }
    return { resolve, index: idx };
  }

  return { createResolver, prepare, canonTokens, typeHint, secondaryWord, squash };
});
