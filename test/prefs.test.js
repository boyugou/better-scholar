"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const prefs = require("../src/lib/prefs.js");
const i18n = require("../src/lib/i18n.js");

test("defaults: complete, in the table's order, and a fresh object each time", () => {
  const d = prefs.defaults();
  assert.deepEqual(d, {
    language: "auto",
    scholarLanguage: "keep",
    roles: { first: true, cofirst: true, second: true, last: true },
    markName: true,
    colors: { first: "", cofirst: "", second: "", last: "" },
    rowStyle: "full",
    ranks: { ccf: true, core: true },
    marks: { award: true, oral: true, spotlight: true, highlight: true },
    talkRows: "separate",
    mergeDuplicates: false,
    hide: { cited: false, citedTable: false, citedChart: false, coauthors: false, access: false },
    panel: { show: true, summary: true, marks: true, filters: true, metrics: true, years: true, venues: false, status: true, names: true },
    copy: { summary: true, table: true, papers: true, apa: true, bibtex: true, markdown: true, json: true, csv: true },
    semanticScholar: false,
    autoLoad: true
  });
  assert.deepEqual(Object.keys(d), [...new Set(prefs.SETTINGS.map((s) => s.path.split(".")[0]))], "the record's keys follow the table");
  d.roles.first = false;
  assert.equal(prefs.defaults().roles.first, true);
});

test("the table of settings: every row is whole, and the groups the code uses are the table's", () => {
  const paths = prefs.SETTINGS.map((s) => s.path);
  assert.equal(new Set(paths).size, paths.length, "no path twice");
  for (const s of prefs.SETTINGS) {
    assert.ok(["bool", "color", "choice", "language"].includes(s.kind), s.path + ": a known kind");
    assert.ok(typeof s.doc === "string" && s.doc.length > 20 && /[.)]$/.test(s.doc), s.path + ": says what it does, in a sentence");
    assert.equal(prefs.apply({}, nest(s.path, s.def)).ignored.length, 0, s.path + ": its own default is accepted");
    if (s.kind === "choice") assert.ok(s.values.includes(s.def), s.path + ": the default is one of the values");
    if (s.kind === "language") assert.ok(s.none === s.def && !i18n.codes.includes(s.none), s.path + ": the default is the 'none' word");
  }
  assert.deepEqual(prefs.flatten(prefs.defaults()).map((x) => x.path), paths, "the record has exactly the table's settings");
  assert.deepEqual([prefs.ROLES, prefs.RANKS, prefs.MARK_GROUPS], [["first", "cofirst", "second", "last"], ["ccf", "core"], ["award", "oral", "spotlight", "highlight"]]);
  assert.deepEqual(prefs.PANEL_PARTS, ["show", "summary", "marks", "filters", "metrics", "years", "venues", "status", "names"]);
  assert.deepEqual(prefs.COPY_BUTTONS, ["summary", "table", "papers", "apa", "bibtex", "markdown", "json", "csv"]);
  assert.deepEqual(prefs.HIDE_PARTS, ["cited", "citedTable", "citedChart", "coauthors", "access"]);
});
function nest(path, value) { const out = {}; let at = out; const keys = path.split("."); for (const k of keys.slice(0, -1)) at = at[k] = {}; at[keys[keys.length - 1]] = value; return out; }

test("normalize: keeps real choices, drops unknown keys, repairs wrong values, never throws", () => {
  const n = prefs.normalize({ roles: { first: false, last: "no", bogus: true }, ranks: { core: false }, markName: 0, marks: null, panel: { show: false, extra: 1 }, copy: { csv: false, text: false }, other: 1 });
  assert.equal(n.roles.first, false);
  assert.equal(n.roles.last, true, "a non-boolean falls back to the default");
  assert.equal("bogus" in n.roles, false);
  assert.deepEqual(n.ranks, { ccf: true, core: false });
  assert.equal(n.markName, true);
  assert.deepEqual(n.marks, prefs.defaults().marks);
  assert.deepEqual(n.panel, { ...prefs.defaults().panel, show: false });
  assert.deepEqual(n.copy, { ...prefs.defaults().copy, csv: false }, "only the buttons the table names");
  assert.equal("other" in n, false);
  assert.equal(prefs.normalize({ autoLoad: false }).autoLoad, false);
  assert.equal(prefs.normalize({ autoLoad: "no" }).autoLoad, true);
  assert.equal(prefs.normalize({ rowStyle: "bar" }).rowStyle, "bar");
  assert.equal(prefs.normalize({ rowStyle: "stripes" }).rowStyle, "full");
  assert.equal(prefs.normalize({ talkRows: "pair" }).talkRows, "pair");
  assert.equal(prefs.normalize({ talkRows: 3 }).talkRows, "separate");
  assert.equal(prefs.normalize({ colors: { first: "#ABCDEF", last: "red", second: "#12345", cofirst: 7 } }).colors.first, "#abcdef", "a colour is lower-cased");
  assert.deepEqual(prefs.normalize({ colors: { first: "#ABCDEF", last: "red", second: "#12345", cofirst: 7 } }).colors, { first: "#abcdef", cofirst: "", second: "", last: "" });
  for (const junk of [undefined, null, 0, "x", [], [1, 2], true, () => 1]) assert.deepEqual(prefs.normalize(junk), prefs.defaults());
  assert.deepEqual(prefs.normalize(prefs.normalize(n)), n, "idempotent");
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
  const r = prefs.apply(base, { panel: { years: false, venues: true }, rowStyle: "bar", colors: { first: "#ABCDEF" }, markName: true });
  assert.deepEqual(r.applied, [
    { path: "panel.years", from: true, to: false },
    { path: "panel.venues", from: false, to: true },
    { path: "rowStyle", from: "full", to: "bar" },
    { path: "colors.first", from: "", to: "#abcdef" }
  ]);
  assert.deepEqual(r.unchanged, ["markName"], "the same value: not a change");
  assert.deepEqual(r.ignored, []);
  assert.equal(r.prefs.panel.years, false);
  assert.equal(r.prefs.roles.first, true, "what the patch does not name stays");
  assert.deepEqual(base, prefs.defaults(), "the record given is not changed");
  assert.deepEqual(prefs.normalize(r.prefs), r.prefs);

  const bad = prefs.apply(base, { panel: { years: "no", bogus: 1 }, "panel.copy": false, hide: 5, rowStyle: "stripes", colors: { first: "red" }, language: "klingon", copy: { csv: false }, extra: {} });
  assert.deepEqual(bad.applied, [{ path: "copy.csv", from: true, to: false }], "the good part of a patch is applied");
  assert.deepEqual(bad.ignored.map((x) => x.path), ["panel.years", "panel.bogus", "panel.copy", "hide", "rowStyle", "colors.first", "language", "extra"]);
  assert.match(bad.ignored.find((x) => x.path === "rowStyle").reason, /one of: full, bar, tint/);
  assert.match(bad.ignored.find((x) => x.path === "colors.first").reason, /#rrggbb/);
  assert.match(bad.ignored.find((x) => x.path === "language").reason, /"auto" or one of: en, zh_CN/);
  assert.equal(bad.ignored.find((x) => x.path === "panel.bogus").reason, "unknown setting");
  assert.equal(bad.ignored.find((x) => x.path === "panel.copy").reason, "unknown setting", "dotted paths are not a second syntax: the shape is the record's");
  assert.equal(bad.ignored.find((x) => x.path === "hide").reason, "must be an object");
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
  const all = prefs.apply(prefs.normalize({ panel: { years: false, show: false }, copy: { csv: false }, hide: { access: true }, roles: { last: false }, semanticScholar: false, language: "ja" }), prefs.PRESETS.all).prefs;
  assert.deepEqual(prefs.PANEL_PARTS.filter((k) => !all.panel[k]), []);
  assert.deepEqual(prefs.COPY_BUTTONS.filter((k) => !all.copy[k]), []);
  assert.deepEqual(prefs.HIDE_PARTS.filter((k) => all.hide[k]), []);
  assert.deepEqual(prefs.ROLES.filter((k) => !all.roles[k]), []);
  assert.equal(all.semanticScholar, false, "no preset switches a network call on");
  assert.equal(all.language, "ja", "nor touches the language");
  for (const p of Object.values(prefs.PRESETS)) assert.equal(p.semanticScholar, undefined);
  assert.deepEqual(prefs.apply(base, prefs.PRESETS.last).prefs.roles, { first: false, cofirst: false, second: false, last: true });
  assert.deepEqual(prefs.apply(base, prefs.PRESETS.first).prefs.roles, { first: true, cofirst: true, second: false, last: false });
  const min = prefs.apply(base, prefs.PRESETS.minimal).prefs;
  assert.deepEqual(prefs.PANEL_PARTS.filter((k) => min.panel[k]), ["show", "filters", "metrics"]);
  assert.deepEqual(prefs.copyButtons(min), []);
});

test("normalizeUi", () => {
  assert.deepEqual(prefs.normalizeUi(null), { collapsed: false, source: "ccf" });
  assert.deepEqual(prefs.normalizeUi({ collapsed: true, source: "core" }), { collapsed: true, source: "core" });
  assert.deepEqual(prefs.normalizeUi({ collapsed: "yes", source: "x" }), { collapsed: false, source: "ccf" });
});

test("the ranking the table uses: the remembered one if it is on, else the first that is, else none", () => {
  const p = (ccf, core) => prefs.normalize({ ranks: { ccf, core } });
  assert.deepEqual(prefs.sources(p(true, true)), ["ccf", "core"]);
  assert.equal(prefs.source(p(true, true), { source: "core" }), "core");
  assert.equal(prefs.source(p(true, false), { source: "core" }), "ccf", "CORE is off, so the table falls back to CCF");
  assert.equal(prefs.source(p(false, true), { source: "ccf" }), "core");
  assert.equal(prefs.source(p(false, false), { source: "ccf" }), null);
  assert.deepEqual(prefs.sources(p(false, false)), []);
});

test("the copy buttons that are on, in the order they are drawn", () => {
  assert.deepEqual(prefs.copyButtons(prefs.defaults()), ["summary", "table", "papers", "apa", "bibtex", "markdown", "json", "csv"]);
  assert.deepEqual(prefs.copyButtons(prefs.normalize({ copy: { summary: false, table: false, apa: false } })), ["papers", "bibtex", "markdown", "json", "csv"]);
  assert.deepEqual(prefs.copyButtons(prefs.normalize({ copy: Object.fromEntries(prefs.COPY_BUTTONS.map((k) => [k, false])) })), []);
});

test("marks: each group has its switch, a finalist follows the awards", () => {
  const only = (group) => prefs.normalize({ marks: { award: false, oral: false, spotlight: false, highlight: false, [group]: true } });
  const marks = [{ kind: "best", group: "award" }, { kind: "finalist", group: "finalist" }, { kind: "oral", group: "oral" }, { kind: "spotlight", group: "spotlight" }, { kind: "highlight", group: "highlight" }];
  const kinds = (p) => prefs.visibleMarks(p, marks).map((m) => m.kind);
  assert.deepEqual(kinds(prefs.defaults()), ["best", "finalist", "oral", "spotlight", "highlight"]);
  assert.deepEqual(kinds(only("award")), ["best", "finalist"]);
  assert.deepEqual(kinds(only("oral")), ["oral"]);
  assert.deepEqual(kinds(only("spotlight")), ["spotlight"]);
  assert.deepEqual(kinds(only("highlight")), ["highlight"]);
  assert.deepEqual(kinds(prefs.normalize({ marks: { award: false, oral: false, spotlight: false, highlight: false } })), []);
  assert.deepEqual(prefs.visibleMarks(prefs.defaults(), undefined), []);
});

test("a dotted key is not a second syntax, whichever setting it names", () => {
  const r = prefs.apply(prefs.defaults(), { "panel.years": false });
  assert.deepEqual([r.applied, r.unchanged, r.ignored.map((x) => x.path)], [[], [], ["panel.years"]]);
  assert.equal(r.prefs.panel.years, true);
});
