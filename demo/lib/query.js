// The search box's language: words, and operators of the form name:value. Pure, no DOM; the panel's autocomplete, the agent guide and the matcher all read OPERATORS.
//
//   deep learning        every word must be somewhere in the paper (title, authors — the whole list once Read full lists has read it —, venue, the venue's name in the lists, year, role, marks)
//   cites:>100           citations compared with a number: > >= < <= = (a bare number means =)
//   year:>=2020          the year compared the same way
//   age:<5               how old, in years, compared the same way: this year is 0, so age:<5 is this year and the four before it
//   ccf:a   core:a*      the venue's rank in that list
//   role:first           your position: first, cofirst, second, last, or middle (none of those)
//   type:journal         the venue's kind as the rank lists say it: conference or journal (a venue without a rank has none)
//   has:award            an award or finalist mark; has:talk: Oral, Spotlight or Highlight
//   role:first,last      a comma lists values of one operator (ccf, core, role, type, has): any of them, so "first or last author"; separate words must all hold
// A word with a colon whose front is no operator ("http://…") is a word like any other. An operator with a value it does not take matches nothing, and is
// named in `errors`, so that whoever typed it (a person, an agent) can see why.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).query = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COMPARE = "(>=|<=|>|<|=)?(\\d{1,9})";
  // name → { how the value is read, the values it takes, examples that the panel suggests, the documentation }
  const OPERATORS = [
    { name: "cites", value: new RegExp("^" + COMPARE + "$"), example: "cites:>100", suggest: ["cites:>100", "cites:>500", "cites:>1000"],
      doc: "citations compared with a number: > >= < <= = (a bare number means =)." },
    { name: "year", value: new RegExp("^" + COMPARE + "$"), example: "year:>=2020", suggest: ["year:>2020", "year:>=2015"],
      doc: "the publication year compared the same way." },
    { name: "age", value: new RegExp("^" + COMPARE + "$"), example: "age:<5", suggest: ["age:<5", "age:<=10"],
      doc: "how old the paper is, in years, compared the same way: this year is 0, so age:<5 is this year and the four before it (the last five years; it stays true as the years go by)." },
    { name: "ccf", value: /^[abc]$/, example: "ccf:a", suggest: ["ccf:a", "ccf:b", "ccf:c"], doc: "the venue's CCF rank: a, b or c." },
    { name: "core", value: /^(?:a\*|[abc])$/, example: "core:a*", suggest: ["core:a*", "core:a", "core:b"], doc: "the venue's CORE rank: a*, a, b or c." },
    { name: "role", value: /^(?:first|cofirst|second|last|middle)$/, example: "role:first", suggest: ["role:first", "role:cofirst", "role:second", "role:last"],
      doc: "your position in the author list: first, cofirst, second, last, or middle (none of those four)." },
    { name: "type", value: /^(?:conference|journal)$/, example: "type:journal", suggest: ["type:conference", "type:journal"],
      doc: "the kind of venue the rank lists say it is: conference or journal (a venue without a rank has no kind)." },
    { name: "has", value: /^(?:award|talk)$/, example: "has:award", suggest: ["has:award", "has:talk"],
      doc: "has:award — a best-paper award or finalist mark; has:talk — an Oral, Spotlight or Highlight mark." }
  ];
  const BY_NAME = new Map(OPERATORS.map((o) => [o.name, o]));
  // the operators whose values are a few words, so that a comma can list them ("any of these")
  const LISTED = new Set(["ccf", "core", "role", "type", "has"]);
  // what the panel offers when the box is empty and the person asks for suggestions (each is one of the operators' `suggest`)
  const POPULAR = ["role:first", "role:last", "ccf:a", "core:a*", "cites:>100", "age:<5", "has:award", "has:talk"];
  const TEXT_FIELDS = 8000;       // a longer query than this is cut: nobody types it, and a script could send anything

  // → { terms, errors }. A term is { kind: "text", text } | { kind: "cites" | "year" | "age", op, n } | { kind: "ccf" | "core" | "role" | "type" | "has", values: [any of these] } | { kind: "never" }.
  function parse(q) {
    const terms = [], errors = [];
    for (const word of String(q == null ? "" : q).slice(0, TEXT_FIELDS).toLowerCase().split(/\s+/).filter(Boolean)) {
      const at = word.indexOf(":");
      const op = at > 0 ? BY_NAME.get(word.slice(0, at)) : undefined;
      if (!op) { terms.push({ kind: "text", text: word }); continue; }
      const raw = word.slice(at + 1), bad = () => { terms.push({ kind: "never" }); errors.push(`${word} — ${op.doc.replace(/\.$/, "")}`); };
      if (LISTED.has(op.name)) {                                              // (a comma lists values: "role:first,last"; one still typing, "role:first,", has the one it has)
        const values = [...new Set(raw.split(",").filter(Boolean))];
        if (!values.length || values.some((v) => !op.value.test(v))) bad(); else terms.push({ kind: op.name, values });
        continue;
      }
      const m = op.value.exec(raw);
      if (!m) { bad(); continue; }
      terms.push({ kind: op.name, op: m[1] || "=", n: parseInt(m[2], 10) });
    }
    return { terms, errors };
  }

  const COMPARERS = { ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b, "=": (a, b) => a === b };

  // fields: { text: [lower-case strings to look into], year: number | null, citations: number, role: string, ccf: "a" | null, core: "a*" | null, type: "conference" | "journal" | null, award: boolean, talk: boolean }
  // `now`: the current year, for `age` (a paper of this year is 0 years old)
  function matches(parsed, fields, now = new Date().getFullYear()) {
    return parsed.terms.every((term) => {
      switch (term.kind) {
        case "text": return fields.text.some((s) => s.includes(term.text)) || (fields.year != null && String(fields.year) === term.text) || fields.role === term.text;
        case "cites": return COMPARERS[term.op](fields.citations, term.n);
        case "year": return fields.year != null && COMPARERS[term.op](fields.year, term.n);
        case "age": return fields.year != null && COMPARERS[term.op](now - fields.year, term.n);
        case "ccf": return term.values.includes(fields.ccf);
        case "core": return term.values.includes(fields.core);
        case "role": return term.values.includes(fields.role);
        case "type": return term.values.includes(fields.type);
        case "has": return term.values.some((v) => (v === "award" ? fields.award : fields.talk));
        default: return false;
      }
    });
  }

  // ---- the quick filters in a query ------------------------------------------------------------------------------------------------------------
  // A quick filter is one `operator:value` ("role:first"). Pressed beside another of the same operator it joins its word ("role:first,last": either), rather than becoming a second
  // word that must hold as well (nothing is both a first and a last author).
  const words = (q) => String(q == null ? "" : q).trim().split(/\s+/).filter(Boolean);
  const split = (word) => { const at = word.indexOf(":"); return at > 0 ? { name: word.slice(0, at).toLowerCase(), values: word.slice(at + 1).toLowerCase().split(",").filter(Boolean) } : null; };
  const parts = (op) => { const at = op.indexOf(":"); return { name: op.slice(0, at), value: op.slice(at + 1) }; };

  // Is this quick filter in the query?
  function hasValue(q, op) {
    const { name, value } = parts(op);
    return words(q).some((w) => (LISTED.has(name) ? (() => { const s = split(w); return !!s && s.name === name && s.values.includes(value); })() : w.toLowerCase() === op));
  }
  // The query with the quick filter put in (joining the word of its operator) or taken out
  function toggleValue(q, op) {
    const ws = words(q), { name, value } = parts(op);
    // (taken out of every word that has it: the person may have typed it twice)
    if (!LISTED.has(name)) { const left = ws.filter((w) => w.toLowerCase() !== op); return (left.length < ws.length ? left : [...ws, op]).join(" "); }
    if (ws.some((w) => { const s = split(w); return !!s && s.name === name && s.values.includes(value); })) {
      return ws.flatMap((w) => {
        const s = split(w);
        if (!s || s.name !== name || !s.values.includes(value)) return [w];
        const left = s.values.filter((v) => v !== value);
        return left.length ? [name + ":" + left.join(",")] : [];
      }).join(" ");
    }
    const same = ws.findIndex((w) => { const s = split(w); return !!s && s.name === name; });
    if (same >= 0) ws[same] = ws[same].replace(/,+$/, "") + "," + value; else ws.push(op);
    return ws.join(" ");
  }
  // The words and values of the query that are quick filters in `allowed` (a Set of "operator:value"), in lower case: what stays when the search box is not there to hold the rest
  function keepOnly(q, allowed) {
    const out = [];
    for (const w of words(q)) {
      const lw = w.toLowerCase(), s = split(lw);
      if (allowed.has(lw)) out.push(lw);                                                      // (a whole word: one of your own quick filters' words)
      else if (s && LISTED.has(s.name)) { const keep = s.values.filter((v) => allowed.has(s.name + ":" + v)); if (keep.length) out.push(s.name + ":" + keep.join(",")); }
    }
    return out.join(" ");
  }

  // ---- a quick filter of your own: several words ----------------------------------------------------------------------------------------------------
  // Its words go into the search whole, each as it is: "has:award has:talk" stays two words that must both hold (split into values they would join into
  // "has:award,talk", either one). Pressed means: every one of its words is a word of the search, so a built-in button that joins one of them ("role:first" + Last →
  // "role:first,last") leaves it unpressed, as its words no longer describe the search.
  const searchParts = (words_) => [...new Set(words(words_).map((w) => w.toLowerCase()))];
  const hasAll = (q, words_) => { const ps = searchParts(words_), ws = new Set(words(q).map((w) => w.toLowerCase())); return ps.length > 0 && ps.every((p) => ws.has(p)); };
  // The query with its words put in (those not there yet) or, when all are there, taken out
  function toggleAll(q, words_) {
    const ps = searchParts(words_), ws = words(q);
    if (hasAll(q, words_)) return ws.filter((w) => !ps.includes(w.toLowerCase())).join(" ");
    // (the other words of a listed operator it has go first: beside its word they would still press their built-in buttons while its word decides —
    // "role:first,last role:first" is first authors only, under a pressed Last — and the same clicks in another order would give another search)
    const ops = new Set(ps.map(split).filter((s) => s && LISTED.has(s.name)).map((s) => s.name));
    const kept = ws.filter((w) => { const s = split(w); return !(s && ops.has(s.name)) || ps.includes(w.toLowerCase()); });
    return [...kept, ...ps.filter((p) => !kept.some((w) => w.toLowerCase() === p))].join(" ");
  }

  return { OPERATORS, POPULAR, LISTED, parse, matches, hasValue, toggleValue, keepOnly, searchParts, hasAll, toggleAll };
});
