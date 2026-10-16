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
    "volume", "vol", "part", "track", "session", "sessions", "ann", "biennial", "triennial"
  ]);
  // Organisations that co-sponsor many events; never an identity on their own.
  const ORG = new Set(["ieee", "acm", "cvf", "usenix", "ifip", "siam", "ieeeacm", "acmieee", "springer", "elsevier",
    // ACM's special interest groups that sponsor many events and are the name of none ("ACM SIGPLAN International Conference on
    // Functional Programming" is "International Conference on Functional Programming" without them)
    "sigplan", "sigsoft", "sigact", "sigops", "sigarch", "sigsac", "sigda", "sigbed", "sigsim"]);
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
  // ... and "41 st International Conference": the suffix of a numeral that was typed apart
  const ORDINAL_SUFFIX = new Set(["st", "nd", "rd", "th"]);
  const dropOrdinalTypos = (tokens) => tokens.filter((t, i) => !(ORDINAL_TYPOS.has(t) && TENS.has(tokens[i - 1])) && !(ORDINAL_SUFFIX.has(t) && /^\d+$/.test(tokens[i - 1] || "")));

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
    const out = dropOrdinalTypos(r.toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter(Boolean))
      .map((t) => ISO[t] || t)
      .filter((t) => !STOP.has(t) && !BOILER.has(t) && !isNoiseToken(t) && !(mode !== "full" && ORG.has(t)));
    // an organisation named twice is named once ("2015 IEEE/ACM 37th IEEE International Conference on Software Engineering")
    return mode === "full" ? out.filter((t, i) => !ORG.has(t) || out.indexOf(t) === i) : out;
  }

  // Like canonTokens but keeps connectives ("in", "and", "of"): used where the exact
  // connective after a truncated prefix matters ("Information processing in …").
  function canonTokensKeepStops(s, mode) {
    return dropOrdinalTypos(fold(s).replace(/&/g, " and ").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean)).map((t) => ISO[t] || t)
      .filter((t) => !BOILER.has(t) && !isNoiseToken(t) && !(mode !== "full" && ORG.has(t)));
  }

  // The words of a name in their order with everything that varies from edition to edition taken out (proceedings, the,
  // annual, ordinals, years, organisations) but the event words and connectives kept: "annual international symposium on
  // computer" → [international symposium on computer]. Lets a lone common content word ("… symposium on computer …") borrow
  // its meaning from the words in front of it.
  const SEQ_DROP = new Set(["the", "proceedings", "proceeding", "proc", "annual", "ann"]);
  function rawSeq(s) {
    return fold(s).replace(/&/g, " and ").toLowerCase().replace(/\b(?:proceedings?|proc)\b\.?\s*(?:of\b)?/g, " ").split(/[^a-z0-9]+/)
      .filter((w) => w && !SEQ_DROP.has(w) && !isNoiseToken(w) && !ORG.has(w)).map((w) => ISO[w] || w);
  }

  // The key of a curated start (aliases.js `starts`): the event words in order, whether the start says "annual" (rawSeq drops the word;
  // RECOMB's "Annual International Conference on Computational …" is not COLING's "International Conference on Computational …"), and
  // the sponsors it names (the IEEE's "International Conference on Computational …" is not COLING either; rawSeq drops them too).
  const startKey = (text) => rawSeq(text).join(" ") + (/\bannual\b/i.test(text) ? "|annual" : "") +
    fold(text).toLowerCase().split(/[^a-z0-9]+/).filter((t) => ORG.has(t) && t !== "springer" && t !== "elsevier").sort().map((t) => "|" + t).join("");

  // -------------------------------------------------------------- input cleanup

  // (the whole word: "Marketing" and "Decision" are not months — "Journal of Marketing" was read as "Journal of" and then as the Journal of the ACM)
  const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const PAGES = "(?:\\d+\\s*pp\\.?|[A-Za-z]{0,3}\\d+[A-Za-z]{0,3})(?:\\s*[-–−]+\\s*(?:[A-Za-z]{0,3}\\d+[A-Za-z]{0,3}|es))?";          // (also IEEE Xplore's "4 pp.")

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
    // (whitespace is collapsed first: a long run of spaces in front of a pattern would otherwise make the scan quadratic; and a venue is not longer than a thousand characters
    // — a longer text is cut, for the same reason: a run of commas in front of a pattern costs time in proportion to the square of its length)
    let s = fold(String(raw == null ? "" : raw).slice(0, 1000)).replace(/\s+/g, " ").trim().replace(DB_PAREN, " ").replace(DB_TAIL, " ").replace(/[\s,;:–-]*\bgeneral track\b/gi, " ").replace(/\s+/g, " ").trim();
    // "[arXiv preprint arXiv:2305.1]" / "(arXiv:…)" annotations some owners append
    s = s.replace(/\[[^\]]*\]?/g, " ").replace(/\((?:[^()]*arxiv[^()]*)\)?/gi, " ");
    const truncated = /…|\.{3}/.test(s);
    if (truncated) s = s.split(/…|\.{3}/)[0];
    s = s.replace(/\s+/g, " ").trim();
    // The inverted title Scholar prints for many older IEEE and ACM journals: "Computers, IEEE Transactions on 60 (3), 386-399, 2011" is "IEEE Transactions on Computers"
    // ("Selected Areas in Communications, IEEE Journal on": "IEEE Journal on Selected Areas in Communications"). The form is fixed, so it is read back before anything else.
    s = s.replace(/^(.{2,80}?),\s*((?:IEEE|ACM)(?:\/(?:IEEE|ACM))?\s+(?:Transactions|Journal|Letters|Magazine)\s+on)\b(.*)$/i, "$2 $1$3");
    // IEEE Xplore's citation form: "IEEE Visualization, 2002. VIS 2002., 355-362, 2002" — the name, its year, then the event's own
    // acronym and year. Read as "IEEE Visualization (VIS)", the form the rules below know.
    s = s.replace(/^(.{6,}?),\s*(?:19|20)\d{2}\.\s+([A-Z][A-Za-z0-9&]{1,9})\s*['’]?\s*(?:\d{2}|(?:19|20)\d{2})\./, "$1 ($2)");
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
      s = s.replace(new RegExp("\\s*,?\\s*\\b" + MONTH + "\\b\\.?\\s*(?:19|20)\\d{2}\\s*$", "i"), "");   // ", December 2012"
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
  const SECONDARY = /\b(?:workshops?|companion|demos?|demonstrations?|doctoral|tutorials?|courses?|posters?|adjunct|findings|extended abstracts?|conference abstracts|abstracts and applications|talks|sketches|emerging technologies|late[- ]breaking|short papers?|industry track|shared task|student (?:abstracts?|research)|work[- ]in[- ]progress|symposium series|(?:spring|summer|fall|autumn|winter) symposi(?:um|a)|tiny papers?|summits?|blog ?posts?|competition track|creative ai(?: track)?|sister conferences?|journal[- ](?:track|first))\b/i;
  function secondaryWord(raw) {
    const m = SECONDARY.exec(fold(raw));
    if (m) return m[0].toLowerCase().replace(/s$/, "");
    // "OM@ ISWC 2288", "NLP-DBPEDIA@ ISWC": a workshop co-located with the conference named after the @ (CEUR-WS proceedings)
    return /\b[A-Za-z0-9-]+@\s?[A-Z]{3,}\b/.test(fold(raw)) ? "workshop" : null;
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
      return { names: new Map(), bare: new Map(), abbrs: new Map(), weakAbbrs: new Map(), bags: new Map(), starts: new Map(), all: [], first: { full: new Map(), noOrg: new Map() } };
    }
    const push = (map, key, entry) => {
      if (!key) return;
      const list = map.get(key);
      if (!list) map.set(key, [entry]); else if (!list.includes(entry)) list.push(entry);
    };

    function register(src, kind, entry, names, abbrs, curated, noPrefix) {
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
          kfull: canonTokensKeepStops(plain, "full"), knoOrg: canonTokensKeepStops(plain, "noOrg"),
          seq: rawSeq(plain), raw: n,
          // a curated name that says "joint" is what a string that says it too reads as; a string that does not is not it
          // (the official names — AAMAS's "Joint Conference …" is also printed without the word — are not held to this)
          needsJoint: !!curated && /\bjoint\b/i.test(plain),
          noPrefix: !!noPrefix          // a curated name for whole strings only: the start of a cut-off string is never read as it
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
    const shadow = new Map();   // acronym key -> [required word | null, …]
    for (const a of aliases) for (const x of a.shadow || []) { const k = squash(typeof x === "string" ? x : x.acronym); if (!shadow.has(k)) shadow.set(k, []); shadow.get(k).push(typeof x === "string" ? null : String(x.with).toLowerCase()); }
    for (const a of aliases) {
      for (const src of ["ccf", "core"]) {
        const ref = a[src];
        if (!ref) continue;
        const kind = src === "core" ? "C" : a.kind || "C";
        const want = src === "core" ? a.coreRank : a.ccfTier;
        const entries = (byRef[src].get(kind + "|" + squash(ref)) || []).filter((e) => !want || ratingOf(e) === want);
        for (const entry of entries) {
          entry.extra.push(...a.names);
          register(src, kind, entry, a.names, a.abbrs || [], true);
          if (a.exact) { entry.extra.push(...a.exact); register(src, kind, entry, a.exact, [], true, true); }
          if (a.noBareAcronym) {            // the acronym says nothing without the name: ACM's SAC is not Selected Areas in Cryptography
            const side = sources[src][kind], k = squash(entry.abbr), list = side.abbrs.get(k);
            if (list) { const rest = list.filter((e) => e !== entry); if (rest.length) side.abbrs.set(k, rest); else side.abbrs.delete(k); push(side.weakAbbrs, k, entry); }
          }
          for (const st of a.starts || []) push(sources[src][kind].starts, startKey(st), entry);
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
    // CCF and CORE rows that the alias table says are one venue under two acronyms
    const pairs = new Set();
    for (const a of aliases) if (a.ccf && a.core) pairs.add(squash(a.ccf) + "|" + squash(a.core));
    const sameVenue = (ccfAbbr, coreAbbr) => pairs.has(squash(ccfAbbr) + "|" + squash(coreAbbr));
    return { sources, known, df, sameVenue, shadow };
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
  // `strict` (the prefix rule): several different venues that merely share a rating are ambiguous too — the badge would be
  // right, but its tooltip would name a venue that may not be the one. Two rows of the same venue are not different venues.
  const venueKey = (e) => e.src + "|" + e.kind + "|" + squash(e.abbr || e.name);
  function decide(list, rawWords, strict) {
    if (!list || !list.length) return null;
    const u = uniq(list);
    if (u.length === 1) return u[0];
    const tie = (l) => (strict && uniq(l.map(venueKey)).length > 1 ? "ambiguous" : l[0]);
    if (rawWords.length) {
      const f = u.filter((e) => rawWords.every((w) => hasWord(e, w)));
      if (f.length === 1) return f[0];
      if (f.length > 1 && uniq(f.map(ratingOf)).length === 1) return tie(f);
    }
    return uniq(u.map(ratingOf)).length === 1 && uniq(u.map((e) => e.kind)).length === 1 ? tie(u) : "ambiguous";
  }

  // Strings that are a publisher, not a venue: the ACL Anthology's publisher is printed as the venue of papers from
  // ACL, NAACL, EMNLP, CoNLL and their workshops alike; AAAI Press publishes AAAI, ICWSM, HCOMP, ICAPS, KR …; so the bare
  // string says nothing about which conference it was (the same name with an acronym — "(ACL 2016)" — still does).
  const PUBLISHERS = new Set(["associationforcomputationallinguistics", "aaaipress", "nipsfoundation", "neuralinformationprocessingsystemsfoundation"]);
  const isPublisher = (p) => PUBLISHERS.has(squash(p.name).replace(/^the/, ""));

  // "ACM CCS 2023", "IEEE/ACM ASE 2023": the organisation words in front are not part of the acronym.
  const ORG_LEAD = /^(?:(?:ieee|acm|usenix|ifip|siam|cvf)(?:\s*[\/-]\s*(?:ieee|acm|usenix|ifip|siam|cvf))*\s+)+(?=[A-Za-z0-9])/i;

  // A country in parentheses after an acronym says it is another edition or another event ("HPCA (China)" is the Chinese conference on
  // High Performance Computing and Applications, not the architecture symposium)
  const PLACED = /\(\s*(?:China|USA|U\.S\.A?\.?|UK|Japan|Korea|India|Germany|France|Canada|Australia|Singapore|Taiwan|Hong Kong|Europe|Asia)\s*\)/i;

  // Acronyms that are also plain English words (or a journal's whole name): written in capitals they are the venue ("FAST", "DATE"), written as a word they are
  // not — "Crisis" is a psychology journal, "Spin" and "Image" are journals, "Fast" is a word, not the Conference on File and Storage Technologies
  const ENGLISH_ACRONYMS = new Set(["fast", "cluster", "group", "wine", "spin", "paste", "image", "mass", "networking", "middleware", "models", "informs",
    "acta", "wise", "cases", "assets", "forte", "crisis", "compass", "time", "chase", "onward", "raid", "pets", "scam", "ease", "concur", "colt",
    "mabs", "cloud", "ideas", "seams", "forum", "micro", "science", "cognition", "networks", "metrics", "security", "learning", "robotics", "vision", "language"]);

  // All-caps / camel-case acronym signals present in the string, strongest first.
  function acronymSignals(p) {
    const out = [];
    const keys = (txt) => {
      const k = squash(txt);
      // (a number glued to an acronym is an edition or a year — "SIGCOMM98", "KR'96" — but one digit after two letters is not: "WG2" is no WG)
      const s = stripDigits(k);
      const digitsOk = s.length >= 3 || k.length - s.length >= 2;
      return k.length >= 2 ? uniq([k, digitsOk ? s : k]).filter((x) => x.length >= 2 && !ORG.has(x)) : [];
    };
    // (ICML), (NSDI 11), (USENIX Security 21), (EMNLP-IJCNLP), (S&P'05), unclosed "(OSDI"
    const reParen = /\(([^()]*)(?:\)|$)/g;
    // (a part of "(EMNLP-IJCNLP)" is an acronym of a joint event, so it may name a conference — but "(WF-IoT)" is not the
    // journal IoT: parts are looked up among conferences only)
    for (let m; (m = reParen.exec(p.withParens.replace(SIG_CHAIN, " "))); ) {
      const g = m[1], parts = g.split(/[-–/,;]+/);
      // (a place in the parenthesis — "(Cambridge, Mass.)", "(College Park, Md.)" — is no acronym: the abbreviation of a state, written as a word, not in capitals)
      const PLACE_ABBR = /^(?:Mass|Md|Mich|Minn|Miss|Mo|Mont|Penn|Pa|Ill|Ind|Calif|Cal|Conn|Del|Fla|Ga|Ariz|Ark|Colo|Kan|Kans|Ky|La|Me|Neb|Nev|Okla|Ore|Tenn|Tex|Va|Vt|Wash|Wis|Wyo)\.?$/;
      for (const part of parts) if (!(PLACE_ABBR.test(part.trim()) && part.trim() !== part.trim().toUpperCase())) for (const k of keys(part.replace(/'?\d{2,4}$/, ""))) out.push({ key: k, kind: "paren", part: parts.length > 1 });
      for (const k of keys(g)) out.push({ key: k, kind: "paren" });
    }
    const placed = PLACED.test(p.withParens);
    // leading acronym: "ISCA 2014", "MICRO 2017", "ACL 2015 Proceedings of …", "NDSS 5", "HPCA-16 2010 …"
    // ("Proceedings ASE 2000. Fifteenth IEEE International Conference on Automated …": the proceedings' own title word is not the venue)
    const head0 = p.withParens.replace(/^[\s,]+/, "").replace(/^(?:proceedings?|proc\.?)(?:\s+of)?\s+(?:the\s+)?(?=[A-Z][A-Za-z0-9&'’-]{1,14}[\s,]+(?:'?\d{2,4}\b|\d+(?:st|nd|rd|th)\b))/i, "");
    const head = head0.replace(ORG_LEAD, "");
    const first = head.split(/[\s,]+/)[0] || "";
    const rest = head.slice(first.length).replace(/^[\s,]+/, "");
    const looksAcr = /^[A-Za-z][A-Za-z0-9&'’\/-]{1,14}$/.test(first) &&
      (/[A-Z].*[A-Z]/.test(first) || first === first.toUpperCase() || /^[A-Z][a-z]+[A-Z]/.test(first));
    // ("HCI International" is a conference of its own — not the journal HCI — although "international" is a noise word)
    const restNoise = canonTokens(rest, "full").length === 0 && !/^international\b/i.test(rest);
    // (after a two-letter acronym a bare two-digit number is not a year: "DS 75-4" is a Design Society report, not the conference DS)
    // (a page range after a longer acronym is read as the event's too — "AAMAS, 1-10, 2016", "CSCW, 1-25, 2017": a ten-page conference paper starts on page 1 — as "AAMAS, 11-20, 2016" always was;
    // the journals of those names are printed in full)
    const yearAfter = (first.length <= 2 ? /^(?:'\d{2}\b|(?:19|20)\d{2}\b|\d+(?:st|nd|rd|th)\b)/ : /^(?:'?\d{2,4}\b|\d+(?:st|nd|rd|th)\b|\d{1,5}\s*-\s*\d{1,5}\b)/).test(rest);
    if (!placed && looksAcr && (restNoise || yearAfter)) {
      // "USENIX ATC 2007": with its organisation first ("usenixatc" is the venue; "atc" alone is a trusted-computing conference)
      const org = head0.length > head.length ? head0.slice(0, head0.length - head.length).trim().split(/[\s/-]+/).filter(Boolean) : [];
      if (org.length === 1) for (const k of keys(org[0] + first)) out.push({ key: k, kind: "lead", event: yearAfter });
      for (const k of keys(first)) out.push({ key: k, kind: "lead", event: yearAfter });
    }
    // the ACM Digital Library's own citation form: "SC18: International Conference for …", "ICSE '06: Proceedings of …", "CHI'09:" —
    // an acronym, a two-digit year and a colon name the event whatever follows
    const acmDl = /^([A-Za-z][A-Za-z0-9&\/]{1,9})(\s*['’]?\s*)\d{2}\s*:/.exec(head);
    // (a two-letter acronym needs the apostrophe or no space before the number: "CHI '09:", "SC18:" — "DS 30: Proceedings of DESIGN 2002" is the Design Society's report series)
    if (acmDl && /[A-Z]/.test(acmDl[1]) && !(acmDl[1].length <= 2 && /\s/.test(acmDl[2]) && !/['’]/.test(acmDl[2]))) for (const k of keys(acmDl[1])) out.push({ key: k, kind: "lead", event: true });
    // a one-word venue equal to an acronym: "Ndss", "Osdi 8 (4), 7, 2008", "ICLR"
    const words = p.plain.split(/\s+/).filter(Boolean);
    if (!placed && words.length === 1 && /^[A-Za-z][A-Za-z0-9&'’-]{3,14}$/.test(words[0]) && !(ENGLISH_ACRONYMS.has(words[0].toLowerCase()) && words[0] !== words[0].toUpperCase())) for (const k of keys(words[0])) out.push({ key: k, kind: "lead", event: false });
    return out;
  }

  // "ACL-08: HLT", "NDSS'05", "SIGCOMM'98": acronym glued to a year, or a long all-caps token.
  // "ACM SIGMOD-SIGACT-SIGART" names a joint symposium (PODS), not SIGMOD, and "ACM SIGGRAPH/Eurographics" one on
  // graphics hardware or animation, not SIGGRAPH itself: a joint-sponsor chain carries no acronym of its own.
  // (and so does "Eurographics/ACM SIGGRAPH Symposium on Geometry Processing": the sponsors in front of the event, not the event).
  const SIG_CHAIN = /\bSIG[A-Za-z]+(?:\s*[-–/]\s*(?:SIG[A-Za-z]+|Eurographics|EUROGRAPHICS))+|\b(?:Eurographics|EUROGRAPHICS)\s*[-–/]\s*(?:(?:ACM|IEEE)\s+)?SIG[A-Za-z]+/g;

  function embeddedSignals(p) {
    const out = [];
    if (PLACED.test(p.withParens)) return out;
    const text = fold(p.withParens).replace(SIG_CHAIN, " ");
    for (const m of text.matchAll(/\b([A-Z][A-Za-z]{2,10})[-–']\s?(\d{2,4})\b/g)) out.push({ key: m[1].toLowerCase(), kind: "embedded" });
    for (const m of text.matchAll(/\b[A-Z][A-Z0-9]{3,11}\b/g)) out.push({ key: m[0].toLowerCase(), kind: "embedded" });
    for (const m of text.matchAll(/\b[Ss]ig[a-z]{3,9}\b/g)) out.push({ key: m[0].toLowerCase(), kind: "embedded" });     // "SIGgraph", "siggraph": Scholar re-cases some strings
    // "SC'05: Proceedings of the 2005 …": a short acronym, a two-digit year and a colon
    for (const m of text.matchAll(/\b([A-Z]{2,10})['’]\d{2}\s*:/g)) out.push({ key: m[1].toLowerCase(), kind: "embedded" });
    return out.filter((s) => !ORG.has(s.key));
  }

  // Resolve against one source (ccf | core). Returns { entry, rule } | null.
  function matchSource(idx, src, p, hint, known) {
    if (isPublisher(p)) return null;
    // an unranked event named by its own acronym (aliases.js `shadow`)
    if (idx.shadow.size && [...acronymSignals(p), ...embeddedSignals(p)].some((x) => (idx.shadow.get(x.key) || []).some((w) => !w || fold(p.withParens).toLowerCase().includes(w)))) return null;
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

    // the words of a venue's names (and aliases), organisations and event words left out
    const vocabOf = (entry) => entry.vocab || (entry.vocab = new Set(entry.extra.flatMap((n) => canonTokens(n.replace(/\([^()]*\)/g, " "), "noOrg"))));

    // Springer's series form: "Advances in Cryptology–ASIACRYPT 2009", "Algorithms–ESA 2012: 19th Annual European Symposium, …".
    // The acronym after the dash names the event, whatever series name goes before it ("Advances in Cryptology" is CRYPTO's series
    // title too, but this is not CRYPTO).
    // (the same series, as Springer's colon form prints it: "Theory of Cryptography: 18th International Conference, TCC 2020, Durham, NC …" — the acronym
    // comes after the ordinal and the event word, and may be three letters; the series title shares a word with the venue's name or it proves nothing)
    const colonForm = /^([^:]{4,80}):\s*(?:\d+(?:st|nd|rd|th)|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth))\s+(?:(?:International|European|Annual|IEEE|ACM)\s+)*(?:Conference|Symposium|Workshop|Colloquium)\b[^,:]*,\s*([A-Z][A-Z0-9]{2,9})\s+(?:19|20)\d{2}\b/.exec(fold(p.withParens));
    const dashForm = /[a-z0-9)] ?[–—−-]{1,2} ?([A-Z][A-Z0-9]{1,9}(?:-[A-Z0-9]{1,6})?)(?:\s+(?:19|20)\d{2}\b|['’]\d{2}\b)/.exec(fold(p.withParens));
    const series = dashForm || (colonForm && { 1: colonForm[2], index: colonForm[1].length - 1 });
    if (series) {
      const k = squash(series[1]);
      const title = canonTokens(fold(p.withParens).slice(0, series.index + 1), "noOrg");
      // A book series of conferences, so only the conference list answers (a journal that happens to share the acronym — "Security and
      // Communication Networks" for SCN, "World Wide Web" for WWW — is not what a series title announces), and only one venue: two that
      // share the acronym are no answer. An acronym that proves nothing on its own is evidence after a dash and in front of a year only
      // when the series title shares a word with the venue's name ("Selected Areas in Cryptography–SAC 2013", not "Applied Computing–SAC").
      for (const side of hint === "J" ? sides : sides.filter((s) => s === idx.sources[src].C)) {
        const strong = side.abbrs.get(k) || null;
        const list = strong || (side.weakAbbrs.get(k) || []).filter((e) => title.some((w) => vocabOf(e).has(w))) || side.abbrs.get(stripDigits(k));
        const d = decide(list && list.length ? list : side.abbrs.get(stripDigits(k)), rawWords, true);
        if (d === "ambiguous") break;
        if (d) return { entry: d, rule: "acronym" };
      }
    }

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
    // is the string's whole name (organisations included) one of the forms of this venue's names?
    const exactForm = (hit, tokens, key) => sides.some((side) => (side.first.full.get(tokens[0]) || []).some(({ entry, form }) => entry === hit && form.full.join(" ") === key));
    // the string says "symposium" and this venue's names say "conference" (and never "symposium"), or the like
    const typeClash = (entry) => rawWords.some((w) => !hasWord(entry, w)) && TYPE_WORDS.some((w) => !rawWords.includes(w) && hasWord(entry, w));
    // does another venue's name begin with these words, go on ("… Distributed Computing" → "… Distributed Computing Systems")
    // and use the string's own event word ("conference") where the hit does not (the symposium DISC)?
    const continuesBeyond = (sidesNow, mode, tokens, hit) => {
      if (!rawWords.length || rawWords.every((w) => hasWord(hit, w))) return false;
      // (the forms are indexed with and without organisation words; "noAcr" tokens are compared with the latter)
      const m = mode === "noAcr" ? "noOrg" : mode;
      return sidesNow.some((side) => (side.first[m].get(tokens[0]) || []).some(({ entry, form }) => {
        const t = form[m];
        return entry !== hit && t.length > tokens.length && tokens.every((w, i) => t[i] === w) && rawWords.every((w) => hasWord(entry, w));
      }));
    };
    // "… Computer graphics and …": cut after a connective, so the name goes on — what is visible equals no complete
    // name (it is not CGI; it is SIGGRAPH's "… on Computer Graphics and Interactive Techniques"); only the prefix rule may speak
    const danglingStop = p.truncated && (() => { const k = canonTokensKeepStops(p.plain, "full"); return k.length > 0 && STOP.has(k[k.length - 1]); })();
    // a venue that is only a publisher ("ACM, 2011", "IEEE") is a book or report, not "Journal of the ACM"; with the years, ordinals and the cut taken out too
    // ("2019 IEEE", "2023 IEEE 39th …": Scholar's cut-off form of a conference of the IEEE) it still says no more than the publisher —
    // only the two journals titled "Proceedings of the IEEE" / "…National Academy of Sciences" name themselves by it
    // (the journal's own line is short, with a volume: a cut "Proceedings of the IEEE …" is the start of a conference's — CVPR, ICCV …)
    const publisherOnly = ORG.has(squash(p.plain)) || (!(JOURNAL_PROCEEDINGS.test(p.plain.trim()) && (!p.truncated || p.hasVolume)) && (() => { const k = canonTokens(p.plain, "full"); return k.length > 0 && k.every((t) => ORG.has(t)); })());
    // a cut-off string that ends in the acronym of a real venue ("Medical Image Computing and Computer Assisted Intervention− MICCAI
    // 2017 …", Springer's series form) has said its whole name before the acronym: the variant without acronyms may speak too
    const endsInAcronym = p.truncated && (() => {
      const w = fold(p.plain).split(/[^A-Za-z0-9&]+/).filter(Boolean).pop() || "";
      return /^[A-Z][A-Z0-9&]{1,9}$/.test(w) && idx.known.has(w.toLowerCase());
    })();
    const modes = danglingStop || publisherOnly ? [] : p.truncated ? (endsInAcronym ? ["full", "noAcr"] : ["full"]) : ["full", "noOrg", "noAcr"];
    // One or two plain words, no organisation and no conference wording ("Data mining", "Software engineering"): a field or a
    // book, not the conference whose official name merely boils down to them. Only a name that really is those words counts
    // (a curated alias such as "Pacific Graphics", a journal called "Machine Learning").
    const plainWords = contentWords(p.plain);
    const bareString = !hint && plainWords.length <= 2 && !plainWords.some((w) => ORG.has(w)) && plainWords.length === canonTokens(p.plain, "full").length;
    const intlJournalWithoutIntl = (e) => e.kind === "J" && /^(?:the\s+)?international\s+journal\b/i.test(e.name) && !/\b(?:international|intl|int)\b/i.test(p.plain);
    const seen = new Set();
    let clashing = null;           // the string's whole name is a venue's, with another event word ("Symposium" for a Conference): only if nothing better turns up
    // the series form names its event by the acronym after the dash: when that acronym is a known one and the rule above did not take it
    // (a journal's, or two venues', or a weak one), the name read without it is a guess
    const seriesAcronymKnown = !!series && idx.known.has(squash(series[1]));
    for (const mode of modes) {
      if (mode === "noAcr" && seriesAcronymKnown) continue;
      const tokens = canonTokens(p.plain, mode, idx.known);
      // organisation words / acronyms carry identity ("Communications of the ACM" is not
      // "Communications"): a weakened variant must still be at least two words long
      if (!tokens.length || (mode !== "full" && tokens.length < 2)) continue;
      const key = tokens.join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      const d = nameHit((side) => (bareString ? side.bare : side.names).get(key));
      if (d === "ambiguous") return null;
      // ("Journal of Knowledge Management" is Emerald's, not IGI's International Journal of Knowledge Management; Scholar prints a journal's whole title, so a
      // journal whose name begins "International Journal" is not met without the word — "Int." and "Intl" count as the word)
      if (d && d !== "ambiguous" && intlJournalWithoutIntl(d)) continue;
      // ("Journal" alone is not "Journal of the ACM": a one-word string only meets a journal's name that is that one word whole, not the rest of a name that lost its organisation)
      if (d && d !== "ambiguous" && d.kind === "J" && tokens.length < 2 && !d.extra.some((n) => canonTokens(n.replace(/\([^()]*\)/g, " "), "full").join(" ") === key)) continue;
      // ("International Security" is a political-science journal, not the USENIX Security Symposium: one content word with "international" or "annual"
      // in front and no event word at all names a field, whatever one-word form a venue's name boils down to)
      if (d && mode === "full" && tokens.length === 1 && !rawWords.length && /\b(?:international|intl|annual)\b/i.test(p.plain) && !hasWord(d, "international") && !hasWord(d, "annual")) continue;
      // A name read without its organisation or acronym (the venue's own forms are indexed that way too) is weaker evidence: "ACM
      // symposium on Cloud computing" is not the IEEE conference on Cloud Computing (CORE lists only that one) — the string's event
      // word must not contradict the venue's own
      if (d && typeClash(d)) {
        // ("IEEE International Symposium on Neural Networks" boils down to the words of the IEEE Joint Conference on them, but the
        // symposium ISNN says "symposium" itself — which the looser variants find)
        if (mode === "full" && exactForm(d, tokens, key) && !clashing) clashing = { d, mode, tokens };
        continue;
      }
      // Scholar cut the name right here ("… Conference on Distributed Computing …") and the string says "conference" while this
      // venue is a symposium: a venue whose longer name goes on the same way and does say "conference" is the better reading —
      // the prefix rule below decides between them
      if (d && p.truncated && continuesBeyond(sides, mode, tokens, d)) continue;
      if (d) return { entry: d, rule: "name" };
    }

    if (clashing && !(p.truncated && continuesBeyond(sides, clashing.mode, clashing.tokens, clashing.d))) return { entry: clashing.d, rule: "name" };

    // R2b: same words, different order (journals: "Audio, Speech, and Language Processing, IEEE Transactions on")
    if (!p.truncated) {
      const bag = canonTokens(p.plain, "noOrg");
      if (bag.length >= 3) {
        const bkey = uniq(bag).sort().join(" ");
        const d = nameHit((side) => side.bags && side.bags.get(bkey));
        if (d && d !== "ambiguous" && !intlJournalWithoutIntl(d)) return { entry: d, rule: "name" };
      }
    }

    // R3: acronym signals
    const signals = acronymSignals(p);
    const confSide = idx.sources[src].C;
    const spelledEvent = /\b(?:symposium|symposia|conference|workshop|congress|colloquium|meeting)\b/i.test(p.plain);
    // "Conference on Supercomputing (SC)" is SC; "USDOE Office of Science (SC)" is not: a one- to three-letter acronym in a parenthesis
    // only counts when at least half of what else the string says is among the venue's own words (a "Working Conference …" or a
    // stray "15 pp." may add a few of its own)
    const ownWordShare = (entry, words) => words.filter((w) => vocabOf(entry).has(w)).length * 2 >= words.length;
    const ownWordsOnly = (entry) => ownWordShare(entry, canonTokens(p.plain, "noOrg"));
    // A string whose parenthesis names another event by an acronym of its own — "ACM SIGIR International Conference on Theory of Information Retrieval (ICTIR)" — is not
    // the venue whose sponsor's name or acronym stands in front ("SIGIR"): unless the parenthesis holds an acronym of the venue itself
    const parenContradicts = (entry) => {
      if (!spelledEvent) return false;
      for (const m of p.withParens.matchAll(/\(([A-Z][A-Za-z0-9&/-]{2,14})(?:\s*['’]?\d{2,4})?\)/g)) {
        const P = m[1];
        if ((P.match(/[A-Z]/g) || []).length < 2) continue;
        const parts = P.split(/[-/]/).filter(Boolean).concat([P]);
        if (!parts.some((x) => sides.some((side) => (side.abbrs.get(squash(x)) || []).includes(entry) || (side.weakAbbrs.get(squash(x)) || []).includes(entry)))) return true;
      }
      return false;
    };
    for (const { key, part, kind } of signals) {
      const d = part ? (confSide && sides.includes(confSide) ? decide(confSide.abbrs.get(key), rawWords) : null) : firstHit((side) => side.abbrs.get(key));
      // (a parenthesised acronym after a name that is another venue's: two or more other words, none of them this venue's own — see the
      // buried acronyms below — in a string that spells out an event; a journal's abbreviated name before its track, "Proc. ACM Program. Lang. 6 (POPL)", does not)
      const nameIsAnotherVenues = kind === "paren" && spelledEvent && d && d !== "ambiguous" && (() => {
        const others = canonTokens(p.plain, "noOrg", idx.known).filter((w) => w !== key && w !== stripDigits(key));
        return others.length >= 2 && !others.some((w) => vocabOf(d).has(w));
      })();
      if (d && d !== "ambiguous" && !nameIsAnotherVenues && !(kind === "paren" && key.length <= 3 && !ownWordsOnly(d)) && !(kind !== "paren" && parenContradicts(d))) return { entry: d, rule: "acronym" };
    }
    // Acronym buried in a sentence: only when little else is said ("… SIGCOMM 2008 conference on
    // Data communication"), and never for journals — otherwise "NIPS-2010 deep learning and
    // unsupervised feature learning" workshops would inherit NeurIPS.
    // ("Nijmegen: ICIS" is a place and a publisher — an institute's report series — not the conference called ICIS)
    const placeAndPublisher = /^[A-Z][A-Za-z.'’-]+(?: [A-Z][A-Za-z.'’-]+){0,2}:\s/.test(p.plain) && !CONF_SIGNAL.test(p.plain);
    if (hint !== "J" && !placeAndPublisher) {
      const content = canonTokens(p.plain, "noOrg", idx.known);
      const room = CONF_SIGNAL.test(p.plain) ? 3 : 1;   // a bare "IEEE INFOCOM" says little else
      for (const { key } of embeddedSignals(p)) {
        const hits = confSide && confSide.abbrs.get(key);
        const left = content.filter((t) => t !== key);
        if (hits && left.length <= room) {
          const d = decide(hits, rawWords);
          // Scholar cut the name after the acronym and the words that did get through are not the venue's own ("ACM SIGCSE conference on
          // Innovation and …" is ITiCSE, not the SIGCSE symposium): the name goes on, so the prefix rule below may read it
          // Two or more other words, none of them the venue's own, are the name of something else: "International Symposium on Wearable Computers
          // (ISWC)" is not the Semantic Web conference of that acronym (a single stray word — "ACL-08: HLT", "VLDB Endowment" — proves nothing)
          const foreign = spelledEvent && left.length >= 2 && !left.some((w) => vocabOf(d).has(w));
          if (d && d !== "ambiguous" && !foreign && !parenContradicts(d) && !(p.truncated && !left.every((w) => vocabOf(d).has(w)))) return { entry: d, rule: "acronym" };
        }
      }
    }

    // R4: Scholar cut the name short with "…": accept a unique entry that begins with what is left.
    const R = canonTokens(p.plain, "full");
    const visibleWords = p.plain.split(/\s+/).filter(Boolean).length;
    if (p.truncated && R.length >= 1 && (R.length >= 3 || visibleWords >= 6)) {
      // a start the curators read as one venue although others begin the same way (aliases.js `starts`)
      const named = firstHit((side) => side.starts.get(startKey(p.plain)));
      if (named && named !== "ambiguous") return { entry: named, rule: "prefix" };
      const rawOrgWords = fold(p.plain).toLowerCase().split(/[^a-z0-9]+/).filter((t) => ORG.has(t));
      const rawHasOrg = rawOrgWords.length > 0;
      // The loose pass leaves the organisations out on both sides, so "ACM SIGSAC Workshop on Programming Languages and …" reads like
      // the SIGOPS workshop (PLOS). A special interest group that the venue's names never mention is the string's own, and the two
      // common words left are not enough: a rare one (the way "Architectural …" is ASPLOS) must carry the claim.
      const sigWords = rawOrgWords.filter((t) => /^sig/.test(t));
      // a colloquium, a congress or a forum is not a "Conference on …" that merely begins with the same words (CISSE is not ICISSP); the
      // ordinary event words are left out here — Scholar swaps conference, symposium and workshop for one another more than it should
      const rareEvent = ((/\b(colloquium|congress|forum|summit)\b/i.exec(p.plain) || [])[1] || "").toLowerCase();
      const sigContradicts = (entry) => sigWords.some((s) => !entry.extra.some((n) => fold(n).toLowerCase().includes(s)));
      // if Scholar cut the name right after a connective, that connective must agree
      const rawKeep = canonTokensKeepStops(p.plain, "full");
      const trailingStops = [];
      for (let i = rawKeep.length - 1; i >= 0 && STOP.has(rawKeep[i]); i--) trailingStops.unshift(rawKeep[i]);
      // The candidates are the venues, seen through the names that begin with what is visible: the event words and "annual" of a name
      // that did not match (a historical alias, the other list's wording) say nothing about this string.
      const through = (found) => Array.from(found, ([entry, names]) => Object.create(entry, { extra: { value: names } }));
      const prefixPass = (mode, listSides = sides) => {
        const Rm = canonTokens(p.plain, mode);
        const found = new Map();
        // One content word says too little ("… the IEEE Computer and …" is INFOCOM, not CCS; "Principles of …"
        // is PODC, PODS or POPL) unless the word is rare among venue names ("Architectural …" is ASPLOS).
        if (!Rm.length || (Rm.length < 2 && (idx.df.get(Rm[0]) || 0) > 5)) return [];
        for (const side of listSides) {
          for (const { entry, form } of side.first[mode].get(Rm[0]) || []) {
            const t = form[mode];
            // an entry whose whole name is what is visible is a candidate too: "… International Conference on
            // Software Engineering 1 …" is ICSE as much as it begins SEKE ("… and Knowledge Engineering")
            if (form.noPrefix || !(t.length >= Rm.length && Rm.every((w, i) => t[i] === w))) continue;
            if (joint ? !hasWord(entry, "joint") : form.needsJoint) continue;
            if (rareEvent && !hasWord(entry, rareEvent)) continue;
            if (mode === "noOrg" && sigWords.length && sigContradicts(entry) && !Rm.some((w) => (idx.df.get(w) || 0) <= 5)) continue;
            if (trailingStops.length) {
              const ts = form[mode === "full" ? "kfull" : "knoOrg"];
              const at = ts.findIndex((w, i) => !STOP.has(w) && ts.filter((x, j) => j <= i && !STOP.has(x)).length === Rm.length);
              if (at < 0 || trailingStops.some((w, k) => ts[at + 1 + k] !== w)) continue;
            }
            found.set(entry, [...(found.get(entry) || []), form.raw]);
          }
        }
        return through(found);
      };
      // strict pass first (organisation words must agree), then a looser one without them
      // "annual" in the string is an event word too: when several venues begin with what is left, only those that call
      // themselves annual stay ("Annual International Conference on the Theory and Applications of …" is EUROCRYPT, not SAT)
      const annual = /\bannual\b/i.test(p.plain);
      // "Annual Joint Conference of the IEEE Computer and …" is INFOCOM, not the IEEE Computer and Information Technology
      // conference: "joint" says what kind of event it is, so a venue that never calls itself joint is not a candidate for it
      // (and INFOCOM's curated "Annual Joint Conference of the IEEE Computer and Communications Societies" is not one for
      // "IEEE … Conference on Computer and …")
      const joint = /\bjoint\b/i.test(p.plain);
      const decideHere = (list) => {
        let x = decide(list, rawWords, true);
        if (x === "ambiguous" && annual) { const only = list.filter((e) => hasWord(e, "annual")); if (only.length) x = decide(only, rawWords, true); }
        return x;
      };
      const readBy = (listSides) => {
        let x = decideHere(prefixPass(rawHasOrg ? "full" : "noOrg", listSides));
        if (!x && rawHasOrg) x = decideHere(prefixPass("noOrg", listSides));
        return x;
      };
      let d = readBy(sides);
      // The other list reads the same visible words too: a venue that only this list has is not "the only one" they fit.
      // Another venue there, or several, and nothing is claimed (an agreeing reading, or none at all, leaves the claim alone).
      const otherSides = kinds.map((k) => idx.sources[src === "ccf" ? "core" : "ccf"][k]).filter(Boolean);
      const sameAs = (a, b) => squash(a.abbr || a.name) === squash(b.abbr || b.name) || (a.src === "ccf" ? idx.sameVenue(a.abbr, b.abbr) : idx.sameVenue(b.abbr, a.abbr));
      if (d && d !== "ambiguous") {
        const rival = readBy(otherSides);
        if (rival === "ambiguous" || (rival && !sameAs(d, rival))) d = null;
      }
      // nothing usable because one common word is all that is left ("… annual international symposium on computer …" is ISCA, not
      // the IEEE Computer Security Foundations Symposium): the event words before it must begin one venue's name, in that order
      if (!d) {
        const seq = rawSeq(p.plain);
        if (seq.length >= 4) {
          // `wide`: the other list's reading also sees the names that do not begin with an organisation where the string's first word is one
          // ("ACM … Distributed Computing …" has the IEEE's DCOSS as a rival too); the claim itself is only ever made from the first-word bucket
          const seqCandidates = (listSides, wide) => {
            const found = new Map();
            const Rno = canonTokens(p.plain, "noOrg");
            for (const side of listSides) {
              for (const { entry, form } of [...(side.first.full.get(R[0]) || []), ...(wide && Rno.length ? side.first.noOrg.get(Rno[0]) || [] : [])]) {
                // (the bucket is the string's first word, an organisation when it begins with one: "ACM/IEEE …" is not the ACM's CIKM, and
                // "ACM SIGPLAN …" is not the ACM/IEEE ICSE — every organisation the string names must be among the form's own)
                if (!form.noPrefix && form.seq.length >= seq.length && seq.every((w, i) => form.seq[i] === w) && !(joint ? !hasWord(entry, "joint") : form.needsJoint) &&
                  R.every((w) => !ORG.has(w) || form.full.includes(w))) found.set(entry, [...(found.get(entry) || []), form.raw]);
              }
            }
            let list = through(found);
            // ISCA calls itself the annual symposium, IFIP Performance does not
            if (list.length > 1 && annual) list = list.filter((e) => hasWord(e, "annual"));
            return list;
          };
          const cands = seqCandidates(sides);
          d = cands.length === 1 ? cands[0] : null;      // one venue, not "same rating, pick any": the tooltip names it
          // The other list reads the same words too: a venue that only one list has is not "the only one" it fits ("… Conference on
          // Computational …" is COLING to CCF, but CORE also has ICCSA, ICCCI …). Unless it is the same venue, nothing is claimed.
          if (d) {
            const other = src === "ccf" ? "core" : "ccf";
            const rivals = seqCandidates(kinds.map((k) => idx.sources[other][k]).filter(Boolean), true);
            const same = (a, b) => squash(a.abbr || a.name) === squash(b.abbr || b.name) || (a.src === "ccf" ? idx.sameVenue(a.abbr, b.abbr) : idx.sameVenue(b.abbr, a.abbr));
            if (rivals.some((r) => !same(d, r))) d = null;
          }
        }
      }
      // The cut came inside a parenthesis that names the event ("IEEE Symposium on Information Visualization (InfoVis' 99 …"): a venue that is
      // not called that is not it, however well its name begins the same way
      if (d && d !== "ambiguous") {
        const open = /\(\s*([A-Za-z][A-Za-z0-9&-]{2,11})\b[^)]*$/.exec(p.withParens);
        const named = open && squash(open[1]);
        if (named && named !== squash(d.abbr) && stripDigits(named) !== squash(d.abbr) && !idx.sameVenue(named, squash(d.abbr))) return null;
        return { entry: d, rule: "prefix" };
      }
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

  // Is the secondary-track word part of the venue, not a sign of a track at it? Two cases. The venue's official name holds it (HotOS, ASRU, IWQoS: "Workshop" is what the venue
  // is, whichever way the string words it). Or a name it had, or is printed under, holds it ("International Workshop on Artificial Intelligence and Statistics" is AISTATS under
  // its first name) — then the words beside it in that name must stand in the string as well (the two after it, or at the end of a name the two before it, in that order):
  // "AISTATS Workshop on Causality" is a workshop at the conference, and "…Statistics Workshops, 2019" its workshops.
  const wordsOf = (text) => fold(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((w) => w.replace(/s$/, ""));
  const wordAt = (t, target, i) => i + target.length <= t.length && target.every((w, j) => t[i + j] === w);
  function ownWord(entry, word, raw) {
    const target = wordsOf(word);
    const official = wordsOf(String(entry.name).replace(/\([^()]*\)/g, " "));
    for (let i = 0; i < official.length; i++) if (wordAt(official, target, i)) return true;
    const have = " " + wordsOf(raw).join(" ") + " ";
    return entry.extra.some((n) => {
      const t = wordsOf(n);
      for (let i = 0; i < t.length; i++) {
        if (!wordAt(t, target, i)) continue;
        const end = i + target.length, after = t.length - end;
        const phrase = after >= 2 ? t.slice(i, end + 2) : t.slice(Math.max(0, i - 2), end + after);
        if (have.includes(" " + phrase.join(" ") + " ")) return true;
      }
      return false;
    });
  }

  const NON_VENUE = /^(?:arxiv|biorxiv|medrxiv|ssrn|preprint|technical report|tech\.? rep|url|https?:|see https?:|cited on|unpublished)/i;
  // Periodicals that are on neither list and whose title, without the words a conference name drops ("International Symposium on"), is the title of a conference that is on one:
  // "IEEE MultiMedia" is a magazine, "IEEE International Symposium on Multimedia" is ISM. Read as what they are, they are not taken for the conference.
  const PERIODICALS = new Set(["ieee multimedia"]);

  function createResolver(data) {
    const idx = buildIndex(data);
    const cache = new Map();

    function resolve(raw) {
      // The same venue printed another way is the same venue. Before any rule looks at the text: the invisible characters a copy from a PDF or a page leaves (soft hyphen, zero-width
      // spaces, the byte-order mark) are gone, every dash is a hyphen, every apostrophe and quotation mark is a straight one, white space is one space and nothing at the ends, and a
      // string does not end in punctuation. ("AAAI  Fall Symposium", "AAAI Fall​ Symposium" and "Late–Breaking" must be read as the symposium and the late-breaking track they are,
      // not as the conference they would be taken for if the rule that spots them did not see them.)
      const key = String(raw == null ? "" : raw).replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, "").replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, "-")
        .replace(/[\u2018\u2019\u201b\u02bc]/g, "'").replace(/[\u201c\u201d\u201f]/g, '"').replace(/\s+/g, " ").replace(/[\s,;:.]+$/, "").trim();
      if (cache.has(key)) return cache.get(key);
      let res;
      try { res = resolveUncached(key); }
      catch (e) {
        // a string the rules cannot cope with is an unranked venue, never a broken page (the tests pass `strict` to see the error)
        if (data && data.strict) throw e;
        res = { ccf: null, core: null, secondary: null, truncated: false, name: "", kind: null };
      }
      cache.set(key, res);
      return res;
    }

    function resolveUncached(raw) {
      const out = { ccf: null, core: null, secondary: null, truncated: false, name: "", kind: null };
      const p = prepare(raw);
      out.truncated = p.truncated;
      out.name = p.name;
      if (!p.name || NON_VENUE.test(p.name)) return out;
      let hint = PERIODICALS.has(fold(p.name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()) ? "J" : typeHint(p.name);
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
        if (sec && !ownWord(r.entry, sec, raw)) { out.secondary = sec; continue; }
        out[src] = src === "ccf"
          ? { tier: r.entry.tier, name: r.entry.name, abbr: r.entry.abbr, area: r.entry.area, kind: r.entry.kind, dblp: r.entry.dblp, rule: r.rule }
          : { rank: r.entry.rank, name: r.entry.name, abbr: r.entry.abbr, kind: r.entry.kind, rule: r.rule };          // (CORE ranks conferences: its kind is "C")
      }
      // The lists disagree about which venue it is: one found the whole name, the other only an acronym lying in the string
      // ("Proceedings of the AAAI Conference on Human Computation and Crowdsourcing" is HCOMP to CORE; CCF, which does not list
      // HCOMP, saw "AAAI"). The name wins — unless the two rows are known to be one venue under two acronyms (SIGKDD / KDD).
      if (out.ccf && out.core && out.ccf.kind !== "J" && squash(out.ccf.abbr) !== squash(out.core.abbr) && !idx.sameVenue(out.ccf.abbr, out.core.abbr)) {
        if (out.ccf.rule === "acronym" && out.core.rule === "name") out.ccf = null;
        else if (out.core.rule === "acronym" && out.ccf.rule === "name") out.core = null;
        // both lists read the same words as different venues (by their start, or as a name that two venues share once their
        // organisation is dropped: IFIP's SEC and Springer's ISC "Information Security"): at least one is wrong, nothing says which
        else if (out.ccf.rule === out.core.rule && (out.ccf.rule === "prefix" || out.ccf.rule === "name")) { out.ccf = null; out.core = null; }
      }
      // a workshop / Findings / demo string is unranked on purpose, not "missing"
      if (sec && !out.ccf && !out.core) out.secondary = sec;
      return out;
    }
    return { resolve, index: idx };
  }

  return { createResolver, prepare, canonTokens, typeHint, secondaryWord, squash };
});
