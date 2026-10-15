// The search box's language: words, and operators of the form name:value. Pure, no DOM; the panel's autocomplete, the agent guide and the matcher all read OPERATORS.
//
//   deep learning        every word must be somewhere in the paper (title, authors, venue, the venue's name in the lists, year, role, marks)
//   cites:>100           citations compared with a number: > >= < <= = (a bare number means =)
//   year:>=2020          the year compared the same way
//   ccf:a   core:a*      the venue's rank in that list
//   role:first           your position: first, cofirst, second, last, or middle (none of those)
//   has:award            an award or finalist mark; has:talk: Oral, Spotlight or Highlight
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
    { name: "ccf", value: /^[abc]$/, example: "ccf:a", suggest: ["ccf:a", "ccf:b", "ccf:c"], doc: "the venue's CCF rank: a, b or c." },
    { name: "core", value: /^(?:a\*|[abc])$/, example: "core:a*", suggest: ["core:a*", "core:a", "core:b"], doc: "the venue's CORE rank: a*, a, b or c." },
    { name: "role", value: /^(?:first|cofirst|second|last|middle)$/, example: "role:first", suggest: ["role:first", "role:cofirst", "role:second", "role:last"],
      doc: "your position in the author list: first, cofirst, second, last, or middle (none of those four)." },
    { name: "has", value: /^(?:award|talk)$/, example: "has:award", suggest: ["has:award", "has:talk"],
      doc: "has:award — a best-paper award or finalist mark; has:talk — an Oral, Spotlight or Highlight mark." }
  ];
  const BY_NAME = new Map(OPERATORS.map((o) => [o.name, o]));
  // what the panel offers when the box is empty and the person asks for suggestions (each is one of the operators' `suggest`)
  const POPULAR = ["role:first", "role:last", "ccf:a", "core:a*", "cites:>100", "year:>2020", "has:award", "has:talk"];
  const TEXT_FIELDS = 8000;       // a longer query than this is cut: nobody types it, and a script could send anything

  // → { terms, errors }. A term is { kind: "text", text } | { kind: "cites" | "year", op, n } | { kind: "ccf" | "core" | "role" | "has", value } | { kind: "never" }.
  function parse(q) {
    const terms = [], errors = [];
    for (const word of String(q == null ? "" : q).slice(0, TEXT_FIELDS).toLowerCase().split(/\s+/).filter(Boolean)) {
      const at = word.indexOf(":");
      const op = at > 0 ? BY_NAME.get(word.slice(0, at)) : undefined;
      if (!op) { terms.push({ kind: "text", text: word }); continue; }
      const raw = word.slice(at + 1), m = op.value.exec(raw);
      if (!m) { terms.push({ kind: "never" }); errors.push(`${word} — ${op.doc.replace(/\.$/, "")}`); continue; }
      terms.push(op.name === "cites" || op.name === "year" ? { kind: op.name, op: m[1] || "=", n: parseInt(m[2], 10) } : { kind: op.name, value: raw });
    }
    return { terms, errors };
  }

  const COMPARERS = { ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b, "=": (a, b) => a === b };

  // fields: { text: [lower-case strings to look into], year: number | null, citations: number, role: string, ccf: "a" | null, core: "a*" | null, award: boolean, talk: boolean }
  function matches(parsed, fields) {
    return parsed.terms.every((term) => {
      switch (term.kind) {
        case "text": return fields.text.some((s) => s.includes(term.text)) || (fields.year != null && String(fields.year) === term.text) || fields.role === term.text;
        case "cites": return COMPARERS[term.op](fields.citations, term.n);
        case "year": return fields.year != null && COMPARERS[term.op](fields.year, term.n);
        case "ccf": return fields.ccf === term.value;
        case "core": return fields.core === term.value;
        case "role": return fields.role === term.value;
        case "has": return term.value === "award" ? fields.award : fields.talk;
        default: return false;
      }
    });
  }

  return { OPERATORS, POPULAR, parse, matches };
});
