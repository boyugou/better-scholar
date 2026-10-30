// The search box's language: words, and operators of the form name:value. Pure, no DOM; the panel's autocomplete, the agent guide and the matcher all read OPERATORS.
//
//   deep learning        every word must be somewhere in the paper (title, authors — the whole list once Read full lists has read it —, venue, the venue's name in the lists, year, role, marks):
//                        at the start of a word ("learn" finds "learning"), a word of one or two letters as a whole word ("he" is the author He, not "the"), a word in
//                        Chinese, Japanese or Korean anywhere; accents and capitals aside ("dollar" finds "Dollár")
//   "genome editing"     the words one after the other;  -crispr  NOT crispr  without the word (or the operator: -role:first);  cas9 OR cas12a  either
//   author:hinton        the word in that field only: author, title, venue
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
    { name: "ccf", value: /^[abc]$/, values: ["a", "b", "c"], example: "ccf:a", suggest: ["ccf:a", "ccf:b", "ccf:c"], doc: "the venue's CCF rank: a, b or c." },
    { name: "core", value: /^(?:a\*|[abc])$/, values: ["a*", "a", "b", "c"], example: "core:a*", suggest: ["core:a*", "core:a", "core:b"], doc: "the venue's CORE rank: a*, a, b or c." },
    { name: "role", value: /^(?:first|cofirst|second|last|middle)$/, values: ["first", "cofirst", "second", "last", "middle"], example: "role:first", suggest: ["role:first", "role:cofirst", "role:second", "role:last"],
      doc: "your position in the author list: first, cofirst, second, last, or middle (none of those four)." },
    { name: "type", value: /^(?:conference|journal)$/, values: ["conference", "journal"], example: "type:journal", suggest: ["type:conference", "type:journal"],
      doc: "the kind of venue the rank lists say it is: conference or journal (a venue without a rank has no kind)." },
    { name: "has", value: /^(?:award|talk)$/, values: ["award", "talk"], example: "has:award", suggest: ["has:award", "has:talk"],
      doc: "has:award — a best-paper award or finalist mark; has:talk — an Oral, Spotlight or Highlight mark." }
  ];
  // the operators that look for a word in one field (an empty value, "author:" while it is typed, asks nothing)
  const FIELDS = [
    { name: "author", example: "author:hinton", doc: "a word of the author list only (the whole list once Read full lists has read it)." },
    { name: "title", example: "title:transformer", doc: "a word of the title only." },
    { name: "venue", example: "venue:neurips", doc: "a word of the venue only (the line Scholar prints, the paper page's line once read, the venue's names in the lists)." }
  ];
  for (const f of FIELDS) OPERATORS.push({ ...f, value: /^.+$/, suggest: [], field: true });
  const BY_NAME = new Map(OPERATORS.map((o) => [o.name, o]));
  // the operators whose values are a few words, so that a comma can list them ("any of these")
  const LISTED = new Set(["ccf", "core", "role", "type", "has"]);
  // what the panel offers when the box is empty and the person asks for suggestions (each is one of the operators' `suggest`)
  const POPULAR = ["role:first", "role:last", "ccf:a", "core:a*", "cites:>100", "age:<5", "has:award", "has:talk"];
  const TEXT_FIELDS = 8000;       // a longer query than this is cut: nobody types it, and a script could send anything

  // → { terms, errors, problems }. `errors` says in English what could not be read (for a script or an agent); `problems` the same as { word, name } (the operator), for
  // the panel to say in the interface's language. A term is { kind: "text", text } | { kind: "cites" | "year" | "age", op, n } | { kind: "ccf" | "core" | "role" | "type" | "has", values: [any of these] } | { kind: "never" }.
  // Accents, capitals and the width of a letter aside: "Dollár" is "dollar", "ＣＣＦ：Ａ" (a Chinese input method) is "ccf:a"
  const LETTERS = { "ł": "l", "ø": "o", "đ": "d", "ð": "d", "þ": "th", "ß": "ss", "æ": "ae", "œ": "oe", "ı": "i", "ħ": "h" };
  const flat = (text) => fold(String(text).normalize("NFKC")).replace(/\s+/g, "");          // (a word in one form: folded, without spaces — "role:first, last" is "role:first,last")
  const fold = (s) => String(s == null ? "" : s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").normalize("NFC").toLowerCase().replace(/[łøđðþßæœıħ]/g, (c) => LETTERS[c]);

  // The words of a query as typed: a quoted phrase is one word ("genome editing", also in curly quotes), and a listed operator's values go on past a space after a comma
  // or the colon ("ccf:a, b" is "ccf:a,b", "role: first" is "role:first")
  function tokens(q) {
    const out = [];
    // (a field's value in quotes — Scholar's own author:"GE Hinton" — is that field's phrase: one word here, read by the operator)
    const re = /(-?[^\s"“”„«»:]+:)["“”„«»]([^"“”„«»]*)["“”„«»]?|(-?)["“”„«»]([^"“”„«»]*)["“”„«»]?|(\S+)/g;
    let m;
    while ((m = re.exec(q))) {
      if (m[1] !== undefined) out.push({ word: m[1] + m[2].trim().replace(/\s+/g, " ") });
      else if (m[5] !== undefined) out.push({ word: m[5] });
      else out.push({ word: m[3] + m[4].trim().replace(/\s+/g, " "), phrase: true });
    }
    for (let i = 0; i < out.length - 1; i++) {
      if (!out[i].phrase && !out[i + 1].phrase && !out[i + 1].word.includes(":") && continues(out[i].word, out[i + 1].word)) { out[i].word += out[i + 1].word; out.splice(i + 1, 1); i--; }
    }
    return out;
  }
  // (does the next word go on with a listed operator's values — "role:first," then "last"? Only when it is values the operator takes: "role:first, transformer" is two words)
  function continues(prev, next) {
    const p = flat(prev), at = p.indexOf(":"), op = at > 0 ? BY_NAME.get(p.slice(p[0] === "-" ? 1 : 0, at)) : null;
    if (!op || !LISTED.has(op.name) || !/[:,、،]$/.test(p)) return false;
    const values = flat(next).split(/[,、،]/).filter(Boolean);
    return values.length > 0 && values.every((v) => op.value.test(v));
  }

  function parse(q) {
    const terms = [], errors = [], problems = [];
    let not = false, or = false;
    const put = (term) => {
      if (not) { term = { kind: "not", term }; not = false; }
      if (or && terms.length) { const prev = terms.pop(); terms.push({ kind: "any", terms: [...(prev.kind === "any" ? prev.terms : [prev]), term] }); } else terms.push(term);
      or = false;
    };
    for (const { word: typed, phrase } of tokens(String(q == null ? "" : q).slice(0, TEXT_FIELDS).normalize("NFKC"))) {
      if (typed === "OR" && !phrase) { or = terms.length > 0; continue; }          // (in capitals, as Scholar writes them; "or" and "not" are words)
      if (typed === "NOT" && !phrase) { not = true; continue; }
      let word = fold(typed);
      if (word.length > 1 && word[0] === "-") { not = true; word = word.slice(1); }
      if (phrase) { if (word) put({ kind: "text", text: word }); else not = false; continue; }
      const at = word.indexOf(":");
      const op = at > 0 ? BY_NAME.get(word.slice(0, at)) : undefined;
      if (!op) { put({ kind: "text", text: word }); continue; }
      const raw = word.slice(at + 1), bad = () => { not = false; put({ kind: "never" }); errors.push(`${word} — ${op.doc.replace(/\.$/, "")}`); problems.push({ word, name: op.name }); };
      if (op.field) { if (raw) put({ kind: "text", text: raw, field: op.name }); else not = false; continue; }
      if (LISTED.has(op.name)) {                                              // (a comma lists values: "role:first,last"; one still typing, "role:first,", has the one it has; the ideographic and Arabic commas too)
        const values = [...new Set(raw.split(/[,、،]/).filter(Boolean))];
        if (!values.length || values.some((v) => !op.value.test(v))) bad(); else put({ kind: op.name, values });
        continue;
      }
      const m = op.value.exec(raw);
      if (!m) { bad(); continue; }
      put({ kind: op.name, op: m[1] || "=", n: parseInt(m[2], 10) });
    }
    return { terms, errors, problems };
  }

  // A word is looked for at the start of a word of the text, a word of one or two letters or digits as a whole word; a word in a script that does not put spaces
  // between words (Chinese, Japanese, Thai …: no Latin letter or digit in it) anywhere. (made once for each word of a query)
  const PATTERNS = new WeakMap();
  // (a letter or digit of a word — not one of a script that writes no spaces: "基于BERT的", "面向5G网络" hold the words "bert" and "5g")
  const WORD = "(?:(?![\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}\\p{Script=Thai}])[\\p{L}\\p{N}])";
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function pattern(term) {
    let p = PATTERNS.get(term);
    if (!p) {
      if (!/[a-z0-9]/.test(term.text)) p = { test: (s) => s.includes(term.text) };
      else {
        const last = term.text.split(" ").pop();
        p = new RegExp("(?<!" + WORD + ")" + term.text.split(" ").map(escape).join("[^\\p{L}\\p{N}]+") + (/^[\p{L}\p{N}]{1,2}$/u.test(last) ? "(?!" + WORD + ")" : ""), "u");
      }
      PATTERNS.set(term, p);
    }
    return p;
  }

  const COMPARERS = { ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b, "=": (a, b) => a === b };

  // fields: { text: [strings to look into, folded], title, authors, venue: [the same, by field], year: number | null, citations: number, role: string, ccf: "a" | null, core: "a*" | null, type: "conference" | "journal" | null, award: boolean, talk: boolean }
  // `now`: the current year, for `age` (a paper of this year is 0 years old)
  function matches(parsed, fields, now = new Date().getFullYear()) {
    const holds = (term) => {
      switch (term.kind) {
        case "text": {
          const p = pattern(term);
          if (term.field) return (fields[term.field] || []).some((s) => p.test(s));
          return fields.text.some((s) => p.test(s)) || (fields.year != null && String(fields.year) === term.text) || fields.role === term.text;
        }
        case "not": return !holds(term.term);
        case "any": return term.terms.some(holds);
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
    };
    return parsed.terms.every(holds);
  }

  // ---- the quick filters in a query ------------------------------------------------------------------------------------------------------------
  // A quick filter is one `operator:value` ("role:first"). Pressed beside another of the same operator it joins its word ("role:first,last": either), rather than becoming a second
  // word that must hold as well (nothing is both a first and a last author).
  // The query is read in units, each with its text as typed: a word; a quoted phrase; NOT and what follows it, or a word with a minus; terms joined by OR; a listed operator's
  // values past a space ("role:first, last"). Only a plain unit — a word, not left out, not one of an OR — is a button's: "NOT role:first" and "role:first OR has:award" press
  // no First button, and a button never joins its value to them. (`word`: a plain unit in one form, folded, without spaces; `key`: what is compared — a listed operator's values
  // once each, in order, so that "Role:Last,first," is "role:first,last")
  const QUOTE = /["“”„«»]/;
  const kw = (t) => String(t).normalize("NFKC");          // (OR and NOT typed in full width are OR and NOT, as the search reads them)
  function units(q) {
    const raw = String(q == null ? "" : q).match(/-?[^\s"“”„«»:]+:["“”„«»][^"“”„«»]*["“”„«»]?|-?["“”„«»][^"“”„«»]*["“”„«»]?|\S+/g) || [];
    const toks = [];
    for (const t of raw) {
      const prev = toks[toks.length - 1];
      if (prev && !QUOTE.test(prev.text) && !QUOTE.test(t) && !flat(t).includes(":") && kw(t) !== "OR" && kw(t) !== "NOT" && continues(prev.text, t)) { prev.text += " " + t; continue; }
      toks.push({ text: t });
    }
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      let text = toks[i].text, opaque = QUOTE.test(text) || /^-./.test(text);
      if (kw(text) === "NOT" && i + 1 < toks.length) { text += " " + toks[++i].text; opaque = true; }
      else if (kw(text) === "NOT" || kw(text) === "OR") opaque = true;          // (a NOT or an OR still waiting for its word: a button's word goes before it — appendable())
      while (i + 2 < toks.length && kw(toks[i + 1].text) === "OR") { text += " " + toks[i + 1].text + " " + toks[i + 2].text; i += 2; opaque = true; }
      const word = flat(text);
      out.push({ text, plain: !opaque, word, key: opaque ? fold(text.normalize("NFKC")).replace(/\s+/g, " ") : norm(word) });
    }
    return out;
  }
  // the words of a query with new ones put in — before a NOT or an OR at its end that still waits for its word ("deep NOT" + First is "deep role:first NOT")
  const appended = (texts, add) => { const last = texts[texts.length - 1]; return last != null && /^(?:NOT|OR)$/.test(kw(last)) ? [...texts.slice(0, -1), ...add, last] : [...texts, ...add]; };
  const split = (word) => { const at = word.indexOf(":"); return at > 0 ? { name: word.slice(0, at), values: word.slice(at + 1).split(/[,、،]/).filter(Boolean) } : null; };
  const norm = (w) => { const s = split(w); return s && LISTED.has(s.name) && s.values.length ? s.name + ":" + [...new Set(s.values)].sort().join(",") : w; };
  const parts = (op) => { const at = op.indexOf(":"); return { name: op.slice(0, at), value: op.slice(at + 1) }; };
  const of = (u, name) => { const s = u.plain && split(u.word); return s && s.name === name ? s : null; };

  // Is this quick filter in the query?
  function hasValue(q, op) {
    const { name, value } = parts(op);
    return units(q).some((u) => (LISTED.has(name) ? !!of(u, name) && of(u, name).values.includes(value) : u.plain && u.word === op));
  }
  // The query with the quick filter put in (joining the word of its operator) or taken out
  function toggleValue(q, op) {
    const us = units(q), { name, value } = parts(op);
    // (taken out of every word that has it: the person may have typed it twice)
    if (!LISTED.has(name)) { const left = us.filter((u) => !(u.plain && u.word === op)); return (left.length < us.length ? left.map((u) => u.text) : appended(us.map((u) => u.text), [op])).join(" "); }
    if (us.some((u) => of(u, name) && of(u, name).values.includes(value))) {
      return us.flatMap((u) => {
        const s = of(u, name);
        if (!s || !s.values.includes(value)) return [u.text];
        const left = s.values.filter((v) => v !== value);
        return left.length ? [name + ":" + left.join(",")] : [];
      }).join(" ");
    }
    const texts = us.map((u) => u.text), same = us.findIndex((u) => of(u, name));
    if (same >= 0) texts[same] = name + ":" + [...of(us[same], name).values, value].join(",");
    return (same >= 0 ? texts : appended(texts, [op])).join(" ");
  }
  // The units of the query that are quick filters in `allowed` (a Set of "operator:value" and of your own filters' keys): what stays when the search box is not there to hold the
  // rest. A unit of your own filter stays as typed (its OR and NOT in capitals); of a listed operator's plain word, the values that are buttons; a word left out or one of an OR goes
  function keepOnly(q, allowed) {
    const out = [];
    for (const u of units(q)) {
      if (allowed.has(u.key)) out.push(u.plain ? u.word : u.text);
      else if (u.plain) { const s = split(u.word); if (s && LISTED.has(s.name)) { const keep = s.values.filter((v) => allowed.has(s.name + ":" + v)); if (keep.length) out.push(s.name + ":" + keep.join(",")); } }
    }
    return out.join(" ");
  }

  // ---- a quick filter of your own: several units ----------------------------------------------------------------------------------------------------
  // Its units go into the search whole, each as it is: "has:award has:talk" stays two words that must both hold (split into values they would join into
  // "has:award,talk", either one); "cas9 OR cas12a" and "NOT survey" stay what they are. Pressed means: every one of its units is a unit of the search, so a built-in button that
  // joins one of them ("role:first" + Last → "role:first,last") leaves it unpressed, as its words no longer describe the search.
  const searchParts = (words_) => [...new Set(units(words_).map((u) => u.key))];
  const hasAll = (q, words_) => { const ps = searchParts(words_), ks = new Set(units(q).map((u) => u.key)); return ps.length > 0 && ps.every((p) => ks.has(p)); };
  // the listed operators whose values exclude each other (a paper has one role, a venue one rank in a list and one kind): a filter's word of one takes the place of its other words.
  // `has` is not one of them: a paper can have an award and a talk, and "has:award has:talk" asks for both
  const SINGLE = new Set(["role", "ccf", "core", "type"]);
  // The query with its units put in (those not there yet) or, when all are there, taken out
  function toggleAll(q, words_) {
    const ps = searchParts(words_), us = units(q);
    if (hasAll(q, words_)) return us.filter((u) => !ps.includes(u.key)).map((u) => u.text).join(" ");
    // (the other plain words of an operator of one value that it has go first: beside its word they would still press their built-in buttons while its word decides —
    // "role:first,last role:first" is first authors only, under a pressed Last — and the same clicks in another order would give another search)
    const own = units(words_);
    const ops = new Set(own.map((u) => u.plain && split(u.word)).filter((x) => x && SINGLE.has(x.name)).map((x) => x.name));
    const kept = us.filter((u) => { const x = u.plain && split(u.word); return !(x && ops.has(x.name)) || ps.includes(u.key); });
    const add = [...new Map(own.map((u) => [u.key, u.plain ? u.word.replace(/[,、،]+$/, "") : u.text])).entries()].filter(([p]) => !kept.some((u) => u.key === p)).map(([, w]) => w);          // (as the person wrote them)
    return appended(kept.map((u) => u.text), add).join(" ");
  }

  return { OPERATORS, POPULAR, LISTED, fold, parse, matches, hasValue, toggleValue, keepOnly, searchParts, hasAll, toggleAll };
});
