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
    "volume", "vol", "part", "track", "session", "sessions", "ann", "annu", "biennial", "triennial",
    // (typos of "proceedings" that Scholar prints: "Procedings of the British Machine Vision Conference 2015", "Proceesings of the 9th Biennial Conference …")
    "procedings", "proceesings", "proceeedings", "proccedings", "proceedigs"
  ]);
  // Organisations that co-sponsor many events; never an identity on their own.
  const ORG = new Set(["ieee", "acm", "cvf", "cfv", "usenix", "ifip", "siam", "ieeeacm", "acmieee", "springer", "elsevier", "iapr", "wic", "edac", "esda", "eai", "sigchi",
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
  const ISO = { trans: "transactions", transaction: "transactions", commun: "communications", lett: "letters", jour: "journal", j: "journal" };
  // British and American spellings are one word in a whole name ("Conceptual Modelling" is CORE's ER, "Conceptual Modeling" CCF's; VISSOFT's "Visualisation"): names are also indexed
  // and looked up in the American form. The start of a cut name keeps the spelling it has (the cut "Information Visualization Theory and …" is not CORE's "Visualisation Theory and Practice").
  const US = { modelling: "modeling", modelled: "modeled", labelling: "labeling", centre: "center", centres: "centers", behaviour: "behavior", behaviours: "behaviors", analyse: "analyze", analysed: "analyzed", catalogue: "catalog", defence: "defense" };
  const us = (t) => US[t] || t.replace(/isation(s?)$/, "ization$1");
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

  // what stands in the parenthesis after a volume as its issue: "(3)", "(1-3)", "(SI)", "(S1)", "(Suppl 1)", "(Nov)" — not a note ("(Best Paper Award)", "(Oral)") and not a year
  const ISSUE_BODY = "(?:\\d{1,3}(?:\\s*[-–/]\\s*\\d{1,3})?(?:(?!(?:st|nd|rd|th)\\b)[A-Za-z]{1,3}\\d{0,2})?|[A-Za-z]{1,3}\\d{0,2}|suppl(?:ement)?[\\s_.]*[^)]{0,6}|pt\\.?\\s*[A-Za-z\\d]+|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?)";
  const ISSUE_ONLY = new RegExp("^\\s*(?:" + ISSUE_BODY + "|(?!(?:19|20)\\d{2}\\b)\\d{4})\\s*$", "i");          // (Nature's issues have four digits: "521 (7553)")
  const ISSUE_AFTER = new RegExp("^\\d{1,3}\\s*\\(\\s*" + ISSUE_BODY + "\\s*\\)", "i");

  // (the whole word: "Marketing" and "Decision" are not months — "Journal of Marketing" was read as "Journal of" and then as the Journal of the ACM)
  const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const PAGES = "(?:\\d+\\s*pp\\.?|[A-Za-z]{0,3}\\d+[A-Za-z]{0,3}|[a-z]{2,6}\\d{3,7})(?:\\s*[-–−]+\\s*(?:[A-Za-z]{0,3}\\d+[A-Za-z]{0,3}|es))?";          // (also IEEE Xplore's "4 pp." and the article numbers of Oxford's journals: "btac817", "bbab315")

  // NeurIPS's "Datasets and Benchmarks Track" papers are NeurIPS papers: the phrase (and its "(Round 2)", "Track on …",
  // "Datasets; Benchmarks" spellings) is not part of the venue's identity, so it is dropped before matching. Whether the
  // raw string names a workshop is judged on the raw string, so "… Workshop on Datasets and Benchmarks" stays unbadged.
  const DB_PHRASE = "(?:track\\s+on\\s+)?(?:datasets?\\s*(?:and|&|;)\\s*benchmarks?|d\\s?&\\s?b)(?:\\s+track)?(?:\\s*[(,]?\\s*round\\s*\\d\\s*\\)?)?";
  const DB_PAREN = new RegExp("\\(\\s*" + DB_PHRASE + "\\s*\\)", "gi");
  const DB_TAIL = new RegExp("[\\s,;:–-]*\\b" + DB_PHRASE + "(?=\\s*(?:[,;:.)]|$|\\d))", "gi");

  // Reduce a raw Scholar venue field to
  //   { name, plain, withParens, truncated, hasVolume, hasIssue }          (hasIssue: "12 (3)" — a journal's volume and issue)
  // name       the venue words with volume/pages/year tails removed (parentheses kept)
  // plain      name with parenthetical content removed (used for name matching)
  // withParens name before tail removal, parentheses kept (used for acronym extraction)
  function prepare(raw) {
    // (whitespace is collapsed first: a long run of spaces in front of a pattern would otherwise make the scan quadratic; and a venue is not longer than a thousand characters
    // — a longer text is cut, for the same reason: a run of commas in front of a pattern costs time in proportion to the square of its length)
    let s = fold(String(raw == null ? "" : raw).slice(0, 1000)).replace(/\s+/g, " ").trim().replace(/^((?:19|20)\d{2})(?=(?:IEEE|ACM)\b)/, "$1 ").replace(DB_PAREN, " ").replace(DB_TAIL, " ").replace(/[\s,;:–-]*\bgeneral track\b/gi, " ").replace(/\s+/g, " ").trim();
    // "[arXiv preprint arXiv:2305.1]" / "(arXiv:…)" annotations some owners append
    s = s.replace(/\[[^\]]*\]?/g, " ").replace(/\((?:[^()]*arxiv[^()]*)\)?/gi, " ");
    const truncated = /…|\.{3}/.test(s);
    if (truncated) s = s.split(/…|\.{3}/)[0];
    s = s.replace(/\s+/g, " ").trim();
    // Springer's proceedings volumes numbered in Roman: "Algorithmic Foundations of Robotics X: Proceedings of the Tenth Workshop on …", "… IX: Selected Contributions of the Ninth …" — the volume and
    // its description are no part of the name (only where the colon is followed by what the volume holds: "Circuits and Systems I: Regular Papers" is a journal's own title)
    s = s.replace(/^(.{6,}?)\s+(?:[IVXL]{1,5})\s*:\s*(?:Selected|Proceedings|The\s+(?:\d+(?:st|nd|rd|th)|[A-Z][a-z]+(?:th|st|nd|rd))\b)\b.*$/, "$1");
    // "Theory of Cryptography - Lecture Notes in Computer Science, 2005": the series of the publisher is no part of the venue's name
    s = s.replace(/^(.{6,}?)\s*[-–—]\s*(?:Lecture Notes in (?:Computer Science|Artificial Intelligence|Bioinformatics|Business Information Processing|Networks and Systems)|Communications in Computer and Information Science|Studies in Computational Intelligence|Advances in Intelligent Systems and Computing)\b.*$/i, "$1");
    // The inverted title Scholar prints for many older IEEE and ACM journals: "Computers, IEEE Transactions on 60 (3), 386-399, 2011" is "IEEE Transactions on Computers"
    // ("Selected Areas in Communications, IEEE Journal on": "IEEE Journal on Selected Areas in Communications"). The form is fixed, so it is read back before anything else.
    s = s.replace(/^(.{2,80}?),\s*((?:IEEE|ACM)(?:\/(?:IEEE|ACM))?\s+(?:Transactions|Journal|Letters|Magazine)\s+on)\b(.*)$/i, "$2 $1$3");
    // IEEE Xplore's inverted title: "Computer Vision and Pattern Recognition, 2006 IEEE Computer Society Conference on" is the "IEEE Computer Society Conference on Computer Vision and
    // Pattern Recognition". Scholar's cut may stop among the sponsors ("… 2006 IEEE Computer Society …", "… 2016 IEEE 35th Annual …"): what is left of the form says it is a conference of the IEEE.
    if (truncated) s = s.replace(/^(.{6,}?),\s*(?:19|20)\d{2}\.?\s+(?:the\s+)?(?:\d+(?:st|nd|rd|th)\s+)?(?:ACM\/)?IEEE(?:\s+Computer\s+Society)?(?:\s+\d+(?:st|nd|rd|th))?(?:\s+(?:Annual|International|Joint))*$/i, "IEEE Conference on $1");
    // IEEE Xplore's citation form: "IEEE Visualization, 2002. VIS 2002., 355-362, 2002" — the name, its year, then the event's own
    // acronym and year. Read as "IEEE Visualization (VIS)", the form the rules below know. (A cut-off line may end on the acronym: "…, 2003. ISESE …", "…, 2009. RTCSA'09 …".)
    s = s.replace(/^(.{6,}?),\s*(?:19|20)\d{2}\.\s+(?:([A-Z][A-Za-z0-9&]{1,9})\s*['’]?\s*(?:\d{2}|(?:19|20)\d{2})\.|([A-Z][A-Z0-9&]{1,9})(?:\s*['’]?\s*(?:\d{2}|(?:19|20)\d{2}))?$)/, (m, name, acr, cutAcr) => acr || (truncated && cutAcr) ? name + " (" + (acr || cutAcr) + ")" : m);
    const withParens = s;
    let hasVolume = false, hasIssue = false;
    const finalYear = (/\b((?:19|20)\d{2})\s*$/.exec(s) || [])[1];
    for (let changed = true, guard = 0; changed && guard < 8; guard++) {
      const before = s;
      s = s.replace(/\s*,\s*(?:19|20)\d{2}\s*$/, "");                       // ", 2014"
      s = s.replace(/\s*,?\s*\bPMLR\b\s*\d*\s*[:,]?\s*(?:\d+\s*[-–]\s*\d+)?\s*$/i, "");   // ", PMLR 235:12345-12367" (the proceedings series, not a venue)
      s = s.replace(new RegExp("\\s*,\\s*" + PAGES + "\\s*$"), "");        // ", 611-626" / ", 79"
      s = s.replace(/\s*,\s*(?:article|art\.?|paper|no\.?|number)\b\.?(?:\s*(?:no\.?|number|id))?\s*[:#]?\s*[A-Za-z]{0,2}\d*[A-Za-z]{0,2}\s*$/i, "");   // ", Article No.: 137" / ", article 75" / ", Art. no. 12" / ", No. 3" (an article number, not a page)
      s = s.replace(/\s*,\s*\d+\s*:\s*\d+\s*-\s*\d+\s*$/, "");              // ", 3: 1-3: 19"
      { const vol = /\s+\d+\s*\(([^)]*)\)?\s*$/.exec(s); if (vol) { hasVolume = true; if (ISSUE_ONLY.test(vol[1])) hasIssue = true; } }
      s = s.replace(/\s+\d+\s*\([^)]*\)?\s*$/, "");                         // " 42 (3)" / " 8 (4"
      s = s.replace(/\s*[,:]?\s*\b(?:volume|vol\.?)\s*\d+.*$/i, "");        // "Volume 1 (Long Papers)"
      s = s.replace(/\s+\d{1,3}\s*:.*$/, "");                               // "… Systems 15: Proceedings"
      s = s.replace(new RegExp("\\s*,?\\s*\\b" + MONTH + "\\b\\.?\\s*(?:19|20)\\d{2}\\s*$", "i"), "");   // ", December 2012"
      s = s.replace(new RegExp("\\s*,?\\s*\\b" + MONTH + "\\b\\.?\\s*(?:\\d{1,2}\\s*[-–]\\s*\\d{1,2})?\\s*$", "i"), "");
      changed = s !== before;
    }
    // a bare trailing volume number: "ISCA 12", "NDSS 5", "Nature 521" — unless it is the edition of the year the line ends with ("Graphics interface 98, 43-50, 1998", "USENIX Security 22, …, 2022")
    { const num = /\s+(\d{1,3})\s*$/.exec(s); if (num) { if (!(finalYear && num[1].length === 2 && +num[1] === +finalYear.slice(2))) hasVolume = true; s = s.replace(/\s+\d{1,3}\s*$/, ""); } }
    s = s.replace(/\s+(?:19|20)\d{2}\s*$/, "").replace(/[\s,;:.-]+$/, "").trim();   // "ISCA 2014"
    // an unclosed "(OSDI" at the very end still counts as acronym text, but is not name text
    const plain = s.replace(/\([^()]*\)?/g, " ").replace(/\s+/g, " ").trim();
    return { name: s, plain, withParens, truncated, hasVolume, hasIssue };
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
  // Every secondary-track word of the string, in order, each once ("Workshop … Posters" has two): a venue whose own name holds one of them is not held to that one only.
  function secondaryWords(raw) {
    const text = fold(raw), words = [];
    const re = new RegExp(SECONDARY.source, "gi");
    for (let m; (m = re.exec(text)); ) {
      // (as the box that says why a venue has no rank words it: one word in the singular — "workshop", "finding" — a phrase as printed — "emerging technologies", "extended abstracts")
      const said = m[0].toLowerCase(), w = /[\s-]/.test(said) ? said : said.replace(/([^se])s$/, "$1");
      if (!words.some((x) => wordsOf(x).join(" ") === wordsOf(w).join(" "))) words.push(w);
    }
    // "OM@ ISWC 2288", "NLP-DBPEDIA@ ISWC": a workshop co-located with the conference named after the @ (CEUR-WS proceedings)
    if (!words.length && /\b[A-Za-z0-9-]+@\s?[A-Z]{3,}[A-Z0-9]*\b/.test(text)) words.push("workshop");
    return words;
  }
  const secondaryWord = (raw) => secondaryWords(raw)[0] || null;

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
      return { names: new Map(), volumeNames: new Map(), uncutNames: new Map(), bare: new Map(), abbrs: new Map(), weakAbbrs: new Map(), bags: new Map(), starts: new Map(), all: [], first: { full: new Map(), noOrg: new Map() } };
    }
    const push = (map, key, entry) => {
      if (!key) return;
      const list = map.get(key);
      if (!list) map.set(key, [entry]); else if (!list.includes(entry)) list.push(entry);
    };

    function register(src, kind, entry, names, abbrs, curated, noPrefix, fullOnly, volumeOnly, uncutOnly) {
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
        if (volumeOnly) {          // (a title that is also a field: it counts for a line with a volume, a journal's — never as a start, never bare)
          push(side.volumeNames, form.full.join(" "), entry);
          continue;
        }
        if (uncutOnly) {          // (a name that is only read whole, with its organisation, in a string that Scholar did not cut off — never as a start, never bare)
          push(side.uncutNames, form.full.join(" "), entry);
          continue;
        }
        for (const mode of fullOnly ? ["full"] : ["full", "noOrg"]) {          // (a name whose organisation is part of what it says — "USENIX ATC" — is not also the bare acronym, "ATC")
          const t = form[mode];
          if (t.length) { push(side.names, t.join(" "), entry); push(side.names, t.map(us).join(" "), entry); push(side.first[mode], t[0], { entry, form }); }
        }
        if (form.full.length && form.full.length === contentWords(plain).length) { push(side.bare, form.full.join(" "), entry); push(side.bare, form.full.map(us).join(" "), entry); }
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
          entry.extra.push(...(a.names || []));
          register(src, kind, entry, a.names || [], a.abbrs || [], true);
          if (a.exact) { entry.extra.push(...a.exact); register(src, kind, entry, a.exact, [], true, true); }
          if (a.fullOnly) { entry.extra.push(...a.fullOnly); register(src, kind, entry, a.fullOnly, [], true, false, true); }
          if (a.volume) { entry.extra.push(...a.volume); register(src, kind, entry, a.volume, [], true, false, false, true); }
          if (a.uncut) { entry.extra.push(...a.uncut); register(src, kind, entry, a.uncut, [], true, false, false, false, true); }
          if (a.renamed) entry.renamed = true;          // (the list's name is a name it had: its "Workshop" says nothing about the venue of today)
          if (a.former) { entry.former = (entry.former || []).concat(a.former); register(src, kind, entry, a.former, [], true); }          // (found by name; not part of its wording — `extra` — so "Workshop" in them is no type clash)
          if (a.noBareAcronym) {            // the acronym says nothing without the name: ACM's SAC is not Selected Areas in Cryptography
            const side = sources[src][kind], k = squash(entry.abbr), list = side.abbrs.get(k);
            if (list) { const rest = list.filter((e) => e !== entry); if (rest.length) side.abbrs.set(k, rest); else side.abbrs.delete(k); push(side.weakAbbrs, k, entry); }
          }
          for (const st of a.starts || []) push(sources[src][kind].starts, startKey(st), entry);
        }
      }
    }
    // CCF and CORE rows that are one venue — the alias table says so (SIGKDD / KDD), or the two lists give the same acronym and mostly the same words: a string that one list's
    // wording found brings the other list's row too ("ACM Conference on Designing Interactive Systems" is CCF's "ACM SIGCHI Conference on Designing Interactive Systems" and CORE's
    // "Designing Interactive Systems" alike). Two rows of one acronym that are two venues (FSE: Foundations of Software Engineering, Fast Software Encryption) share too few words.
    const stem = (w) => w.replace(/(?:ings|ing|ed)$/, "").replace(/([^s])s$/, "$1").replace(/(.)\1+/g, "$1");
    const wordsOf = (e) => new Set(e.extra.flatMap((n) => canonTokens(n.replace(/\([^()]*\)/g, " "), "noOrg")).map(stem));
    const sameWords = (x, y) => {
      const a = wordsOf(x), b = wordsOf(y), shared = [...a].filter((w) => b.has(w)).length;
      if (!a.size || !b.size) return false;
      return (shared >= 2 && shared >= 0.6 * Math.min(a.size, b.size)) || (shared === a.size && shared === b.size);          // (a name of one word each — MICRO, ACM MM, VIS — is the same word)
    };
    const partners = new Map();          // row -> its rows in the other list
    const link = (x, y) => { push(partners, x, y); push(partners, y, x); };
    const coreByAcronym = new Map();
    for (const y of sources.core.C.all) push(coreByAcronym, squash(y.abbr), y);
    for (const x of sources.ccf.C.all) for (const y of coreByAcronym.get(squash(x.abbr)) || []) if (sameWords(x, y)) link(x, y);
    for (const a of aliases) {
      if (!a.ccf || !a.core || (a.kind && a.kind !== "C")) continue;
      for (const x of byRef.ccf.get("C|" + squash(a.ccf)) || []) for (const y of byRef.core.get("C|" + squash(a.core)) || []) {
        if ((a.ccfTier && ratingOf(x) !== a.ccfTier) || (a.coreRank && ratingOf(y) !== a.coreRank)) continue;
        link(x, y);
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
    return { sources, known, df, sameVenue, shadow, partners };
  }

  // ---------------------------------------------------------------- matching

  const hasWord = (e, w) => e.extra.some((n) => new RegExp("\\b" + w + "(?:s|es)?\\b", "i").test(n));          // ("Workshops" is "Workshop")

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
  let ties = 0;          // how often decide() took the first of venues that only share a rating: a result that rests on it names a rating, not a venue (matchSource says so: `tied`)
  function decide(list, rawWords, strict) {
    if (!list || !list.length) return null;
    const u = uniq(list);
    if (u.length === 1) return u[0];
    const tie = (l) => {
      if (uniq(l.map(venueKey)).length > 1) { if (strict) return "ambiguous"; ties++; }
      return l[0];
    };
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
      for (const part of parts) if (!(PLACE_ABBR.test(part.trim()) && part.trim() !== part.trim().toUpperCase())) for (const k of keys(part.replace(/'?\d{2,4}$/, ""))) out.push({ key: k, kind: "paren", part: parts.length > 1, raw: part.replace(/'?\d{2,4}$/, "").trim() });
      for (const k of keys(g)) out.push({ key: k, kind: "paren", raw: g.trim() });
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
    // but only weakly: the abbreviation of a journal that no conference shares — "TPAMI, 1-14, 2020" — is the journal's, see `resolve`)
    const numberAfter = first.length <= 2 ? /^(?:'\d{2}\b|(?:19|20)\d{2}\b|\d+(?:st|nd|rd|th)\b)/ : /^(?:'?\d{2,4}\b(?!\s*-\s*\d+\b)|\d+(?:st|nd|rd|th)\b)/;
    const pagesAfter = first.length > 2 && /^\d{1,5}\s*-\s*\d{1,5}\b/.test(rest);
    const yearAfter = numberAfter.test(rest) || pagesAfter, weak = !numberAfter.test(rest) && pagesAfter;
    if (!placed && looksAcr && (restNoise || yearAfter)) {
      // "USENIX ATC 2007": with its organisation first ("usenixatc" is the venue; "atc" alone is a trusted-computing conference)
      const org = head0.length > head.length ? head0.slice(0, head0.length - head.length).trim().split(/[\s/-]+/).filter(Boolean) : [];
      // ("IEEE MICRO 15 (1)": a volume and an issue, not the 15th MICRO — the abbreviation of a journal may stand there, a conference's does not: "ACM TKDD 6 (1)"; "CCS 21 (2021)", "KDD 2019 (note)" have none)
      const issue = ISSUE_AFTER.test(rest);
      if (org.length === 1) for (const k of keys(org[0] + first)) out.push({ key: k, kind: "lead", event: yearAfter && !issue, weak, issue });
      for (const k of keys(first)) out.push({ key: k, kind: "lead", event: yearAfter && !issue, weak, issue, raw: first });
    }
    // the ACM Digital Library's own citation form: "SC18: International Conference for …", "ICSE '06: Proceedings of …", "CHI'09:" —
    // an acronym, a two-digit year and a colon name the event whatever follows
    const acmDl = /^([A-Za-z][A-Za-z0-9&\/]{1,9})(\s*['’]?\s*)\d{2}\s*:/.exec(head);
    // (a two-letter acronym needs the apostrophe or no space before the number: "CHI '09:", "SC18:" — "DS 30: Proceedings of DESIGN 2002" is the Design Society's report series)
    if (acmDl && /[A-Z]/.test(acmDl[1]) && !(acmDl[1].length <= 2 && /\s/.test(acmDl[2]) && !/['’]/.test(acmDl[2]))) for (const k of keys(acmDl[1])) out.push({ key: k, kind: "lead", event: true, raw: acmDl[1] });
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
    for (const m of text.matchAll(/\b([A-Z][A-Za-z]{2,10})[-–']\s?(\d{2,4})\b/g)) out.push({ key: m[1].toLowerCase(), kind: "embedded", raw: m[1] });
    // ("ICME2000", "ICIP98": IEEE Xplore glues the year to the acronym — "… on Multimedia and Expo. ICME2000")
    // (not after "@" or a hyphen: "BEA@ACL2023", "FTL-IJCAI21" are workshops of the venue, not the venue)
    for (const m of text.matchAll(/\b[A-Z][A-Z0-9]{3,11}\b/g)) for (const key of uniq([m[0].toLowerCase(), /[@-]$/.test(text.slice(Math.max(0, m.index - 1), m.index)) ? "" : stripDigits(m[0].toLowerCase())].filter(Boolean))) out.push({ key, kind: "embedded", raw: m[0] });
    for (const m of text.matchAll(/\b[Ss]ig[a-z]{3,9}\b/g)) out.push({ key: m[0].toLowerCase(), kind: "embedded" });     // "SIGgraph", "siggraph": Scholar re-cases some strings
    // "SC'05: Proceedings of the 2005 …": a short acronym, a two-digit year and a colon
    for (const m of text.matchAll(/\b([A-Z]{2,10})['’]\d{2}\s*:/g)) out.push({ key: m[1].toLowerCase(), kind: "embedded" });
    return out.filter((s) => !ORG.has(s.key));
  }

  // Resolve against one source (ccf | core). Returns { entry, rule } | null.
  // What one list makes of a string: { entry, rule, tied }, null when nothing; `tied`: the entry was taken from venues that share a rating, the first of them
  function matchSource(idx, src, p, hint, known) {
    const before = ties, r = matchSourceIn(idx, src, p, hint, known);
    if (r) r.tied = ties !== before;
    return r;
  }
  function matchSourceIn(idx, src, p, hint, known) {
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
        // (a title that is the name of an event of its own — "American Control Conference - ACC'95" — names the acronym of that event: ACC is not CORE's Applied Computing Conference;
        // a series title says no event, and an ACM title that says one says the venue's own words: "… Conference on Programming language design and implementation - PLDI '02")
        if (d && title.length >= 2 && /\b(?:conference|symposium|symposia|workshop|congress|colloquium|meeting)\b/i.test(fold(p.withParens).slice(0, series.index + 1)) && !title.some((w) => vocabOf(d).has(w))) break;
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
      if (hits.length > 1) {
        const pick = pickByBoiler(hits, p.plain);
        if (pick) return pick;
        // a journal and a conference of one name ("Computational Visual Media"): the acronym the string names ("… (CVM)") is the conference's
        const named = acronymSignals(p).filter((sig) => sig.kind === "paren" || (sig.kind === "lead" && sig.event));
        const byAcronym = hits.filter((h) => named.some((sig) => squash(h.abbr) === sig.key));
        if (byAcronym.length === 1) return byAcronym[0];
      }
      return hits[0] || null;
    };
    // is the string's whole name (organisations included) one of the forms of this venue's names?
    const exactForm = (hit, tokens, key) => sides.some((side) => (side.first.full.get(tokens[0]) || []).some(({ entry, form }) => entry === hit && form.full.join(" ") === key));
    // the string says "symposium" and this venue's names say "conference" (and never "symposium"), or the like
    // (the names the venue had count for the string's event word, not against it: "Workshop" in them is no clash with a string that says "Workshop")
    const hasWordAny = (e, w) => hasWord(e, w) || (Object.getPrototypeOf(e).former || e.former || []).some((n) => new RegExp("\\b" + w + "(?:s|es)?\\b", "i").test(n));
    const typeClash = (entry) => rawWords.some((w) => !hasWordAny(entry, w)) && TYPE_WORDS.some((w) => !rawWords.includes(w) && hasWord(entry, w));
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
    // the acronym a string names for its event — it opens with it ("AAAI'17: …", "SDM 2019 …") or puts it in a parenthesis ("(AAAI-07)", "(ISSTA)") — is the venue's: a name hit
    // that is another venue's, whose own acronym the string does not say ("… Conference on Artificial Intelligence (AAAI-07)" boils down to IJCAI's name), disagrees with it.
    // (the acronyms of other venues that the string only holds — "2025 USENIX Annual Technical Conference (ATC'25)" — are told by the hit's own being in it)
    const ownersOf = (a) => sides.flatMap((side) => [...(side.abbrs.get(a) || []), ...(side.weakAbbrs.get(a) || [])]);
    const wordsHere = new Set(fold(p.withParens).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    // ... and a hit whose whole name stands in the string is the venue the string says ("… USENIX Conference on Security Symposium (SEC'17)": the organisation and the name are there)
    const wholeName = (hit) => hit.extra.some((n) => { const w = fold(n.replace(/\([^()]*\)/g, " ")).toLowerCase().split(/[^a-z0-9]+/).filter((x) => x && !STOP.has(x)); return w.length >= 2 && w.every((x) => wordsHere.has(x)); });
    const dashLead = /^([A-Za-z][A-Za-z0-9&/]{1,9})-(?:\d{4}|\d{2})\s*:/.exec(p.plain);          // ("SDM-19: …": AAAI's and others' own form; it vetoes, it does not name the event)
    const acronymAgrees = (hit) => {
      const own = squash(hit.abbr || "");
      if (own.length >= 2 && (wordsHere.has(own) || wordsHere.has(stripDigits(own)))) return true;
      if (wholeName(hit)) return true;
      const named = acronymSignals(p).filter((sig) => (sig.kind === "lead" && sig.event) || sig.kind === "paren");
      if (dashLead) named.push({ key: squash(dashLead[1]) });
      const owned = named.filter((sig) => ownersOf(sig.key).length);
      return !owned.length || owned.some((sig) => ownersOf(sig.key).includes(hit));
    };
    const intlJournalWithoutIntl = (e) => e.kind === "J" && /^(?:the\s+)?international\s+journal\b/i.test(e.name) && !/\b(?:international|intl|int)\b/i.test(p.plain);
    // ("AAAI-23: Thirty-Seventh AAAI Conference on Artificial Intelligence": the acronym in front says the event, and says it again inside the name — the venue's own name has it once)
    const nameBody = (() => {
      const m = /^([A-Za-z][A-Za-z0-9&/]{1,9})\s*['’-]?\s*(?:\d{4}|\d{2})\s*:\s*(.+)$/.exec(p.plain);
      return m && new RegExp("\\b" + m[1].replace(/[^A-Za-z0-9]/g, "") + "\\b", "i").test(m[2]) ? m[2] : p.plain;
    })();
    const seen = new Set();
    let clashing = null;           // the string's whole name is a venue's, with another event word ("Symposium" for a Conference): only if nothing better turns up
    // the series form names its event by the acronym after the dash: when that acronym is a known one and the rule above did not take it
    // (a journal's, or two venues', or a weak one), the name read without it is a guess
    const seriesAcronymKnown = !!series && idx.known.has(squash(series[1]));
    for (const mode of modes) {
      if (mode === "noAcr" && seriesAcronymKnown) continue;
      const tokens = canonTokens(nameBody, mode, idx.known);
      // organisation words / acronyms carry identity ("Communications of the ACM" is not
      // "Communications"): a weakened variant must still be at least two words long
      if (!tokens.length || (mode !== "full" && tokens.length < 2)) continue;
      const key = tokens.join(" "), ukey = tokens.map(us).join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      let d = nameHit((side) => {
        const base = (bareString ? side.bare : side.names).get(ukey), more = p.hasVolume ? side.volumeNames.get(ukey) : null, whole = p.truncated ? null : side.uncutNames.get(ukey);
        return more || whole ? [...(base || []), ...(more || []), ...(whole || [])] : base;
      });
      // "Human-Computer Interaction 23 (1), 47-99, 2008": two journals boil down to these words ("Proceedings of the ACM on Human-Computer Interaction" is the other) and the string is
      // nothing but them, with a volume: it is the journal whose whole name they are
      if (d === "ambiguous" && p.hasVolume && !bareString && plainWords.length === canonTokens(p.plain, "full").length) d = nameHit((side) => side.bare.get(ukey));
      if (d === "ambiguous") return null;
      // ("AAAI'17: Proceedings of the Thirty-First AAAI Conference on Artificial Intelligence" boils down, once its acronyms are taken out, to the words of IJCAI's name)
      if (d && !acronymAgrees(d)) continue;
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
    // two venues share the acronym ("FSE": the Foundations of Software Engineering and Fast Software Encryption): the words of the string that are not the acronym say which —
    // the one whose own words they all are ("Proceedings of the ACM on Software Engineering 1 (FSE)")
    const byContext = (key) => {
      const words = canonTokens(p.plain, "noOrg", idx.known).filter((w) => w !== key && w !== stripDigits(key));
      if (words.length < 2) return "ambiguous";
      const covering = uniq(sides.flatMap((side) => side.abbrs.get(key) || [])).filter((e) => words.every((w) => vocabOf(e).has(w)));
      return covering.length === 1 ? covering[0] : "ambiguous";
    };
    // an acronym in a parenthesis after a name of its own — "International Conference on Electronics, Computers and Artificial Intelligence (ECAI)", "Innovations in Power and Advanced Computing
    // Technologies (i-PACT)" — is the acronym of another event unless more than half of the words in front of the parenthesis are the venue's own; abbreviations with a full stop
    // ("Des.", "Autom.") count by their start; endings and doubled letters are no difference; the same venue of the other list lends its words too
    const jointEvent = (part, raw) => {          // (not for a joint event, "(EMNLP-IJCNLP)", "(DASC/PiCom/CBDCom)": two or more of the parts look like acronyms; "(i-PACT)" has one)
      if (!part || !raw) return false;
      const inside = (p.withParens.match(/\(([^()]*)\)/g) || []).find((x) => x.includes(raw));
      return !!inside && inside.slice(1, -1).split(/[-–/,;]+/).map((x) => x.trim().replace(/['’]?\d{2,4}$/, "")).filter((x) => x.length >= 2 && (x.match(/[A-Z]/g) || []).length >= 2).length >= 2;
    };
    const parenNameIsAnotherVenueOf = (raw, key, d, fallback) => {
      if (!d || d === "ambiguous") return false;
      const open = raw ? p.withParens.search(new RegExp("\\(\\s*" + raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))) : -1;
      if (open < 0 && !fallback) return false;                                        // (an acronym that stands in no parenthesis is not this case)
      const before = (open > 0 ? p.withParens.slice(0, open) : p.withParens.split("(")[0]).split(")").pop();          // (the name of this parenthesis: after an earlier one — "… (CSE) and … Ubiquitous Computing (EUC)")
      if (/\d\s*$/.test(before)) return false;          // (a volume in front of the parenthesis: a journal's line with its track — "Proceedings of the ACM on Programming Languages 3 (POPL)")
      const words = canonTokens(before, "noOrg", idx.known).filter((w) => w !== key && w !== stripDigits(key));
      if (words.length < 2) return false;
      const dotted = new Set((before.match(/[A-Za-z]{2,}\./g) || []).map((x) => squash(x)));
      const owners = [d, ...Object.keys(idx.sources).flatMap((sn) => Object.keys(idx.sources[sn]).flatMap((kd) => (idx.sources[sn][kd].abbrs.get(key) || []).filter((e) => e.src !== d.src && (String(e.abbr).toLowerCase() === String(d.abbr).toLowerCase() || (d.src === "ccf" ? idx.sameVenue(d.abbr, e.abbr) : idx.sameVenue(e.abbr, d.abbr)))))) ];
      const own = words.filter((w) => owners.some((e) => vocabOf(e).has(w) || [...vocabOf(e)].some((v) => stemOf(v) === stemOf(w) || (dotted.has(w) && v.startsWith(w))))).length;
      return own * 2 <= words.length;
    };
    // the acronym as printed names its own venue: "C&C" is Creativity and Cognition, not Compiler Construction ("CC") — unless the lists say the two spellings are one venue ("S&P", "SP")
    const rawNamesVenue = (raw, k, d) => {
      if (!raw || raw.includes("&") === (d.abbr || "").includes("&")) return true;          // (only an ampersand set the two apart: "ASP-DAC" and "ASPDAC" are one venue)
      const exact = Object.keys(idx.sources).flatMap((sn) => Object.keys(idx.sources[sn]).flatMap((kd) => (idx.sources[sn][kd].abbrs.get(k) || []).filter((e) => e.abbr === raw)));
      return !exact.length || exact.some((e) => e === d || e.abbr === d.abbr || (e.src !== d.src && (d.src === "ccf" ? idx.sameVenue(d.abbr, e.abbr) : idx.sameVenue(e.abbr, d.abbr))));
    };
    for (const { key, part, kind, issue, raw } of signals) {
      if (issue && !(idx.sources[src].J && idx.sources[src].J.abbrs.has(key))) continue;
      // (the venue whose acronym is spelled as the string spells it comes first: "CC 2019" is Compiler Construction, not "C&C", which squashes alike)
      const exactHere = raw && !part ? uniq(sides.flatMap((side) => (side.abbrs.get(key) || []).filter((e) => e.abbr === raw))) : [];
      let d = exactHere.length === 1 ? exactHere[0] : part ? (confSide && sides.includes(confSide) ? decide(confSide.abbrs.get(key), rawWords) : null) : firstHit((side) => side.abbrs.get(key));
      if (d === "ambiguous" && !part) d = byContext(key);
      // (a parenthesised acronym after a name that is another venue's: two or more other words, none of them this venue's own — see the
      // buried acronyms below — in a string that spells out an event; a journal's abbreviated name before its track, "Proc. ACM Program. Lang. 6 (POPL)", does not)
      const nameIsAnotherVenues = kind === "paren" && spelledEvent && d && d !== "ambiguous" && (() => {
        const others = canonTokens(p.plain, "noOrg", idx.known).filter((w) => w !== key && w !== stripDigits(key));
        return others.length >= 2 && !others.some((w) => vocabOf(d).has(w));
      })();
      // (an acronym in front of a name that says what the event is about — "ITS '14: ACM International Conference on Interactive Tabletops and Surfaces" — is that venue's only if its
      // own words are among them: not CORE's ITS, the Intelligent Tutoring Systems; a theme or a note after the name — "DiGRA 2007 Conference: Situated Play" — is no name)
      const subjectIsAnotherVenues = kind === "lead" && d && d !== "ambiguous" && (() => {
        const m = /\b(?:conference|symposium|symposia|workshop|congress|colloquium|meeting)\s+(?:on|of|for)\s+(?:the\s+)?([^,:;(]+)/i.exec(p.plain);
        const subject = m ? canonTokens(m[1], "noOrg", idx.known).filter((w) => w !== key && w !== stripDigits(key)) : [];
        // (the same venue in the other list — CCF lists RAID under its old name, CORE under the new one — not another venue that squashes to the same acronym: "C&C" is not "CC")
        const owners = [d, ...Object.keys(idx.sources).flatMap((sn) => Object.keys(idx.sources[sn]).flatMap((kd) => (idx.sources[sn][kd].abbrs.get(key) || []).filter((e) => e.src !== d.src && (String(e.abbr).toLowerCase() === String(d.abbr).toLowerCase() || (d.src === "ccf" ? idx.sameVenue(d.abbr, e.abbr) : idx.sameVenue(e.abbr, d.abbr))))))];
        return subject.length >= 2 && !subject.some((w) => owners.some((e) => vocabOf(e).has(w)));
      })();
      // (a parenthesised acronym after a name of its own — "International Conference on Electronics, Computers and Artificial Intelligence (ECAI)", "Innovations in Power and Advanced Computing
      // Technologies (i-PACT)" — is the acronym of another event unless more than half of the words in front of the parenthesis are the venue's own; abbreviations with a full stop
      // ("Des.", "Autom.") count by their start; the same venue of the other list lends its words too)
      const parenNameIsAnotherVenue = kind === "paren" && !jointEvent(part, raw) && parenNameIsAnotherVenueOf(raw, key, d, true);
      if (d && d !== "ambiguous" && !nameIsAnotherVenues && !parenNameIsAnotherVenue && !subjectIsAnotherVenues && rawNamesVenue(raw, key, d) && !(kind === "paren" && key.length <= 3 && !ownWordsOnly(d)) && !(kind !== "paren" && parenContradicts(d))) return { entry: d, rule: "acronym" };
    }
    // Acronym buried in a sentence: only when little else is said ("… SIGCOMM 2008 conference on
    // Data communication"), and never for journals — otherwise "NIPS-2010 deep learning and
    // unsupervised feature learning" workshops would inherit NeurIPS.
    // ("Nijmegen: ICIS" is a place and a publisher — an institute's report series — not the conference called ICIS)
    const placeAndPublisher = /^[A-Z][A-Za-z.'’-]+(?: [A-Z][A-Za-z.'’-]+){0,2}:\s/.test(p.plain) && !CONF_SIGNAL.test(p.plain);
    if (hint !== "J" && !placeAndPublisher) {
      const content = canonTokens(p.plain, "noOrg", idx.known);
      const room = CONF_SIGNAL.test(p.plain) ? 3 : 1;   // a bare "IEEE INFOCOM" says little else
      // what the event is about, in the string's own words: "… International Conference on Theory of Information Retrieval" — three words or more, one of them not the venue's own, are the
      // name of another event under the sponsor's acronym (ACM SIGIR's ICTIR is no SIGIR), where the same words beside the acronym ("IEEE INFOCOM 2016 - … Conference on Computer Communications") are its own
      const subject = (() => { const m = /\b(?:conference|symposium|symposia|workshop|congress|colloquium|meeting)\s+(?:on|of|for)\s+(?:the\s+)?([^,:;(.…]+)/i.exec(fold(p.plain)); return m ? canonTokens(m[1], "noOrg") : []; })();
      const subjectIsNotOwn = (d, key) => { const words = subject.filter((w) => w !== key); if (words.length < 3) return false; const own = new Set([...vocabOf(d)].map(stemOf)); return words.some((w) => !own.has(stemOf(w))); };          // (the acronym itself, "… Computer Design ICCD'93", is no word of the subject)
      for (const { key, raw } of embeddedSignals(p)) {
        const hits = confSide && confSide.abbrs.get(key);
        const left = content.filter((t) => t !== key && t !== String(raw || "").toLowerCase());          // (the acronym, with its year glued on or not)
        if (p.hasIssue && !CONF_SIGNAL.test(p.plain) && !left.length && !idx.sources.ccf.J.abbrs.has(key)) continue;          // (nothing but an acronym and a volume with an issue — "IEEE MICRO 15 (1)" — is a periodical's title, not an event)
        if (hits && left.length <= room) {
          const d = decide(hits, rawWords);
          // Scholar cut the name after the acronym and the words that did get through are not the venue's own ("ACM SIGCSE conference on
          // Innovation and …" is ITiCSE, not the SIGCSE symposium): the name goes on, so the prefix rule below may read it
          // Two or more other words, none of them the venue's own, are the name of something else: "International Symposium on Wearable Computers
          // (ISWC)" is not the Semantic Web conference of that acronym (a single stray word — "ACL-08: HLT", "VLDB Endowment" — proves nothing)
          // (a line that ends in a volume and an issue is a journal's unless what stands beside the acronym is the venue's own: "PLOS Biology 3 (9)" is not the workshop PLOS, "VLDB Endowment 8 (7)" is VLDB)
          const foreign = (spelledEvent && left.length >= 2 && !left.some((w) => vocabOf(d).has(w))) || (d && d !== "ambiguous" && subjectIsNotOwn(d, key)) || namedElsewhere(key, left, d) || parenNameIsAnotherVenueOf(raw, key, d, false) || (p.hasIssue && !CONF_SIGNAL.test(p.plain) && left.length >= 1 && !left.every((w) => vocabOf(d).has(w)));
          if (d && d !== "ambiguous" && !foreign && !parenContradicts(d) && !(p.truncated && !left.every((w) => vocabOf(d).has(w)))) return { entry: d, rule: "acronym" };
        }
      }
    }

    // the acronym and what is left of the string begin a name that is another venue's, in either list ("ACM SIGGRAPH Asia 7 (2)": SIGGRAPH Asia is not SIGGRAPH)
    function namedElsewhere(key, left, hit) {
      if (!left.length) return false;
      for (const srcName of Object.keys(idx.sources)) for (const kind of Object.keys(idx.sources[srcName])) {
        for (const { entry, form } of idx.sources[srcName][kind].first.noOrg.get(key) || []) {
          if (entry === hit || squash(entry.abbr || "") === squash(hit.abbr || "")) continue;
          const rem = form.noOrg.slice(1);
          if (rem.length && (left.slice(0, rem.length).join(" ") === rem.join(" ") || rem.slice(0, left.length).join(" ") === left.join(" "))) return true;
        }
      }
      return false;
    }

    // R4: Scholar cut the name short with "…": accept a unique entry that begins with what is left.
    const R = canonTokens(p.plain, "full");
    const visibleWords = p.plain.split(/\s+/).filter(Boolean).length;
    const visibleContent = R.filter((t) => !ORG.has(t)).length;          // (the words of the visible start that are no sponsor: "… IFIP/IEEE International Conference on …" shows none)
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
        // (a rival whose event word is not the string's — a symposium for a "Conference on …" — is no other reading of it: where the visible start says what the event is about,
        // in two words at least; a cut that shows the sponsors and the event words only — "… IFIP/IEEE International Conference on …" — fits any of their venues)
        if (rival === "ambiguous" || (rival && !sameAs(d, rival) && !(typeClash(rival) && visibleContent >= 2))) d = null;
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
  // its first name) — then the string must carry that whole name, the words that vary from edition to edition (ordinals, years, "proceedings", "international", the sponsors) taken
  // out on both sides: "AISTATS Workshop on Causality" and "… Artificial Intelligence and Statistics Workshops" are workshops at the conference, not its name.
  const wordsOf = (text) => fold(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((w) => w.replace(/s$/, ""));
  // a word without its endings and doubled letters: "Modeling" and "Modelling", "System" and "Systems" are one word
  const stemOf = (w) => w.replace(/(?:ings|ing|ed)$/, "").replace(/([^s])s$/, "$1").replace(/(.)\1+/g, "$1");
  const holdsWord = (t, target) => { for (let i = 0; i + target.length <= t.length; i++) if (target.every((w, j) => t[i + j] === w)) return true; return false; };
  const KIND_WORDS = new Set(["conference", "symposium", "symposia", "workshop", "meeting", "congres", "colloquium"]);          // (what kind of event it is stays: "Symposium Workshops" is not "Workshop")
  const trackCore = (text, target) => wordsOf(String(text).replace(/\b(?:proceedings?|proc\.?)\s+(?:of\s+)?(?:the\s+)?/gi, " ")).filter((w) => target.includes(w) || KIND_WORDS.has(w) || !(BOILER.has(w) || ORG.has(w) || SEQ_DROP.has(w) || isNoiseToken(w)));
  // a name and the names its notes give: "Privacy Enhancing Technologies Symposium (was International Workshop of Privacy Enhancing Technologies)"
  const nameParts = (n) => [n.replace(/\([^()]*\)/g, " "), ...Array.from(n.matchAll(/\(([^()]*)\)/g), (m) => m[1].replace(/^\s*(?:prior to \d{4}\s+)?(?:was|previously|formerly|aka)\s+/i, "").replace(/\s*[;,]\s*(?:changed|renamed|until)\b.*$/i, ""))];
  function ownWord(entry, word, raw) {
    const target = wordsOf(word);
    // (the names of the venue itself, not a view of it that a rule narrowed to the names it matched — `through` —, and the names it had)
    const proto = Object.getPrototypeOf(entry) || {};
    const all = [...(proto.extra || entry.extra), ...(proto.former || entry.former || [])];
    let cut = raw.indexOf("…");
    if (cut >= 0 && /\([^)]*$/.test(raw.slice(0, cut))) cut = -1;          // (cut inside a parenthesis — "… Foundations Workshop (Cat. No …" — the name before it is whole)
    // the venue's own acronym, as the name's words are written down (no trailing "s": "CHES" is "che" there)
    const ownAbbr = squash(entry.abbr || "");
    const ownTokens = new Set([ownAbbr, ownAbbr.replace(/s$/, ""), stripDigits(ownAbbr), stripDigits(ownAbbr).replace(/s$/, "")].filter(Boolean));
    const rawWords = wordsOf(raw);
    // (a) the official name holds the word: "Workshop" is what the venue is — but where the string says what the workshop is about ("PKC 2019 Workshop on Post-Quantum Cryptography"),
    // that is the venue's own subject (its words, spelled alike: "Modeling" is "Modelling") or it is another workshop; a cut string shows only the start of its subject, two words of
    // which must begin the subject of one of the venue's names; a venue the list names by a name it had ("renamed") has no official name that says what it is
    const renamed = !!(proto.renamed || entry.renamed);
    if (holdsWord(wordsOf(String(entry.name).replace(/\([^()]*\)/g, " ")), target) && !(renamed && /\bconference\b/i.test(raw))) {
      const about = word === "workshop" ? /\bworkshops?\s+(?:on|of|for)\s+(?:the\s+)?([^,:;(.…]+)/i.exec(fold(raw)) : null;
      const subject = about ? canonTokens(about[1], "noOrg") : [];
      const stem = stemOf;
      const vocab = new Set(all.flatMap((n) => canonTokens(n.replace(/\([^()]*\)/g, " "), "noOrg").flatMap((w) => [w, stem(w)])));
      // a renamed venue is the Workshop only where the string says so with the subject of the old name ("Applications of Computer Vision, 2008. WACV 2008. IEEE Workshop on"): "WACV Workshops" says nothing
      let evidence = true;
      if (renamed) {
        const have = new Set(rawWords.flatMap((w) => [w, stem(w)]));
        const need = canonTokens(((/\bworkshops?\s+(?:on|of|for)\s+(?:the\s+)?([^,:;(.…]+)/i.exec(fold(entry.name)) || [])[1]) || "", "noOrg");
        evidence = need.length > 0 && /\bworkshops?\s+on\b/i.test(fold(raw)) && (cut < 0 ? need.every((w) => have.has(w) || have.has(stem(w))) : subject.length >= 2 && subject.every((w, i) => need[i] !== undefined && (need[i] === w || stem(need[i]) === stem(w))));
      }
      if (evidence) {
        if (!subject.length) return true;
        if (cut < 0) { if (subject.every((w) => vocab.has(w) || vocab.has(stem(w)))) return true; }
        else if (subject.every((w) => vocab.has(w) || vocab.has(stem(w))) && [...ownTokens].some((t) => rawWords.includes(t))) return true;          // (cut, with the venue's own acronym beside it: "Public Key Cryptography-PKC 2003: 6th International Workshop on Theory and …")
        else if (subject.length >= 2) {
          // the visible part of the subject must be the start of the subject of one of the venue's names ("Network and operating …" is NOSSDAV's; "Visualization for …" is anybody's)
          const starts = all.map((n) => { const m = /\bworkshops?\s+(?:on|of|for)\s+(?:the\s+)?([^,:;(.…]+)/i.exec(fold(n)); return m ? canonTokens(m[1], "noOrg") : null; }).filter(Boolean);
          if (starts.length ? starts.some((ns) => subject.every((w, i) => ns[i] !== undefined && (ns[i] === w || stem(ns[i]) === stem(w)))) : subject.every((w) => vocab.has(w) || vocab.has(stem(w)))) return true;
        }
      }
    }
    // (b) a name it had, or is printed under: the string must carry that whole name as the whole of its name part — without volume, pages, year and parentheses, and with what varies from
    // edition to edition (ordinals, years, "proceedings", "international", the sponsors) out on both sides — or go on with the initials of it only ("… Foundations Workshop. CSFW-15"):
    // "NIPS Workshop on Machine Learning", "Satellite Workshop of the … Spoken Language Technology Workshop" and "ICML Workshop on Machine Learning for Music" are tracks
    const unconnected = (tokens) => { const t = tokens.slice(); while (t.length && STOP.has(t[0])) t.shift(); return t; };
    const prepared = prepare(raw);
    const head = unconnected(trackCore(cut < 0 ? prepared.plain : prepared.withParens, target));          // (a cut string keeps its parentheses: "… Abstract Interpretation (VMCAI) …" ends in the acronym)
    return all.some((n) => nameParts(n).some((part) => {
      if (!holdsWord(wordsOf(part), target)) return false;
      const core = trackCore(part, target);
      if (!core.length) return false;
      const initials = core.filter((w) => !STOP.has(w)).map((w) => w[0]).join("");
      const mine = (w) => w === initials || w === initials.slice(0, -1) || ownTokens.has(w);          // (its acronym: "PRIMA 2005: Pacific Rim International Workshop on …")
      const named = head.slice(); while (named.length && mine(named[0])) named.shift();
      if (!core.every((w, j) => named[j] === w)) {
        if (cut < 0) return false;
      } else if (named.slice(core.length).every(mine) && (cut < 0 || named.length > core.length)) return true;          // (cut: the name, then its acronym, then the cut)
      if (cut < 0) return false;
      // a cut name shows only the start of the name — which other workshops share ("International Workshop on Search-Based Software …" is Engineering or Testing): the start must be
      // all there is before the cut and say four words of its own, not counting the track word and the connectives
      for (let k = core.length - 1; k >= 4; k--) {
        const start = core.slice(0, k);
        const own = [...ownTokens].some((t) => rawWords.includes(t));          // (with the venue's own acronym in the string — "MSR '06: … workshop on Mining software …" — two words suffice)
        if (start.filter((w) => !STOP.has(w) && !target.includes(w)).length >= (own ? 2 : 4) && holdsWord(start, target) && (own ? named : head).length === start.length && start.every((w, j) => (own ? named[j] : head[j]) === w)) return true;
      }
      return false;
    }));
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
      // spaces, the byte-order mark) are gone, every dash is a hyphen, every apostrophe and quotation mark is a straight one, white space is one space and nothing at the ends, three dots
      // are the ellipsis that marks a cut name, and a string does not end in punctuation. ("AAAI  Fall Symposium", "AAAI Fall​ Symposium" and "Late–Breaking" must be read as the symposium
      // and the late-breaking track they are, not as the conference they would be taken for if the rule that spots them did not see them.) Every scan below is linear: the text is cut at the
      // length `prepare` reads first.
      let key = String(raw == null ? "" : raw).slice(0, 1000).replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, "").replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, "-")
        .replace(/[\u2018\u2019\u201b\u02bc]/g, "'").replace(/[\u201c\u201d\u201f]/g, '"').replace(/\.{3,}/g, "…").replace(/\s+/g, " ");
      let end = key.length;
      while (end > 0 && /[\s,;:.]/.test(key[end - 1])) end--;
      key = key.slice(0, end).trim();
      if (cache.has(key)) return cache.get(key);
      let res;
      try { res = resolveUncached(key); }
      catch (e) {
        // a string the rules cannot cope with is an unranked venue, never a broken page (the tests pass `strict` to see the error)
        if (data && data.strict) throw e;
        res = { ccf: null, core: null, secondary: null, refused: false, truncated: false, name: "", kind: null };
      }
      cache.set(key, res);
      return res;
    }

    function resolveUncached(raw, inner) {
      const out = { ccf: null, core: null, secondary: null, refused: false, truncated: false, name: "", kind: null };
      const p = prepare(raw);
      out.truncated = p.truncated;
      out.name = p.name;
      if (!p.name || NON_VENUE.test(p.name)) return out;
      let hint = PERIODICALS.has(fold(p.name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()) ? "J" : typeHint(p.name);
      // "WWW 2018", "ISCA 2014 42 (3)": an acronym followed by a year names an event — unless the word is the whole title of a journal ("GeoInformatica 12 (3), 123-145, 2019":
      // written in camel case it looks like an acronym, and its volume like an edition)
      // ... nor the abbreviation of a journal that no conference has the acronym of ("TPAMI, 1-14, 2020", "ACM DLT, 1-10, 2023": with the organisation in front it is the journal's own abbreviation,
      // and CORE's Developments in Language Theory is another event)
      if (!hint) {
        const leads = acronymSignals(p).filter((s) => s.kind === "lead" && s.event);
        const journalOnly = (k) => idx.sources.ccf.J.abbrs.has(k) && !idx.sources.ccf.C.abbrs.has(k) && !idx.sources.core.C.abbrs.has(k);
        if (leads.length && !leads.some((s) => s.weak && journalOnly(s.key)) && !idx.sources.ccf.J.names.has(canonTokens(p.name, "full").join(" "))) hint = "C";
      }
      out.kind = hint;
      const secs = secondaryWords(raw);
      const matched = {}, tied = {};
      const saysAcronymOf = (e) => [...acronymSignals(p), ...embeddedSignals(p)].some((x) => x.key === squash(e.abbr || "") || stripDigits(x.key) === squash(e.abbr || ""));
      const realEntry = (e) => (Object.getPrototypeOf(e) === Object.prototype ? e : Object.getPrototypeOf(e));          // (the prefix rule hands out a view of the row: `through`)
      const badge = (src, e, rule) => src === "ccf"
        ? { tier: e.tier, name: e.name, abbr: e.abbr, area: e.area, kind: e.kind, dblp: e.dblp, rule }
        : { rank: e.rank, name: e.name, abbr: e.abbr, kind: e.kind, rule };          // (CORE ranks conferences: its kind is "C")
      for (const src of ["ccf", "core"]) {
        // CORE ranks conferences only: a string CCF identified as a journal is not one
        if (src === "core" && out.ccf && out.ccf.kind === "J") continue;
        const r = matchSource(idx, src, p, hint, idx.known);
        if (!r) continue;
        const blocking = secs.find((w) => !ownWord(r.entry, w, raw));
        if (blocking) { out.secondary = blocking; out.refused = true; continue; }
        out[src] = badge(src, r.entry, r.rule);
        matched[src] = r.entry;
        tied[src] = r.tied;
      }
      // the lists name one venue differently: what one list's wording found, the other list's row of the same venue is too (unless the track words of the string do not fit it)
      if (!out.refused) for (const [from, to] of [["ccf", "core"], ["core", "ccf"]]) {
        // (a volume with an issue is a periodical's line: "SIGSPATIAL Special 12 (3)" is the newsletter, which CORE's guard refused — what one list refused is not for the fill to add)
        if (!matched[from] || out[to] || matched[from].kind === "J" || (p.hasIssue && !CONF_SIGNAL.test(p.plain))) continue;
        // (a pick among venues of one rating — "International Conference on Data Mining": ICDM or SDM — is no venue to carry over, unless the string says the venue's own acronym)
        if (tied[from] && !saysAcronymOf(realEntry(matched[from]))) continue;
        const rows = idx.partners.get(realEntry(matched[from])) || [];
        if (rows.length === 1 && !secs.some((w) => !ownWord(rows[0], w, raw))) out[to] = badge(to, rows[0], out[from].rule);
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
        // ... one found a whole name, the other only a venue that begins with the words that are visible: the whole name is the better reading
        else if (out.ccf.rule === "prefix" && out.core.rule === "name") out.ccf = null;
        else if (out.core.rule === "prefix" && out.ccf.rule === "name") out.core = null;
      }
      // a workshop / Findings / demo string is unranked on purpose, not "missing"
      if (secs.length && !out.ccf && !out.core && !out.secondary) out.secondary = secs[0];
      // a track of a listed venue whose name did not come out whole ("CHI'13 Extended Abstracts on Human Factors in Computing Systems"): the string without its track words says which venue it is a track of
      if (secs.length && !inner && !out.refused && !out.ccf && !out.core) {
        const bare = raw.replace(new RegExp(SECONDARY.source, "gi"), " ");
        if (bare !== raw) { const again = resolveUncached(bare, true); out.refused = !!((again.ccf && again.ccf.kind !== "J") || again.core); }          // (a journal has no tracks: "Surveys & Tutorials")
      }
      return out;
    }
    return { resolve, index: idx };
  }

  return { createResolver, prepare, canonTokens, typeHint, secondaryWord, secondaryWords, squash };
});
