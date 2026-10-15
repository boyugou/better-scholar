// Award and talk-level markers that authors write into a paper's title or venue field on
// Scholar ("(Oral)", "ICLR 2023 Spotlight", "Best Paper Award"). Pure, no DOM.
//
// Precision first, like the venue matcher: a marker counts only where it is unmistakably a
// marker, never inside an ordinary word or title ("Oral Oncology", "Research Highlights",
// "Spotlight on Education", "Oral Histories"). In a venue string an award phrase counts
// anywhere; a talk word (oral / spotlight / highlight) must stand on its own — after a
// delimiter, a year or a venue acronym, and before a delimiter, a year or the end. In a title it
// only counts inside a trailing or leading ( … ) / [ … ] or after a trailing " – " when that
// bracket holds nothing but marker words and venue/year tokens.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).marks = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Display priority, most notable first.
  const KINDS = ["best", "best-student", "outstanding", "distinguished", "best-category", "runner-up", "tot", "finalist", "oral", "spotlight", "highlight"];
  // What the panel counts: every award a paper won, and each talk level. A finalist is only shown.
  const GROUP = {
    best: "award", "best-student": "award", outstanding: "award", distinguished: "award", "best-category": "award", "runner-up": "award", tot: "award",
    finalist: "finalist", oral: "oral", spotlight: "spotlight", highlight: "highlight"
  };
  const GROUPS = ["award", "oral", "spotlight", "highlight"];
  const LABEL = {
    best: "Best paper", "best-student": "Best student paper", outstanding: "Outstanding paper", distinguished: "Distinguished paper",
    "best-category": "Category award", "runner-up": "Honorable mention", tot: "Test of time", finalist: "Best paper finalist", oral: "Oral", spotlight: "Spotlight", highlight: "Highlight"
  };
  // A category award ("Best Resource Paper", "Best Theme Paper") is shown under its own printed name, shortened for a chip.
  function categoryLabel(printed) {
    const s = String(printed || "").replace(/^\s*(?:ACL|EMNLP|NAACL|EACL|COLING)\s+/i, "").replace(/\s+award\s*$/i, "").replace(/\s+/g, " ").trim();
    if (!s) return LABEL["best-category"];
    return s.length > 26 ? s.slice(0, 25).trimEnd() + "…" : s;
  }
  const groupOf = (kind) => GROUP[kind] || null;

  const S = "[-\\s]";   // separator inside a phrase: "best paper", "best-paper"
  // Order matters: a lesser honour is tried before the award it contains, and a span that
  // is already taken is never read twice ("Best Paper Runner-up" is not "Best Paper").
  const PHRASES = [
    { kind: "finalist", label: "Best paper finalist",
      re: new RegExp(`\\b(?:best${S}paper${S}(?:award${S})?(?:finalists?|nominees?|nominations?|candidates?)|(?:award|best${S}paper)${S}(?:finalist|nominee|candidate)|(?:nominated|shortlisted)${S}for${S}(?:the${S})?best${S}paper(?:${S}award)?|award${S}candidates?)\\b`, "gi") },
    { kind: "runner-up", label: (m) => (/runner/i.test(m) ? "Best paper runner-up" : "Honorable mention"),
      re: new RegExp(`\\b(?:(?:best|outstanding|distinguished)${S}paper${S}(?:award${S})?(?:runner${S}?up|honou?rable${S}mention)|(?:second|2nd|third|3rd)${S}best${S}paper(?:${S}award)?|runner${S}?up${S}(?:for${S})?(?:the${S})?best${S}paper|honou?rable${S}mention(?:${S}award)?)\\b`, "gi") },
    { kind: "best-student", label: "Best student paper", re: new RegExp(`\\bbest${S}student${S}paper(?:${S}award)?\\b`, "gi") },
    { kind: "best", label: "Best short paper", re: new RegExp(`\\bbest${S}short${S}paper(?:${S}award)?\\b`, "gi") },
    { kind: "best", label: "Best paper",
      re: new RegExp(`\\bbest${S}(?:(?:long|full|research|main${S}track|application|applied|systems?|theory|industry|dataset|resource)${S})?paper(?:${S}award)?\\b`, "gi") },
    { kind: "outstanding", label: "Outstanding paper",
      re: new RegExp(`\\boutstanding${S}(?:(?:student|long|short|main${S}track|research)${S})*paper(?:${S}award)?\\b`, "gi") },
    { kind: "distinguished", label: "Distinguished paper", re: new RegExp(`\\bdistinguished${S}(?:student${S})?paper(?:${S}award)?\\b`, "gi") },
    { kind: "tot", label: "Test of time",
      re: new RegExp(`\\b(?:test${S}of${S}time(?:${S}(?:paper${S})?award)?|most${S}influential${S}paper(?:${S}award)?|(?:10|ten)${S}years?${S}(?:most${S}influential|test${S}of${S}time)(?:${S}paper)?(?:${S}award)?|classic${S}paper${S}award)\\b`, "gi") },
    // ICLR's own wording for orals and spotlights
    { kind: "oral", label: "Oral", talk: true, re: /\bnotable[-\s]top[-\s]?5\s*%/gi },
    { kind: "spotlight", label: "Spotlight", talk: true, re: /\bnotable[-\s]top[-\s]?25\s*%/gi },
    { kind: "oral", label: "Oral", talk: true, re: new RegExp(`\\b(?:(?:long|short|full)${S})?oral(?:${S}(?:presentation|paper|talk|session|track))?\\b`, "gi") },
    { kind: "spotlight", label: "Spotlight", talk: true, re: new RegExp(`\\bspotlight(?:${S}(?:presentation|paper|talk|track|poster))?\\b`, "gi") },
    { kind: "highlight", label: "Highlight", talk: true, re: new RegExp(`\\bhighlights?(?:${S}(?:paper|presentation|poster))?\\b`, "gi") }
  ];

  const SPACES = /[   -​  　]/g;
  // (NFKC turns the styled letters some authors paste in — 𝐎𝐫𝐚𝐥, 𝘉𝘦𝘴𝘵 𝘗𝘢𝘱𝘦𝘳, full-width ＯＲＡＬ — back into plain ones)
  const norm = (s) => String(s == null ? "" : s)
    .normalize("NFKC")
    .replace(SPACES, " ")
    .replace(/[（［【]/g, (c) => (c === "（" ? "(" : "[")).replace(/[）］】]/g, (c) => (c === "）" ? ")" : "]"))
    .replace(/\s+/g, " ").trim();

  // Every phrase occurrence, longest-priority first, never overlapping.
  function scan(text) {
    const taken = new Array(text.length).fill(false);
    const out = [];
    for (const p of PHRASES) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(text))) {
        const start = m.index, end = start + m[0].length;
        if (taken.slice(start, end).some(Boolean)) continue;
        for (let i = start; i < end; i++) taken[i] = true;
        out.push({ kind: p.kind, label: typeof p.label === "function" ? p.label(m[0]) : p.label, talk: !!p.talk, start, end, text: m[0] });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  // A year, a two-digit year, or something that reads like a venue acronym ("ICLR", "NeurIPS").
  function filler(tok, venueWord) {
    const t = tok.replace(/^[(\[]+|[)\],.;:]+$/g, "");
    if (!t) return true;
    if (/^(?:19|20)\d{2}$/.test(t) || /^['’]\d{2}$/.test(t) || /^\d+%$/.test(t)) return true;
    if (/^(?:and|&|\+|top|at|@|award|awards|winner|winning|paper)$/i.test(t)) return true;
    if (/^[A-Z][A-Za-z]*[A-Z0-9][A-Za-z0-9+&-]*$/.test(t)) return true;
    return !!(venueWord && venueWord(t.toLowerCase()));
  }

  // In a venue string a talk word must stand alone.
  function standsAlone(text, m, venueWord) {
    const before = text.slice(0, m.start), after = text.slice(m.end);
    let okBefore = !before.trim() || /(?:[(\[,;:|/]|\s[–—-])\s*$/.test(before);
    if (!okBefore) okBefore = filler(before.trim().split(/\s+/).pop(), venueWord);
    return okBefore && /^\s*(?:$|[)\](\[,;:|/]|\s?[–—-]\s|(?:19|20)\d{2}\b)|^\s+(?:at|@)\s+(?:the\s+)?[A-Z0-9']/.test(after);
  }

  // The bracketed or dashed tails and heads of a title that could hold a marker. Several brackets in a row
  // ("… (Oral) (Best Paper Finalist)") are each a segment.
  function titleSegments(title) {
    const segs = [];
    let rest = title, m;
    for (let i = 0; i < 3 && (m = /[(\[]([^()\[\]]{1,80})[)\]]\s*$/.exec(rest)); i++) { segs.push(m[1]); rest = rest.slice(0, m.index).trimEnd(); }
    rest = title;
    for (let i = 0; i < 3 && (m = /^\s*[(\[]([^()\[\]]{1,80})[)\]]\s*[:–—-]?\s*(?=\S)/.exec(rest)); i++) { segs.push(m[1]); rest = rest.slice(m[0].length); }
    m = /\s[–—|-]\s+([^–—|]{1,80})$/.exec(title);
    if (m) segs.push(m[1]);
    return segs;
  }

  // A segment counts only if, once its marker phrases are removed, nothing but venue/year words is left.
  function markerOnly(seg, found, venueWord) {
    let rest = "", at = 0;
    for (const f of found) { rest += seg.slice(at, f.start) + " "; at = f.end; }
    rest += seg.slice(at);
    return rest.split(/[\s,;:&+/|–—-]+/).filter(Boolean).every((tok) => filler(tok, venueWord));
  }

  // fields: { title?: string, venue?: string | string[] };  opts: { venueWord?: (lowercase word) => boolean }
  // → [{ kind, group, label, text, field }] — one per kind, most notable first.
  function detect(fields, opts = {}) {
    const venueWord = opts.venueWord;
    const found = new Map();
    const add = (m, field) => { if (!found.has(m.kind)) found.set(m.kind, { kind: m.kind, group: GROUP[m.kind], label: m.label, text: m.text.trim(), field, source: "author" }); };

    const venues = [].concat(fields.venue || []).map(norm).filter(Boolean);
    for (const v of venues) {
      for (const m of scan(v)) if (!m.talk || standsAlone(v, m, venueWord)) add(m, "venue");
    }
    const title = norm(fields.title);
    if (title) {
      for (const seg of titleSegments(title)) {
        const ms = scan(seg);
        if (ms.length && markerOnly(seg, ms, venueWord)) for (const m of ms) add(m, "title");
      }
    }
    return KINDS.filter((k) => found.has(k)).map((k) => found.get(k));
  }

  // Combine what the author wrote with what the award list says. The list wins where both name the same
  // kind (it is the better evidence) but remembers the author's words in `declared`.
  //   listed: [{ kind, venue, year, awardLabel }]  →  [{ kind, group, label, source, … }], most notable first
  function merge(declared, listed) {
    const byKind = new Map();
    for (const m of declared || []) byKind.set(m.kind, m);
    for (const m of listed || []) {
      const prev = byKind.get(m.kind);
      byKind.set(m.kind, {
        kind: m.kind, group: GROUP[m.kind], label: m.kind === "best-category" ? categoryLabel(m.awardLabel) : LABEL[m.kind], text: "", field: "list", source: "list",
        venue: m.venue, year: m.year, awardLabel: m.awardLabel || "", ...(prev ? { declared: prev.text } : {})
      });
    }
    return KINDS.filter((k) => byKind.has(k)).map((k) => byKind.get(k));
  }

  // The panel's rows. Talk levels may be shown together: "pair" puts spotlight and highlight in one row, "talks" puts oral too.
  // A merged row's id joins its members with "+" ("spotlight+highlight"); a paper counts once in it however many of them it has.
  const TALK_ROWS = ["separate", "pair", "talks"];
  const MERGED = { pair: ["spotlight", "highlight"], talks: ["oral", "spotlight", "highlight"] };
  const members = (id) => String(id).split("+");
  function rows(mode) {
    const m = MERGED[mode];
    return m ? ["award", ...GROUPS.filter((g) => g !== "award" && !m.includes(g) && GROUPS.indexOf(g) < GROUPS.indexOf(m[0])), m.join("+")] : GROUPS.slice();
  }

  // Counts for the panel: papers per row (a paper counts once per row) among `papers`, each `{ marks: [...] }`.
  // Rows with no paper are left out.
  function summarize(papers, mode) {
    const counts = {};
    const ids = rows(mode);
    for (const p of papers) {
      const have = new Set((p.marks || []).map((m) => m.group));
      for (const id of ids) if (members(id).some((g) => have.has(g))) counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  }

  // Papers per award kind (a paper counts once per kind): what the panel's "Awards" count is made of — best papers and test-of-time
  // awards apart from the many honorable mentions that a conference such as CHI gives.
  function summarizeKinds(papers) {
    const counts = {};
    for (const p of papers) {
      for (const k of new Set((p.marks || []).filter((m) => m.group === "award").map((m) => m.kind))) counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }

  const inGroup = (paper, group) => members(group).some((g) => (paper.marks || []).some((m) => m.group === g));

  return { KINDS, GROUPS, TALK_ROWS, rows, members, LABEL, groupOf, scan, detect, merge, summarize, summarizeKinds, inGroup };
});
