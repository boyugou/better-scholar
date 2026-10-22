"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const prefs = require("../src/lib/prefs.js");
const i18n = require("../src/lib/i18n.js");
const query = require("../src/lib/query.js");

const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/_locales/en/messages.json"), "utf8"));
function nest(p, value) { const out = {}; let at = out; const keys = p.split("."); for (const k of keys.slice(0, -1)) at = at[k] = {}; at[keys[keys.length - 1]] = value; return out; }
const bools = (group) => prefs.SETTINGS.filter((s) => s.kind === "bool" && s.path.startsWith(group + ".")).map((s) => s.path);

test("defaults: complete, in the table's order, and a fresh object each time", () => {
  const d = prefs.defaults();
  assert.deepEqual(Object.keys(d), [...new Set(prefs.SETTINGS.map((s) => s.path.split(".")[0]))], "the record's keys follow the table");
  assert.deepEqual(d.roles, { first: true, cofirst: true, second: true, last: true });
  assert.deepEqual(d.colors, { first: "", cofirst: "", second: "", last: "", ccf: "", core: "", award: "", talk: "" });
  assert.deepEqual(d.chips, { style: "outline", shape: "pill", label: "full" });
  assert.deepEqual(d.rows, { name: true, style: "full", ccf: true, core: true, prefer: "ccf", award: true, oral: true, spotlight: true, highlight: true });
  assert.deepEqual(d.panel.order, ["table", "copy", "marks", "filters", "metrics", "years", "venues", "status", "names"]);
  assert.deepEqual(d.panel.copy.order, ["summary", "table", "papers", "apa", "ieee", "bibtex", "markdown", "json", "csv"]);
  assert.deepEqual(d.panel.filters.pills.order, ["ccfA", "coreA", "cites100", "recent", "first", "cofirst", "second", "last", "award", "talk"]);
  assert.equal(d.panel.venues.show, false, "the venue list is off until asked");
  assert.equal(d.panel.marks.grouping, "separate");
  assert.deepEqual(prefs.PILLS.filter((id) => d.panel.filters.pills[id]), ["ccfA", "cites100", "first", "award"], "the quick filters that were always there");
  assert.deepEqual([d.mergeDuplicates, d.autoLoad, d.semanticScholar, d.language, d.scholarLanguage], [false, true, false, "auto", "keep"]);
  assert.equal(Object.values(d.hide).some(Boolean), false, "nothing of Scholar's own is hidden until asked");
  // every part and every thing in it is on, except what is off for a reason
  for (const p of prefs.SETTINGS.filter((s) => s.kind === "bool" && /^(panel|rows|roles)\./.test(s.path) && !s.path.startsWith("panel.filters.pills."))) {
    assert.equal(prefs.normalize({})[p.path.split(".")[0]] !== undefined && p.def, !["panel.venues.show", "panel.copy.ieee"].includes(p.path), p.path);
  }
  d.roles.first = false;
  d.panel.order.reverse();
  assert.equal(prefs.defaults().roles.first, true);
  assert.equal(prefs.defaults().panel.order[0], "table", "the lists are copies");
});

test("the table of settings: every row is whole, the cards hold them in the order they are drawn, and the words exist", () => {
  const paths = prefs.SETTINGS.map((s) => s.path);
  assert.equal(new Set(paths).size, paths.length, "no path twice");
  for (const s of prefs.SETTINGS) {
    assert.ok(["bool", "color", "choice", "language", "order", "text"].includes(s.kind), s.path + ": a known kind");
    assert.ok(typeof s.doc === "string" && s.doc.length > 20 && /[.)]$/.test(s.doc), s.path + ": says what it does, in a sentence");
    assert.equal(prefs.apply({}, nest(s.path, s.def)).ignored.length, 0, s.path + ": its own default is accepted");
    if (s.kind === "choice") assert.ok(s.values.includes(s.def), s.path + ": the default is one of the values");
    if (s.kind === "language") assert.ok(s.none === s.def && !i18n.codes.includes(s.none), s.path + ": the default is the 'none' word");
    if (s.kind === "order") assert.deepEqual([...s.def].sort(), [...s.values].sort(), s.path + ": the default order has every id once");
    if (s.kind === "text") assert.ok(s.def === "" && s.max === prefs.NAME_MAX && s.path === "labels." + s.label, s.path + ": a name, empty by default, called by its message key");
    if (s.kind !== "color") assert.ok(en[s.label], s.path + ": the label " + s.label + " is a message");
    if (s.hint) assert.ok(en[s.hint], s.path + ": the hint is a message");
    if (s.group) assert.ok(en[s.group], s.path + ": the group's name is a message");
    if (s.parent) assert.ok(paths.indexOf(s.parent) >= 0 && paths.indexOf(s.parent) < paths.indexOf(s.path), s.path + ": hangs on a switch above it");
  }
  for (const c of prefs.CARDS) {
    assert.ok(en[c.title], c.id + ": the title is a message");
    if (c.hint) assert.ok(en[c.hint], c.id + ": the description is a message");
  }
  assert.deepEqual(prefs.flatten(prefs.defaults()).map((x) => x.path), paths, "the record has exactly the table's settings");
  assert.deepEqual([prefs.ROLES, prefs.RANKS, prefs.MARK_GROUPS], [["first", "cofirst", "second", "last"], ["ccf", "core"], ["award", "oral", "spotlight", "highlight"]]);
  assert.deepEqual(prefs.COPY_BUTTONS, ["summary", "table", "papers", "apa", "ieee", "bibtex", "markdown", "json", "csv"]);
  assert.deepEqual(prefs.HIDE_PARTS, ["cited", "citedTable", "citedChart", "coauthors", "access"]);
  // a part of the panel has a card of its own, and the cards follow the panel's default order
  assert.deepEqual(prefs.SECTIONS.map((id) => prefs.CARDS.findIndex((c) => c.id === id)).every((i) => i >= 0), true);
  const at = prefs.SECTIONS.map((id) => prefs.CARDS.findIndex((c) => c.id === id));
  assert.deepEqual(at, [...at].sort((a, b) => a - b), "the part cards are in the order of the panel");
  for (const id of prefs.SECTIONS) assert.ok(paths.includes(`panel.${id}.show`), id + " has its own switch");
});

test("the quick filters: each is one valid term of the search language, of the kind its name says", () => {
  for (const [id, op] of Object.entries(prefs.PILL_OPERATORS)) {
    const r = query.parse(op);
    assert.deepEqual([r.errors, r.terms.length], [[], 1], id);
  }
  assert.deepEqual(prefs.PILLS, Object.keys(prefs.PILL_OPERATORS));
  assert.deepEqual(bools("panel.filters.pills"), prefs.PILLS.map((id) => "panel.filters.pills." + id));
});

test("normalize: keeps real choices, drops unknown keys, repairs wrong values, never throws", () => {
  const n = prefs.normalize({ roles: { first: false, last: "no", bogus: true }, rows: { core: false, name: 0 }, panel: { show: false, extra: 1, table: { total: false, ccf: "yes" }, marks: null }, other: 1 });
  assert.equal(n.roles.first, false);
  assert.equal(n.roles.last, true, "a non-boolean falls back to the default");
  assert.equal("bogus" in n.roles, false);
  assert.deepEqual([n.rows.core, n.rows.name, n.rows.ccf], [false, true, true]);
  assert.equal(n.panel.show, false);
  assert.deepEqual([n.panel.table.total, n.panel.table.ccf], [false, true]);
  assert.deepEqual(n.panel.marks, prefs.defaults().panel.marks);
  assert.equal("extra" in n.panel, false);
  assert.equal("other" in n, false);
  assert.equal(prefs.normalize({ autoLoad: false }).autoLoad, false);
  assert.equal(prefs.normalize({ autoLoad: "no" }).autoLoad, true);
  assert.equal(prefs.normalize({ rows: { style: "bar" } }).rows.style, "bar");
  assert.equal(prefs.normalize({ rows: { style: "none" } }).rows.style, "none");
  assert.equal(prefs.normalize({ rows: { style: "stripes" } }).rows.style, "full");
  assert.equal(prefs.normalize({ panel: { marks: { grouping: "pair" } } }).panel.marks.grouping, "pair");
  assert.equal(prefs.normalize({ panel: { marks: { grouping: 3 } } }).panel.marks.grouping, "separate");
  assert.equal(prefs.normalize({ colors: { first: "#ABCDEF", last: "red", second: "#12345", cofirst: 7 } }).colors.first, "#abcdef", "a colour is lower-cased");
  assert.deepEqual(prefs.normalize({ colors: { first: "#ABCDEF", last: "red", second: "#12345", cofirst: 7 } }).colors, { first: "#abcdef", cofirst: "", second: "", last: "", ccf: "", core: "", award: "", talk: "" });
  for (const junk of [undefined, null, 0, "x", [], [1, 2], true, () => 1]) assert.deepEqual(prefs.normalize(junk), prefs.defaults());
  assert.deepEqual(prefs.normalize(prefs.normalize(n)), n, "idempotent");
});

test("an order is always a whole permutation: ids left out follow in the default order, an unknown or repeated id spoils the list", () => {
  const first = prefs.normalize({ panel: { order: ["filters", "table"] } }).panel.order;
  assert.deepEqual(first, ["filters", "table", "copy", "marks", "metrics", "years", "venues", "status", "names"], "named first, the rest after");
  assert.deepEqual(prefs.normalize({ panel: { order: ["names", "table", "names"] } }).panel.order, prefs.defaults().panel.order, "a repeated id: the default");
  assert.deepEqual(prefs.normalize({ panel: { order: ["table", "bogus"] } }).panel.order, prefs.defaults().panel.order, "an unknown id: the default");
  assert.deepEqual(prefs.normalize({ panel: { order: "table" } }).panel.order, prefs.defaults().panel.order);
  assert.deepEqual(prefs.normalize({ panel: { copy: { order: ["json", "csv"] } } }).panel.copy.order, ["json", "csv", "summary", "table", "papers", "apa", "ieee", "bibtex", "markdown"]);
  // switching a part off never takes it out of its list
  const off = prefs.apply(prefs.defaults(), { panel: { years: { show: false }, copy: { json: false } } }).prefs;
  assert.deepEqual([off.panel.order, off.panel.copy.order], [prefs.defaults().panel.order, prefs.defaults().panel.copy.order]);

  const r = prefs.apply(prefs.defaults(), { panel: { order: ["metrics", "table", "metrics"], copy: { order: ["csv", "nope"] }, filters: { pills: { order: ["last", "first"] } } } });
  assert.deepEqual(r.ignored.map((x) => x.path), ["panel.order", "panel.copy.order"]);
  assert.match(r.ignored[0].reason, /listed twice/);
  assert.match(r.ignored[1].reason, /unknown id: "nope" \(ids: summary, table/);
  assert.deepEqual(r.applied, [{ path: "panel.filters.pills.order", from: prefs.defaults().panel.filters.pills.order, to: ["last", "first", "ccfA", "coreA", "cites100", "recent", "cofirst", "second", "award", "talk"] }]);
  assert.equal(prefs.apply(prefs.defaults(), { panel: { order: prefs.defaults().panel.order } }).unchanged[0], "panel.order", "the same order: not a change");
  assert.equal(prefs.apply(prefs.defaults(), { panel: { order: ["table"] } }).unchanged[0], "panel.order", "a list that says what already is: not a change");
  assert.match(prefs.apply(prefs.defaults(), { panel: { order: "x" } }).ignored[0].reason, /list of ids/);
  assert.match(prefs.apply(prefs.defaults(), { panel: { order: [1] } }).ignored[0].reason, /list of ids/);
});

test("languages: a folder we have, or the 'none' word; nothing else", () => {
  assert.equal(prefs.normalize({ language: "ja" }).language, "ja");
  assert.equal(prefs.normalize({ language: "zh_TW" }).language, "zh_TW");
  assert.equal(prefs.normalize({ language: "klingon" }).language, "auto");
  assert.equal(prefs.normalize({ language: "en_US" }).language, "auto", "well formed, but not a folder of _locales");
  assert.equal(prefs.normalize({ scholarLanguage: "de" }).scholarLanguage, "de");
  assert.equal(prefs.normalize({ scholarLanguage: "auto" }).scholarLanguage, "keep", "each setting has its own 'none' word");
  assert.equal(prefs.normalize({ language: 7 }).language, "auto");
});

test("normalize does not read through the prototype", () => {
  const proto = { roles: { first: false }, autoLoad: false };
  const inherits = Object.create(proto);
  assert.deepEqual(prefs.normalize(inherits), prefs.defaults());
  assert.deepEqual(prefs.normalize({ roles: Object.create({ first: false }) }), prefs.defaults());
});

test("apply: a patch is laid over the record and reported; nothing in it can break the record", () => {
  const base = prefs.defaults();
  const r = prefs.apply(base, { panel: { years: { show: false }, venues: { show: true } }, rows: { style: "bar", name: true }, colors: { first: "#ABCDEF" } });
  assert.deepEqual(r.applied, [
    { path: "rows.style", from: "full", to: "bar" },
    { path: "colors.first", from: "", to: "#abcdef" },
    { path: "panel.venues.show", from: false, to: true },
    { path: "panel.years.show", from: true, to: false }
  ].sort((a, b) => r.applied.findIndex((x) => x.path === a.path) - r.applied.findIndex((x) => x.path === b.path)), "every change, with what it was");
  assert.deepEqual(r.unchanged, ["rows.name"], "the same value: not a change");
  assert.deepEqual(r.ignored, []);
  assert.equal(r.prefs.panel.years.show, false);
  assert.equal(r.prefs.panel.years.title, true, "what the patch does not name stays");
  assert.equal(r.prefs.roles.first, true);
  assert.deepEqual(base, prefs.defaults(), "the record given is not changed");
  assert.deepEqual(prefs.normalize(r.prefs), r.prefs);

  const bad = prefs.apply(base, { panel: { years: { show: "no", bogus: 1 }, "panel.copy": false, table: 5 }, hide: 5, rows: { style: "stripes" }, colors: { first: "red" }, language: "klingon", extra: {}, "panel.show": false });
  assert.deepEqual(bad.applied, []);
  assert.deepEqual(bad.ignored.map((x) => x.path), ["panel.years.show", "panel.years.bogus", "panel.panel.copy", "panel.table", "hide", "rows.style", "colors.first", "language", "extra", "panel.show"]);
  assert.match(bad.ignored.find((x) => x.path === "rows.style").reason, /one of: full, bar, tint, none/);
  assert.match(bad.ignored.find((x) => x.path === "colors.first").reason, /#rrggbb/);
  assert.match(bad.ignored.find((x) => x.path === "language").reason, /"auto" or one of: en, zh_CN/);
  assert.equal(bad.ignored.find((x) => x.path === "panel.years.bogus").reason, "unknown setting");
  assert.equal(bad.ignored.find((x) => x.path === "panel.table").reason, "must be an object");
  assert.equal(bad.ignored.find((x) => x.path === "panel.show").reason, "unknown setting", "dotted paths are not a second syntax: the shape is the record's");
  for (const junk of [null, 5, "x", [], [{ panel: {} }]]) {
    const j = prefs.apply(base, junk);
    assert.deepEqual([j.applied, j.unchanged, j.ignored], [[], [], [{ path: "", reason: "must be a JSON object" }]]);
    assert.deepEqual(j.prefs, base);
  }
  // keys that name the prototype are only unknown settings
  const evil = prefs.apply(base, JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "panel": {"__proto__": {"polluted": true}}}'));
  assert.deepEqual(evil.ignored.map((x) => x.path), ["__proto__", "constructor", "panel.__proto__"]);
  assert.equal({}.polluted, undefined);
  assert.equal(evil.prefs.polluted, undefined);
});

test("presets are patches the table accepts, and each does what its name says", () => {
  const base = prefs.defaults();
  for (const [name, patch] of Object.entries(prefs.PRESETS)) {
    const r = prefs.apply(base, patch);
    assert.deepEqual(r.ignored, [], name + ": every key is a setting, with an accepted value");
  }
  const messy = prefs.normalize({ panel: { years: { show: false }, show: false, copy: { csv: false, show: false }, header: { fold: false } }, rows: { ccf: false, style: "bar" }, hide: { access: true }, roles: { last: false }, semanticScholar: false, language: "ja" });
  const all = prefs.apply(messy, prefs.PRESETS.all).prefs;
  const get = (o, p) => p.split(".").reduce((x, k) => x[k], o);
  const parts = prefs.SETTINGS.filter((s) => s.kind === "bool" && /^(roles|rows|panel)\./.test(s.path) && !s.path.startsWith("panel.filters.pills."));
  assert.ok(parts.length > 60);
  assert.deepEqual(parts.filter((s) => get(all, s.path) !== true).map((s) => s.path), [], "every part and every thing in it is on");
  assert.deepEqual(prefs.COPY_BUTTONS.filter((k) => !all.panel.copy[k]), []);
  assert.deepEqual(prefs.HIDE_PARTS.filter((k) => all.hide[k]), []);
  assert.equal(all.rows.style, "full");
  assert.equal(all.semanticScholar, false, "no preset switches a network call on");
  assert.equal(all.language, "ja", "nor touches the language");
  assert.deepEqual(all.panel.filters.pills, prefs.defaults().panel.filters.pills, "nor the quick filters the person chose");
  for (const p of Object.values(prefs.PRESETS)) assert.equal(p.semanticScholar, undefined);
  assert.deepEqual(prefs.apply(base, prefs.PRESETS.last).prefs.roles, { first: false, cofirst: false, second: false, last: true });
  assert.deepEqual(prefs.apply(base, prefs.PRESETS.first).prefs.roles, { first: true, cofirst: true, second: false, last: false });
  const min = prefs.apply(base, prefs.PRESETS.minimal).prefs;
  assert.deepEqual(prefs.SECTIONS.filter((id) => min.panel[id].show), ["filters", "metrics"]);
  assert.equal(min.panel.show, true);
  assert.equal(min.rows.style, "tint");
  assert.deepEqual(prefs.copyButtons(min).length, 8, "the buttons themselves stay on: the copy row is hidden as a part");
});

test("normalizeUi", () => {
  assert.deepEqual(prefs.normalizeUi(null), { collapsed: false, source: null }, "no tab picked yet");
  assert.deepEqual(prefs.normalizeUi({ collapsed: true, source: "core" }), { collapsed: true, source: "core" });
  assert.deepEqual(prefs.normalizeUi({ collapsed: "yes", source: "x" }), { collapsed: false, source: null });
});

test("the ranking the table uses: the remembered one if it has a tab, else the first that has, else none", () => {
  const p = (ccf, core) => prefs.normalize({ panel: { table: { ccf, core } } });
  assert.deepEqual(prefs.sources(p(true, true)), ["ccf", "core"]);
  assert.equal(prefs.source(p(true, true), { source: "core" }), "core");
  assert.equal(prefs.source(p(true, false), { source: "core" }), "ccf", "CORE has no tab, so the table falls back to CCF");
  assert.equal(prefs.source(p(false, true), { source: "ccf" }), "core");
  assert.equal(prefs.source(p(false, false), { source: "ccf" }), null);
  assert.deepEqual(prefs.sources(p(false, false)), []);
});

test("while the table is not drawn the summary and the exports are counted by the lists the rows' chips show", () => {
  const p = (table, rows) => prefs.normalize({ panel: { table: { show: table } }, rows });
  assert.deepEqual(prefs.sources(p(false, { ccf: true, core: false })), ["ccf"], "no table: the chips' lists");
  assert.deepEqual(prefs.sources(p(false, { ccf: false, core: false })), [], "no table and no chips: nothing draws a rank, so by role only");
  assert.deepEqual(prefs.sources(p(true, { ccf: false, core: false })), ["ccf", "core"], "the table is drawn: its tabs decide");
  assert.deepEqual(prefs.sources(prefs.normalize({ panel: { table: { show: true, ccf: false } }, rows: { ccf: true } })), ["core"], "the table's own tabs decide, not the chips");
});

test("the popup draws the table, the awards and talks counts and the copy buttons: their switches count while the panel is off; the others hang on the panel", () => {
  const rows = new Map(prefs.SETTINGS.map((s) => [s.path, s]));
  for (const part of ["table", "marks", "copy"]) assert.equal(rows.get(`panel.${part}.show`).parent, undefined, `panel.${part}.show does not hang on panel.show`);
  for (const part of ["filters", "metrics", "years", "venues", "status", "names"]) assert.equal(rows.get(`panel.${part}.show`).parent, "panel.show", `panel.${part}.show hangs on panel.show`);
  // what a thing hangs on is a switch that exists, and no chain loops
  for (const s of prefs.SETTINGS) for (let at = s, n = 0; at.parent; at = rows.get(at.parent), n++) assert.ok(rows.has(at.parent) && n < 6, `${s.path}: ${at.parent}`);
});

test("the copy buttons that are on, in the order the settings give", () => {
  assert.deepEqual(prefs.copyButtons(prefs.defaults()), ["summary", "table", "papers", "apa", "bibtex", "markdown", "json", "csv"]);
  assert.deepEqual(prefs.copyButtons(prefs.normalize({ panel: { copy: { summary: false, table: false, apa: false } } })), ["papers", "bibtex", "markdown", "json", "csv"]);
  assert.deepEqual(prefs.copyButtons(prefs.normalize({ panel: { copy: { order: ["csv", "json"], summary: false } } })), ["csv", "json", "table", "papers", "apa", "bibtex", "markdown"]);
  assert.deepEqual(prefs.copyButtons(prefs.normalize({ panel: { copy: Object.fromEntries(prefs.COPY_BUTTONS.map((k) => [k, false])) } })), []);
});

test("what is drawn: a rank list or a kind of mark is searched and exported while a chip, a table tab or a count row shows it", () => {
  const set = (patch) => prefs.apply(prefs.defaults(), patch).prefs;
  assert.deepEqual(prefs.lists(prefs.defaults()), { ccf: true, core: true });
  assert.deepEqual(prefs.lists(set({ rows: { ccf: false } })), { ccf: true, core: true }, "no CCF chip, but the table still has its tab");
  assert.deepEqual(prefs.lists(set({ rows: { ccf: false }, panel: { table: { ccf: false } } })), { ccf: false, core: true });
  assert.deepEqual(prefs.lists(set({ rows: { core: false }, panel: { table: { show: false } } })), { ccf: true, core: false }, "with the table hidden only the chips are left");
  assert.deepEqual(prefs.lists(set({ rows: { ccf: false, core: false }, panel: { table: { show: false } } })), { ccf: false, core: false }, "a hidden table shows nothing");
  assert.deepEqual(prefs.sources(set({ rows: { ccf: false }, panel: { table: { ccf: true } } })), ["ccf", "core"], "the table's tabs follow the table's switches only");

  const marks = [{ kind: "best", group: "award" }, { kind: "finalist", group: "finalist" }, { kind: "oral", group: "oral" }, { kind: "spotlight", group: "spotlight" }, { kind: "highlight", group: "highlight" }];
  const kinds = (fn, p) => fn(p, marks).map((m) => m.kind);
  assert.deepEqual(kinds(prefs.visibleMarks, prefs.defaults()), ["best", "finalist", "oral", "spotlight", "highlight"]);
  assert.deepEqual(kinds(prefs.chipMarks, prefs.defaults()), ["best", "finalist", "oral", "spotlight", "highlight"]);
  assert.deepEqual(kinds(prefs.panelMarks, prefs.defaults()), ["best", "finalist", "oral", "spotlight", "highlight"]);
  const noChips = set({ rows: { award: false, oral: false, spotlight: false, highlight: false } });
  assert.deepEqual(kinds(prefs.chipMarks, noChips), []);
  assert.deepEqual(kinds(prefs.panelMarks, noChips), ["best", "finalist", "oral", "spotlight", "highlight"]);
  assert.deepEqual(kinds(prefs.visibleMarks, noChips), ["best", "finalist", "oral", "spotlight", "highlight"], "still counted in the panel: still searched");
  const noCounts = set({ rows: { oral: false, spotlight: false, highlight: false }, panel: { marks: { oral: false, spotlight: false, highlight: false } } });
  assert.deepEqual(kinds(prefs.visibleMarks, noCounts), ["best", "finalist"], "a finalist follows the awards");
  assert.deepEqual(kinds(prefs.chipMarks, noCounts), ["best", "finalist"]);
  const none = set({ rows: { award: false, oral: false, spotlight: false, highlight: false }, panel: { marks: { show: false } } });
  assert.deepEqual(kinds(prefs.visibleMarks, none), [], "nothing draws a mark");
  assert.deepEqual(prefs.visibleMarks(prefs.defaults(), undefined), []);
  assert.deepEqual(prefs.markShown(set({ panel: { marks: { award: false } }, rows: { award: false } }), "finalist"), false);
});

test("a dotted key is not a second syntax, whichever setting it names", () => {
  const r = prefs.apply(prefs.defaults(), { "panel.years.show": false });
  assert.deepEqual([r.applied, r.unchanged, r.ignored.map((x) => x.path)], [[], [], ["panel.years.show"]]);
  assert.equal(r.prefs.panel.years.show, true);
});

test("the record fits what chrome.storage.sync takes: 8 KB for an item, so the worst case is checked here", () => {
  const worst = prefs.apply(prefs.defaults(), { colors: { first: "#abcdef", cofirst: "#abcdef", second: "#abcdef", last: "#abcdef" }, panel: { order: [...prefs.SECTIONS].reverse(), copy: { order: [...prefs.COPY_BUTTONS].reverse() }, filters: { pills: { order: [...prefs.PILLS].reverse() } } } }).prefs;
  assert.ok(Buffer.byteLength(JSON.stringify(worst)) < 4096, "the settings: " + Buffer.byteLength(JSON.stringify(worst)) + " bytes");
});

test("the quick filters that are drawn: in their order, those that are on and can find something", () => {
  const set = (patch) => prefs.apply(prefs.defaults(), patch).prefs;
  assert.deepEqual(prefs.pills(prefs.defaults()), ["ccfA", "cites100", "first", "award"]);
  assert.deepEqual(prefs.pills(set({ panel: { filters: { pills: { order: ["award", "first"], cites100: false } } } })), ["award", "first", "ccfA"]);
  assert.deepEqual(prefs.pills(set({ rows: { ccf: false }, panel: { table: { ccf: false } } })), ["cites100", "first", "award"], "CCF is drawn nowhere: nothing to find with ccf:a");
  assert.deepEqual(prefs.pills(set({ rows: { award: false }, panel: { marks: { award: false } } })), ["ccfA", "cites100", "first"]);
  assert.deepEqual(prefs.pills(set({ panel: { filters: { pills: { talk: true, coreA: true, last: true } } } })), ["ccfA", "coreA", "cites100", "first", "last", "award", "talk"]);
  assert.deepEqual(prefs.pills(set({ rows: { oral: false, spotlight: false, highlight: false }, panel: { marks: { oral: false, spotlight: false, highlight: false }, filters: { pills: { talk: true } } } })), ["ccfA", "cites100", "first", "award"], "no talk is drawn: no quick filter for talks");
});

test("names: a text of the screen in the person's own words; every one is a single piece of the catalogue, and its row says what it is", () => {
  const keys = Object.keys(prefs.NAMES);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(prefs.SETTINGS.filter((s) => s.kind === "text").map((s) => s.label).sort(), [...keys].sort(), "a name for each, once");
  for (const [key, [where, words]] of Object.entries(prefs.NAMES)) {
    assert.equal(en[key] && en[key].message, words, key + ": the English words here are the catalogue's");
    assert.ok(!/\$/.test(words) && !en[key + "One"] && !en[key].placeholders, key + ": nothing is put into it, and it has no plural");
    assert.ok(where.length > 8, key);
    const row = prefs.SETTINGS.find((s) => s.path === "labels." + key);
    assert.ok(row.doc.includes(JSON.stringify(words)) && row.doc.includes(where), key + ": the row says where it is drawn and what it says");
    assert.ok(words.length <= 36, key);
  }
  // a name is on the row of its switch (inline) or on its own, and never before the part it belongs to
  for (const s of prefs.SETTINGS.filter((x) => x.kind === "text")) { if (s.parent) assert.ok(prefs.SETTINGS.some((x) => x.path === s.parent), s.path); }
});

test("names: one line of at most 30 characters; anything else is left out with the reason", () => {
  const set = (patch) => prefs.apply(prefs.defaults(), patch);
  assert.equal(prefs.defaults().labels.metricsTitle, "");
  assert.equal(set({ labels: { metricsTitle: "  My   papers \n" } }).prefs.labels.metricsTitle, "My papers", "trimmed, on one line");
  assert.equal(set({ labels: { metricsTitle: "我的论文" } }).prefs.labels.metricsTitle, "我的论文");
  assert.equal(set({ labels: { metricsTitle: "x".repeat(30) } }).ignored.length, 0);
  const long = set({ labels: { metricsTitle: "x".repeat(31), mH: 5, roleFirst: "Lead", nonsense: "x" } });
  assert.deepEqual(long.ignored.map((x) => x.path), ["labels.metricsTitle", "labels.mH", "labels.nonsense"]);
  assert.match(long.ignored[0].reason, /at most 30 characters/);
  assert.equal(long.prefs.labels.roleFirst, "Lead", "the rest is applied");
  assert.deepEqual(set({ labels: { roleFirst: "" } }).unchanged, ["labels.roleFirst"], "empty is the built-in text: not a change");
  assert.equal(prefs.normalize({ labels: { mH: "a".repeat(40), mI10: "ok" } }).labels.mH, "", "a stored name that is too long is the built-in text");
  assert.equal(prefs.normalize({ labels: { mI10: " ok " } }).labels.mI10, "ok");
  assert.equal(prefs.normalize({ labels: "no" }).labels.mH, "");
});

test("the record, with every name at its longest in a language that takes three bytes a character, fits chrome.storage.sync's 8 KB for an item", () => {
  const labels = Object.fromEntries(Object.keys(prefs.NAMES).map((k) => [k, "字".repeat(prefs.NAME_MAX)]));
  const worst = prefs.apply(prefs.defaults(), { labels, colors: { first: "#abcdef", cofirst: "#abcdef", second: "#abcdef", last: "#abcdef" },
    panel: { order: [...prefs.SECTIONS].reverse(), copy: { order: [...prefs.COPY_BUTTONS].reverse() }, filters: { pills: { order: [...prefs.PILLS].reverse() } } } });
  assert.deepEqual(worst.ignored, []);
  const bytes = Buffer.byteLength(JSON.stringify(worst.prefs)) + "prefs".length;
  assert.ok(bytes < 7400, "the record is " + bytes + " bytes");
});

test("names: nothing in a name shows nothing or turns the text around, and what some scripts need stays", () => {
  const r = prefs.apply(prefs.defaults(), { labels: { metricsTitle: "My\u202e papers\u200b\u2066", copySummary: "Copy\u0000 \u00adsum\u3164mary\ufeff\u{e0001}\u{e0041}" } });
  assert.deepEqual([r.prefs.labels.metricsTitle, r.prefs.labels.copySummary], ["My papers", "Copy summary"], "overrides, isolates, zero-width characters, fillers, tag characters and controls are gone");
  const persian = "می\u200cخواهم";          // (a non-joiner inside a word)
  assert.equal(prefs.apply(prefs.defaults(), { labels: { metricsTitle: persian } }).prefs.labels.metricsTitle, persian, "the zero-width non-joiner stays");
  const hebrew = "עברית\u200f (1)";          // (a right-to-left mark that fixes the punctuation of a Hebrew name in a left-to-right page)
  assert.equal(prefs.apply(prefs.defaults(), { labels: { metricsTitle: hebrew } }).prefs.labels.metricsTitle, hebrew, "the direction marks stay");
  assert.equal(prefs.normalize({ labels: { mH: "h\u202e-index" } }).labels.mH, "h-index", "a stored record is read the same way");
  // what is left of a name is one line of single spaces; a name of nothing but marks is no name; the variation selectors of the supplement are hidden text, those of Mongolian letters are not
  const one = (v) => prefs.apply(prefs.defaults(), { labels: { metricsTitle: v } }).prefs.labels.metricsTitle;
  assert.equal(one("My \u00ad papers"), "My papers", "a soft hyphen between two spaces leaves one space");
  assert.equal(one("\u200e"), "", "a name of only a direction mark shows nothing: it is no name");
  assert.equal(one(" \u200f\ufe0f\u200d "), "");
  assert.equal(one("Best\u{e0100}\u{e0101}"), "Best", "the variation selectors of the supplement are gone");
  const mongolian = "ᠮᠣᠩᠭᠣᠯ\u180b";
  assert.equal(one(mongolian), mongolian, "the Mongolian variation selector shapes a letter");
  assert.equal(one("❤\ufe0f"), "❤\ufe0f", "and an emoji keeps its presentation selector");
});

test("the record's size is counted the way Chrome counts it: a '<' is six bytes, and a patch that would make the record too large for chrome.storage.sync is refused whole", () => {
  assert.equal(prefs.sizeOf({ a: "<" }), Buffer.byteLength('{"a":"<"}') + 5, "a < is \\u003C in Chrome's JSON");
  assert.ok(prefs.sizeOf(prefs.defaults()) < 3500, "the defaults: " + prefs.sizeOf(prefs.defaults()));
  const labels = Object.fromEntries(Object.keys(prefs.NAMES).map((k) => [k, "<".repeat(prefs.NAME_MAX)]));
  const r = prefs.apply(prefs.defaults(), { labels, rows: { style: "bar" } });
  assert.deepEqual(r.applied, [], "nothing of it is applied, the other setting in the patch too");
  assert.match(r.ignored.at(-1).reason, /more than Chrome's sync storage keeps for one item/);
  assert.deepEqual(r.prefs, prefs.defaults(), "the record is as it was");
  // the same names in characters that cost three bytes fit, as before
  const ok = prefs.apply(prefs.defaults(), { labels: Object.fromEntries(Object.keys(prefs.NAMES).map((k) => [k, "字".repeat(prefs.NAME_MAX)])) });
  assert.equal(ok.applied.length, Object.keys(prefs.NAMES).length);
});

test("the counts follow the filters: on by default, a switch of the filters' card with its hint, and the panel's only (it hangs on the panel itself)", () => {
  assert.equal(prefs.defaults().panel.filters.follow, true);
  const row = prefs.SETTINGS.find((r) => r.path === "panel.filters.follow");
  assert.equal(row.kind, "bool");
  assert.equal(row.parent, "panel.show");
  assert.deepEqual([row.label, row.hint], ["optFiltersFollow", "optFiltersFollowHint"]);
  assert.ok(prefs.CARDS.find((c) => c.id === "filters").rows.some((r) => r.path === "panel.filters.follow"), "it is on the filters' card");
  const off = prefs.apply(prefs.defaults(), { panel: { filters: { follow: false } } });
  assert.deepEqual(off.applied.map((a) => [a.path, a.to]), [["panel.filters.follow", false]]);
});

test("rows.prefer: where both lists rank a venue, one chip — the preferred list's — and the other fills in where it has no rank", () => {
  const d = prefs.defaults();
  assert.equal(d.rows.prefer, "ccf");
  const both = { ccf: { tier: "A" }, core: { rank: "A*" } };
  assert.deepEqual(prefs.chipLists(d, both), { shown: ["ccf"], hidden: ["core"] });
  assert.deepEqual(prefs.chipLists(d, { core: { rank: "B" } }), { shown: ["core"], hidden: [] }, "CCF has no rank for the venue: CORE fills in");
  assert.deepEqual(prefs.chipLists(d, { ccf: { tier: "C" }, core: null }), { shown: ["ccf"], hidden: [] });
  assert.deepEqual(prefs.chipLists(d, null), { shown: [], hidden: [] });
  assert.deepEqual(prefs.chipLists(d, {}), { shown: [], hidden: [] });
  assert.deepEqual(prefs.chipLists(prefs.normalize({ rows: { prefer: "core" } }), both), { shown: ["core"], hidden: ["ccf"] });
  assert.deepEqual(prefs.chipLists(prefs.normalize({ rows: { prefer: "core" } }), { ccf: { tier: "B" } }), { shown: ["ccf"], hidden: [] }, "the other way round: CCF fills in");
  assert.deepEqual(prefs.chipLists(prefs.normalize({ rows: { prefer: "both" } }), both), { shown: ["ccf", "core"], hidden: [] });
  // only between lists that are drawn: a list whose chip is off is not left out for one that is, and a preferred list that is not drawn wins nothing
  assert.deepEqual(prefs.chipLists(prefs.normalize({ rows: { ccf: false } }), both), { shown: ["core"], hidden: [] });
  assert.deepEqual(prefs.chipLists(prefs.normalize({ rows: { core: false } }), both), { shown: ["ccf"], hidden: [] });
  assert.deepEqual(prefs.chipLists(prefs.normalize({ rows: { prefer: "core", core: false } }), both), { shown: ["ccf"], hidden: [] });
  assert.deepEqual(prefs.chipLists(prefs.normalize({ rows: { ccf: false, core: false } }), both), { shown: [], hidden: [] });
  // the venue list and the notes of the copies go by the lists drawn anywhere (a chip or a tab of the table)
  assert.equal(prefs.winner(d), "ccf");
  assert.equal(prefs.winner(prefs.normalize({ rows: { prefer: "core" } })), "core");
  assert.equal(prefs.winner(prefs.normalize({ rows: { prefer: "both" } })), null);
  assert.equal(prefs.winner(prefs.normalize({ rows: { core: false }, panel: { table: { core: false } } })), null, "CORE is drawn nowhere");
  assert.equal(prefs.winner(prefs.normalize({ rows: { core: false } })), "ccf", "CORE is still a tab of the table: it is drawn");
  // a value that is not a choice falls back, and a patch names it
  assert.equal(prefs.normalize({ rows: { prefer: "both?" } }).rows.prefer, "ccf");
  assert.deepEqual(prefs.apply(d, { rows: { prefer: "none" } }).ignored.map((x) => x.path), ["rows.prefer"]);
  assert.equal(prefs.apply(d, { rows: { prefer: "core" } }).prefs.rows.prefer, "core");
  // the ready-made patch that shows everything shows both lists
  assert.equal(prefs.apply(d, prefs.PRESETS.all).prefs.rows.prefer, "both");
});

test("the table opens on the list the settings prefer until a tab is picked on this device", () => {
  const withPrefer = (prefer, ccf = true, core = true) => prefs.normalize({ rows: { prefer, ccf, core }, panel: { table: { ccf, core } } });
  assert.equal(prefs.source(withPrefer("ccf"), { source: null }), "ccf");
  assert.equal(prefs.source(withPrefer("core"), { source: null }), "core");
  assert.equal(prefs.source(withPrefer("both"), { source: null }), "ccf", "no preference: the first list");
  assert.equal(prefs.source(withPrefer("core"), { source: "ccf" }), "ccf", "a tab picked on this device wins");
  assert.equal(prefs.source(withPrefer("core", true, false), { source: null }), "ccf", "the preferred list has no tab: the first that has");
});


test("the winner never keeps a list whose chip is off over one whose chip is on", () => {
  const p = (rows, panel) => prefs.normalize({ rows, panel });
  // chips: CORE only; the CCF tab is still on: CCF first would keep the list that has no chip — no winner, both lists are drawn somewhere
  assert.equal(prefs.winner(p({ ccf: false })), null);
  assert.equal(prefs.winner(p({ ccf: false, prefer: "core" })), "core", "the preferred list has its chip: it wins");
  assert.equal(prefs.winner(p({ core: false, prefer: "core" })), null, "the other way round");
  assert.equal(prefs.winner(p({ core: false })), "ccf");
  // no chip at all: the tabs decide, as before
  assert.equal(prefs.winner(p({ ccf: false, core: false })), "ccf");
  assert.equal(prefs.winner(p({ ccf: false, core: false, prefer: "core" })), "core");
  // the chips and the winner agree for one venue both lists rank
  const both = { ccf: { tier: "A" }, core: { rank: "A*" } };
  assert.deepEqual(prefs.chipLists(p({ ccf: false }), both), { shown: ["core"], hidden: [] });
});

test("the counts of marks in the panel, the popup and a copied summary follow the part's own switch too (what you see is what you copy)", () => {
  const on = prefs.normalize({});
  const marks = [{ group: "award" }, { group: "oral" }, { group: "finalist" }];
  assert.equal(prefs.panelMarks(on, marks).length, 3);
  const off = prefs.apply(on, { panel: { marks: { show: false } } }).prefs;
  assert.deepEqual(prefs.panelMarks(off, marks), []);
  const noOral = prefs.apply(on, { panel: { marks: { oral: false } } }).prefs;
  assert.deepEqual(prefs.panelMarks(noOral, marks).map((m) => m.group), ["award", "finalist"]);
});

